const {app, BrowserWindow} = require("electron");
const path = require("path");

class WindowManager {

  /**
   * @param {string?} openDevTools Defaults to false. If true, opens the
   *  devtools on the new window.
   */
  constructor(openDevTools = false) {
    this.mainWindow = null;
    this.openDevTools = openDevTools;

    this.bind();
  }

  createWindow() {
    if (this.mainWindow !== null) {
      throw new Error("Main window already exists!");
    }

    // Create the browser window.
    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, "..", "preload.js")
      },
      titleBarStyle: "hiddenInset",
      webPreferences: {
        nodeIntegration: true // required for require() in renderer.js
      }
    });
  
    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, "..", "..", "html", "index.html"));
  
    // Open the DevTools.
    if (this.openDevTools) {
      mainWindow.webContents.openDevTools();
    }
  }

  /**
   * Should only be called from the constructor.
   * @private
   */
  bind() {
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.whenReady().then(() => {
      this.createWindow();
      
      app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) this.createWindow();
      });
    });

    // Quit when all windows are closed, except on macOS. There, it's common
    // for applications and their menu bar to stay active until the user quits
    // explicitly with Cmd + Q.
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit();
    });
  }

}

module.exports = WindowManager;
