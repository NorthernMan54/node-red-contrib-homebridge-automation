const HAPNodeJSClient = require('hap-node-client').HAPNodeJSClient;
const debug = require('debug')('hapNodeRed:hbConfigNode');
const { Homebridges } = require('./lib/Homebridges.js');

class HBConfNode {
  constructor(nodeConfig, RED) {
    this.RED = RED;
    this.username = nodeConfig.username;
    this.macAddress = nodeConfig.macAddress || '';
    this.password = nodeConfig.credentials.password;
    this.users = {};
    this.homebridge = null;

    this.initHomebridge(nodeConfig);
  }

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
      this.homebridge.on('Ready', this.handleReady.bind(this));
    }
  }

  handleReady(accessories) {
    const hbDevices = new Homebridges(accessories);
    debug('Discovered %s new evDevices', hbDevices.toList({ perms: 'ev' }).length);

    const list = hbDevices.toList({ perms: 'ev' });
    this.handleDuplicates(list);
  }

  handleDuplicates(list) {
    const deleteSeen = new Set();

    for (const endpoint of list) {
      if (deleteSeen.has(endpoint.fullName)) {
        console.warn('WARNING: Duplicate device name', endpoint.fullName);
      } else {
        deleteSeen.add(endpoint.fullName);
      }
    }

    deleteSeen.clear();

    for (const endpoint of list) {
      if (deleteSeen.has(endpoint.uniqueId)) {
        console.error('ERROR: Parsing failed, duplicate uniqueID.', endpoint.fullName);
      } else {
        deleteSeen.add(endpoint.uniqueId);
      }
    }
  }

  register(deviceNode, callback) {
    debug('hbConf.register', deviceNode.fullName);
    this.users[deviceNode.id] = deviceNode;
    debug('Register %s -> %s', deviceNode.type, deviceNode.fullName);
    reqisterQueue.push(
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

  close() {
    if (this.client && this.client.connected) {
      this.client.end();
    }
  }
}

module.exports = HBConfNode;
