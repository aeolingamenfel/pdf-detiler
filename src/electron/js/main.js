// Modules to control application life and create native browser window
const {ipcMain} = require("electron");
const WindowManager = require("./system/WindowManager");
const fs = require("fs");
const path = require("path");
const {Worker} = require('worker_threads');

// Events for this should come exclusively from
// controllers/ProgressIndicator.j, which sends "process-file" requests when it
// got a file from the user to process.
ipcMain.on("process-file", async (event, arg) => {
  const {fullFilePath, columns} = arg;

  const dirName = path.dirname(fullFilePath);
  const fileName = path.basename(fullFilePath);
  const outputPath =
    path.join(
      dirName, fileName.substr(0, fileName.length - 4) + "_detiled.pdf");

  const worker = new Worker(path.join(__dirname, "process-file-thread.js"), {
    workerData: {fullFilePath, columns, outputPath}
  });

  worker.on("message", (value) => {
    if (value.done) {
      event.sender.send("process-file-complete", outputPath);
      return;
    }

    event.sender.send("process-file-processing-status-update", value);
  });
  worker.on("error", (e) => {
    console.warn("Error on process", e);
  });
  worker.on("exit", (code) => {
    if (code !== 0) {
      throw new Error(`Worker stopped with exit code ${code}`);
    }
  });
});

// WindowManager automatically generates the first window of the app at the
// right time.
new WindowManager(/* openDevTools= */ true);
