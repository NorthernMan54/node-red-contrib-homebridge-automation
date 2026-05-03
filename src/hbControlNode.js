const HbBaseNode = require('./hbBaseNode');
const { filterIfOff } = require('./utils');
const debug = require('debug')('hapNodeRed:hbControlNode');

class HbControlNode extends HbBaseNode {
  constructor(config, RED) {
    super(config, RED);
  }

  async handleInput(message, send, done) {
    debug('handleInput', this.name, JSON.stringify(message.payload));

    if (!this.hbDevice) {
      this.handleWarning('HB not initialized');
      done('HB not initialized');
      return;
    }

    const isCamera = this.hbDevice.type === 'CameraRTPStreamManagement';
    const payloadType = typeof message.payload;

    // Is the payload a valid JSON object?

    if (!isCamera && payloadType !== 'object') {
      const validNames = Object.keys(this.hbDevice.values)
        .filter(key => key !== 'ConfiguredName')
        .join(', ');
      this.error(
        `Invalid payload. Expected JSON object, e.g., {"On":false, "Brightness":0}. Valid values: ${validNames}`
      );
      this.status({ text: 'Invalid payload', shape: 'ring', fill: 'red' });
      done();
      return;
    }

    // Validate payload
    const keysToKeep = Object.keys(this.hbDevice.values);

    Object.keys(message.payload).forEach(key => {
      if (!keysToKeep.includes(key)) {
        this.handleWarning(`Unhandled Characteristic '${key}'`);
        delete message.payload[key];
      }
    });

    const results = [];
    let fill = 'green';
    let shape = 'dot';

    try {
      if (isCamera) {
        // Handle CameraRTPStreamManagement
        const cameraPayload = {
          "resource-type": "image",
          "image-width": 1920,
          "image-height": 1080
        };

        const result = await this.hbDevice.getResource(cameraPayload);

        message = { ...message, ...this.createMessage(this.hbDevice), payload: result };
        send(message);
        results.push({ Received: result.length });
      } else {
        // Handle other characteristics
        try {
          // debug('Setting value for', message.payload);
          const result = await this.hbDevice.setCharacteristicsByTypes(filterIfOff(message.payload));
          // debug('Result', result.values);
          results.push(result.values);
        } catch (error) {
          this.error(`${error.message} for ${JSON.stringify(message.payload)}`);
          results.push({ Error: `${error.message} for ${JSON.stringify(message.payload)}` });
          fill = 'red';
          shape = 'ring';
        }
      }

      // Update status
      const statusText = this.statusText(JSON.stringify(Object.assign({}, ...results)));
      this.status({ text: statusText, shape, fill });
      done();
    } catch (error) {
      this.handleError(error, 'Unhandled error');
      done(`Unhandled error: ${error.message}`);
    }
  }
}

module.exports = HbControlNode;
