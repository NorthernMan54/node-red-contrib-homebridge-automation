const HbBaseNode = require('./hbBaseNode'); // Path to the HbBaseNode file
const debug = require('debug')('hapNodeRed:hbResumeNode');

class HbResumeNode extends HbBaseNode {
  constructor(config, RED) {
    super(config, RED);

    this.storedState = null;

    // Set up input and command handlers
    // this.on('input', this.handleInput.bind(this));
    this.command = this.handleCommand.bind(this);

    // Handle device registration
    debug('hbResume - hbConfigNode', this.hbConfigNode);
  }

  handleInput(message, send) {
    debug('handleInput', message.payload, this.name);

    if (!this.hbDevice) {
      this.warn('HB not initialized');
      this.status({ text: 'HB not initialized', shape: 'ring', fill: 'red' });
      return;
    }

    if (typeof message.payload !== 'object') {
      const validNames = Object.keys(this.hbDevice.values)
        .filter(key => key !== 'ConfiguredName')
        .join(', ');
      this.warn(`Payload should be a JSON object containing device characteristics and values, e.g. {"On":false, "Brightness":0}. Valid values: ${validNames}`);
      this.status({ text: 'Invalid payload', shape: 'dot', fill: 'red' });
      return;
    }

    // if on, store the current values object to storedState before passing
    // if off, if storedState, then send stored state else passthru

    if (message.payload.On) {
      this.storedState = this.hbDevice.values;
      debug('Storing', this.storedState);
    } else if (!message.payload.On && this.storedState) {
      debug('Restoring', this.storedState)
      message.payload = { ...message.payload, ...this.storedState }
      this.storedState = null;
    }
    this.status({
      text: JSON.stringify(message.payload),
      shape: 'dot',
      fill: 'green',
    });
    send(message);
  }

}

module.exports = HbResumeNode;
