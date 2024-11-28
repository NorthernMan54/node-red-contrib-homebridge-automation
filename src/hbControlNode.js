const hbBaseNode = require('./hbBaseNode');
const debug = require('debug')('hapNodeRed:hbControlNode');

class HbControlNode extends hbBaseNode {
  constructor(config, RED) {
    super(config, RED);
  }

  async handleInput(message, send) {
    debug('handleInput', message.payload, this.name);
    if (!this.hbDevice) {
      this.handleError('HB not initialized');
      return;
    }
    if (this.hbDevice.type == 'CameraRTPStreamManagement') {
      message.payload = {
        "resource-type": "image",
        "image-width": 1920,
        "image-height": 1080
      };
    }
    if (typeof message.payload !== 'object') {
      const validNames = Object.keys(this.hbDevice.values)
        .filter(key => key !== 'ConfiguredName')
        .join(', ');
      this.error(`Payload should be a JSON object containing device characteristics and values, e.g. {"On":false, "Brightness":0}. Valid values: ${validNames}`);
      this.status({ text: 'Invalid payload', shape: 'dot', fill: 'red' });
      return;
    }

    const results = [];
    let fill = 'green';

    if (this.hbDevice.type == 'CameraRTPStreamManagement') {
      const result = await this.hbDevice.getResource({
        "resource-type": "image",
        "image-width": 1920,
        "image-height": 1080
      });
      message = { ...message, ...this.createMessage(this.hbDevice) };
      message.payload = result;
      send(message);
      results.push({ 'Received': result.length })
    } else {
      for (const key of Object.keys(message.payload)) {

        try {
          const result = await this.hbDevice.setCharacteristicByType(key, message.payload[key]);
          results.push({ [result.type]: result.value });
        } catch (error) {
          this.error(`Failed to set value for ${key}: ${error.message}`);
          results.push({ key: key + ' ' + error.message })
          fill = 'red';
        }
      }
    }

    this.status({
      text: this.statusText(JSON.stringify(Object.assign({}, ...results))),
      shape: 'dot',
      fill,
    });
  }
}

function btoa(str) {
  var buffer;

  if (str instanceof Buffer) {
    buffer = str;
  } else {
    buffer = Buffer.from(str.toString(), 'binary');
  }

  return buffer.toString('base64');
}

module.exports = HbControlNode;
