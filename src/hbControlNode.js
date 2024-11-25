const hbBaseNode = require('./hbBaseNode');
const debug = require('debug')('hapNodeRed:hbControlNode');

class HbControlNode extends hbBaseNode {
  constructor(config, RED) {
    super(config, RED);

    // Register the node-specific input and close handlers
    // this.on('input', this.handleInput.bind(this));
    // Register the node with the configuration
  }

  // Handle input messages
  async handleInput(message) {
    debug('handleInput', message, this.hbDevice);
    if (this.hbDevice) {
      var results = [];
      if (typeof message.payload === "object") {
        var fill = 'green';
        for (const key of Object.keys(message.payload)) {
          const characteristic = this.hbDevice.serviceCharacteristics.find(
            c => c.type === key
          );

          if (characteristic) {
            const result = await characteristic.setValue(message.payload[key]);
            results.push({ [result.type]: result.value })
          } else {
            console.log('Not Found', key);
            this.error('Invalid Characteristic \'' + key + '\' found in the message ' + JSON.stringify(message));
            results.push({ 'Invalid Key': key });
            fill = 'red';
          };
        }
        this.status({
          text: JSON.stringify(Object.assign({}, ...results)),
          shape: 'dot',
          fill: fill
        });

      } else {
        // Improper object
        const validNames = Object.keys(this.hbDevice.values)
          .filter(key => key !== 'ConfiguredName')
          .join(', ');
        this.error("Payload should be an JSON object containing device characteristics and values, ie {\"On\":false, \"Brightness\":0 }\nValid values include: " + validNames);
        this.status({
          text: 'Invalid payload',
          shape: 'ring',
          fill: 'red'
        });

      }
    } else {
      this.error("HB not initialized");
      this.status({
        text: 'HB not initialized',
        shape: 'ring',
        fill: 'red',
      });

    }
    /*
    this._control.call(this, this.node, msg.payload, (err, data) => {
      if (!err && data && (this.deviceType === '00000110' || this.deviceType === '00000111')) {
        const outputMsg = this.createOutputMessage(data);
        this.send(outputMsg);
      } else if (err) {
        this.error(err, this.msg);
      }
    });
    */
  }

  // Handle node closure
  handleClose(callback) {
    callback();
  }
}

module.exports = HbControlNode;
