const hbBaseNode = require('./hbBaseNode');
const debug = require('debug')('hapNodeRed:hbControlNode');

class HbControlNode extends hbBaseNode {
  constructor(config, RED) {
    super(config, RED);
  }

  async handleInput(message) {
    debug('handleInput', message.payload, this.name);

    if (!this.hbDevice) {
      this.error('HB not initialized');
      this.status({ text: 'HB not initialized', shape: 'ring', fill: 'red' });
      return;
    }

    if (typeof message.payload !== 'object') {
      const validNames = Object.keys(this.hbDevice.values)
        .filter(key => key !== 'ConfiguredName')
        .join(', ');
      this.error(`Payload should be a JSON object containing device characteristics and values, e.g. {"On":false, "Brightness":0}. Valid values: ${validNames}`);
      this.status({ text: 'Invalid payload', shape: 'ring', fill: 'red' });
      return;
    }

    const results = [];
    let fill = 'green';

    for (const key of Object.keys(message.payload)) {
      const characteristic = this.hbDevice.serviceCharacteristics.find(c => c.type === key);

      if (characteristic) {
        try {
          const result = await characteristic.setValue(message.payload[key]);
          results.push({ [result.type]: result.value });
        } catch (error) {
          this.error(`Failed to set value for ${key}: ${error.message}`);
          fill = 'red';
        }
      } else {
        this.error(`Invalid characteristic '${key}' found in the message: ${JSON.stringify(message.payload)}`);
        results.push({ 'Invalid Key': key });
        fill = 'red';
      }
    }

    this.status({
      text: JSON.stringify(Object.assign({}, ...results)),
      shape: 'dot',
      fill,
    });
  }

  handleClose(callback) {
    callback();
  }
}

module.exports = HbControlNode;
