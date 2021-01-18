const EventSystem = require("./../events/EventSystem");
const {ipcRenderer} = require("electron");

class ProgressIndicator {

  constructor() {
    this.element = document.getElementById("progressIndicator");
    /** @type {HTMLInputElement} */
    this.columnsInput = document.getElementById("columnsInput");
    this.bind();
  }

  /**
   * @private
   */
  onFileSelected(e) {
    if (this.columnsInput.value.trim() === "") {
      alert("Please specify a column value!");
      return;
    }

    const fullFilePath = e.payload;
    const columns = parseInt(this.columnsInput.value);

    this.processFile(fullFilePath, columns);
  }

  /**
   * @param {string} fullFilePath
   * @param {number} columns
   * @private
   */
  processFile(fullFilePath, columns) {
    ipcRenderer.send("process-file", {fullFilePath, columns});
  }

  /**
   * This should only be called from the constructor.
   * @private
   */
  bind() {
    EventSystem.on("file-selected", (e) => {
      this.onFileSelected(e);
    });
  }

}

module.exports = ProgressIndicator;
