const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const svgToImg = require("svg-to-img");
const pdfjsLib = require("pdfjs-dist/es5/build/pdf.js");
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
    this.scale = 4;

    this.assertSvgTempDirExists();
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
    console.log("# Document Loaded");
    console.log("Number of Pages: " + numPages);
    console.log();
    let svgs = [];
    let metadata = null;

    var loadPage = (pageNum) => {
      return doc.getPage(pageNum).then((page) => {
        if (metadata === null) {
          metadata = this.getMetadata(page);
        }

        const viewport = page.getViewport({scale: 1.0});
        console.log("# Page " + pageNum, page.userUnit, "Size: " + viewport.width + "x" + viewport.height);

        return page.getOperatorList().then(function (opList) {
          var svgGfx = new pdfjsLib.SVGGraphics(page.commonObjs, page.objs);
          svgGfx.embedFonts = true;
          return svgGfx.getSVG(opList, viewport).then(function (svg) {
            svgs.push(svg);
          });
        });
      });
    };

    for (var i = 1; i <= numPages; i++) {
      await loadPage(i);
    }

    this.writeSvgsToFile(svgs, path, metadata);
  }

  /**
   * Given a list of SVG elements and other metadata, renders the SVG elements
   * as JPEGs to the svgTempDir.
   * 
   * @param {object[]} svgElements
   * @param {object} metadata
   */
  async writeSvgsAsJpegs(svgElements, metadata) {
    for (const svgIndex in svgElements) {
      const svg = svgElements[svgIndex];
      await svgToImg.from(svg.toString()).toJpeg({
        path: path.join(this.svgTempDir, `rendered-${svgIndex}.jpeg`),
        width: metadata.width * this.scale // px
      });
    }
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

    const doc = new PDFDocument({autoFirstPage: false});
    doc.addPage({
      size: [
        metadata.width * this.columns * this.scale,
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
    }

    doc.end();
    this.cleanupAllSvgJpegs();
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
