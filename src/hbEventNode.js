const hbBaseNode = require('./hbBaseNode');
const debug = require('debug')('hapNodeRed:hbEventNode');

class HbEventNode extends hbBaseNode {
  constructor(config, RED) {
    super(config, RED);
    this.sendInitialState = config.sendInitialState === true;
    this.on('hbReady', this.handleHbReady.bind(this))
  }

  handleHbReady(service) {
    debug('handleHbReady', this.id, this.name, service.values)
    if (this.sendInitialState) {
      this.status({
        text: JSON.stringify(service.values),
        shape: 'dot',
        fill: 'green',
      });
      this.send({ ...this.createMessage(service) });
    }
  }
}

module.exports = HbEventNode;
