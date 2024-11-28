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
      this.handleError('HB not initialized');
      return;
    }

    if (typeof message.payload !== 'object' || typeof message.payload.On !== 'boolean') {
      const validNames = Object.keys(this.hbDevice.values)
        .filter(key => key !== 'ConfiguredName')
        .join(', ');
      this.handleError(
        `Invalid payload. Expected: {"On": false, "Brightness": 0}. Valid values: ${validNames}`,
        'Invalid payload'
      );
      return;
    }

    if (message.payload.On) {
      this.storedState = JSON.parse(JSON.stringify(this.hbDevice.values));
      debug('Storing state', this.storedState);
    } else if (this.storedState) {
      debug('Restoring state', this.storedState);
      message.payload = { ...this.storedState, ...message.payload };
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
