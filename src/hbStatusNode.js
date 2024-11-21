const debug = require('debug')('hapNodeRed:hbStatusNode');

class HbStatusNode {
  constructor(nodeConfig, RED) {

    this.conf = RED.nodes.getNode(nodeConfig.conf); // The configuration node
    this.confId = nodeConfig.conf;
    this.device = nodeConfig.device;
    this.service = nodeConfig.Service;
    this.name = nodeConfig.name;
    this.fullName = `${nodeConfig.name} - ${nodeConfig.Service}`;

    this.hbDevice = null;

    // Register the node with the configuration
    this.conf.register(this, this.registerNode.bind(this));

    // Set up event listeners
    this.on('input', this.handleInput.bind(this));
    this.on('close', this.handleClose.bind(this));
  }

  registerNode() {
    debug("hbStatus Registered:", this.fullName);

    this.hbDevice = hbDevices.findDevice(this.device);

    if (this.hbDevice) {
      this.deviceType = this.hbDevice.deviceType;
    } else {
      this.error(`437: Can't find device ${this.device}`, null);
    }
  }

  handleInput(msg) {
    this.msg = msg;

    _status(this.device, this, { perms: 'pr' }, (err, message) => {
      if (!err) {
        debug(
          "hbStatus received: %s = %s",
          JSON.stringify(this.fullName),
          JSON.stringify(message).slice(0, 80) + '...',
          JSON.stringify(this.hbDevice)
        );

        this.msg.name = this.name;
        this.msg._rawMessage = message;
        this.msg.payload = _convertHBcharactericToNode(message.characteristics, this);

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

  handleClose(callback) {
    callback();
  }
}

module.exports = HbStatusNode;
