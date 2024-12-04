const HbBaseNode = require('./hbBaseNode'); // Path to the HbBaseNode file
const debug = require('debug')('hapNodeRed:hbResumeNode');

class HbResumeNode extends HbBaseNode {
  constructor(config, RED) {
    super(config, RED);
    this.lastOutputTime = Date.now();
    this.storedState = null;
  }

  handleHBEventMessage(service) {
    debug('hbEvent for', this.id, service.serviceName, JSON.stringify(service.values));

    if (service.values && Date.now() - this.lastOutputTime > 1000) {    // Ignore messages within 1 second of last output
      this.storedState = JSON.parse(JSON.stringify(this.hbDevice.values));
      debug('Storing state', this.name, JSON.stringify(this.storedState));
    }
  }

  handleInput(message, send) {
    debug('handleInput', this.id, message.payload, this.name);

    if (!this.hbDevice) {
      this.handleWarning('HB not initialized');
      return;
    }

    if (typeof message.payload !== 'object' || typeof message.payload.On !== 'boolean') {
      const validNames = Object.keys(this.hbDevice.values)
        .filter(key => key !== 'ConfiguredName')
        .join(', ');
      this.handleWarning(
        `Invalid payload. Expected: {"On": false, "Brightness": 0}. Valid values: ${validNames}`,
        'Invalid payload'
      );
      return;
    }

    // if on, store the current values object to storedState before passing
    // if off, if storedState, then send stored state else passthru

    if (message.payload.On) {
      this.storedState = JSON.parse(JSON.stringify(this.hbDevice.values));
      debug('Storing state', this.name, JSON.stringify(this.storedState));
    } else if (this.storedState) {
      debug('Restoring state', this.name, JSON.stringify(this.storedState));
      message.payload = { ...message.payload, ...this.storedState };
      this.storedState = null;
    }

    this.status({
      text: this.statusText(JSON.stringify(message.payload)),
      shape: 'dot',
      fill: 'green',
    });

    this.lastOutputTime = Date.now();;
    send(message);
  }

}

module.exports = HbResumeNode;
