// Modules to control application life and create native browser window
const {ipcMain} = require("electron");
const WindowManager = require("./system/WindowManager");
const fs = require("fs");
const path = require("path");
const PdfDetiler = require("./../../PdfDetiler");

ipcMain.on("process-file", async (event, arg) => {
  const {fullFilePath, columns} = arg;

  const dirName = path.dirname(fullFilePath);
  const fileName = path.basename(fullFilePath);
  const outputPath =
    path.join(
      dirName, fileName.substr(0, fileName.length - 4) + "_detiled.pdf");

  const detiler = new PdfDetiler(fullFilePath, columns);
  await detiler.detileAndWriteTo(outputPath);

  ipcMain.emit("process-file-complete", outputPath);
});

// WindowManager automatically generates the first window of the app at the
// right time.
new WindowManager(/* openDevTools= */ true);
