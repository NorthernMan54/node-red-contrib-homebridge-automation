const debug = require('debug')('hapNodeRed:hbEventNode');

class HbEventNode {
  constructor(nodeConfig, RED) {
    this.RED = RED;
    this.node = nodeConfig;
    this.conf = RED.nodes.getNode(nodeConfig.conf);
    this.confId = nodeConfig.conf;
    this.device = nodeConfig.device;
    this.service = nodeConfig.Service;
    this.name = nodeConfig.name;
    this.fullName = `${nodeConfig.name} - ${nodeConfig.Service}`;
    this.sendInitialState = nodeConfig.sendInitialState === true;
    this.state = {};

    this.init();
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
      this.state = Object.assign(this.state, _convertHBcharactericToNode([event], this.node));
      const msg = {
        name: this.node.name,
        payload: this.state,
        Homebridge: this.node.hbDevice.homebridge,
        Manufacturer: this.node.hbDevice.manufacturer,
        Service: this.node.hbDevice.deviceType,
        _device: this.node.device,
        _confId: this.node.confId,
        _rawEvent: event,
      };
      this.node.status({
        text: `${JSON.stringify(msg.payload).slice(0, 30)}...`,
        shape: 'dot',
        fill: 'green',
      });
      clearTimeout(this.node.timeout);
      this.node.timeout = setTimeout(() => {
        this.node.status({});
      }, 10 * 1000);
      this.node.send(msg);
    } else if (event.status === true) {
      this.node.status({
        text: 'connected',
        shape: 'dot',
        fill: 'green',
      });
    } else {
      this.node.status({
        text: `disconnected: ${event.status}`,
        shape: 'ring',
        fill: 'red',
      });
    }
  }

  // Handle device registration logic
  handleDeviceRegistration() {
    debug('hbEvent.register', this.node.fullName);
    this.node.hbDevice = hbDevices.findDevice(this.node.device, { perms: 'pr' });

    if (this.node.hbDevice) {
      this.node.deviceType = this.node.hbDevice.deviceType;

      _status(this.node.device, this.node, { perms: 'ev' }, (err, message) => {
        if (!err) {
          this.state = _convertHBcharactericToNode(message.characteristics, this.node);
          debug(
            'hbEvent received: %s = %s',
            this.node.fullName,
            `${JSON.stringify(message.characteristics).slice(0, 80)}...`
          );

          if (this.sendInitialState) {
            const msg = {
              name: this.node.name,
              payload: this.state,
              Homebridge: this.node.hbDevice.homebridge,
              Manufacturer: this.node.hbDevice.manufacturer,
              Service: this.node.hbDevice.deviceType,
              _device: this.node.device,
              _confId: this.node.confId,
              _rawMessage: message,
            };
            this.node.status({
              text: `${JSON.stringify(msg.payload).slice(0, 30)}...`,
              shape: 'dot',
              fill: 'green',
            });
            clearTimeout(this.node.timeout);
            this.node.timeout = setTimeout(() => {
              this.node.status({});
            }, 10 * 1000);
            this.node.send(msg);
          }
        } else {
          this.node.error('hbEvent _status: error', this.node.fullName, err);
        }
      });

      // Register for events
      this.node.listener = this.node.command;
      this.node.eventName = [];

      this.node.hbDevice.eventRegisters.forEach((event) => {
        homebridge.on(this.node.hbDevice.id + event.aid + event.iid, this.node.command);
        this.node.eventName.push(this.node.hbDevice.id + event.aid + event.iid);
      });

      this.node.status({
        text: 'connected',
        shape: 'dot',
        fill: 'green',
      });
    } else {
      this.node.error(`197:Can't find device ${this.node.device}`, null);
    }
  }
}

module.exports = HbEventNode;
