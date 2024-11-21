const hbBaseNode = require('./hbBaseNode');
const HAPNodeJSClient = require('hap-node-client').HAPNodeJSClient;
const debug = require('debug')('hapNodeRed:hbConfigNode');
const { Homebridges } = require('./lib/Homebridges.js');
var Queue = require('better-queue');

class HBConfNode extends hbBaseNode {
  constructor(nodeConfig, RED) {
    super(nodeConfig, RED); // Initialize base class

    this.username = nodeConfig.username;
    this.macAddress = nodeConfig.macAddress || '';
    // this.password = nodeConfig.credentials.password;
    this.users = {};
    this.homebridge = null;

    this.reqisterQueue = new Queue(function (node, cb) {
      this._register.call(node.that, node, cb);
    }, {
      concurrent: 1,
      autoResume: false,
      maxRetries: 1000,
      retryDelay: 30000
    });
    this.reqisterQueue.pause();

    this.initHomebridge(nodeConfig);
  }

  // Initialize the Homebridge client
  initHomebridge(nodeConfig) {
    if (this.homebridge) {
      if (this.macAddress) {
        // Register additional PIN on existing instance
        this.homebridge.RegisterPin(this.macAddress, nodeConfig.username);
      }
    } else {
      this.homebridge = new HAPNodeJSClient({
        pin: nodeConfig.username,
        refresh: 900,
        debug: false,
        timeout: 20,
        reqTimeout: 7000,
      });

      // Handle 'Ready' event
      this.homebridge.on('Ready', this.handleReady.bind(this));
    }
  }

  // Handle Homebridge 'Ready' event
  handleReady(accessories) {
    const hbDevices = new Homebridges(accessories);
    debug('Discovered %s new evDevices', hbDevices.toList({ perms: 'ev' }).length);

    const list = hbDevices.toList({ perms: 'ev' });
    this.handleDuplicates(list);
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
    debug('hbConf.register', deviceNode.fullName);
    this.users[deviceNode.id] = deviceNode;
    debug('Register %s -> %s', deviceNode.type, deviceNode.fullName);

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

module.exports = HBConfNode;
