class EventSystem {

  constructor() {
    this.body = document.getElementsByTagName("body")[0];
  }

  emit(eventName, payload) {
    this.body.dispatchEvent(new EventSystemEvent(eventName, payload));
  }

  /**
   * @param {string} eventName
   * @param {function(EventSystemEvent):void} callbackFn
   */
  on(eventName, callbackFn) {
    this.body.addEventListener(eventName, callbackFn);
  }

}

class EventSystemEvent extends Event {

  /**
   * @param {string} eventName
   * @param {object} payload
   */
  constructor(eventName, payload) {
    super(eventName);
    this.payload = payload;
  }

}

const singleton = new EventSystem();

module.exports = singleton;
