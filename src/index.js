const fs = require("fs");
const path = require("path");
const args = require("really-simple-args")();
const PdfDetiler = require("./PdfDetiler");

(async function() {
  if (args.getAmountOfArguments() < 1) {
    console.log(
      "Please specify a filename to detile by passing it as the first "
      + "argument, ie. 'pdf-detiler cool-file.pdf'");
    return;
  }

  const inputPath = path.resolve(args.getArgumentByIndex(0));

  if (!inputPath.endsWith(".pdf")) {
    console.log(
      "The file you specified doesn't look like a PDF (ie. it doesn't end "
      + "with \".pdf\").");
    return;
  }

  if (!fs.existsSync(inputPath)) {
    console.log(
      `The specified file doesn't exist. I, by default, look in the directory `
      + `in which I'm run, and specifically I looked for a file `
      + `at: ${inputPath}`);
    return;
  }

  if (!args.hasParameter("columns")) {
    console.log(
      "You must specify the amount of columns to output, ex: \"-columns 5\"");
    return;
  }

  const columns = parseInt(args.getParameter("columns"));

  const outputPath =
    path.join(
      process.cwd(),
      path.basename(inputPath).substr(0, inputPath.length - 4)
        + "_detiled.pdf");

  const detiler = new PdfDetiler(inputPath, columns);
  await detiler.detileAndWriteTo(outputPath);
})();
