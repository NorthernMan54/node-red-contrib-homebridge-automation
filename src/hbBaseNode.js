const debug = require('debug')('hapNodeRed:hbBaseNode');

class HbBaseNode {
  constructor(config, RED) {
    debug("Constructor:", config);
    RED.nodes.createNode(this, config);

    if (!config.conf) {
      this.error(`Warning: ${config.type} @ (${config.x}, ${config.y}) not connected to a HB Configuration Node`);
    }

    this.config = config;
    this.hbConfigNode = RED.nodes.getNode(config.conf);
    this.confId = config.conf;
    this.device = config.device;
    this.service = config.Service;
    this.name = config.name;
    this.fullName = `${config.name} - ${config.Service}`;
    this.hbDevice = null;

    this.hbConfigNode?.register(this);

    if (this.handleInput) {
      this.on('input', this.handleInput.bind(this));
    }
    if (this.handleHbReady) {
      this.on('hbReady', this.handleHbReady.bind(this))
    }
    this.on('close', this.handleClose.bind(this));
    this.on('hbEvent', this.handleHBEventMessage.bind(this));
  }

  handleHBEventMessage(service) {
    debug('hbEvent for', this.id, service.serviceName, service.values);

    this.status({
      text: JSON.stringify(service.values),
      shape: 'dot',
      fill: 'green',
    });
    this.send({ payload: service.values });
  }

  createMessage(service) {
    return {
      name: this.name,
      payload: service.values,
      Homebridge: service.instance.name,
      Manufacturer: service.accessoryInformation.Manufacturer,
      Service: service.type,
      _device: this.device,
      _confId: this.confId,
    };
  }

  handleClose(removed, done) {
    debug('close', this.name);
    done();
  }

  /**
   * 
   * @param {*} warning - Message to log and display in debug panel
   * @param {*} statusText - Message to display under Node ( If not present, uses warning message text)
   */
  handleError(warning, statusText) {
    this.warn(warning);
    this.status({
      text: (statusText ? statusText : warning),
      shape: 'ring',
      fill: 'red',
    });
  }

}

module.exports = HbBaseNode;
