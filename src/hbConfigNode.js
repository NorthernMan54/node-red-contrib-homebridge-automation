const hbBaseNode = require('./hbBaseNode.js');
// const HAPNodeJSClient = require('hap-node-client').HAPNodeJSClient;
const { HapClient } = require('@homebridge/hap-client');
const debug = require('debug')('hapNodeRed:hbConfigNode');
const { Homebridges } = require('./lib/Homebridges.js');
const { Log } = require('./lib/logger.js');
var Queue = require('better-queue');
const { manualSync } = require('rimraf');

class HBConfigNode {
  constructor(config, RED) {
    if (!config.jest) {
      RED.nodes.createNode(this, config);
      this.username = config.username;
      this.macAddress = config.macAddress || '';
      this.password = this.password;
      this.on('close', function () {
        this.hbConf.close(); // Close any open connections
      });

      // console.log('HBConfNode', config);
      this.username = config.username;
      this.macAddress = config.macAddress || '';
      // this.password = config.credentials.password;
      this.users = {};
      this.homebridge = null;
      this.evDevices = [];
      this.ctDevices = [];
      this.hbDevices = [];

      this.clientNodes = []; // An array of client nodes attached

      this.log = new Log(console, true);

      this.reqisterQueue = new Queue((clientNode, cb) => {
        // debug('Queue execute', clientNode);
        this._register(clientNode, cb);
      }, {
        concurrent: 1,
        autoResume: false,
        maxRetries: 1000,
        retryDelay: 30000,
        batchDelay: 2000,
        batchSize: 150
      });
      this.reqisterQueue.pause();

      this.hapClient = new HapClient({
        config: { debug: false },
        pin: config.username,
        logger: this.log,
      });

      this.waitForNoMoreDiscoveries();
      this.hapClient.on('instance-discovered', () => this.waitForNoMoreDiscoveries);
    }
  }

  waitForNoMoreDiscoveries = () => {
    // Clear any existing timeout
    if (this.discoveryTimeout) {
      clearTimeout(this.discoveryTimeout);
    }

    // Set up the timeout
    this.discoveryTimeout = setTimeout(() => {
      this.log.debug('No more instances discovered, publishing services');
      this.hapClient.removeListener('instance-discovered', this.waitForNoMoreDiscoveries);
      // debug('waitfornomore', this);
      this.handleReady();
      // this.requestSync();
      // this.hapClient.on('instance-discovered', this.requestSync.bind(this));  // Request sync on new instance discovery
    }, 5000);
  };

  // Handle Homebridge 'Ready' event
  async handleReady(accessories) {
    this.hbDevices = await this.hapClient.getAllServices(accessories);
    // debug('handleReady', JSON.stringify(this.hbDevices, null, 2));
    debug('Discovered %s new evDevices', this.toList({ perms: 'ev' }).length);

    this.evDevices = this.toList({ perms: 'ev' });
    this.ctDevices = this.toList({ perms: 'pw' });
    this.handleDuplicates(this.evDevices);
    debug('Queue', this.reqisterQueue.getStats());
    this.reqisterQueue.resume();
  }



  toList(perms) {

    function supportedServiceType(service) {
      switch (service.humanType) {
        case 'Battery':
        case 'Carbon Dioxide Sensor':
        case 'Carbon Monoxide Sensor':
        case 'Doorbell':
        case 'Fan':
        case 'Fanv2':
        case 'Garage Door Opener':
        case 'Humidity Sensor':
        case 'Input Source':
        case 'Leak Sensor':
        case 'Lightbulb':
        case 'Lock Mechanism':
        case 'Motion Sensor':
        case 'Occupancy Sensor':
        case 'Outlet':
        case 'Smoke Sensor':
        case 'Speaker':
        case 'Stateless Programmable Switch':
        case 'Switch':
        case 'Switch':
        case 'Television':
        case 'Temperature Sensor':
        case 'Thermostat':
        case 'Contact Sensor':
          return true;
        case 'Camera Operating Mode':
        case 'Camera Rtp Stream Management':
        case 'Protocol Information':

          return false;
        default:
          debug('Unsupport HomeKit Service Type \'%s\':', service.humanType);
      }
    }

    // debug('toList', this.hbDevices);
    return this.hbDevices.filter(service => supportedServiceType(service)).map(service => ({
      name: `${service.serviceName}`,
      fullName: `${service.serviceName} - ${service.type}`,
      sortName: `${service.serviceName}:${service.type}`,
      uniqueId: `${service.instance.name}${service.instance.username}${service.accessoryInformation.Manufacturer}${service.serviceName}${service.uuid.slice(0, 8)}`, homebridge: `${service.instance.name}`,
      service: `${service.type}`,
      manufacturer: `${service.accessoryInformation.Manufacturer}`
    })).sort((a, b) => (a.sortName > b.sortName) ? 1 : ((b.sortName > a.sortName) ? -1 : 0));;
  }
  /**
  * Start processing
  */
  async start() {
    this.services = await this.loadAccessories();
    this.log.info(`Discovered ${this.services.length} accessories`);
    this.ready = true;
    await this.buildSyncResponse();
    const evServices = this.services.filter(x => this.evTypes.some(uuid => x.serviceCharacteristics.find(c => c.uuid === uuid)));
    this.log.debug(`Monitoring ${evServices.length} services for changes`);

    const monitor = await this.hapClient.monitorCharacteristics(evServices);
    monitor.on('service-update', (services) => {
      this.reportStateSubject.next(services[0].uniqueId);
    });
  }

  // Handle duplicate devices
  handleDuplicates(list) {
    const seenFullNames = new Set();
    const seenUniqueIds = new Set();

    for (const endpoint of list) {
      if (seenFullNames.has(endpoint.fullName)) {
        console.warn('WARNING: Duplicate device name', endpoint.fullName);
      } else {
        seenFullNames.add(endpoint.fullName);
      }
    }

    for (const endpoint of list) {
      if (seenUniqueIds.has(endpoint.uniqueId)) {
        console.error('ERROR: Parsing failed, duplicate uniqueID.', endpoint.fullName);
      } else {
        seenUniqueIds.add(endpoint.uniqueId);
      }
    }
  }

  // Register a device node
  register(clientNode) {
    // debug('hbConf.register', clientNode);
    debug('Register %s -> %s', clientNode.type, clientNode.name);
    this.clientNodes[clientNode.id] = clientNode;
    this.reqisterQueue.push(
      clientNode
    );
  }

  /**
   * Process batched event registration messages
   */
  async _register(clientNodes, cb) {
    // debug('_register', clientNodes);

    // debug('clientNodes', this.clientNodes);

    for (const clientNode of clientNodes) {
      debug('_Register %s -> %s', clientNode.type, clientNode.name);
      clientNode.hbDevice = this.hbDevices.find(service => {

        // console.log('clientNodeDevice', clientNode);
        // debug('Testing:', { clientNodeDevice: clientNode.device, serviceName: service });
        const testValue = `${service.instance.name}${service.instance.username}${service.accessoryInformation.Manufacturer}${service.serviceName}${service.uuid.slice(0, 8)}`;
        // debug('Testing - final:', { clientNodeDevice: clientNode.device, testValue });
        return clientNode.device === testValue;
      });
      // debug('Updated clientNode', clientNode);
      if (!clientNode.hbDevice) {
        console.log('ERROR: _register - HB Device Missing', clientNode.name);
      }
    }
    // const monitor = await this.hapClient.monitorCharacteristics(clientNodes);
    // monitor.on('service-update', (services) => {
    //   debug('service-update', services);
    // });

    cb(null);
  }

  // Deregister a device node
  deregister(deviceNode, callback) {
    deviceNode.status({
      text: 'disconnected',
      shape: 'ring',
      fill: 'red',
    });

    this.clientNodes[clientNode.id] = {};
  }

  // Clean up resources
  close() {
    if (this.client && this.client.connected) {
      this.client.end();
    }
  }
}

module.exports = HBConfigNode;
