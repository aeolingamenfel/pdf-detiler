const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const svgToImg = require("svg-to-img");
const pdfjsLib = require("pdfjs-dist/es5/build/pdf.js");
const ReadableSVGStream = require("./readableSvgStreamExtension");
// HACK few hacks to let PDF.js be loaded not as a module in global space.
require("./domstubs.js").setStubs(global);

const ranFromPath = process.cwd();

const DOWNLOADS = "/Users/imattie/Downloads";

// Loading file from file system into typed array
const pdfPath = process.argv[2] || `${DOWNLOADS}/PP-1795-1.psd.pdf`;
const data = new Uint8Array(fs.readFileSync(pdfPath));

const outputDirectory = __dirname + "/../svgdump";

/**
 * Streams the SVG element to the given file path.
 * @param {object[]} svgElements
 * @param {string} filePath
 * @param {number} columns
 */
async function writeSvgsToFile(svgElements, filePath, metadata, columns = 5, scale = 4) {
  // Write all SVGs as files
  for (const svgIndex in svgElements) {
    const svg = svgElements[svgIndex];
    await svgToImg.from(svg.toString()).toJpeg({
      path: `${outputDirectory}/rendered-${svgIndex}.jpeg`,
      width: metadata.width * scale // px
    });
  }

  const doc = new PDFDocument({autoFirstPage: false});
  doc.addPage({
    size: [
      metadata.width * columns * scale,
      metadata.height * Math.floor((svgElements.length / columns)) * scale
    ]
  });
  doc.pipe(fs.createWriteStream(filePath + ".pdf")); // write to PDF

  let row = 0;

  for (let svgIndex = 0; svgIndex < svgElements.length; svgIndex++) {
    const column = (svgIndex - (row * columns));
    let renderX = column * metadata.width * scale;
    let renderY = (row * metadata.height * scale) - (row / 2);
    doc.image(
      `${outputDirectory}/rendered-${svgIndex}.jpeg`,
      renderX,
      renderY,
      {width: metadata.width * scale});

    if (svgIndex !== 0 && (svgIndex + 1) % columns === 0) {
      row++;
    }
  }

  // finalize the PDF and end the stream
  doc.end();
}

function getMetadata(page) {
  const viewport = page.getViewport({scale: 1.0});
  const userUnit = page.userUnit; // 1/72nd of an inch units
  return {
    width: viewport.width,
    height: viewport.height,
    userUnit: userUnit
  };
}

// Will be using promises to load document, pages and misc data instead of
// callback.
var loadingTask = pdfjsLib.getDocument({
  data: data,
  cMapUrl: __dirname + "/../node_modules/pdfjs-dist/cmaps/",
  cMapPacked: true,
  fontExtraProperties: true,
});
loadingTask.promise
  .then(async function (doc) {
    var numPages = doc.numPages;
    console.log("# Document Loaded");
    console.log("Number of Pages: " + numPages);
    console.log();
    let svgs = [];
    let metadata = null;

    var loadPage = function (pageNum) {
      return doc.getPage(pageNum).then(function (page) {
        if (metadata === null) {
          metadata = getMetadata(page);
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

    writeSvgsToFile(
      svgs,
      `${outputDirectory}/final`,
      metadata);
  }).then(
    function () {
      console.log("# End of Document");
    },
    function (err) {
      console.error("Error: " + err);
    });
