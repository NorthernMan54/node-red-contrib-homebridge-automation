const hbBaseNode = require('./hbBaseNode');
const debug = require('debug')('hapNodeRed:hbEventNode');

class HbEventNode extends hbBaseNode {
  constructor(nodeConfig, RED) {
    super(nodeConfig, RED); // Call the base node constructor
    this.sendInitialState = nodeConfig.sendInitialState === true;
    this.init(); // Initialize additional functionality
  }

  // Initialize the event handling logic
  init() {
    this.node.command = this.command.bind(this);

    // Register the node with the HbConf class
    this.conf.register(this.node, this.handleDeviceRegistration.bind(this));

    // Clean up when the node is closed
    this.node.on('close', (callback) => {
      this.conf.deregister(this.node, callback);
    });
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
    debug('hbEvent.register', this.node.fullName);
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
