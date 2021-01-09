//
// Node tool to dump SVG output into a file.
//

var fs = require("fs");
var util = require("util");
var path = require("path");
var stream = require("stream");

const PDFDocument = require('pdfkit');
const svgToImg = require("svg-to-img");

// HACK few hacks to let PDF.js be loaded not as a module in global space.
require("./domstubs.js").setStubs(global);

// Run `gulp dist-install` to generate 'pdfjs-dist' npm package files.
var pdfjsLib = require("pdfjs-dist/es5/build/pdf.js");

// Some PDFs need external cmaps.
var CMAP_URL = __dirname + "/../node_modules/pdfjs-dist/cmaps/";
var CMAP_PACKED = true;

const DOWNLOADS = "/Users/imattie/Downloads";

// Loading file from file system into typed array
var pdfPath = process.argv[2] || `${DOWNLOADS}/PP-1795-1.psd.pdf`;
var data = new Uint8Array(fs.readFileSync(pdfPath));

var outputDirectory = __dirname + "/../svgdump";

try {
  // Note: This creates a directory only one level deep. If you want to create
  // multiple subdirectories on the fly, use the mkdirp module from npm.
  fs.mkdirSync(outputDirectory);
} catch (e) {
  if (e.code !== "EEXIST") {
    throw e;
  }
}

// Dumps svg outputs to a folder called svgdump
function getFilePathForPage(pageNum) {
  var name = path.basename(pdfPath, path.extname(pdfPath));
  return path.join(outputDirectory, name + "-" + pageNum + ".svg");
}

/**
 * A readable stream which offers a stream representing the serialization of a
 * given DOM element (as defined by domstubs.js).
 *
 * @param {object} options
 * @param {DOMElement} options.svgElement The element to serialize
 */
function ReadableSVGStream(options) {
  if (!(this instanceof ReadableSVGStream)) {
    return new ReadableSVGStream(options);
  }
  stream.Readable.call(this, options);
  this.serializer = options.svgElement.getSerializer();
}
util.inherits(ReadableSVGStream, stream.Readable);
// Implements https://nodejs.org/api/stream.html#stream_readable_read_size_1
ReadableSVGStream.prototype._read = function () {
  var chunk;
  while ((chunk = this.serializer.getNext()) !== null) {
    if (!this.push(chunk)) {
      return;
    }
  }
  this.push(null);
};

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
  cMapUrl: CMAP_URL,
  cMapPacked: CMAP_PACKED,
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
  })
  .then(
    function () {
      console.log("# End of Document");
    },
    function (err) {
      console.error("Error: " + err);
    }
  );
