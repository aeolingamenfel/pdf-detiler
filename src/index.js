const PdfDetiler = require("./PdfDetiler");

(async function() {
  const inputPath = `/Users/imattie/Downloads/PP-1795-1.psd.pdf`;
  const outputPath = process.cwd() + "/tmp/final.pdf";

  const detiler = new PdfDetiler(inputPath);
  await detiler.detileAndWriteTo(outputPath);
})();
