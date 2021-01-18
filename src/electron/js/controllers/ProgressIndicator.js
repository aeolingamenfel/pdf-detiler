const EventSystem = require("./../events/EventSystem");

class ProgressIndicator {

  constructor() {
    this.element = document.getElementById("progressIndicator");
    this.bind();
  }

  /**
   * @private
   */
  onFileSelected(e) {
    console.log(e.payload);
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
