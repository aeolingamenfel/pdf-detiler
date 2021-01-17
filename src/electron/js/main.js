// Modules to control application life and create native browser window
const {ipcMain} = require("electron");
const WindowManager = require("./system/WindowManager");

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on("test", (event, arg) => {
  console.log(arg);
  event.returnValue = "response";
});

// WindowManager automatically generates the first window of the app at the
// right time.
new WindowManager(/* openDevTools= */ true);
