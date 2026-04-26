const HbBaseNode = require('./hbBaseNode');
const debug = require('debug')('hapNodeRed:hbStatusNode');

class HbStatusNode extends HbBaseNode {
  constructor(config, RED) {
    super(config, RED);
  }

  async handleInput(message, send, done) {
    debug('handleInput', message.payload, this.name);

    if (!this.hbDevice) {
      this.handleWarning('HB not initialized');
      done('HB not initialized');
      return;
    }

    try {
      const result = await this.hbDevice.refreshCharacteristics();
      if (result) {
        this.status({
          text: this.statusText(JSON.stringify(result.values)),
          shape: 'dot',
          fill: 'green'
        });

        send(Object.assign(message, this.createMessage(result)));
        done();
      } else {
        this.handleError(`No response from device ${this.name}`, 'no response');
        done(`No response from device ${this.name}`);
      }
    } catch (error) {
      this.handleError(error.message, 'error');
      done(error.message);
    }

  }

  /* #195 - Removed - see event node
  handleHBEventMessage(service) {
    debug('hbEvent for', this.id, this.type, service.serviceName, JSON.stringify(service.values));

    this.status({
      text: JSON.stringify(service.values),
      shape: 'dot',
      fill: 'green',
    });
    this.send({ payload: service.values });
  }
  */
}

module.exports = HbStatusNode;
