const { HapClient } = require('@homebridge/hap-client');
const debug = require('debug')('hapNodeRed:hbConfigNode');
const { Log } = require('./lib/logger.js');
const Queue = require('better-queue');

class HBConfigNode {
  constructor(config, RED) {
    if (!config.jest) {
      RED.nodes.createNode(this, config);

      // Initialize properties
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
      this.discoveryTimeout = null;

      // Initialize queue
      this.reqisterQueue = new Queue(this._register.bind(this), {
        concurrent: 1,
        autoResume: false,
        maxRetries: 1000,
        retryDelay: 30000,
        batchDelay: 2000,
        batchSize: 150,
      });
      this.reqisterQueue.pause();

      // Initialize HAP client
      this.hapClient = new HapClient({
        config: { debug: true },
        pin: config.username,
        logger: this.log,
      });

      this.hapClient.on('instance-discovered', this.waitForNoMoreDiscoveries);
      this.waitForNoMoreDiscoveries();
      this.on('close', this.close.bind(this));
    }
  }

  waitForNoMoreDiscoveries = () => {
    if (!this.discoveryTimeout) {
      clearTimeout(this.discoveryTimeout);
      this.discoveryTimeout = setTimeout(() => {
        this.log.debug('No more instances discovered, publishing services');
        this.hapClient.removeListener('instance-discovered', this.waitForNoMoreDiscoveries);
        this.hapClient.on('instance-discovered', async (instance) => { debug('instance-discovered', instance); await this.monitorDevices(); });
        this.hapClient.on('discovery-ended', async () => { debug('discovery-ended'); });
        this.handleReady();
        this.discoveryTimeout = null;
      }, 5000);
    }
  };

  async handleReady() {
    this.hbDevices = await this.hapClient.getAllServices();
    this.evDevices = this.toList({ perms: 'ev' });
    this.ctDevices = this.toList({ perms: 'pw' });
    this.log.info(`Devices initialized: evDevices: ${this.evDevices.length}, ctDevices: ${this.ctDevices.length}`);
    this.handleDuplicates(this.evDevices);
    debug('Queue stats:', this.reqisterQueue.getStats());
    this.reqisterQueue.resume();
  }

  toList(perms) {
    const supportedTypes = [
      'Battery', 'Carbon Dioxide Sensor', 'Carbon Monoxide Sensor', 'Camera Rtp Stream Management', 'Doorbell',
      'Fan', 'Fanv2', 'Garage Door Opener', 'Humidity Sensor', 'Input Source',
      'Leak Sensor', 'Lightbulb', 'Lock Mechanism', 'Motion Sensor', 'Occupancy Sensor',
      'Outlet', 'Smoke Sensor', 'Speaker', 'Stateless Programmable Switch', 'Switch',
      'Television', 'Temperature Sensor', 'Thermostat', 'Contact Sensor',
    ];

    return filterUnique(this.hbDevices)
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

    list.forEach(endpoint => {
      if (!seenFullNames.add(endpoint.fullName)) {
        console.warn('WARNING: Duplicate device name', endpoint.fullName);
      }

      if (!seenUniqueIds.add(endpoint.uniqueId)) {
        console.error('ERROR: Duplicate uniqueId detected.', endpoint.fullName);
      }
    });
  }

  register(clientNode) {
    debug('Register: %s type: %s', clientNode.type, clientNode.name);
    this.clientNodes[clientNode.id] = clientNode;
    this.reqisterQueue.push(clientNode);
    clientNode.status({ fill: 'yellow', shape: 'ring', text: 'connecting' });
  }

  async _register(clientNodes, cb) {
    for (const clientNode of clientNodes) {
      debug('_Register: %s type: %s', clientNode.type, clientNode.name, clientNode.instance);
      const matchedDevice = this.hbDevices.find(service =>
        clientNode.device === `${service.instance.name}${service.instance.username}${service.accessoryInformation.Manufacturer}${service.serviceName}${service.uuid.slice(0, 8)}`
      );

      if (matchedDevice) {
        clientNode.hbDevice = matchedDevice;
        clientNode.status({ fill: 'green', shape: 'dot', text: 'connected' });
        clientNode.emit('hbReady', matchedDevice);
        debug('_Registered: %s type: %s', matchedDevice.type, matchedDevice.serviceName, matchedDevice.instance);
        if (clientNode.config.type === 'hb-status' || clientNode.config.type === 'hb-event') {
          this.monitorNodes[clientNode.device] = matchedDevice;
        }
      } else {
        console.error('ERROR: Device registration failed', clientNode.name);
      }
    }

    await this.monitorDevices();

    cb(null);
  }

  async monitorDevices() {
    debug('monitorDevices', Object.keys(this.monitorNodes).length);
    if (Object.keys(this.monitorNodes).length) {
      this.monitor = await this.hapClient.monitorCharacteristics(Object.values(this.monitorNodes));
      this.monitor.on('service-update', (services) => {
        services.forEach(service => {
          const eventNodes = Object.values(this.clientNodes).filter(clientNode =>
            clientNode.config.device === `${service.instance.name}${service.instance.username}${service.accessoryInformation.Manufacturer}${service.serviceName}${service.uuid.slice(0, 8)}`
          );
          eventNodes.forEach(eventNode => eventNode.emit('hbEvent', service));
        });
      });
      this.monitor.on('monitor-close', (hadError) => {
        debug('monitor-close', hadError)
        if (!this.hapClient.this.discoveryInProgress) {
          this.monitor.finish();
          this.hapClient.resetInstancePool();
        }
      })
    }
  }
  close() {
    debug('hb-config: close');
    this.hapClient?.destroy();
  }
}


// Filter unique devices by AID, service name, username, and port
const filterUnique = (data) => {
  const seen = new Set();
  return data.filter(item => {
    const uniqueKey = `${item.aid}-${item.serviceName}-${item.instance.username}-${item.instance.port}`;
    if (seen.has(uniqueKey)) return false;
    seen.add(uniqueKey);
    return true;
  });
};

module.exports = HBConfigNode;
