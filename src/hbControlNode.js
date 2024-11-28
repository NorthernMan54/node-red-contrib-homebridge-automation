const hbBaseNode = require('./hbBaseNode');
const debug = require('debug')('hapNodeRed:hbControlNode');

class HbControlNode extends hbBaseNode {
  constructor(config, RED) {
    super(config, RED);
  }

  async handleInput(message, send) {
    debug('handleInput', message.payload, this.name);

    if (!this.hbDevice) {
      this.handleError('HB not initialized');
      return;
    }

    const isCamera = this.hbDevice.type === 'CameraRTPStreamManagement';
    const payloadType = typeof message.payload;

    // Validate payload
    if (!isCamera && payloadType !== 'object') {
      const validNames = Object.keys(this.hbDevice.values)
        .filter(key => key !== 'ConfiguredName')
        .join(', ');

      this.error(
        `Invalid payload. Expected JSON object, e.g., {"On":false, "Brightness":0}. Valid values: ${validNames}`
      );
      this.status({ text: 'Invalid payload', shape: 'dot', fill: 'red' });
      return;
    }

    const results = [];
    let fill = 'green';

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
        for (const key of Object.keys(message.payload)) {
          try {
            const result = await this.hbDevice.setCharacteristicByType(key, message.payload[key]);
            results.push({ [result.type]: result.value });
          } catch (error) {
            this.error(`Failed to set value for "${key}": ${error.message}`);
            results.push({ [key]: `Error: ${error.message}` });
            fill = 'red';
          }
        }
      }

      // Update status
      const statusText = this.statusText(JSON.stringify(Object.assign({}, ...results)));
      this.status({ text: statusText, shape: 'dot', fill });
    } catch (error) {
      this.error(`Unhandled error: ${error.message}`);
      this.status({ text: 'Unhandled error', shape: 'dot', fill: 'red' });
    }
  }
}

function btoa(str) {
  return Buffer.isBuffer(str) ? str.toString('base64') : Buffer.from(str.toString(), 'binary').toString('base64');
}

module.exports = HbControlNode;
