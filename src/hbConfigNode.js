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
      this.on('close', this.close.bind(this));
      this.refreshInProcess = true; // Prevents multiple refreshes, hapClient kicks of a discovery on start
    }
  }

  /**
   * Wait for no more instance discoveries to be made before publishing services
   */
  waitForNoMoreDiscoveries = (instance) => {
    if (instance)
      debug('Instance discovered: %s - %s %s:%s', instance?.name, instance?.username, instance?.ipAddress, instance?.port);
    if (!this.discoveryTimeout) {
      this.discoveryTimeout = setTimeout(() => {
        this.debug('No more instances discovered, publishing services');
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
    // Fix broken uniqueId's from HAP-Client
    updatedDevices.forEach((service) => {
      const friendlyName = (service.serviceName ? service.serviceName : service.accessoryInformation.Name);
      service.uniqueId = `${service.instance.name}${service.instance.username}${service.accessoryInformation.Manufacturer}${friendlyName}${service.uuid.slice(0, 8)}`;
    });
    updatedDevices.forEach((updatedService, index) => {
      if (this.hbDevices.find(service => service.uniqueId === updatedService.uniqueId)) {
        // debug(`Exsiting UniqueID breakdown - ${updatedService.serviceName}-${updatedService.instance.username}-${updatedService.aid}-${updatedService.iid}-${updatedService.type}`);
        const update = this.hbDevices.find(service => service.uniqueId === updatedService.uniqueId);
        update.instance = updatedService.instance;
      } else {
        // debug(`New Service UniqueID breakdown - ${updatedService.serviceName}-${updatedService.instance.username}-${updatedService.aid}-${updatedService.iid}-${updatedService.type}`);
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
      'Air Purifier', 'Air Quality Sensor', 'Battery', 'Carbon Dioxide Sensor', 'Carbon Monoxide Sensor', 'Camera Rtp Stream Management',
      'Doorbell', 'Fan', 'Fanv2', 'Garage Door Opener', 'Humidity Sensor', 'Input Source',
      'Leak Sensor', 'Lightbulb', 'Lock Mechanism', 'Motion Sensor', 'Occupancy Sensor',
      'Outlet', 'Smoke Sensor', 'Speaker', 'Stateless Programmable Switch', 'Switch',
      'Television', 'Temperature Sensor', 'Thermostat', 'Contact Sensor',
    ]);
    return filterUnique(this.hbDevices)
      .filter(service => supportedTypes.has(service.humanType))
      .map(service => ({
        name: (service.serviceName ? service.serviceName : service.accessoryInformation.Name),
        fullName: `${(service.serviceName ? service.serviceName : service.accessoryInformation.Name)} - ${service.humanType}`,
        sortName: `${(service.serviceName ? service.serviceName : service.accessoryInformation.Name)}:${service.type}`,
        uniqueId: service.uniqueId,
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
    this.waitForNoMoreDiscoveries(); // Connect new nodes created after startup has ended ( Need a function to rather than brute forcing it )
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
        debug('_Registered: %s type: %s', clientNode.type, matchedDevice.type, matchedDevice.serviceName);
      } else {
        this.error(`ERROR: Device registration failed '${clientNode.fullName}'`);
      }
    };

    await this.monitorDevices();
  }

  async monitorDevices() {
    if (Object.keys(this.clientNodes).length) {

      const monitorNodes = Object.values(this.clientNodes)
        .filter(node => ['hb-status', 'hb-event', 'hb-resume'].includes(node.type)) // Filter by type
        .map(node => node.hbDevice) // Map to hbDevice property
        .filter(Boolean); // Remove any undefined or null values, if present;
      this.log(`Connected to ${Object.keys(monitorNodes).length} Homebridge devices`);
      // console.log('monitorNodes', monitorNodes);
      if (this.monitor) {
        // This is kinda brute force, and should be refactored to only refresh the changed monitorNodes
        this.monitor.finish();
      }
      this.monitor = await this.hapClient.monitorCharacteristics(monitorNodes);
      this.monitor.on('service-update', (services) => {
        services.forEach(service => {
          const eventNodes = Object.values(this.clientNodes).filter(clientNode =>
            clientNode.config.device === `${service.instance.name}${service.instance.username}${service.accessoryInformation.Manufacturer}${service.serviceName}${service.uuid.slice(0, 8)}`
          );
          // debug('service-update', service.serviceName, eventNodes);
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
