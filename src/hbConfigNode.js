const { HapClient } = require('@homebridge/hap-client');
const debug = require('debug')('hapNodeRed:hbConfigNode');
const { Log } = require('./lib/logger.js');
const Queue = require('better-queue');

class HBConfigNode {
  constructor(config, RED) {
    if (!config.jest) {
      RED.nodes.createNode(this, config);

      this.username = config.username;
      this.macAddress = config.macAddress || '';
      this.users = {};
      this.homebridge = null;
      this.evDevices = [];
      this.ctDevices = [];
      this.hbDevices = [];
      this.clientNodes = [];
      this.monitorNodes = [];
      this.log = new Log(console, true);

      this.reqisterQueue = new Queue(this._register.bind(this), {
        concurrent: 1,
        autoResume: false,
        maxRetries: 1000,
        retryDelay: 30000,
        batchDelay: 2000,
        batchSize: 150,
      });
      this.reqisterQueue.pause();

      this.hapClient = new HapClient({
        config: { debug: false },
        pin: config.username,
        logger: this.log,
      });

      this.waitForNoMoreDiscoveries();
      this.hapClient.on('instance-discovered', this.waitForNoMoreDiscoveries);

      this.on('close', this.close.bind(this));
    }
  }

  waitForNoMoreDiscoveries = () => {
    if (this.discoveryTimeout) {
      clearTimeout(this.discoveryTimeout);
    }

    this.discoveryTimeout = setTimeout(() => {
      this.log.debug('No more instances discovered, publishing services');
      this.hapClient.removeListener('instance-discovered', this.waitForNoMoreDiscoveries);
      this.handleReady();
    }, 5000);
  };

  async handleReady() {
    this.hbDevices = await this.hapClient.getAllServices();
    this.evDevices = this.toList({ perms: 'ev' });
    this.ctDevices = this.toList({ perms: 'pw' });
    this.handleDuplicates(this.evDevices);
    debug('Queue', this.reqisterQueue.getStats());
    this.reqisterQueue.resume();
  }

  toList(perms) {
    const supportedTypes = [
      'Battery', 'Carbon Dioxide Sensor', 'Carbon Monoxide Sensor', 'Doorbell',
      'Fan', 'Fanv2', 'Garage Door Opener', 'Humidity Sensor', 'Input Source',
      'Leak Sensor', 'Lightbulb', 'Lock Mechanism', 'Motion Sensor', 'Occupancy Sensor',
      'Outlet', 'Smoke Sensor', 'Speaker', 'Stateless Programmable Switch', 'Switch',
      'Television', 'Temperature Sensor', 'Thermostat', 'Contact Sensor',
    ];

    return this.hbDevices
      .filter(service => supportedTypes.includes(service.humanType))
      .map(service => ({
        name: service.serviceName,
        fullName: `${service.serviceName} - ${service.type}`,
        sortName: `${service.serviceName}:${service.type}`,
        uniqueId: `${service.instance.name}${service.instance.username}${service.accessoryInformation.Manufacturer}${service.serviceName}${service.uuid.slice(0, 8)}`,
        homebridge: service.instance.name,
        service: service.type,
        manufacturer: service.accessoryInformation.Manufacturer,
      }))
      .sort((a, b) => a.sortName.localeCompare(b.sortName));
  }

  handleDuplicates(list) {
    const seenFullNames = new Set();
    const seenUniqueIds = new Set();

    for (const endpoint of list) {
      if (seenFullNames.has(endpoint.fullName)) {
        console.warn('WARNING: Duplicate device name', endpoint.fullName);
      } else {
        seenFullNames.add(endpoint.fullName);
      }

      if (seenUniqueIds.has(endpoint.uniqueId)) {
        console.error('ERROR: Parsing failed, duplicate uniqueID.', endpoint.fullName);
      } else {
        seenUniqueIds.add(endpoint.uniqueId);
      }
    }
  }

  register(clientNode) {
    debug('Register %s -> %s', clientNode.type, clientNode.name);
    this.clientNodes[clientNode.id] = clientNode;
    this.reqisterQueue.push(clientNode);
    clientNode.status({ fill: 'yellow', shape: 'ring', text: 'connecting' });
  }

  async _register(clientNodes, cb) {
    for (const clientNode of clientNodes) {
      debug('_Register %s -> %s', clientNode.type, clientNode.name);
      clientNode.hbDevice = this.hbDevices.find(service => {
        const deviceUnique = `${service.instance.name}${service.instance.username}${service.accessoryInformation.Manufacturer}${service.serviceName}${service.uuid.slice(0, 8)}`;
        clientNode.status({ fill: 'green', shape: 'dot', text: 'connected' });
        return clientNode.device === deviceUnique;
      });

      if (clientNode.config.type === 'hb-status') {
        this.monitorNodes[clientNode.device] = clientNode.hbDevice;
      }

      if (!clientNode.hbDevice) {
        console.error('ERROR: _register - HB Device Missing', clientNode.name);
      }
    }

    if (Object.keys(this.monitorNodes).length) {
      this.monitor = await this.hapClient.monitorCharacteristics(Object.values(this.monitorNodes));
      this.monitor.on('service-update', (services) => {
        for (const service of services) {
          const eventNodes = Object.values(this.clientNodes).filter(
            clientNode =>
              clientNode.config.device === `${service.instance.name}${service.instance.username}${service.accessoryInformation.Manufacturer}${service.serviceName}${service.uuid.slice(0, 8)}`
          );

          eventNodes.forEach((eventNode) => {
            if (eventNode._events && typeof eventNode.emit === 'function') {
              eventNode.emit('event', service);
            }
          });
        }
      });
    }
    cb(null);
  }

  deregister(clientNode) {
    clientNode.status({ text: 'disconnected', shape: 'ring', fill: 'red' });
    delete this.clientNodes[clientNode.id];
  }

  close() {
    if (this.hapClient) {
      this.hapClient.destroy();
    }
  }
}

module.exports = HBConfigNode;
