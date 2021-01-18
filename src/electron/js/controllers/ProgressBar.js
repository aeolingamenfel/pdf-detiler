class ProgressBar {

  /**
   * @param {HTMLElement} element
   */
  constructor(element) {
    this.element = element;
    this.bar = this.element.querySelector(".bar");
    this.text = this.element.querySelector(".text");
    this.textUp = false;
  }

  /**
   * @param {number} value
   * @param {number} max
   * @param {string} label
   */
  update(value, max, label) {
    const scale = Math.floor((value / max) * 100);
    this.bar.setAttribute("style", `width: ${scale}%;`);
    this.text.textContent = `${value}/${max} ${label}`;

    if (!this.textUp) {
      this.textUp = true;
      this.text.classList.add("up");
    }
  }

}

module.exports = ProgressBar;
