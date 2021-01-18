const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const svgToImg = require("svg-to-img");
const pdfjsLib = require("./pdfjs/pdf");
const cliProgress = require("cli-progress");
const chalk = require("chalk");
const {isMainThread, parentPort, workerData} = require("worker_threads");
const ReadableSVGStream = require("./readableSvgStreamExtension");
// HACK few hacks to let PDF.js be loaded not as a module in global space.
require("./domstubs.js").setStubs(global);

class PdfDetiler {

  /**
   * @param {string} inputPath The path to the PDF file to be detiled.
   * @param {number} columns The amount of columns in the output.
   */
  constructor(inputPath, columns) {
    this.inputPath = inputPath;
    this.columns = columns;
    this.svgTempDir = path.join(process.cwd(), "tmp");
    this.scale = 1;
    // https://lospec.com/palette-list/twilight-5
    this.theme = {
      pagesColor: chalk.hex("#fbbbad"),
      stepColor: chalk.hex("#fbbbad"),
      step1Color: chalk.hex("#ee8695"),
      step2Color: chalk.hex("#4a7a96"),
      step3Color: chalk.hex("#333f58"),
      finaleColor: chalk.hex("#fbbbad")
    };

    this.assertSvgTempDirExists();
  }

  /**
   * Sends an update as to the progress of the DeTiler to the parent thread,
   * if there is one.
   * @param {number} step
   * @param {number} progress
   * @param {number} progressMax
   * @private
   */
  updateParentThread(step, progress, progressMax) {
    if (isMainThread) {
      return;
    }

    parentPort.postMessage({step, progress, progressMax});
  }

  /**
   * Guaruntees that the svgTempDir exists by making it, if it doesn't already
   * exist.
   * @private
   */
  assertSvgTempDirExists() {
    if (fs.existsSync(this.svgTempDir)) {
      return;
    }

    fs.mkdirSync(this.svgTempDir);
  }

  /**
   * Retrieves the pdfJS document object for the known input path.
   * @returns {Promise<>}
   * @private
   */
  getDocument() {
    const data = new Uint8Array(fs.readFileSync(this.inputPath));
    return pdfjsLib.getDocument({
        data: data,
        cMapUrl: path.join(__dirname, "..", "node_modules", "pdfjs-dist", "cmaps"),
        cMapPacked: true,
        fontExtraProperties: true,
      }).promise;
  }

  /**
   * Detiles the file represented by the inputPath set when this object was
   * constructed, and writes the resulting PDF to the given path.
   * @param {string} path Path to write the result to, relative to where the
   *  command was run from.
   */
  async detileAndWriteTo(path) {
    const doc = await this.getDocument();
    const numPages = doc.numPages;
    let svgs = [];
    let metadata = this.getMetadata(await doc.getPage(1));
    const computedWidth = (metadata.width / metadata.userUnit) / 72;
    const computedHeight = (metadata.height / metadata.userUnit) / 72;

    console.log("Loaded document");
    console.log(`Number of Pages: ......... ${this.theme.pagesColor(numPages)}`);
    console.log(`Single-page Dimensions: .. ` + this.theme.pagesColor(`${computedWidth}in x ${computedHeight}in`));
    console.log(`Output Size: ............. ` + this.theme.pagesColor(`${this.columns}x${Math.floor(numPages / this.columns)}`));

    var loadPage = (pageNum) => {
      return doc.getPage(pageNum).then((page) => {
        const viewport = page.getViewport({scale: 1.0});
        return page.getOperatorList().then(function (opList) {
          var svgGfx = new pdfjsLib.SVGGraphics(page.commonObjs, page.objs);
          svgGfx.embedFonts = true;
          return svgGfx.getSVG(opList, viewport).then(function (svg) {
            svgs.push(svg);
          });
        });
      });
    };

    const pagesBar =
      new cliProgress.SingleBar(
        {
          format:
            this.theme.stepColor("Step (1/3)")
            + `: Processing Pages: ${this.theme.step1Color("{bar}")} {percentage}% | {value}/{total} Pages | ETA: {eta}s`,
          barCompleteChar: "=",
          barIncompleteChar: "-",
        },
        cliProgress.Presets.shades_classic);
    
    pagesBar.start(numPages, 0);
    this.updateParentThread(1, 0, numPages);

    for (let i = 1; i <= numPages; i++) {
      await loadPage(i);
      pagesBar.update(i);
      this.updateParentThread(1, i, numPages);
    }

    pagesBar.stop();
    this.updateParentThread(1, numPages, numPages);

    await this.writeSvgsToFile(svgs, path, metadata);
  }

  /**
   * Given a list of SVG elements and other metadata, renders the SVG elements
   * as JPEGs to the svgTempDir.
   * 
   * @param {object[]} svgElements
   * @param {object} metadata
   */
  async writeSvgsAsJpegs(svgElements, metadata) {
    const svgsBar =
      new cliProgress.SingleBar(
        {
          format:
            this.theme.stepColor("Step (2/3)")
            + `: Rendering Pages:  ${this.theme.step2Color("{bar}")} {percentage}% | {value}/{total} Pages | ETA: {eta}s`,
          barCompleteChar: "=",
          barIncompleteChar: "-",
        },
        cliProgress.Presets.shades_classic);
    
    svgsBar.start(svgElements.length, 0);
    this.updateParentThread(2, 0, svgElements.length);

    for (let svgIndex = 0; svgIndex < svgElements.length; svgIndex++) {
      const svg = svgElements[svgIndex];
      await svgToImg.from(svg.toString()).toJpeg({
        path: path.join(this.svgTempDir, `rendered-${svgIndex}.jpeg`),
        width: metadata.width * this.scale // px
      });
      svgsBar.update(svgIndex + 1);
      this.updateParentThread(2, svgIndex + 1, svgElements.length);
    }
    svgsBar.stop();
    this.updateParentThread(2, svgElements.length, svgElements.length);
  }

  /**
   * Cleans up any-and-all files created by writeSvgsAsJpegs().
   */
  cleanupAllSvgJpegs() {
    const files = fs.readdirSync(this.svgTempDir);
    for (const filename of files) {
      if (!(filename.startsWith("rendered") && filename.endsWith(".jpeg"))) {
        continue;
      }

      const fullPath = path.join(this.svgTempDir, filename);
      fs.unlinkSync(fullPath);
    }

    fs.rmdirSync(this.svgTempDir);
  }

  /**
   * Streams the SVG element to the given file path.
   * @param {object[]} svgElements
   * @param {string} filePath
   * @param {object} metadata
   * @param {number?} columns
   * @param {number?} scale
   * @private
   */
  async writeSvgsToFile(svgElements, filePath, metadata) {
    await this.writeSvgsAsJpegs(svgElements, metadata, this.scale);

    const fileBar =
      new cliProgress.SingleBar(
        {
          format:
            this.theme.stepColor("Step (3/3)")
            + `: Combining Pages:  ${this.theme.step3Color("{bar}")} {percentage}% | {value}/{total} Pages | ETA: {eta}s`,
          barCompleteChar: "=",
          barIncompleteChar: "-",
        },
        cliProgress.Presets.shades_classic);
    
    fileBar.start(svgElements.length, 0);
    this.updateParentThread(3, 0, svgElements.length);

    const doc = new PDFDocument({autoFirstPage: false});
    doc.addPage({
      size: [
        metadata.width
          * this.columns
          * this.scale,
        metadata.height
          * Math.floor((svgElements.length / this.columns))
          * this.scale
      ]
    });
    doc.pipe(fs.createWriteStream(filePath)); // write to PDF

    let row = 0;

    for (let svgIndex = 0; svgIndex < svgElements.length; svgIndex++) {
      const column = (svgIndex - (row * this.columns));
      let renderX = column * metadata.width * this.scale;
      let renderY = (row * metadata.height * this.scale) - (row / 2);
      doc.image(
        path.join(this.svgTempDir, `rendered-${svgIndex}.jpeg`),
        renderX,
        renderY,
        {width: metadata.width * this.scale});

      if (svgIndex !== 0 && (svgIndex + 1) % this.columns === 0) {
        row++;
      }

      fileBar.update(svgIndex + 1);
      this.updateParentThread(3, svgIndex + 1, svgElements.length);
    }

    fileBar.stop();
    this.updateParentThread(3, svgElements.length, svgElements.length);
    doc.end();
    this.cleanupAllSvgJpegs();

    console.log(this.theme.finaleColor(`Wrote ${filePath} successfully!`));
  }

  /**
   * @param {object} page
   * @private
   */
  getMetadata(page) {
    const viewport = page.getViewport({scale: 1.0});
    const userUnit = page.userUnit; // 1/72nd of an inch units
    return {
      width: viewport.width,
      height: viewport.height,
      userUnit: userUnit
    };
  }

}

module.exports = PdfDetiler;
