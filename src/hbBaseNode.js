const debug = require('debug')('hapNodeRed:hbBaseNode');

class HbBaseNode {
  constructor(nodeConfig, RED) {
    // console.log("HbBaseNode", nodeConfig, RED);
    // RED.nodes.createNode(this, nodeConfig);

    // this.conf = RED.nodes.getNode(nodeConfig.conf); // The configuration node
    this.confId = nodeConfig.conf;
    this.device = nodeConfig.device;
    this.service = nodeConfig.Service;
    this.name = nodeConfig.name;
    this.fullName = `${nodeConfig.name} - ${nodeConfig.Service}`;

    this.hbDevice = null;

    // Register the node with the configuration
    // this.conf.register(this, this.registerNode.bind(this));

    // Set up the close event
    // this.on('close', this.handleClose.bind(this));
  }

  /**
   * Common logic for registering the node
   */
  registerNode() {
    debug("hbBaseNode Registered:", this.fullName);

    this.hbDevice = hbDevices.findDevice(this.device);

    if (this.hbDevice) {
      this.deviceType = this.hbDevice.deviceType;
    } else {
      this.error(`437: Can't find device ${this.device}`, null);
    }
  }

  /**
   * Common logic for handling the close event
   * @param {Function} callback - Callback to be executed on close
   */
  handleClose(callback) {
    callback();
  }

  /**
   * Convert a HB message to a node message
   * @param {*} hbMessage 
   * @param {*} node 
   * @returns 
   */
  _convertHBcharactericToNode(hbMessage, node) {
    // debug("_convertHBcharactericToNode", node.device);
    var payload = {};
    if (!hbMessage.payload) {
      var device = hbDevices.findDevice(node.device);
      // debug("Device", device);

      // characteristics = Object.assign(characteristics, characteristic.characteristic);
      if (device) {
        hbMessage.forEach(function (characteristic) {
          // debug("Exists", (device.characteristics[characteristic.aid + '.' + characteristic.iid]));
          if (device.characteristics[characteristic.aid + '.' + characteristic.iid]) {
            payload = Object.assign(payload, {
              [device.characteristics[characteristic.aid + '.' + characteristic.iid].characteristic]: characteristic.value
            });
          }
        });
      }
    } else {
      payload = hbMessage.payload;
    }
    // debug("payload", payload);
    return (payload);
  }

  /**
   * Create a HB ontrol message for a device
   * @param {*} payload 
   * @param {*} node 
   * @param {*} device 
   * @returns 
   */
  _createControlMessage(payload, node, device) {
    // debug("_createControlMessage", payload, device);
    // debug("Device", device, device.characteristics[event.aid + '.' + event.iid]);
    var response = [];

    for (var key in payload) {
      // debug("IID", key, _getKey(device.characteristics, key));
      if (this._getKey(device.characteristics, key)) {
        response.push({
          "aid": device.aid,
          "iid": this._getKey(device.characteristics, key).iid,
          "value": payload[key]
        });
      } else {
        this.warn("Characteristic '" + key + "' is not valid.\nTry one of these: " + device.descriptions);
        node.status({
          text: 'warn - Invalid Characteristic ' + key,
          shape: 'ring',
          fill: 'yellow'
        });
      }
    }
    return ({
      "characteristics": response
    });
  }


  /**
   * Return the status of a device
   * @param {*} nrDevice 
   * @param {*} node 
   * @param {*} perms 
   * @returns 
   */
  async _status(nrDevice, node, perms) {
    let error;
    try {
      if (!hbDevices) {
        throw new Error('hbDevices not initialized');
      }

      const device = hbDevices.findDevice(node.device, perms);
      if (device) {
        let status, message;
        switch (device.type) {
          case "00000110": // Camera RTPStream Management
          case "00000111": // Camera Control
            message = {
              "resource-type": "image",
              "image-width": 1920,
              "image-height": 1080
            };
            debug("_status Control %s -> %s", device.id, JSON.stringify(message));

            // Await the result of HAPresourceByDeviceIDAsync
            status = await this.HAPresourceByDeviceIDAsync(device.id, JSON.stringify(message));

            debug("_status Controlled %s:%s ->", device.host, device.port);
            node.status({
              text: 'sent',
              shape: 'dot',
              fill: 'green'
            });

            clearTimeout(node.timeout);
            node.timeout = setTimeout(() => {
              node.status({});
            }, 30 * 1000);

            return {
              characteristics: {
                payload: btoa(status)
              }
            };

          default:
            message = '?id=' + device.getCharacteristics;
            debug("_status request: %s -> %s:%s ->", node.fullName, device.id, message);

            // Await the result of HAPstatusByDeviceIDAsync
            status = await this.HAPstatusByDeviceIDAsync(device.id, message);

            node.status({
              text: 'sent',
              shape: 'dot',
              fill: 'green'
            });

            clearTimeout(node.timeout);
            node.timeout = setTimeout(() => {
              node.status({});
            }, 30 * 1000);

            return status;
        }
      } else {
        error = "Device not found: " + nrDevice;
        node.status({
          text: 'Device not found',
          shape: 'ring',
          fill: 'red'
        });
        throw new Error(error);
      }
    } catch (err) {
      error = "Homebridge not initialized -2";
      node.status({
        text: error,
        shape: 'ring',
        fill: 'red'
      });
      throw new Error(error);
    }
  }

  /**
   * Control a HB Device
   * @param {*} node 
   * @param {*} payload 
   * @returns 
   */
  async _control(node, payload) {
    try {
      if (!hbDevices) {
        throw new Error('hbDevices not initialized');
      }

      const device = hbDevices.findDevice(node.device, {
        perms: 'pw'
      });

      if (device) {
        let message;
        switch (device.type) {
          case "00000110": // Camera RTPStream Management
          case "00000111": // Camera Control
            {
              message = {
                "resource-type": "image",
                "image-width": 1920,
                "image-height": 1080,
                "aid": node.hbDevice.aid
              };
              debug("Control %s ->", device.id, node.fullName, JSON.stringify(message));

              // Await the result of HAPresourceByDeviceIDAsync
              const status = await this.HAPresourceByDeviceIDAsync(device.id, JSON.stringify(message));

              node.status({
                text: JSON.stringify(payload).slice(0, 30) + '...',
                shape: 'dot',
                fill: 'green'
              });

              clearTimeout(node.timeout);
              node.timeout = setTimeout(() => {
                node.status({});
              }, 30 * 1000);

              return status;
            }
          default:
            if (typeof payload === "object") {
              message = this._createControlMessage.call(this, payload, node, device);
              debug("Control %s ->", device.id, JSON.stringify(message));

              if (message.characteristics.length > 0) {
                // Await the result of HAPcontrolByDeviceIDAsync
                const status = await this.HAPcontrolByDeviceIDAsync(device.id, JSON.stringify(message));

                if (status && status.characteristics[0].status === 0) {
                  debug("Controlled %s ->", device.id, JSON.stringify(status));
                  node.status({
                    text: JSON.stringify(payload).slice(0, 30) + '...',
                    shape: 'dot',
                    fill: 'green'
                  });

                  clearTimeout(node.timeout);
                  node.timeout = setTimeout(() => {
                    node.status({});
                  }, 10 * 1000);

                  return; // Successful control, no error
                } else {
                  debug("Controlled %s ->", device.id, payload);
                  node.status({
                    text: JSON.stringify(payload).slice(0, 30) + '...',
                    shape: 'dot',
                    fill: 'green'
                  });

                  clearTimeout(node.timeout);
                  node.timeout = setTimeout(() => {
                    node.status({});
                  }, 10 * 1000);

                  return; // Status controlled, no error
                }
              } else {
                throw new Error('Invalid payload');
              }
            } else {
              throw new Error("Payload should be a JSON object containing device characteristics and values.");
            }
        }
      } else {
        throw new Error('Device not available');
      }
    } catch (err) {
      let error = err.message || "Homebridge not initialized - 3";
      node.status({
        text: error,
        shape: 'ring',
        fill: 'red'
      });
      throw new Error(error);
    }
  }

  async _register(node) {
    try {
      debug("_register", node.device);
      const device = hbDevices.findDevice(node.device, { perms: 'ev' });

      if (node.type === 'hb-event' || node.type === 'hb-resume') {
        const message = {
          "characteristics": device.eventRegisters
        };
        debug("_register", node.fullName, device.id, message);

        // Use the shared async function here
        const status = await hapEventByDeviceIDAsync(device.id, JSON.stringify(message));

        // Check the result of the operation
        if (status === null) {
          debug("%s registered: %s -> %s", node.type, node.fullName, device.id);
        } else {
          debug("%s registered: %s -> %s", node.type, node.fullName, device.id, JSON.stringify(status));
        }
      }
    } catch (err) {
      // Handle errors that occur in the async function
      debug("Error in _register:", err);
      // You can handle errors here, like logging or setting the status
      node.status({
        text: 'error',
        shape: 'ring',
        fill: 'red'
      });
    }
  }

  _getObjectDiff(obj1, obj2) {
    const diff = Object.keys(obj1).reduce((result, key) => {
      if (!obj2.hasOwnProperty(key)) {
        result.push(key);
      } else if (obj1[key] === obj2[key]) {
        const resultKeyIndex = result.indexOf(key);
        result.splice(resultKeyIndex, 1);
      }
      return result;
    }, Object.keys(obj2));

    return diff;
  }

  _getKey(obj, value) {
    for (var key in obj) {
      // debug("%s === %s", obj[key].characteristic, value);
      // debug("%s === %s", obj[key].characteristic.toLowerCase(), value.toLowerCase());
      if (obj[key].characteristic.toLowerCase() === value.toLowerCase()) {
        return obj[key];
      }
    }
    return null;
  }

  btoa(str) {
    var buffer;

    if (str instanceof Buffer) {
      buffer = str;
    } else {
      buffer = Buffer.from(str.toString(), 'binary');
    }

    return buffer.toString('base64');
  }


  // Helper function to promisify HAPresourceByDeviceID
  async HAPresourceByDeviceIDAsync(deviceId, message) {
    return new Promise((resolve, reject) => {
      homebridge.HAPresourceByDeviceID(deviceId, message, (err, status) => {
        if (err) {
          reject(err);
        } else {
          resolve(status);
        }
      });
    });
  }

  // Helper function to promisify HAPstatusByDeviceID
  async HAPstatusByDeviceIDAsync(deviceId, message) {
    return new Promise((resolve, reject) => {
      homebridge.HAPstatusByDeviceID(deviceId, message, (err, status) => {
        if (err) {
          reject(err);
        } else {
          resolve(status);
        }
      });
    });
  }

  async hapEventByDeviceIDAsync(deviceId, message) {
    return new Promise((resolve, reject) => {
      homebridge.HAPeventByDeviceID(deviceId, message, (err, status) => {
        if (err) {
          reject(err);
        } else {
          resolve(status);
        }
      });
    });
  }

}

module.exports = HbBaseNode;
