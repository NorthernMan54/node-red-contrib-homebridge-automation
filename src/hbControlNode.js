const debug = require('debug')('hapNodeRed:hbControlNode');

class HbControlNode {
  constructor(nodeConfig, RED) {

    this.conf = RED.nodes.getNode(nodeConfig.conf); // The configuration node
    this.confId = nodeConfig.conf;
    this.device = nodeConfig.device;
    this.service = nodeConfig.Service;
    this.name = nodeConfig.name;
    this.fullName = `${nodeConfig.name} - ${nodeConfig.Service}`;

    this.state = null;
    this.hbDevice = null;
    this.deviceType = null;

    this.on('input', this.handleInput.bind(this));
    this.on('close', this.handleClose.bind(this));

    // Register the node with the configuration
    this.conf.register(this, this.registerNode.bind(this));
  }

  handleInput(msg) {
    this.msg = msg;

    _control.call(this, this, msg.payload, (err, data) => {
      if (!err && data && (this.deviceType === '00000110' || this.deviceType === '00000111')) {
        const outputMsg = {
          name: this.name,
          payload: this.state,
          _device: this.device,
          _confId: this.confId,
        };

        if (this.hbDevice) {
          outputMsg.Homebridge = this.hbDevice.homebridge;
          outputMsg.Manufacturer = this.hbDevice.manufacturer;
          outputMsg.Service = this.hbDevice.deviceType;
        }

        outputMsg.payload = data;
        this.send(outputMsg);
      } else if (err) {
        this.error(err, this.msg);
      }
    });
  }

  handleClose(callback) {
    callback();
  }

  registerNode() {
    debug("hbControl.register:", this.fullName);

    this.hbDevice = hbDevices.findDevice(this.device);

    if (this.hbDevice) {
      this.deviceType = this.hbDevice.type;
    } else {
      this.error(`437: Can't find device ${this.device}`, null);
    }
  }
}

module.exports = HbControlNode;
