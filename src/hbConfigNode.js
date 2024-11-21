const HAPNodeJSClient = require('hap-node-client').HAPNodeJSClient;
const debug = require('debug')('hapNodeRed:hbConfigNode');

class HbConf {
  constructor(n, RED) {
    this.RED = RED;
    this.username = n.username;
    this.macAddress = n.macAddress || '';
    this.password = n.credentials.password;
    this.users = {};
    this.homebridge = null;

    this.initHomebridge(n);
  }

  initHomebridge(n) {
    if (this.homebridge) {
      if (this.macAddress) {
        // Register additional PIN on existing instance
        this.homebridge.RegisterPin(this.macAddress, n.username);
      }
    } else {
      this.homebridge = new HAPNodeJSClient({
        pin: n.username,
        refresh: 900,
        debug: false,
        timeout: 20,
        reqTimeout: 7000
      });
      this.homebridge.on('Ready', this.handleReady.bind(this));
    }
  }

  handleReady(accessories) {
    const hbDevices = new Homebridges(accessories);
    debug('Discovered %s new evDevices', hbDevices.toList({ perms: 'ev' }).length);

    let list = hbDevices.toList({ perms: 'ev' });
    this.handleDuplicates(list);
  }

  handleDuplicates(list) {
    let deleteSeen = [];

    for (let i = 0; i < list.length; i++) {
      const endpoint = list[i];
      if (deleteSeen[endpoint.fullName]) {
        console.log("WARNING: Duplicate device name", endpoint.fullName);
      } else {
        deleteSeen[endpoint.fullName] = true;
      }
    }

    deleteSeen = [];

    for (let i = 0; i < list.length; i++) {
      const endpoint = list[i];
      if (deleteSeen[endpoint.uniqueId]) {
        console.log("ERROR: Parsing failed, duplicate uniqueID.", endpoint.fullName);
      } else {
        deleteSeen[endpoint.uniqueId] = true;
      }
    }
  }

  connect(callback) {
    callback();
  }

  register(deviceNode, callback) {
    debug("hbConf.register", deviceNode.fullName);
    this.users[deviceNode.id] = deviceNode;
    debug("Register %s -> %s", deviceNode.type, deviceNode.fullName);
    reqisterQueue.push({
      that: this,
      device: deviceNode.device,
      type: deviceNode.type,
      name: deviceNode.name,
      fullName: deviceNode.fullName,
      node: this
    }, callback);
  }

  deregister(deviceNode, callback) {
    deviceNode.status({
      text: 'disconnected',
      shape: 'ring',
      fill: 'red'
    });

    deviceNode.eventName.forEach((event) => {
      this.homebridge.removeListener(event, deviceNode.listener);
    });

    callback();
  }

  close() {
    if (this.client && this.client.connected) {
      this.client.end();
    }
  }
}

module.exports = HbConf;
