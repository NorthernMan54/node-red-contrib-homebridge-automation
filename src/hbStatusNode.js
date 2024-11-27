const HbBaseNode = require('./hbBaseNode');
const debug = require('debug')('hapNodeRed:hbStatusNode');

class HbStatusNode extends HbBaseNode {
  constructor(config, RED) {
    super(config, RED);
  }

  async handleInput(message, send) {
    debug('handleInput', message.payload, this.name);

    if (!this.hbDevice) {
      this.error('HB not initialized');
      this.status({ text: 'HB not initialized', shape: 'ring', fill: 'red' });
      return;
    }

    const result = await this.hbDevice.refreshCharacteristics();
    this.status({
      text: JSON.stringify(await this.hbDevice.values),
      shape: 'dot',
      fill: 'green'
    });

    message.payload = result.values;
    send(message);
  }
}

module.exports = HbStatusNode;
