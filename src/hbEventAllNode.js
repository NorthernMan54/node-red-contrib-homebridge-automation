const HbGlobalNode = require('./hbGlobalNode');
const debug = require('debug')('hapNodeRed:hbEventAllNode');

class HbEventAllNode extends HbGlobalNode {
  constructor(config, RED) {
    super(config, RED, { needsMonitor: true });
    this.readyText = 'listening';

    // Optional comma-separated list of service humanTypes to allow through
    // (e.g. "Motion Sensor, Lightbulb"). Empty = pass everything.
    this.serviceFilter = (config.serviceFilter || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    this.on('hbEventAll', this.handleHbEventAll.bind(this));
  }

  handleHbEventAll(service) {
    if (this.serviceFilter.length && !this.serviceFilter.includes(service.humanType)) {
      return;
    }
    debug('hbEventAll', service.friendlyName, service.humanType, JSON.stringify(service.values));
    this.send({
      name: service.friendlyName,
      payload: service.values,
      Homebridge: service.instance.name,
      Manufacturer: service.accessoryInformation.Manufacturer,
      Service: service.humanType,
      _device: service.uniqueId,
      _ts: Date.now(),
    });
  }
}

module.exports = HbEventAllNode;
