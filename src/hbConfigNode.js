const hbBaseNode = require('./hbBaseNode');
// const HAPNodeJSClient = require('hap-node-client').HAPNodeJSClient;
const { HapClient } = require('@homebridge/hap-client');
const debug = require('debug')('hapNodeRed:hbConfigNode');
const { Homebridges } = require('./lib/Homebridges.js');
const { Log } = require('./lib/logger.js');
var Queue = require('better-queue');

class HBConfigNode {
  constructor(config, RED) {
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

    this.log = new Log(console, true);

    this.reqisterQueue = new Queue(function (node, cb) {
      this._register.call(node.that, node, cb);
    }, {
      concurrent: 1,
      autoResume: false,
      maxRetries: 1000,
      retryDelay: 30000
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

  waitForNoMoreDiscoveries = () => {
    // Clear any existing timeout
    if (this.discoveryTimeout) {
      clearTimeout(this.discoveryTimeout);
    }

    // Set up the timeout
    this.discoveryTimeout = setTimeout(() => {
      this.log.debug('No more instances discovered, publishing services');
      this.hapClient.removeListener('instance-discovered', this.waitForNoMoreDiscoveries);
      debug('waitfornomore', this);
      this.handleReady();
      // this.requestSync();
      // this.hapClient.on('instance-discovered', this.requestSync.bind(this));  // Request sync on new instance discovery
    }, 5000);
  };

  // Handle Homebridge 'Ready' event
  handleReady(accessories) {
    debug('handleReady', this);
    this.hbDevices = this.hapClient.getAllServices(accessories);
    debug('Discovered %s new evDevices', this.hbDevices.toList({ perms: 'ev' }).length);

    this.evDevices = this.hbDevices.toList({ perms: 'ev' });
    this.ctDevices = this.hbDevices.toList({ perms: 'pw' });
    this.handleDuplicates(this.evDevices);
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
  register(deviceNode, callback) {
    debug('hbConf.register', deviceNode);
    this.users[deviceNode.id] = deviceNode;
    debug('Register %s -> %s', deviceNode.type, deviceNode.name);

    this.reqisterQueue.push(
      {
        that: this,
        device: deviceNode.device,
        type: deviceNode.type,
        name: deviceNode.name,
        fullName: deviceNode.fullName,
        node: this,
      },
      callback
    );
  }

  // Deregister a device node
  deregister(deviceNode, callback) {
    deviceNode.status({
      text: 'disconnected',
      shape: 'ring',
      fill: 'red',
    });

    for (const event of deviceNode.eventName) {
      this.homebridge.removeListener(event, deviceNode.listener);
    }

    callback();
  }

  // Clean up resources
  close() {
    if (this.client && this.client.connected) {
      this.client.end();
    }
  }
}

module.exports = HBConfigNode;
