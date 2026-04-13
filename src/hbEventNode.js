const HbBaseNode = require('./hbBaseNode');
const debug = require('debug')('hapNodeRed:hbEventNode');

class HbEventNode extends HbBaseNode {
  constructor(config, RED) {
    super(config, RED);
    this.sendInitialState = config.sendInitialState === true;
  }

  handleHbReady(service) {
    debug('handleHbReady', this.id, this.name, service.values)
    if (this.sendInitialState && !this._initialStateSent) {
      this._initialStateSent = true;
      this.status({
        text: this.statusText(JSON.stringify(service.values)),
        shape: 'dot',
        fill: 'green',
      });
      this.send({ ...this.createMessage(service) });
    }
  }

  handleHbDisconnected() {
    this._initialStateSent = false;
  }

  handleHBEventMessage(service) {
    debug('hbEvent for', this.id, this.type, service.serviceName, JSON.stringify(service.values));

    this.status({
      text: this.statusText(JSON.stringify(service.values)),
      shape: 'dot',
      fill: 'green',
    });
    this.send({ ...this.createMessage(service) });
  }
}

module.exports = HbEventNode;
