const { HapClient } = require('@homebridge/hap-client');
const debug = require('debug')('hapNodeRed:hbConfigNode');
const fs = require('fs');
const path = require('path');
const process = require('process');

// Module-level persisted state: keyed by config node ID, survives config-node restarts
// during redeploy. The HapClient is kept alive so mDNS discovery doesn't restart.
const _persistedClients = new Map();

// Clean up humanType strings from hap-client for display
const HUMAN_TYPE_DISPLAY = {
  'Camera Rtp Stream Management': 'Camera',
  'Fanv2': 'Fan v2',
};

// Canonical device name — accessoryInformation.Name if set, otherwise serviceName
function getFriendlyName(service) {
  return service.accessoryInformation.Name || service.serviceName;
}

// Canonical device identifier — must be the single source of truth for matching
function getDeviceIdentifier(service) {
  return `${service.instance.name}${service.instance.username}${service.accessoryInformation.Manufacturer}${getFriendlyName(service)}${service.uuid.slice(0, 8)}`;
}

class HBConfigNode {
  constructor(config, RED) {
    RED.nodes.createNode(this, config);

    // Initialize properties
    this.username = config.username;
    this.macAddress = config.macAddress || '';
    this.debugLogging = config.debug || false;
    this.hapClientDebug = config.hapClientDebug || false;
    this.instanceBlacklist = config.instanceBlacklist
      ? config.instanceBlacklist.split(',').map(s => s.trim()).filter(s => s)
      : [];
    this.users = {};
    this.homebridge = null;
    this.evDevices = [];
    this.ctDevices = [];
    this.hbDevices = [];
    this.clientNodes = {};
    //  this.log = new Log(console, true);
    this.discoveryTimeout = null;
    this._monitorRefreshTimeout = null;
    this._recreatingMonitor = false;

    const persisted = this.id ? _persistedClients.get(this.id) : null;
    const configKey = `${config.username}|${String(this.hapClientDebug)}|${this.instanceBlacklist.join(',')}`;

    if (persisted && persisted.configKey === configKey) {
      // Reuse existing HapClient from previous deploy — avoids 20-second rediscovery
      this.hapClient = persisted.hapClient;
      this.hbDevices = persisted.hbDevices;
      this.evDevices = persisted.evDevices;
      this.ctDevices = persisted.ctDevices;
      persisted.currentNode = this;
      this.refreshInProcess = false;
      debug('Reusing persisted HapClient with %d devices for config node %s', this.hbDevices.length, this.id);
    } else {
      // First startup or config changed — create new HapClient
      if (persisted) {
        persisted.hapClient.destroy();
      }

      const hapClientConfig = { debug: this.hapClientDebug };
      if (this.instanceBlacklist.length > 0) {
        hapClientConfig.instanceBlacklist = this.instanceBlacklist;
      }

      this.hapClient = new HapClient({
        config: hapClientConfig,
        pin: config.username
      });
      // Stable discovery handler: always delegates to the current config node instance
      // via the persisted state lookup, so it survives config node restarts
      const nodeId = this.id;
      this.hapClient.on('instance-discovered', (instance) => {
        const state = nodeId ? _persistedClients.get(nodeId) : null;
        if (state?.currentNode) {
          state.currentNode.waitForNoMoreDiscoveries(instance);
        }
      });
      this.hapClient.on('discovery-ended', this.hapClient.refreshInstances);

      if (this.id) {
        _persistedClients.set(this.id, {
          hapClient: this.hapClient,
          configKey,
          hbDevices: this.hbDevices,
          evDevices: this.evDevices,
          ctDevices: this.ctDevices,
          currentNode: this,
        });
      }

      this.refreshInProcess = true;
    }

    if (this.on)
      this.on('close', this.close.bind(this));
  }

  /**
   * Wait for no more instance discoveries to be made before publishing services
   */
  waitForNoMoreDiscoveries = (instance) => {
    if (instance)
      debug('Instance discovered: %s - %s %s:%s', instance?.name, instance?.username, instance?.ipAddress, instance?.port);
    if (this.discoveryTimeout) {
      clearTimeout(this.discoveryTimeout);
    }
    this.discoveryTimeout = setTimeout(() => {
      this.debug('No more instances discovered, publishing services');
      this.discoveryTimeout = null;
      this.handleReady()
        .catch(err => this.error(`Error during device initialization: ${err.message}`))
        .finally(() => { this.refreshInProcess = false; });
    }, 20000);  // resetInstancePool() triggers a discovery after 6 seconds.  Need to wait for it to finish.
  };

  /**
   * Refresh the device list from Homebridge instances
   */
  async refreshDeviceList() {
    const updatedDevices = await this.hapClient.getAllServices();
    if (this.debugLogging && updatedDevices && updatedDevices.length && process.uptime() < 300) {
      try {
        const storagePath = path.join(process.cwd(), 'homebridge-automation-endpoints.json');
        this.warn(`Writing Homebridge endpoints to ${storagePath}`);
        fs.writeFileSync(storagePath, JSON.stringify(updatedDevices, null, 2));
      } catch (e) {
        this.error(`Error writing Homebridge endpoints to file: ${e.message}`);
      }
    }
    // Fix broken uniqueId's from HAP-Client
    updatedDevices.forEach((service) => {
      service.uniqueId = getDeviceIdentifier(service);
    });
    // Rebuild device list: update existing, add new, drop stale, deduplicate
    const existingMap = new Map(this.hbDevices.map(s => [s.uniqueId, s]));
    const newMap = new Map();
    updatedDevices.forEach(updatedService => {
      if (newMap.has(updatedService.uniqueId)) return; // Skip duplicates within batch
      const existing = existingMap.get(updatedService.uniqueId);
      if (existing) {
        // Preserve object reference for clientNode.hbDevice === matchedDevice checks,
        // but update all properties including method closures bound to the current HapClient
        Object.assign(existing, updatedService);
        newMap.set(updatedService.uniqueId, existing);
      } else {
        // debug(`New Service UniqueID breakdown - ${updatedService.serviceName}-${updatedService.instance.username}-${updatedService.aid}-${updatedService.iid}-${updatedService.type}`);
        newMap.set(updatedService.uniqueId, updatedService);
      }
    });
    this.hbDevices = Array.from(newMap.values());
    this.evDevices = this.toList({ perms: 'ev' });
    this.ctDevices = this.toList({ perms: 'pw' });

    // Update persisted state for subsequent deploys
    const persisted = this.id ? _persistedClients.get(this.id) : null;
    if (persisted) {
      persisted.hbDevices = this.hbDevices;
      persisted.evDevices = this.evDevices;
      persisted.ctDevices = this.ctDevices;
    }
  }

  /**
   * Populate the list of devices, handle duplicates, and connect client nodes
   */
  async handleReady() {
    await this.refreshDeviceList();
    this.log(`Devices initialized: evDevices: ${this.evDevices.length}, ctDevices: ${this.ctDevices.length}`);
    this.handleDuplicates(this.evDevices);
    await this.connectClientNodes();
  }

  toList({ perms } = {}) {
    const supportedTypes = new Set([
      'Air Purifier', 'Air Quality Sensor', 'Battery', 'Carbon Dioxide Sensor', 'Carbon Monoxide Sensor', 'Camera Rtp Stream Management',
      'Doorbell', 'Fan', 'Fanv2', 'Garage Door Opener', 'Humidity Sensor', 'Input Source',
      'Leak Sensor', 'Light Sensor', 'Lightbulb', 'Lock Mechanism', 'Motion Sensor', 'Occupancy Sensor',
      'Outlet', 'Smoke Sensor', 'Speaker', 'Stateless Programmable Switch', 'Switch',
      'Television', 'Temperature Sensor', 'Thermostat', 'Contact Sensor',
      'Window', 'Window Covering'
    ]);
    return filterUnique(this.hbDevices)
      .filter(service => supportedTypes.has(service.humanType))
      .filter(service => !perms || service.serviceCharacteristics.some(c => !c.perms || c.perms.includes(perms)))
      .map(service => {
        const name = getFriendlyName(service);
        const displayType = HUMAN_TYPE_DISPLAY[service.humanType] || service.humanType;
        const manufacturer = service.accessoryInformation.Manufacturer;
        return {
          name,
          fullName: `${name} - ${displayType} (${manufacturer})`,
          sortName: `${name}:${service.type}`,
          uniqueId: service.uniqueId,
          homebridge: service.instance.name,
          service: service.type,
          manufacturer,
        };
      })
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

    // Connect immediately from existing/cached device list when possible
    if (this.hbDevices.length > 0) {
      const matchedDevice = this._findMatchingDevice(clientNode.device);
      if (matchedDevice) {
        clientNode.hbDevice = matchedDevice;
        clientNode.status({ fill: 'green', shape: 'dot', text: 'connected' });
        // Defer emit so subclass constructors complete before handlers fire
        process.nextTick(() => clientNode.emit('hbReady', matchedDevice));
        debug('_Registered: %s type: %s', clientNode.type, matchedDevice.type, matchedDevice.serviceName);
        if (['hb-status', 'hb-event', 'hb-resume'].includes(clientNode.type)) {
          this._scheduleMonitorRefresh();
        }
        return;
      }
      // Device not in current list — refresh directly since instances are already known
      if (!this.refreshInProcess) {
        this.refreshInProcess = true;
        this._scheduleRefresh();
      }
    }

    clientNode.status({ fill: 'yellow', shape: 'ring', text: 'connecting' });
  }

  unregisterClientNode(clientNode) {
    debug('Unregister: %s type: %s', clientNode.type, clientNode.name);
    delete this.clientNodes[clientNode.id];
  }

  _findMatchingDevice(deviceId) {
    return this.hbDevices.find(service => deviceId === getDeviceIdentifier(service));
  }

  _scheduleRefresh() {
    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
    }
    // Cancel any pending monitor-only refresh — handleReady will handle the monitor
    if (this._monitorRefreshTimeout) {
      clearTimeout(this._monitorRefreshTimeout);
      this._monitorRefreshTimeout = null;
    }
    this._refreshTimeout = setTimeout(() => {
      this._refreshTimeout = null;
      this.handleReady()
        .catch(err => this.error(`Error during device refresh: ${err.message}`))
        .finally(() => { this.refreshInProcess = false; });
    }, 500);
  }

  _scheduleMonitorRefresh() {
    if (this._monitorRefreshTimeout) {
      clearTimeout(this._monitorRefreshTimeout);
    }
    this._monitorRefreshTimeout = setTimeout(() => {
      this._monitorRefreshTimeout = null;
      this.monitorDevices()
        .catch(err => this.error(`Error refreshing monitor: ${err.message}`));
    }, 500);
  }

  async connectClientNodes() {
    debug('connect %s nodes', Object.keys(this.clientNodes).length);
    let changed = false;
    for (const [, clientNode] of Object.entries(this.clientNodes)) {
      const matchedDevice = this._findMatchingDevice(clientNode.device);

      if (matchedDevice) {
        // Skip nodes already connected to the same device (preserves status, avoids re-emitting hbReady)
        if (clientNode.hbDevice === matchedDevice) {
          debug('_Already connected: %s type: %s', clientNode.type, matchedDevice.type);
          continue;
        }
        clientNode.hbDevice = matchedDevice;
        clientNode.status({ fill: 'green', shape: 'dot', text: 'connected' });
        clientNode.emit('hbReady', matchedDevice);
        debug('_Registered: %s type: %s', clientNode.type, matchedDevice.type, matchedDevice.serviceName);
        changed = true;
      } else {
        clientNode.hbDevice = null;
        this.error(`ERROR: Device registration failed '${clientNode.fullName}' - '${clientNode.device}'`);
        clientNode.status({ fill: 'red', shape: 'ring', text: 'not found' });
        changed = true;
      }
    };

    // Only recreate the monitor if device assignments actually changed
    if (changed || !this.monitor) {
      await this.monitorDevices();
    }
  }

  async monitorDevices() {
    if (Object.keys(this.clientNodes).length) {

      const monitorNodes = Object.values(this.clientNodes)
        .filter(node => ['hb-status', 'hb-event', 'hb-resume'].includes(node.type))
        .map(node => node.hbDevice) // Map to hbDevice property
        .filter(Boolean); // Remove any undefined or null values, if present;

      // Skip if the monitor already covers the same set of devices
      if (this.monitor && this._monitorNodeIds) {
        const currentIds = monitorNodes.map(n => n.uniqueId).sort().join(',');
        if (currentIds === this._monitorNodeIds) {
          debug('Monitor already covers same devices, skipping recreation');
          return;
        }
      }

      this.log(`Connected to ${monitorNodes.length} Homebridge devices`);
      this._monitorNodeIds = monitorNodes.map(n => n.uniqueId).sort().join(',');

      if (this.monitor) {
        this._recreatingMonitor = true;
        this.monitor.finish();
      }
      try {
        this.monitor = await this.hapClient.monitorCharacteristics(monitorNodes);
      } finally {
        this._recreatingMonitor = false;
      }
      this.monitor.on('service-update', (services) => {
        services.forEach(service => {
          const deviceId = getDeviceIdentifier(service);
          const eventNodes = Object.values(this.clientNodes).filter(
            clientNode => clientNode.config.device === deviceId
          );
          eventNodes.forEach(eventNode => eventNode.emit('hbEvent', service));
        });
      });
      this.monitor.on('monitor-close', (instance, hadError) => {
        if (this._recreatingMonitor) return;
        debug('monitor-close', instance.name, instance.ipAddress, instance.port, hadError)
        this.disconnectClientNodes(instance);
        // this.refreshDevices();
      })
      this.monitor.on('monitor-refresh', (instance, hadError) => {
        if (this._recreatingMonitor) return;
        debug('monitor-refresh', instance.name, instance.ipAddress, instance.port, hadError)
        this.reconnectClientNodes(instance);
        // this.refreshDevices();
      })
      this.monitor.on('monitor-error', (instance, hadError) => {
        debug('monitor-error', instance, hadError);
        this.warnClientNodes(instance, 'monitor error');
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

  warnClientNodes(instance, text) {
    debug('warnClientNodes', `${instance.ipAddress}:${instance.port}`, text);
    const clientNodes = Object.values(this.clientNodes).filter(clientNode => {
      return `${clientNode.hbDevice?.instance.ipAddress}:${clientNode.hbDevice?.instance.port}` === `${instance.ipAddress}:${instance.port}`;
    });

    clientNodes.forEach(clientNode => {
      clientNode.status({ fill: 'yellow', shape: 'ring', text });
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

  close(removed, done) {
    debug('hb-config: close');
    if (this.discoveryTimeout) {
      clearTimeout(this.discoveryTimeout);
      this.discoveryTimeout = null;
    }
    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }
    if (this._monitorRefreshTimeout) {
      clearTimeout(this._monitorRefreshTimeout);
      this._monitorRefreshTimeout = null;
    }
    // Finish monitor — it will be recreated when new client nodes register
    if (this.monitor) {
      this._recreatingMonitor = true;
      this.monitor.finish();
      this.monitor = null;
      this._monitorNodeIds = null;
    }

    const persisted = this.id ? _persistedClients.get(this.id) : null;
    if (removed) {
      // Config node permanently removed — destroy HapClient and clean up
      if (persisted) {
        persisted.hapClient.destroy();
        _persistedClients.delete(this.id);
      } else {
        this.hapClient?.destroy();
      }
    } else if (persisted) {
      // Redeploy — persist current state, keep HapClient alive
      persisted.currentNode = null; // Guard against events during close->constructor gap
      persisted.hbDevices = this.hbDevices;
      persisted.evDevices = this.evDevices;
      persisted.ctDevices = this.ctDevices;
    } else {
      this.hapClient?.destroy();
    }

    if (done) done();
  }

  static clearPersistedState() {
    for (const [, state] of _persistedClients) {
      state.hapClient?.destroy?.();
    }
    _persistedClients.clear();
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
