class HbGlobalNode {
  constructor(config, RED, { needsMonitor = false } = {}) {
    RED.nodes.createNode(this, config);

    this.config = config;
    this.name = config.name;
    this.needsMonitor = needsMonitor;
    this.hbConfigNode = RED.nodes.getNode(config.conf);

    if (!this.hbConfigNode) {
      this.error(`${config.type} @ (${config.x}, ${config.y}) not connected to a HB Configuration Node`);
      return;
    }

    this.status({ fill: 'yellow', shape: 'ring', text: 'connecting' });
    this.hbConfigNode.registerGlobalEventNode(this);

    this.on('hbReady', () => {
      this.status({ fill: 'green', shape: 'dot', text: this.readyText || 'ready' });
    });
    this.on('hbDisconnected', () => {
      this.status({ fill: 'red', shape: 'ring', text: 'disconnected' });
    });
    this.on('close', (removed, done) => {
      if (this.hbConfigNode && typeof this.hbConfigNode.unregisterGlobalEventNode === 'function') {
        this.hbConfigNode.unregisterGlobalEventNode(this);
      }
      done();
    });
  }
}

module.exports = HbGlobalNode;
