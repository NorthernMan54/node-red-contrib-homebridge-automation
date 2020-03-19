var debug = require('debug')('hapNodeRed');
var Queue = require('better-queue');
// var register = require('./lib/register.js');
var Homebridges = require('./lib/Homebridges.js').Homebridges;
var HAPNodeJSClient = require('hap-node-client').HAPNodeJSClient;

module.exports = function(RED) {
  var evDevices = [];
  var ctDevices = [];
  var hbDevices;
  var homebridge;
  var reqisterQueue = new Queue(function(node, cb) {
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

  function hbConf(n) {
    RED.nodes.createNode(this, n);
    this.username = n.username;
    this.password = this.credentials.password;

    this.users = {};

    if (!homebridge) {
      homebridge = new HAPNodeJSClient({
        "pin": n.username,
        "refresh": 900,
        "debug": true,
        "timeout": 20,
        "reqTimeout": 7000
      });
      reqisterQueue.pause();
      homebridge.on('Ready', function(accessories) {
        // evDevices = register.registerEv(homebridge, accessories);
        // ctDevices = register.registerCt(homebridge, accessories);
        hbDevices = new Homebridges(accessories);
        // debug("output", JSON.stringify(hbDevices.toList({ perms: 'ev'}), null, 4));
        // debug("evDevices", evDevices);
        // debug('Discovered %s evDevices', evDevices.length);
        debug('Discovered %s new evDevices', hbDevices.toList({
          perms: 'ev'
        }).length);
        // debug(hbDevices.toList({perms: 'pw'}));

        var list = hbDevices.toList({
          perms: 'ev'
        });

        var deleteSeen = [];

        for (var i = 0; i < list.length; i++) {
          var endpoint = list[i];
          // console.log("Checking", endpoint.fullName);
          if (deleteSeen[endpoint.fullName]) {
            console.log("WARNING: Duplicate device name", endpoint.fullName);
            // response.event.payload.endpoints.splice(i, 1);
          } else {
            deleteSeen[endpoint.fullName] = true;
          }
        }

        deleteSeen = [];

        for (i = 0; i < list.length; i++) {
          endpoint = list[i];
          // console.log("Checking uniqueId", endpoint.uniqueId);
          if (deleteSeen[endpoint.uniqueId]) {
            console.log("ERROR: Parsing failed, duplicate uniqueID.", endpoint.fullName);
            // response.event.payload.endpoints.splice(i, 1);
          } else {
            deleteSeen[endpoint.uniqueId] = true;
          }
        }
        // evDevices.sort((a, b) => (a.sortName > b.sortName) ? 1 : ((b.sortName > a.sortName) ? -1 : 0));
        // ctDevices.sort((a, b) => (a.sortName > b.sortName) ? 1 : ((b.sortName > a.sortName) ? -1 : 0));

        // debug('Discovered %s ctDevices', ctDevices.length);
        debug('Discovered %s new ctDevices', hbDevices.toList({
          perms: 'pw'
        }).length);
        // debug('Discovered %s new ctDevices', hbDevices.toList({ perms: 'pw'}).length);
        // debug("Register Queue", reqisterQueue.getStats());
        reqisterQueue.resume();
      });
    }

    var node = this;

    this.connect = function(callback) {
      callback();
    };

    this.register = function(deviceNode, callback) {
      debug("hbConf.register", deviceNode.fullName);
      node.users[deviceNode.id] = deviceNode;
      debug("Register %s -> %s", deviceNode.type, deviceNode.fullName);
      reqisterQueue.push({
        that: this,
        device: deviceNode.device,
        type: deviceNode.type,
        name: deviceNode.name,
        fullName: deviceNode.fullName,
        node: node
      }, callback);
      // debug("Register Queue - push", reqisterQueue.getStats());
    };

    this.deregister = function(deviceNode, callback) {
      deviceNode.status({
        text: 'disconnected',
        shape: 'ring',
        fill: 'red'
      });
      // Should this also remove the homebridge registered event?
      //
      // debug("hbEvent deregistered:", deviceNode.name);
      // if (homebridge.listenerCount(deviceNode.eventName)) {
      deviceNode.eventName.forEach(function(event) {
        homebridge.removeListener(event, deviceNode.listener);
      });
      // }
      callback();
    };

    this.on('close', function() {
      if (node.client && node.client.connected) {
        node.client.end();
      }
    });
  }

  RED.nodes.registerType("hb-conf", hbConf, {
    credentials: {
      password: {
        type: "password"
      }
    }
  });

  /**
   * hbEvent - Node that listens to HomeKit Events, and sends message into NodeRED
   *
   * @param  {type} n description
   * @return {type}   description
   */

  function hbEvent(n) {
    // debug("hbEvent", n);
    RED.nodes.createNode(this, n);
    this.conf = RED.nodes.getNode(n.conf);
    this.confId = n.conf;
    this.device = n.device;
    this.service = n.Service;
    this.name = n.name;
    this.fullName = n.name + ' - ' + n.Service;
    this.state = {};

    var node = this;

    node.command = function(event) {
      // False messages can be received from accessories with multiple services
      // if (Object.keys(_convertHBcharactericToNode(event, node)).length > 0) {
      debug("hbEvent", node.name, event, node.state);
      node.state = Object.assign(node.state, _convertHBcharactericToNode([event], node));
      var msg = {
        name: node.name,
        payload: node.state,
        Homebridge: node.hbDevice.homebridge,
        Manufacturer: node.hbDevice.manufacturer,
        Service: node.hbDevice.deviceType,
        _device: node.device,
        _confId: node.confId,
        _rawEvent: event
      };
      node.status({
        text: JSON.stringify(msg.payload),
        shape: 'dot',
        fill: 'green'
      });
      setTimeout(function() {
        node.status({});
      }, 10 * 1000);
      node.send(msg);
    };
    // };

    node.conf.register(node, function() {
      debug("hbEvent.register", node.fullName);
      this.hbDevice = hbDevices.findDevice(node.device);
      if (this.hbDevice) {
        _status(node.device, node, '', function(err, message) {
          if (!err) {
            node.state = _convertHBcharactericToNode(message.characteristics, node);
            debug("hbEvent received: %s = %s", node.fullName, JSON.stringify(message.characteristics), node.state);
          } else {
            node.error("hbEvent _status: error", node.fullName, err);
          }
        });
        node.hbDevice = this.hbDevice;
        // Register for events
        node.listener = node.command;
        node.eventName = [];
        // node.eventName = this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid;
        // debug("DEVICE", this.hbDevice);
        this.hbDevice.eventRegisters.forEach(function(event) {
          homebridge.on(node.hbDevice.host + node.hbDevice.port + event.aid + event.iid, node.command);
          node.eventName.push(node.hbDevice.host + node.hbDevice.port + event.aid + event.iid);
        });
        // homebridge.on(this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid, node.command);
        node.status({
          text: 'connected',
          shape: 'dot',
          fill: 'green'
        });
      } else {
        node.error("197:Can't find device " + node.device, null);
      }
    }.bind(this));

    node.on('close', function(callback) {
      node.conf.deregister(node, callback);
    });
  }

  RED.nodes.registerType("hb-event", hbEvent);

  /**
   * hbResume - description
   *
   * State operating model
   * - Store msg into node.lastPayload
   * - Store device state into node.state on events
   *
   * Turn on message just passes thru
   * - if msg = on
   *
   * First turn off message restores state from Turn on
   * - if msg = off and node.lastPayload === on
   *
   * Second turn off message just passes thru
   * - if msg = off and node.lastPayload === off
   * - Update stored device state to off
   *
   * @param  {type} n description
   * @return {type}   description
   */

  function hbResume(n) {
    RED.nodes.createNode(this, n);
    this.conf = RED.nodes.getNode(n.conf);
    this.confId = n.conf;
    this.device = n.device;
    this.service = n.Service;
    this.name = n.name;
    this.fullName = n.name + ' - ' + n.Service;
    var node = this;

    node.state = null;
    node.lastMessageTime = null;
    node.lastMessageValue = null;
    node.lastPayload = {
      On: false
    };

    node.on('input', function(msg) {
      debug("hbResume.input: %s input", node.fullName, JSON.stringify(msg));
      if (typeof msg.payload === "object") {
        // Using this to validate input message contains valid Accessory Characteristics
        var message = _createControlMessage.call(this, msg.payload, node, node.hbDevice);

        if (message.characteristics.length > 0) {
          var newMsg;
          if (!msg.payload.On) {
            // false / Turn Off
            // debug("hbResume-Node lastPayload %s", JSON.stringify(node.lastPayload));
            if (node.lastPayload.On) {
              // last msg was on, restore previous state
              newMsg = {
                name: node.name,
                _device: node.device,
                _confId: node.confId
              };
              if (node.hbDevice) {
                newMsg.Homebridge = node.hbDevice.homebridge;
                newMsg.Manufacturer = node.hbDevice.manufacturer;
                newMsg.Type = node.hbDevice.deviceType;
              }
              newMsg.payload = node.state;
            } else {
              // last msg was off, pass thru
              node.state = JSON.parse(JSON.stringify(msg.payload));
              newMsg = msg;
            }
          } else {
            // True / Turn on
            newMsg = msg;
          }
          // Off messages should not include brightness
          node.send((newMsg.payload.On ? newMsg : newMsg.payload = {
            On: false
          }, newMsg));
          debug("hbResume.input: %s output", node.fullName, JSON.stringify(newMsg));
          node.status({
            text: JSON.stringify(newMsg.payload),
            shape: 'dot',
            fill: 'green'
          });
          setTimeout(function() {
            node.status({});
          }, 10 * 1000);
          node.lastMessageValue = newMsg.payload;
          node.lastMessageTime = Date.now();
          // debug("hbResume.input: %s updating lastPayload %s", node.fullName, JSON.stringify(msg.payload));
          node.lastPayload = JSON.parse(JSON.stringify(msg.payload)); // store value not reference
        }
      } else {
        node.error("Payload should be an JSON object containing device characteristics and values, ie {\"On\":false, \"Brightness\":0 }\nValid values include: " + node.hbDevice.descriptions);
        node.status({
          text: 'error - Invalid payload',
          shape: 'ring',
          fill: 'red'
        });
      }
    });

    node.command = function(event) {
      // debug("hbResume received event: %s ->", node.fullName, event);
      // debug("hbResume - internals %s millis, old %s, event %s, previous %s", Date.now() - node.lastMessageTime, node.lastMessageValue, event.status, node.state);
      // Don't update for events originating from here
      // if Elapsed is greater than 5 seconds, update stored state
      // if Elapsed is less then 5, and lastMessage doesn't match event update stored state

      var payload = Object.assign({}, node.state);

      // debug("should be true", _getObjectDiff(payload, node.state).length);

      payload = Object.assign(payload, _convertHBcharactericToNode([event], node));

      // debug("should be false", _getObjectDiff(payload, node.state).length);

      debug("hbResume.event: %s %s -> %s", node.fullName, JSON.stringify(node.state), JSON.stringify(payload));

      if ((Date.now() - node.lastMessageTime) > 5000) {
        debug("hbResume.update: %s - updating stored event >5", node.fullName, payload);
        node.state = JSON.parse(JSON.stringify(payload));
      } else if (_getObjectDiff(payload, node.lastMessageValue).length > 0) {
        // debug("hbResume - updating stored event !=", payload, node.lastMessageValue);
        // node.state = payload;
      }
    };

    node.conf.register(node, function() {
      debug("hbResume.register:", node.fullName);
      this.hbDevice = hbDevices.findDevice(node.device);
      if (this.hbDevice) {
        _status(node.device, node, '', function(err, message) {
          if (!err) {
            node.state = _convertHBcharactericToNode(message.characteristics, node);
            debug("hbResume received: %s = %s", node.fullName, JSON.stringify(message.characteristics), node.state);
          } else {
            node.error(err);
          }
        });
        node.hbDevice = this.hbDevice;
        node.deviceType = this.hbDevice.deviceType;
        // Register for events
        node.listener = node.command;
        node.eventName = [];
        // node.eventName = this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid;
        // homebridge.on(this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid, node.command);
        this.hbDevice.eventRegisters.forEach(function(event) {
          homebridge.on(node.hbDevice.host + node.hbDevice.port + event.aid + event.iid, node.command);
          node.eventName.push(node.hbDevice.host + node.hbDevice.port + event.aid + event.iid);
        });
        node.status({
          text: 'sent',
          shape: 'dot',
          fill: 'green'
        });
        setTimeout(function() {
          node.status({});
        }, 30 * 1000);
      } else {
        node.error("365:Can't find device " + node.device, null);
      }
    }.bind(this));

    node.on('close', function(callback) {
      node.conf.deregister(node, callback);
    });
  }

  RED.nodes.registerType("hb-resume", hbResume);

  /**
   * hbControl - description
   *
   * @param  {type} n description
   * @return {type}   description
   */

  function hbControl(n) {
    RED.nodes.createNode(this, n);
    this.conf = RED.nodes.getNode(n.conf); // The configuration node
    this.confId = n.conf;
    this.device = n.device;
    this.service = n.Service;
    this.name = n.name;
    this.fullName = n.name + ' - ' + n.Service;

    var node = this;

    node.on('input', function(msg) {
      const payload = {};
      Object.keys(msg.payload).sort().forEach(function(key) {
        payload[key] = msg.payload[key];
      });
      _control.call(this, node, msg.payload, function() {});
    });

    node.on('close', function(callback) {
      callback();
    });
  }

  RED.nodes.registerType("hb-control", hbControl);

  /**
   * hbStatus - description
   *
   * @param  {type} n description
   * @return {type}   description
   */

  function hbStatus(n) {
    RED.nodes.createNode(this, n);
    this.conf = RED.nodes.getNode(n.conf); // The configuration node
    this.confId = n.conf;
    this.device = n.device;
    this.service = n.Service;
    this.name = n.name;
    this.fullName = n.name + ' - ' + n.Service;

    var node = this;

    node.conf.register(node, function() {
      debug("hbStatus Registered:", node.fullName);
      this.hbDevice = hbDevices.findDevice(node.device);
      if (this.hbDevice) {
        node.hbDevice = this.hbDevice;
        node.deviceType = this.hbDevice.deviceType;
        // Register for events
        node.listener = node.command;
        // node.eventName = this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid;
      } else {
        node.error("437:Can't find device " + node.device, null);
        // this.error("Missing device " + node.device);
      }
    });

    node.on('input', function(msg) {
      _status(this.device, node, msg.payload, function(err, message) {
        if (!err) {
          debug("hbStatus received: %s = %s", JSON.stringify(node.fullName), JSON.stringify(message));
          var msg = {
            name: node.name,
            _rawMessage: message,
            payload: _convertHBcharactericToNode(message.characteristics, node)
          };
          if (node.hbDevice) {
            msg.Homebridge = node.hbDevice.homebridge;
            msg.Manufacturer = node.hbDevice.manufacturer;
            msg.Service = node.hbDevice.deviceType;
            msg._device = node.device;
            msg._confId = node.confId;
          }
          node.send(msg);
        } else {
          node.error(err);
        }
      });
    });

    node.on('close', function(callback) {
      callback();
    });
  }

  RED.nodes.registerType("hb-status", hbStatus);

  RED.httpAdmin.post('/hap-device/refresh/:id', RED.auth.needsPermission('hb-event.read'), function(req, res) {
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

  RED.httpAdmin.get('/hap-device/evDevices/', RED.auth.needsPermission('hb-event.read'), function(req, res) {
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

  RED.httpAdmin.get('/hap-device/evDevices/:id', RED.auth.needsPermission('hb-event.read'), function(req, res) {
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

  RED.httpAdmin.post('/hap-device/refresh/:id', RED.auth.needsPermission('hb-resume.read'), function(req, res) {
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

  RED.httpAdmin.get('/hap-device/evDevices/', RED.auth.needsPermission('hb-resume.read'), function(req, res) {
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

  RED.httpAdmin.get('/hap-device/evDevices/:id', RED.auth.needsPermission('hb-resume.read'), function(req, res) {
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

  RED.httpAdmin.get('/hap-device/ctDevices/', RED.auth.needsPermission('hb-control.read'), function(req, res) {
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

  RED.httpAdmin.get('/hap-device/ctDevices/:id', RED.auth.needsPermission('hb-control.read'), function(req, res) {
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
    var device = hbDevices.findDevice(node.device);
    // debug("Device", device);
    var payload = {};
    // characteristics = Object.assign(characteristics, characteristic.characteristic);
    if (device) {
      hbMessage.forEach(function(characteristic) {
        // debug("Exists", (device.characteristics[characteristic.aid + '.' + characteristic.iid]));
        if (device.characteristics[characteristic.aid + '.' + characteristic.iid]) {
          payload = Object.assign(payload, {
            [device.characteristics[characteristic.aid + '.' + characteristic.iid].characteristic]: characteristic.value
          });
        }
      });
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
    // debug("_createControlMessage", msg, device);
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

  function _status(nrDevice, node, value, callback) {
    // debug("_status", new Error(), hbDevices);
    var error;
    if (hbDevices) {
      var device = hbDevices.findDevice(node.device);
      if (device) {
        switch (device.service) {
          // Nothing specialized, yet
          default:
            var message = '?id=' + device.getCharacteristics;
            debug("_status request: %s -> %s:%s ->", node.fullName, device.host, device.port, message);
            homebridge.HAPstatus(device.host, device.port, message, function(err, status) {
              if (!err) {
                // debug("Status %s:%s ->", device.host, device.port, status);
                node.status({
                  text: 'sent',
                  shape: 'dot',
                  fill: 'green'
                });
                setTimeout(function() {
                  node.status({});
                }, 30 * 1000);
                callback(null, status);
              } else {
                error = device.host + ":" + device.port + " -> " + err + " -> " + status;
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
          text: 'error',
          shape: 'ring',
          fill: 'red'
        });
        callback(error);
      } // end of device if
    } else {
      error = "Homebridge not initialized: " + nrDevice;
      node.status({
        text: 'error',
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
    // debug("_control", node.device);
    var device = hbDevices.findDevice(node.device);
    if (device) {
      var message;
      switch (device.type) {
        case "00000111": // Camera
          message = {
            "resource-type": "image",
            "image-width": 1920,
            "image-height": 1080
          };
          debug("Control %s:%s ->", device.host, device.port, JSON.stringify(message));
          homebridge.HAPresource(device.host, device.port, JSON.stringify(message), function(err, status) {
            if (!err) {
              debug("Controlled %s:%s ->", device.host, device.port);
              node.status({
                text: JSON.stringify(payload),
                shape: 'dot',
                fill: 'green'
              });
              setTimeout(function() {
                node.status({});
              }, 30 * 1000);
              callback(null);
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
          // debug("Object type", typeof payload);
          if (typeof payload === "object") {
            message = _createControlMessage.call(this, payload, node, device);
            debug("Control %s:%s ->", device.host, device.port, JSON.stringify(message));
            if (message.characteristics.length > 0) {
              homebridge.HAPcontrol(device.host, device.port, JSON.stringify(message), function(err, status) {
                if (!err && status && status.characteristics[0].status === 0) {
                  debug("Controlled %s:%s ->", device.host, device.port, JSON.stringify(status));
                  node.status({
                    text: JSON.stringify(payload),
                    shape: 'dot',
                    fill: 'green'
                  });
                  setTimeout(function() {
                    node.status({});
                  }, 10 * 1000);
                  callback(null);
                } else if (!err) {
                  debug("Controlled %s:%s ->", device.host, device.port);
                  node.status({
                    text: "Ok",
                    shape: 'dot',
                    fill: 'green'
                  });
                  setTimeout(function() {
                    node.status({});
                  }, 10 * 1000);
                  callback(null);
                } else {
                  node.error(device.host + ":" + device.port + " -> " + err + " -> " + status);
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
            node.status({
              text: 'error - Invalid payload',
              shape: 'ring',
              fill: 'red'
            });
            var err = 'Invalid payload';
            callback(err);
          }
      } // End of switch
    } else {
      node.error("Device not found");
      node.status({
        text: 'error',
        shape: 'ring',
        fill: 'red'
      });
      callback();
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
    // debug("_register", node.device);
    var device = hbDevices.findDevice(node.device);
    if (node.type === 'hb-event' || node.type === 'hb-resume') {
      var message = {
        "characteristics": device.eventRegisters
      };
      // debug("Message", message);
      homebridge.HAPevent(device.host, device.port, JSON.stringify(message), function(err, status) {
        if (!err) {
          debug("%s registered: %s -> %s:%s", node.type, node.fullName, device.host, device.port, JSON.stringify(status));
          callback(null);
        } else {
          node.error(device.host + ":" + device.port + " -> " + err);
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
