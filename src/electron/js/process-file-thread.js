// This file exclusively is run in a separate thread from the main thread in
// main.js. This thread is responsible for processing a given file.
const {isMainThread, parentPort, workerData} = require('worker_threads');
const PdfDetiler = require("./../../PdfDetiler");

(async function() {
  // Do nothing if this is the main thread, though this should never be the
  // case during normal operation.
  if (isMainThread) {
    return;
  }

  const {fullFilePath, columns, outputPath} = workerData;

  const detiler = new PdfDetiler(fullFilePath, columns);
  await detiler.detileAndWriteTo(outputPath);

  parentPort.postMessage({done: true});
})();

