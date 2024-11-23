const hbBaseNode = require('./hbBaseNode');
const debug = require('debug')('hapNodeRed:hbEventNode');

class HbEventNode extends hbBaseNode {
  constructor(config, RED) {
    // console.log('HbEventNode', config);
    super(config, RED);
    this.sendInitialState = config.sendInitialState === true;
    this.hbConfigNode.register(this.config, this.registerNode.bind(this));
  }

  // Handle event command processing
  command(event) {
    if (event.status === true && event.value !== undefined) {
      this.state = { ...this.state, ...this._convertHBcharacteristicToNode([event]) };
      const msg = this.createMessage(event);
      this.updateStatus({ text: `${JSON.stringify(msg.payload).slice(0, 30)}...`, shape: 'dot', fill: 'green' });
      this.send(msg);
    } else if (event.status === true) {
      this.updateStatus({ text: 'connected', shape: 'dot', fill: 'green' });
    } else {
      this.updateStatus({ text: `disconnected: ${event.status}`, shape: 'ring', fill: 'red' });
    }
  }

  // Handle device registration logic
  handleDeviceRegistration() {
    debug('hbEvent.register', this);
    this.node.hbDevice = this.findDevice(this.node.device, { perms: 'pr' });

    if (this.node.hbDevice) {
      this.registerEventHandlers();
      this.fetchInitialState();
    } else {
      this.node.error(`Can't find device ${this.node.device}`);
    }
  }

  // Register for device events
  registerEventHandlers() {
    this.node.deviceType = this.node.hbDevice.deviceType;
    this.node.listener = this.command;
    this.node.eventName = [];

    this.node.hbDevice.eventRegisters.forEach((event) => {
      this.registerEvent(this.node.hbDevice.id + event.aid + event.iid);
    });

    this.updateStatus({ text: 'connected', shape: 'dot', fill: 'green' });
  }

  // Fetch and send initial state if required
  fetchInitialState() {
    this.fetchStatus(this.node.device, { perms: 'ev' }, (err, message) => {
      if (!err) {
        this.state = this._convertHBcharacteristicToNode(message.characteristics);
        debug(
          'hbEvent received: %s = %s',
          this.node.fullName,
          `${JSON.stringify(message.characteristics).slice(0, 80)}...`
        );

        if (this.sendInitialState) {
          const msg = this.createMessage(message, true);
          this.updateStatus({ text: `${JSON.stringify(msg.payload).slice(0, 30)}...`, shape: 'dot', fill: 'green' });
          this.send(msg);
        }
      } else {
        this.node.error('hbEvent _status: error', this.node.fullName, err);
      }
    });
  }

  // Create a message payload for event or initial state
  createMessage(event, isInitialState = false) {
    return {
      name: this.node.name,
      payload: this.state,
      Homebridge: this.node.hbDevice.homebridge,
      Manufacturer: this.node.hbDevice.manufacturer,
      Service: this.node.hbDevice.deviceType,
      _device: this.node.device,
      _confId: this.node.confId,
      _rawEvent: isInitialState ? event : undefined,
    };
  }
}

module.exports = HbEventNode;
