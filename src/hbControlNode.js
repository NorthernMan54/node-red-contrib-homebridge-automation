const hbBaseNode = require('./hbBaseNode');
const debug = require('debug')('hapNodeRed:hbControlNode');

class HbControlNode extends hbBaseNode {
  constructor(config, RED) {
    super(config, RED);
  }

  async handleInput(message, send, done) {
    debug('handleInput', this.name, JSON.stringify(message.payload));

    if (!this.hbDevice) {
      this.handleWarning('HB not initialized');
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
        try {
          const result = await this.hbDevice.setCharacteristicsByTypes(filterIfOff(message.payload));
          results.push(result.values);
        } catch (error) {
          console.log(error)
          this.error(`Failed to set value for "${JSON.stringify(message.payload)}": ${error.message}`);
          results.push({ 'Error': `Error: ${error.message}` });
          fill = 'red';
          this.hbConfigNode.disconnectClientNodes(this.hbDevice.instance);
        }

        /*
        for (const key of Object.keys(message.payload)) {
          try {
            debug('Setting value for', key, message.payload[key]);
            const result = await this.hbDevice.setCharacteristicByType(key, message.payload[key]);
            results.push({ [result.type]: result.value });
          } catch (error) {
            console.log(error)
            this.error(`Failed to set value for "${key}": ${error.message}`);
            results.push({ [key]: `Error: ${error.message}` });
            fill = 'red';
            this.hbConfigNode.disconnectClientNodes(this.hbDevice.instance);
          }
           
        } */
      }

      // Update status
      const statusText = this.statusText(JSON.stringify(Object.assign({}, ...results)));
      this.status({ text: statusText, shape: 'dot', fill });
      done
    } catch (error) {
      this.handleError(error, 'Unhandled error');
      done(`Unhandled error: ${error.message}`);
    }
  }
}

function filterIfOff(payload) {
  if (payload.On === 0 || payload.On === false) {
    return { On: payload.On }; // Only keep "On"
  }
  return payload; // Pass as is
}

module.exports = HbControlNode;
