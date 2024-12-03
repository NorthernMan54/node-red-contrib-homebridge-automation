const { HapClient } = require('@homebridge/hap-client');
const debug = require('debug')('hapNodeRed:hbConfigNode');

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
      //  this.log = new Log(console, true);
      this.discoveryTimeout = null;

      // Initialize HAP client
      this.hapClient = new HapClient({
        config: { debug: false },
        pin: config.username
      });

      this.hapClient.on('instance-discovered', this.waitForNoMoreDiscoveries);
      this.hapClient.on('discovery-ended', this.hapClient.refreshInstances);
      this.waitForNoMoreDiscoveries();
      this.on('close', this.close.bind(this));
      this.refreshInProcess = true; // Prevents multiple refreshes, hapClient kicks of a discovery on start
    }
  }

  /**
   * Start device discovery after monitor reports issues
   */

  refreshDevices = () => {
    if (!this.refreshInProcess) {

      this.monitor.finish();
      this.debug('Monitor reported homebridge stability issues, refreshing devices');
      this.hapClient.on('instance-discovered', this.waitForNoMoreDiscoveries);
      this.hapClient.resetInstancePool();
      this.waitForNoMoreDiscoveries();
    }
  };

  /**
   * Wait for no more instance discoveries to be made before publishing services
   */
  waitForNoMoreDiscoveries = () => {
    if (!this.discoveryTimeout) {
      clearTimeout(this.discoveryTimeout);
      this.discoveryTimeout = setTimeout(() => {
        this.debug('No more instances discovered, publishing services');
        this.hapClient.removeListener('instance-discovered', this.waitForNoMoreDiscoveries);
        this.handleReady();
        this.discoveryTimeout = null;
        this.refreshInProcess = false;
      }, 20000);  // resetInstancePool() triggers a discovery after 6 seconds.  Need to wait for it to finish.
    }
  };

  /**
   * Populate the list of devices and handle duplicates
   */
  async handleReady() {
    const updatedDevices = await this.hapClient.getAllServices();
    updatedDevices.forEach((updatedService, index) => {
      if (this.hbDevices.find(service => service.uniqueId === updatedService.uniqueId)) {
        const update = this.hbDevices.find(service => service.uniqueId === updatedService.uniqueId);
        update.instance = updatedService.instance;
      } else {
        this.hbDevices.push(updatedService);
      }
    });
    this.evDevices = this.toList({ perms: 'ev' });
    this.ctDevices = this.toList({ perms: 'pw' });
    this.log(`Devices initialized: evDevices: ${this.evDevices.length}, ctDevices: ${this.ctDevices.length}`);
    this.handleDuplicates(this.evDevices);
    this.connectClientNodes();
  }

  toList(perms) {
    const supportedTypes = new Set([
      'Battery', 'Carbon Dioxide Sensor', 'Carbon Monoxide Sensor', 'Camera Rtp Stream Management',
      'Doorbell', 'Fan', 'Fanv2', 'Garage Door Opener', 'Humidity Sensor', 'Input Source',
      'Leak Sensor', 'Lightbulb', 'Lock Mechanism', 'Motion Sensor', 'Occupancy Sensor',
      'Outlet', 'Smoke Sensor', 'Speaker', 'Stateless Programmable Switch', 'Switch',
      'Television', 'Temperature Sensor', 'Thermostat', 'Contact Sensor',
    ]);
    return filterUnique(this.hbDevices)
      .filter(service => supportedTypes.has(service.humanType))
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
    const seen = new Map();

    list.forEach(endpoint => {
      const { fullName, uniqueId } = endpoint;

      if (seen.has(fullName)) {
        this.warn(`Duplicate device name detected: ${fullName}`);
      }
      if (seen.has(uniqueId)) {
        this.error(`Duplicate uniqueId detected: ${uniqueId}`);
      }

      seen.set(fullName, true);
      seen.set(uniqueId, true);
    });
  }

  registerClientNode(clientNode) {
    debug('Register: %s type: %s', clientNode.type, clientNode.name);
    this.clientNodes[clientNode.id] = clientNode;
    clientNode.status({ fill: 'yellow', shape: 'ring', text: 'connecting' });
  }

  async connectClientNodes() {
    debug('connect %s nodes', Object.keys(this.clientNodes).length);
    for (const [key, clientNode] of Object.entries(this.clientNodes)) {
      // debug('_Register: %s type: %s', clientNode.type, clientNode.name, clientNode.instance);
      const matchedDevice = this.hbDevices.find(service =>
        clientNode.device === `${service.instance.name}${service.instance.username}${service.accessoryInformation.Manufacturer}${service.serviceName}${service.uuid.slice(0, 8)}`
      );

      if (matchedDevice) {
        clientNode.hbDevice = matchedDevice;
        clientNode.status({ fill: 'green', shape: 'dot', text: 'connected' });
        clientNode.emit('hbReady', matchedDevice);
        debug('_Registered: %s type: %s', matchedDevice.type, matchedDevice.serviceName, matchedDevice.instance);
      } else {
        this.error(`ERROR: Device registration failed ${clientNode.name}`);
      }
    };

    await this.monitorDevices();
  }

  async monitorDevices() {
    if (Object.keys(this.clientNodes).length) {
      const uniqueDevices = new Set();

      const monitorNodes = Object.values(this.clientNodes)
        .filter(node => ['hb-status', 'hb-control', 'hb-event', 'hb-resume'].includes(node.type)) // Filter by type
        .filter(node => {
          if (uniqueDevices.has(node.device)) {
            return false; // Exclude duplicates
          }
          uniqueDevices.add(node.device);
          return true; // Include unique devices
        })
        .map(node => node.hbDevice) // Map to hbDevice property
        .filter(Boolean); // Remove any undefined or null values, if present;
      debug('monitorNodes', Object.keys(monitorNodes).length);
      // console.log('monitorNodes', monitorNodes);
      this.monitor = await this.hapClient.monitorCharacteristics(monitorNodes);
      this.monitor.on('service-update', (services) => {
        services.forEach(service => {
          const eventNodes = Object.values(this.clientNodes).filter(clientNode =>
            clientNode.config.device === `${service.instance.name}${service.instance.username}${service.accessoryInformation.Manufacturer}${service.serviceName}${service.uuid.slice(0, 8)}`
          );
          eventNodes.forEach(eventNode => eventNode.emit('hbEvent', service));
        });
      });
      this.monitor.on('monitor-close', (instance, hadError) => {
        debug('monitor-close', instance.name, instance.ipAddress, instance.port, hadError)
        this.disconnectClientNodes(instance);
        // this.refreshDevices();
      })
      this.monitor.on('monitor-refresh', (instance, hadError) => {
        debug('monitor-refresh', instance.name, instance.ipAddress, instance.port, hadError)
        this.reconnectClientNodes(instance);
        // this.refreshDevices();
      })
      this.monitor.on('monitor-error', (instance, hadError) => {
        debug('monitor-error', instance, hadError)
      })
    }
  }

  disconnectClientNodes(instance) {
    debug('disconnectClientNodes', `${instance.ipAddress}:${instance.port}`);
    const clientNodes = Object.values(this.clientNodes).filter(clientNode => {
      return `${clientNode.hbDevice?.instance.ipAddress}:${clientNode.hbDevice?.instance.port}` === `${instance.ipAddress}:${instance.port}`;
    });

    clientNodes.forEach(clientNode => {
      clientNode.status({ fill: 'red', shape: 'ring', text: 'disconnected' });
      clientNode.emit('hbDisconnected', instance);
    });
  }

  reconnectClientNodes(instance) {
    debug('reconnectClientNodes', `${instance.ipAddress}:${instance.port}`);
    const clientNodes = Object.values(this.clientNodes).filter(clientNode => {
      return `${clientNode.hbDevice?.instance.ipAddress}:${clientNode.hbDevice?.instance.port}` === `${instance.ipAddress}:${instance.port}`;
    });

    clientNodes.forEach(clientNode => {
      clientNode.status({ fill: 'green', shape: 'dot', text: 'connected' });
      clientNode.emit('hbReady', clientNode.hbDevice);
    });
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
    const uniqueKey = `${item.aid}-${item.serviceName}-${item.humanType}-${item.instance.username}-${item.instance.port}`;
    if (seen.has(uniqueKey)) return false;
    seen.add(uniqueKey);
    return true;
  });
};

module.exports = HBConfigNode;
