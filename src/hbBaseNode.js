const debug = require('debug')('hapNodeRed:hbBaseNode');

const PENDING_MESSAGE_TIMEOUT = 30000; // 30 seconds

class HbBaseNode {
  constructor(config, RED) {
    debug("Constructor:", config.type, JSON.stringify(config));
    RED.nodes.createNode(this, config);

    if (!config.conf) {
      this.error(`Warning: ${config.type} @ (${config.x}, ${config.y}) not connected to a HB Configuration Node`);
      this.status({ fill: 'red', shape: 'ring', text: 'not configured' });
    }

    this.config = config;
    this.hbConfigNode = RED.nodes.getNode(config.conf);
    this.confId = config.conf;
    this.device = config.device;
    this.service = config.Service;
    this.name = config.name;
    this.fullName = `${config.name} - ${config.Service}`;
    this.hbDevice = null;
    this._disconnected = false;
    this._pendingMessages = [];

    this.hbConfigNode?.registerClientNode(this);

    if (this.handleInput) {
      this.on('input', this._onInput.bind(this));
    }
    this.on('hbReady', (service) => {
      this._disconnected = false;
      if (this.handleHbReady) {
        this.handleHbReady(service);
      }
      this._drainPendingMessages();
    });
    this.on('hbDisconnected', () => {
      this._disconnected = true;
      if (this.handleHbDisconnected) {
        this.handleHbDisconnected();
      }
    });
    this.on('close', this._onClose.bind(this));
    if (this.handleHBEventMessage) {
      this.on('hbEvent', this.handleHBEventMessage.bind(this));
    }
  }

  _onInput(message, send, done) {
    if (!this.hbDevice || this._disconnected) {
      this._queueMessage(message, send, done);
    } else {
      this.handleInput(message, send, done);
    }
  }

  _queueMessage(message, send, done) {
    const reason = this._disconnected ? 'disconnected' : 'pending';
    const timer = setTimeout(() => {
      this._pendingMessages = this._pendingMessages.filter(m => m.timer !== timer);
      this.handleWarning('HB not initialized (timeout)');
      if (done) done('HB not initialized');
    }, PENDING_MESSAGE_TIMEOUT);
    this._pendingMessages.push({ message, send, done, timer });
    debug('Queued message for %s (%d pending, %s)', this.name, this._pendingMessages.length, reason);
    this.status({ fill: 'yellow', shape: 'ring', text: `queued - ${reason} (${this._pendingMessages.length})` });
  }

  async _drainPendingMessages() {
    if (!this._pendingMessages.length) return;
    debug('Draining %d pending messages for %s', this._pendingMessages.length, this.name);
    const pending = this._pendingMessages.splice(0);
    for (const { message, send, done, timer } of pending) {
      clearTimeout(timer);
      try {
        await this.handleInput(message, send, done);
      } catch (err) {
        debug('Error processing queued message for %s: %s', this.name, err.message);
        if (done) done(err.message);
      }
    }
  }

  _onClose(removed, done) {
    this._pendingMessages.forEach(({ timer }) => clearTimeout(timer));
    this._pendingMessages = [];
    if (this.hbConfigNode) {
      this.hbConfigNode.unregisterClientNode(this);
    }
    this.handleClose(removed, done);
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

  statusText(message) {
    return message.slice(0, 32)
  }

  /**
   * 
   * @param {*} warning - Message to log and display in debug panel
   * @param {*} statusText - Message to display under Node ( If not present, uses warning message text)
   */
  handleWarning(warning, statusText) {
    this.warn(warning);
    this.status({
      text: (statusText ? statusText : warning).slice(0, 32),
      shape: 'ring',
      fill: 'yellow',
    });
  }

  /**
   * 
   * @param {*} warning - Message to log and display in debug panel
   * @param {*} statusText - Message to display under Node ( If not present, uses warning message text)
   */
  handleError(error, statusText) {
    this.error(error);
    this.status({
      text: (statusText ? statusText : error).slice(0, 32),
      shape: 'ring',
      fill: 'red',
    });
  }
}

module.exports = HbBaseNode;
