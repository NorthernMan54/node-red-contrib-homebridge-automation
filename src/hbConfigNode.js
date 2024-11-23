const hbBaseNode = require('./hbBaseNode');
const HAPNodeJSClient = require('hap-node-client').HAPNodeJSClient;
const debug = require('debug')('hapNodeRed:hbConfigNode');
const { Homebridges } = require('./lib/Homebridges.js');
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

    this.reqisterQueue = new Queue(function (node, cb) {
      this._register.call(node.that, node, cb);
    }, {
      concurrent: 1,
      autoResume: false,
      maxRetries: 1000,
      retryDelay: 30000
    });
    this.reqisterQueue.pause();

    this.initHomebridge(config);
  }

  // Initialize the Homebridge client
  initHomebridge(config) {
    if (this.homebridge) {
      if (this.macAddress) {
        // Register additional PIN on existing instance
        this.homebridge.RegisterPin(this.macAddress, config.username);
      }
    } else {
      this.homebridge = new HAPNodeJSClient({
        pin: config.username,
        refresh: 900,
        debug: false,
        timeout: 5,
        reqTimeout: 7000,
      });

      // Handle 'Ready' event
      this.homebridge.on('Ready', this.handleReady.bind(this));
    }
  }

  // Handle Homebridge 'Ready' event
  handleReady(accessories) {
    this.hbDevices = new Homebridges(accessories);
    debug('Discovered %s new evDevices', this.hbDevices.toList({ perms: 'ev' }).length);

    this.evDevices = this.hbDevices.toList({ perms: 'ev' });
    this.ctDevices = this.hbDevices.toList({ perms: 'pw' });
    this.handleDuplicates(this.evDevices);
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
