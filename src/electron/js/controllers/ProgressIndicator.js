const EventSystem = require("./../events/EventSystem");
const {ipcRenderer} = require("electron");

const STATE = {
  WAITING: 0,
  STEP_1: 1,
  STEP_2: 2,
  STEP_3: 3
};

class ProgressIndicator {

  constructor() {
    this.element = document.getElementById("progressIndicator");
    /** @type {HTMLInputElement} */
    this.columnsInput = document.getElementById("columnsInput");
    this.stepTextEl = this.element.querySelector(".step-text");
    this.messageEl = this.element.querySelector(".message");
    this.state = STATE.WAITING;
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
    this.updateState(STATE.STEP_1);
  }

  /**
   * Called automatically when the file has completed processing.
   * @param {string} outputPath
   * @private
   */
  onProcessFileComplete(outputPath) {
    this.updateState(STATE.WAITING);
    console.log(outputPath);
  }

  /**
   * @param {object} newValue
   * @private
   */
  updateState(newValue) {
    if (newValue === this.state) {
      return;
    }

    this.state = newValue;

    switch(this.state) {
      case STATE.WAITING:
        this.setStep(0);
        this.setMessage("Waiting for file...");
        break;
      case STATE.STEP_1:
        this.setStep(1);
        this.setMessage("Processing pages...");
        break;
      case STATE.STEP_2:
        this.setStep(2);
        this.setMessage("Rendering pages...");
        break;
      case STATE.STEP_3:
        this.setStep(3);
        this.setMessage("Combining pages...");
        break;
      default:
        throw new Error(`Bad Progress Indicator State: ${this.state}`);
    }
  }

  /**
   * @param {number} stepNumber
   * @private
   */
  setStep(stepNumber) {
    this.stepTextEl.textContent = `(Step ${stepNumber}/3)`;
  }

  /**
   * @param {string} message
   * @private
   */
  setMessage(message) {
    this.messageEl.textContent = message;
  }

  /**
   * This should only be called from the constructor.
   * @private
   */
  bind() {
    EventSystem.on("file-selected", (e) => {
      this.onFileSelected(e);
    });
    ipcRenderer.on("process-file-complete", (e, args) => {
      this.onProcessFileComplete(args);
    });
  }

}

module.exports = ProgressIndicator;
