var debug = require('debug')('hapNodeRed');
var Queue = require('better-queue');
// var register = require('./lib/register.js');

const HBConfNode = require('./hbConfigNode');
const HbEventNode = require('./hbEventNode'); // Import the class
const HbResumeNode = require('./hbResumeNode'); // Import the class
const hbControl = require('./hbControlNode');
const hbStatus = require('./hbStatusNode');
const HbControlNode = require('./hbControlNode');
const HbStatusNode = require('./hbStatusNode');

module.exports = function (RED) {
  var evDevices = [];
  var ctDevices = [];
  var hbDevices;
  var homebridge;
  var reqisterQueue = new Queue(function (node, cb) {
    _register.call(node.that, node, cb);
  }, {
    concurrent: 1,
    autoResume: false,
    maxRetries: 1000,
    retryDelay: 30000
  });
  reqisterQueue.pause();

  /**
   * hbConf - Configuration
   *
   * @param  {type} n description
   * @return {type}   description
   */

  function hbConfNode(n) {
    RED.nodes.createNode(this, n);
    this.username = n.username;
    this.macAddress = n.macAddress || '';
    this.password = this.credentials.password;

    this.hbConf = new HBConfNode(n, RED); // Initialize the class instance

    this.on('close', function () {
      this.hbConf.close(); // Close any open connections
    });
  }

  RED.nodes.registerType("hb-conf", hbConfNode, {
    credentials: {
      password: {
        type: "password"
      }
    }
  });

/**
 *  hbEventNode - description
 * @param {*} n 
 */
  function hbEventNode(n) {
    RED.nodes.createNode(this, n);
    
    // Create instance of HbEventNode class to handle events
    new HbEventNode(this, n); // Pass current node and config object
  }

  RED.nodes.registerType("hb-event", hbEventNode);

/**
 * hbResumeNode - description
 */
  function hbResumeNode(n) {
    RED.nodes.createNode(this, n);
    
    // Create instance of HbEventNode class to handle events
    new HbResumeNode(this, n); // Pass current node and config object
  }

  RED.nodes.registerType("hb-resume", hbResumeNode);

  function hbControlNode(n) {
    RED.nodes.createNode(this, n);
    
    // Create instance of HbEventNode class to handle events
    new HbControlNode(this, n); // Pass current node and config object
  }

  RED.nodes.registerType("hb-control", hbControlNode);

  /**
   * hbStatus - description
   *
   * @param  {type} n description
   * @return {type}   description
   */

 
  function hbStatusNode(n) {
    RED.nodes.createNode(this, n);
    
    // Create instance of HbEventNode class to handle events
    new HbStatusNode(this, n); // Pass current node and config object
  }

  RED.nodes.registerType("hb-status", hbStatusNode);

  RED.httpAdmin.post('/hap-device/refresh/:id', RED.auth.needsPermission('hb-event.read'), function (req, res) {
    var id = req.params.id;
    var conf = RED.nodes.getNode(id);
    if (conf) {
      res.status(200).send();
    } else {
      // not deployed yet
      console.log("Can't refresh until deployed");
      res.status(404).send();
    }
  });

  RED.httpAdmin.get('/hap-device/evDevices/', RED.auth.needsPermission('hb-event.read'), function (req, res) {
    debug("evDevices", hbDevices.toList({
      perms: 'ev'
    }).length);
    if (evDevices) {
      res.send(hbDevices.toList({
        perms: 'ev'
      }));
    } else {
      res.status(404).send();
    }
  });

  RED.httpAdmin.get('/hap-device/evDevices/:id', RED.auth.needsPermission('hb-event.read'), function (req, res) {
    if (evDevices && hbDevices) {
      debug("evDevices", hbDevices.toList({
        perms: 'ev'
      }).length);
      res.send(hbDevices.toList({
        perms: 'ev'
      }));
    } else {
      res.status(404).send();
    }
  });

  RED.httpAdmin.post('/hap-device/refresh/:id', RED.auth.needsPermission('hb-resume.read'), function (req, res) {
    var id = req.params.id;
    var conf = RED.nodes.getNode(id);
    if (conf) {
      res.status(200).send();
    } else {
      // not deployed yet
      console.log("Can't refresh until deployed");
      res.status(404).send();
    }
  });

  RED.httpAdmin.get('/hap-device/evDevices/', RED.auth.needsPermission('hb-resume.read'), function (req, res) {
    debug("evDevices", hbDevices.toList({
      perms: 'ev'
    }).length);
    if (evDevices) {
      res.send(hbDevices.toList({
        perms: 'ev'
      }));
    } else {
      res.status(404).send();
    }
  });

  RED.httpAdmin.get('/hap-device/evDevices/:id', RED.auth.needsPermission('hb-resume.read'), function (req, res) {
    debug("evDevices", hbDevices.toList({
      perms: 'ev'
    }).length);
    if (evDevices) {
      res.send(hbDevices.toList({
        perms: 'ev'
      }));
    } else {
      res.status(404).send();
    }
  });

  RED.httpAdmin.get('/hap-device/ctDevices/', RED.auth.needsPermission('hb-control.read'), function (req, res) {
    debug("ctDevices", hbDevices.toList({
      perms: 'pw'
    }).length);
    if (ctDevices) {
      res.send(hbDevices.toList({
        perms: 'pw'
      }));
    } else {
      res.status(404).send();
    }
  });

  RED.httpAdmin.get('/hap-device/ctDevices/:id', RED.auth.needsPermission('hb-control.read'), function (req, res) {
    debug("ctDevices", hbDevices.toList({
      perms: 'pw'
    }).length);
    if (ctDevices) {
      res.send(hbDevices.toList({
        perms: 'pw'
      }));
    } else {
      res.status(404).send();
    }
  });

  /**
   * _convertHBcharactericToNode - Convert homebridge characteric array to Node Payload
   *
   * @param  {array} hbMessage description
   * @param  {object} node  description
   * @return {type}       description
   */

  function _convertHBcharactericToNode(hbMessage, node) {
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
   * _createControlMessage - description
   *
   * @param  {type} payload    {"On":false,"Brightness":0}
   * @param  {type} node   description
   * @param  {type} device description
   * @return {type}        description
   */

  function _createControlMessage(payload, node, device) {
    // debug("_createControlMessage", payload, device);
    // debug("Device", device, device.characteristics[event.aid + '.' + event.iid]);
    var response = [];

    for (var key in payload) {
      // debug("IID", key, _getKey(device.characteristics, key));
      if (_getKey(device.characteristics, key)) {
        response.push({
          "aid": device.aid,
          "iid": _getKey(device.characteristics, key).iid,
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
   * _status - description
   *
   * @param  {type} nrDevice description
   * @param  {type} node     description
   * @param  {type} value    description
   * @param  {type} callback     description
   * @return {type}          description
   */

  function _status(nrDevice, node, perms, callback) {
    // debug("_status", new Error(), hbDevices);
    var error;
    try {
      if (!hbDevices) {
        throw new Error('hbDevices not initialized');
      }
      var device = hbDevices.findDevice(node.device, perms);
      if (device) {
        // debug("device.type", device.type);
        switch (device.type) {
          case "00000110": // Camera RTPStream Management
          case "00000111": // Camera Control
            var message = {
              "resource-type": "image",
              "image-width": 1920,
              "image-height": 1080
            };
            debug("_status Control %s -> %s", device.id, JSON.stringify(message));
            homebridge.HAPresourceByDeviceID(device.id, JSON.stringify(message), function (err, status) {
              // debug("status", err);
              if (!err) {
                debug("_status Controlled %s:%s ->", device.host, device.port);
                node.status({
                  text: 'sent',
                  shape: 'dot',
                  fill: 'green'
                });
                clearTimeout(node.timeout);
                node.timeout = setTimeout(function () {
                  node.status({});
                }, 30 * 1000);
                // {"characteristics":[{"aid":19,"iid":10,"value":false},{"aid":19,"iid":11,"value":0}]}
                callback(null, {
                  characteristics: {
                    payload: btoa(status)
                  }
                });
              } else {
                node.error(device.host + ":" + device.port + " -> " + err);
                node.status({
                  text: 'error',
                  shape: 'ring',
                  fill: 'red'
                });
                callback(err);
              }
            });
            break;
          default:
            var message = '?id=' + device.getCharacteristics;
            debug("_status request: %s -> %s:%s ->", node.fullName, device.id, message);
            homebridge.HAPstatusByDeviceID(device.id, message, function (err, status) {
              if (!err) {
                // debug("Status %s:%s ->", device.host, device.port, status);
                node.status({
                  text: 'sent',
                  shape: 'dot',
                  fill: 'green'
                });
                clearTimeout(node.timeout);
                node.timeout = setTimeout(function () {
                  node.status({});
                }, 30 * 1000);
                callback(null, status);
              } else {
                error = device.id + " -> " + err + " -> " + status;
                node.status({
                  text: 'error',
                  shape: 'ring',
                  fill: 'red'
                });
                callback(error);
              }
            });
        } // End of switch
      } else {
        error = "Device not found: " + nrDevice;
        node.status({
          text: 'Device not found',
          shape: 'ring',
          fill: 'red'
        });
        callback(error);
      } // end of device if
    } catch (err) {
      // debug('_status', err);
      error = "Homebridge not initialized -2";
      node.status({
        text: error,
        shape: 'ring',
        fill: 'red'
      });
      callback(error);
    }
  }

  /**
   * _control - description
   *
   * @param  {type} nrDevice description
   * @param  {type} node     description
   * @param  {type} payload    {"On":false, "Brightness":0}
   * @param  {type} callback     description
   * @return {type}          description
   */

  function _control(node, payload, callback) {
    try {
      if (!hbDevices) {
        throw new Error('hbDevices not initialized');
      }
      var device = hbDevices.findDevice(node.device, {
        perms: 'pw'
      });
      if (device) {
        var message;
        // console.log('device.type', device.type)
        switch (device.type) {
          case "00000110": // Camera RTPStream Management
          case "00000111": // Camera Control
            message = {
              "resource-type": "image",
              "image-width": 1920,
              "image-height": 1080,
              "aid": node.hbDevice.aid
            };
            debug("Control %s ->", device.id, node.fullName, JSON.stringify(message));
            homebridge.HAPresourceByDeviceID(device.id, JSON.stringify(message), function (err, status) {
              if (!err) {
                //  debug("Controlled %s ->", device.id, JSON.stringify(payload));
                //  debug("Payload %s ->", device.id, status);
                node.status({
                  text: JSON.stringify(payload).slice(0, 30) + '...',
                  shape: 'dot',
                  fill: 'green'
                });
                clearTimeout(node.timeout);
                node.timeout = setTimeout(function () {
                  node.status({});
                }, 30 * 1000);
                callback(null, status);
              } else {
                node.error(device.id + " -> " + err);
                node.status({
                  text: 'error',
                  shape: 'ring',
                  fill: 'red'
                });
                callback(err);
              }
            });
            break;
          default:
            // debug("Object type", typeof payload);
            if (typeof payload === "object") {
              message = _createControlMessage.call(this, payload, node, device);
              debug("Control %s ->", device.id, JSON.stringify(message));
              if (message.characteristics.length > 0) {
                homebridge.HAPcontrolByDeviceID(device.id, JSON.stringify(message), function (err, status) {
                  if (!err && status && status.characteristics[0].status === 0) {
                    debug("Controlled %s ->", device.id, JSON.stringify(status));
                    node.status({
                      text: JSON.stringify(payload).slice(0, 30) + '...',
                      shape: 'dot',
                      fill: 'green'
                    });
                    clearTimeout(node.timeout);
                    node.timeout = setTimeout(function () {
                      node.status({});
                    }, 10 * 1000);
                    callback(null);
                  } else if (!err) {
                    debug("Controlled %s ->", device.id, payload);
                    node.status({
                      text: JSON.stringify(payload).slice(0, 30) + '...',
                      shape: 'dot',
                      fill: 'green'
                    });
                    clearTimeout(node.timeout);
                    node.timeout = setTimeout(function () {
                      node.status({});
                    }, 10 * 1000);
                    callback(null);
                  } else {
                    node.error(device.id + " -> " + err + " -> " + status);
                    node.status({
                      text: 'error',
                      shape: 'ring',
                      fill: 'red'
                    });
                    callback(err);
                  }
                });
              } else {
                // Bad message
                /* - This is handled in createcontrolmessage
                this.warn("Invalid payload-");
                node.status({
                  text: 'error - Invalid payload',
                  shape: 'ring',
                  fill: 'red'
                });
                */
                var err = 'Invalid payload';
                callback(err);
              }
            } else {
              node.error("Payload should be an JSON object containing device characteristics and values, ie {\"On\":false, \"Brightness\":0 }\nValid values include: " + device.descriptions);
              var err = 'Invalid payload';
              node.status({
                text: err,
                shape: 'ring',
                fill: 'red'
              });
              callback(err);
            }
        } // End of switch
      } else {
        var error = 'Device not available';
        node.status({
          text: error,
          shape: 'ring',
          fill: 'red'
        });
        callback(error);
      }
    } catch (err) {
      var error = "Homebridge not initialized - 3 "+ err;
      node.status({
        text: error,
        shape: 'ring',
        fill: 'red'
      });
      callback(error);
    }
  }

  /**
   * _register - description
   *
   * @param  {type} node description
   * @param  {type} callback callback
   * @return {type}      description
   */

  function _register(node, callback) {
    debug("_register", node.device);
    var device = hbDevices.findDevice(node.device, {
      perms: 'ev'
    });
    if (node.type === 'hb-event' || node.type === 'hb-resume') {
      var message = {
        "characteristics": device.eventRegisters
      };
      debug("_register", node.fullName, device.id, message);
      homebridge.HAPeventByDeviceID(device.id, JSON.stringify(message), function (err, status) {
        if (!err && status === null) {
          debug("%s registered: %s -> %s", node.type, node.fullName, device.id);
          callback(null);
        } else if (!err) {
          debug("%s registered: %s -> %s", node.type, node.fullName, device.id, JSON.stringify(status));
          callback(null);
        } else {
          // Fix for # 47
          // node.error(device.host + ":" + device.port + " -> " + err);
          callback(err);
        }
      }.bind(this));
    } else {
      callback(null);
    }
  }
};

function _getObjectDiff(obj1, obj2) {
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

function _getKey(obj, value) {
  for (var key in obj) {
    // debug("%s === %s", obj[key].characteristic, value);
    // debug("%s === %s", obj[key].characteristic.toLowerCase(), value.toLowerCase());
    if (obj[key].characteristic.toLowerCase() === value.toLowerCase()) {
      return obj[key];
    }
  }
  return null;
}

function btoa(str) {
  var buffer;

  if (str instanceof Buffer) {
    buffer = str;
  } else {
    buffer = Buffer.from(str.toString(), 'binary');
  }

  return buffer.toString('base64');
}
