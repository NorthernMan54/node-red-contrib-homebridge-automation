const HbBaseNode = require('./hbBaseNode');
const debug = require('debug')('hapNodeRed:hbStatusNode');

class HbStatusNode extends HbBaseNode {
  constructor(config, RED) {
    super(config, RED);
  }

  async handleInput(message, send) {
    debug('handleInput', message.payload, this.name);

    if (!this.hbDevice) {
      this.handleError('HB not initialized');
      return;
    }

    const result = await this.hbDevice.refreshCharacteristics();
    if (result) {
      this.status({
        text: this.statusText(JSON.stringify(await this.hbDevice.values)),
        shape: 'dot',
        fill: 'green'
      });

      send(Object.assign(message, this.createMessage(result)));
    } else {
      this.status({ fill: "red", shape: "ring", text: "disconnected" });
      this.error("No response from device", this.name);
    }

  }
}

module.exports = HbStatusNode;
