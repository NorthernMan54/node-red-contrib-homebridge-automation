const hbBaseNode = require('./hbBaseNode');
const debug = require('debug')('hapNodeRed:hbEventNode');

class HbEventNode extends hbBaseNode {
  constructor(config, RED) {
    super(config, RED);
    this.sendInitialState = config.sendInitialState === true;
    this.on('hbReady', this.handleHbReady.bind(this))
  }

  handleHbReady(service) {
    this.status({
      text: JSON.stringify(service.values),
      shape: 'dot',
      fill: 'green',
    });
    this.send({ payload: service.values });
  }
  // Create a message payload for event or initial state

}

module.exports = HbEventNode;
