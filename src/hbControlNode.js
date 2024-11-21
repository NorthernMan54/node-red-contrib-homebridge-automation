const hbBaseNode = require('./hbBaseNode');
const debug = require('debug')('hapNodeRed:hbControlNode');

class HbControlNode extends hbBaseNode {
  constructor(nodeConfig, RED) {
    super(nodeConfig, RED); // Initialize with hbBaseNode constructor

    // Register the node-specific input and close handlers
    this.on('input', this.handleInput.bind(this));
    this.on('close', this.handleClose.bind(this));

    // Register the node with the configuration
    this.conf.register(this.node, this.registerNode.bind(this));
  }

  // Handle input messages
  handleInput(msg) {
    this.msg = msg;

    this._control.call(this, this.node, msg.payload, (err, data) => {
      if (!err && data && (this.deviceType === '00000110' || this.deviceType === '00000111')) {
        const outputMsg = this.createOutputMessage(data);
        this.send(outputMsg);
      } else if (err) {
        this.error(err, this.msg);
      }
    });
  }

  // Handle node closure
  handleClose(callback) {
    callback();
  }

  // Register the node with the configuration and find the device
  registerNode() {
    debug('hbControl.register:', this.node.fullName);

    this.node.hbDevice = this.findDevice(this.node.device);

    if (this.node.hbDevice) {
      this.node.deviceType = this.node.hbDevice.type;
    } else {
      this.error(`437: Can't find device ${this.node.device}`);
    }
  }

  // Create an output message based on the received data
  createOutputMessage(data) {
    const outputMsg = {
      name: this.node.name,
      payload: this.node.state,
      _device: this.node.device,
      _confId: this.node.confId,
    };

    if (this.node.hbDevice) {
      outputMsg.Homebridge = this.node.hbDevice.homebridge;
      outputMsg.Manufacturer = this.node.hbDevice.manufacturer;
      outputMsg.Service = this.node.hbDevice.deviceType;
    }

    outputMsg.payload = data;
    return outputMsg;
  }
}

module.exports = HbControlNode;
