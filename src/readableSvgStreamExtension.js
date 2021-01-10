const util = require("util");
const stream = require("stream");

/**
 * A readable stream which offers a stream representing the serialization of a
 * given DOM element (as defined by domstubs.js).
 */
class ReadableSVGStream {

  /**
   * @param {object} options
   * @param {DOMElement} options.svgElement The element to serialize
   */
  constructor(options) {
    if (!(this instanceof ReadableSVGStream)) {
      return new ReadableSVGStream(options);
    }
    stream.Readable.call(this, options);
    this.serializer = options.svgElement.getSerializer();
  }

  // Implements https://nodejs.org/api/stream.html#stream_readable_read_size_1
  _read() {
    let chunk;
    while ((chunk = this.serializer.getNext()) !== null) {
      if (!this.push(chunk)) {
        return;
      }
    }
    this.push(null);
  }

}

util.inherits(ReadableSVGStream, stream.Readable);

module.exports = ReadableSVGStream;
