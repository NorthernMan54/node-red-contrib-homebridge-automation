const HbBaseNode = require('./hbBaseNode'); // Path to HbBaseNode file
const debug = require('debug')('hapNodeRed:hbStatusNode');

class HbStatusNode extends HbBaseNode {
  constructor(nodeConfig) {
    super(nodeConfig);

    // Set up the input event listener
    this.on('input', this.handleInput.bind(this));
  }

  /**
   * Handle input events specific to HbStatusNode
   * @param {Object} msg - Input message
   */
  handleInput(msg) {
    this.msg = msg;

    this._status(this.device, this, { perms: 'pr' }, (err, message) => {
      if (!err) {
        debug(
          "hbStatus received: %s = %s",
          JSON.stringify(this.fullName),
          JSON.stringify(message).slice(0, 80) + '...',
          JSON.stringify(this.hbDevice)
        );

        this.msg.name = this.name;
        this.msg._rawMessage = message;
        this.msg.payload = this._convertHBcharactericToNode(message.characteristics, this);

        if (this.hbDevice) {
          this.msg.Homebridge = this.hbDevice.homebridge;
          this.msg.Manufacturer = this.hbDevice.manufacturer;
          this.msg.Service = this.hbDevice.service;
          this.msg._device = this.device;
          this.msg._confId = this.confId;
        }

        this.status({
          text: JSON.stringify(this.msg.payload).slice(0, 30) + '...',
          shape: 'dot',
          fill: 'green',
        });

        this.send(this.msg);
      } else {
        this.error(err, this.msg);
      }
    });
  }
}

module.exports = HbStatusNode;
