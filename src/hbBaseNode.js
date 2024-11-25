const debug = require('debug')('hapNodeRed:hbBaseNode');

class HbBaseNode {
  constructor(config, RED) {
    debug("Constructor:", config);
    RED.nodes.createNode(this, config);

    if (!config.conf) {
      this.error(`Warning: ${config.type} @ (${config.x}, ${config.y}) not connected to a HB Configuration Node`);
    }

    this.config = config;
    this.hbConfigNode = RED.nodes.getNode(config.conf);
    this.confId = config.conf;
    this.device = config.device;
    this.service = config.Service;
    this.name = config.name;
    this.fullName = `${config.name} - ${config.Service}`;
    this.hbDevice = null;

    this.hbConfigNode?.register(this);

    if (this.handleInput) {
      this.on('input', this.handleInput.bind(this));
    }
    this.on('close', this.handleClose.bind(this));
  }

  registerNode() {
    debug("Registering node:", this.fullName);
    this.hbDevice = hbDevices.findDevice(this.device);

    if (!this.hbDevice) {
      this.error(`Device not found: ${this.device}`);
    } else {
      this.deviceType = this.hbDevice.deviceType;
    }
  }

  handleClose(callback) {
    callback();
  }

  _convertHBcharacteristicToNode(hbMessage, node) {
    let payload = {};
    if (!hbMessage.payload) {
      const device = hbDevices.findDevice(node.device);
      if (device) {
        hbMessage.forEach(characteristic => {
          const charKey = `${characteristic.aid}.${characteristic.iid}`;
          if (device.characteristics[charKey]) {
            payload[device.characteristics[charKey].characteristic] = characteristic.value;
          }
        });
      }
    } else {
      payload = hbMessage.payload;
    }
    return payload;
  }

  _createControlMessage(payload, node, device) {
    const response = [];
    for (const key in payload) {
      const characteristic = this._getKey(device.characteristics, key);
      if (characteristic) {
        response.push({
          aid: device.aid,
          iid: characteristic.iid,
          value: payload[key],
        });
      } else {
        this.warn(`Invalid characteristic: '${key}'. Available: ${device.descriptions}`);
        node.status({ text: `Invalid characteristic: ${key}`, shape: 'ring', fill: 'yellow' });
      }
    }
    return { characteristics: response };
  }

  async _status(nrDevice, node, perms) {
    try {
      const device = hbDevices.findDevice(node.device, perms);
      if (!device) throw new Error(`Device not found: ${nrDevice}`);

      const message = device.type === "00000110" || device.type === "00000111"
        ? { "resource-type": "image", "image-width": 1920, "image-height": 1080 }
        : `?id=${device.getCharacteristics}`;

      const status = device.type === "00000110" || device.type === "00000111"
        ? await this.HAPresourceByDeviceIDAsync(device.id, JSON.stringify(message))
        : await this.HAPstatusByDeviceIDAsync(device.id, message);

      node.status({ text: 'Success', shape: 'dot', fill: 'green' });
      return device.type === "00000110" || device.type === "00000111"
        ? { characteristics: { payload: this.btoa(status) } }
        : status;
    } catch (err) {
      debug("Error in _status:", err);
      node.status({ text: 'Error retrieving status', shape: 'ring', fill: 'red' });
      throw err;
    }
  }

  async _control(node, payload) {
    try {
      const device = hbDevices.findDevice(node.device, { perms: 'pw' });
      if (!device) throw new Error('Device not available');

      const message = typeof payload === "object"
        ? this._createControlMessage(payload, node, device)
        : null;

      if (message && message.characteristics.length > 0) {
        const status = await this.HAPcontrolByDeviceIDAsync(device.id, JSON.stringify(message));
        node.status({ text: 'Controlled', shape: 'dot', fill: 'green' });
        return status;
      } else {
        throw new Error('Invalid payload');
      }
    } catch (err) {
      debug("Error in _control:", err);
      node.status({ text: 'Control error', shape: 'ring', fill: 'red' });
      throw err;
    }
  }

  async _register(node) {
    try {
      const device = hbDevices.findDevice(node.device, { perms: 'ev' });
      if (device) {
        const message = { characteristics: device.eventRegisters };
        await hapEventByDeviceIDAsync(device.id, JSON.stringify(message));
      }
    } catch (err) {
      debug("Error in _register:", err);
      node.status({ text: 'Register error', shape: 'ring', fill: 'red' });
    }
  }

  _getKey(obj, value) {
    return Object.values(obj).find(char => char.characteristic.toLowerCase() === value.toLowerCase()) || null;
  }

  btoa(str) {
    return Buffer.from(str.toString(), 'binary').toString('base64');
  }

  async HAPresourceByDeviceIDAsync(deviceId, message) {
    return new Promise((resolve, reject) => {
      homebridge.HAPresourceByDeviceID(deviceId, message, (err, status) => err ? reject(err) : resolve(status));
    });
  }

  async HAPstatusByDeviceIDAsync(deviceId, message) {
    return new Promise((resolve, reject) => {
      homebridge.HAPstatusByDeviceID(deviceId, message, (err, status) => err ? reject(err) : resolve(status));
    });
  }
}

module.exports = HbBaseNode;
