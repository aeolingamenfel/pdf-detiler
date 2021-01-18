const EventSystem = require("./../events/EventSystem");

class FileDropzone {

  constructor() {
    this.element = document.getElementById("fileDropzone");
    /** @type {HTMLInputElement} */
    this.fileDataInput = document.getElementById("fileDataInput");
    this.bind();
  }

  /**
   * Called when the file input changed (could be to empty).
   * @param {Event} e
   * @private
   */
  onFileInputChange(e) {
    if (this.fileDataInput.files.length < 1) {
      return;
    }
    const fullPath = this.fileDataInput.files[0].path;
    EventSystem.emit("file-selected", fullPath);
  }

  /**
   * Called when a file is dropped on this element.
   * @param {DragEvent} e
   * @private
   */
  onDrop(e) {
    this.element.classList.remove("dragging");
  }

  /**
   * Called when a file is dragged over this elemeent.
   * @param {DragEvent} e
   * @private
   */
  onDragEnter(e) {
    this.element.classList.add("dragging");
  }

  /**
   * Called when a file is dragged away from this elemeent.
   * @param {DragEvent} e
   * @private
   */
  onDragLeave(e) {
    this.element.classList.remove("dragging");
  }

  /**
   * Should only be called by the constructor.
   * @private
   */
  bind() {
    this.fileDataInput.addEventListener(
      "change", (e) => this.onFileInputChange(e));
    this.element.addEventListener("drop", (e) => this.onDrop(e));
    this.element.addEventListener("dragenter", (e) => this.onDragEnter(e));
    this.element.addEventListener("dragleave", (e) => this.onDragLeave(e));
  }

}

module.exports = FileDropzone;
