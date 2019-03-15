var debug = require('debug')('hapNodeRed');
var Queue = require('better-queue');
var register = require('./lib/register.js');
var Homebridges = require('./lib/Homebridges.js').Homebridges;
var HAPNodeJSClient = require('hap-node-client').HAPNodeJSClient;

module.exports = function(RED) {
  var evDevices = [];
  var ctDevices = [];
  var hbDevices;
  var homebridge;
  var reqisterQueue = new Queue(function(node, cb) {
    // debug("deQueue", options.type, options.name);
    _register(node, cb);
  }, {
    concurrent: 1,
    autoResume: false
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
        "timeout": 5
      });
      reqisterQueue.pause();
      homebridge.on('Ready', function(accessories) {
        // evDevices = register.registerEv(homebridge, accessories);
        // ctDevices = register.registerCt(homebridge, accessories);
        hbDevices = new Homebridges(accessories);
        // debug("output", JSON.stringify(hbDevices.toList({ perms: 'ev'}), null, 4));
        // debug("evDevices", evDevices);
        // debug('Discovered %s evDevices', evDevices.length);
        debug('Discovered %s new evDevices', hbDevices.toList({perms: 'ev'}).length);
        // debug(hbDevices.toList({perms: 'pw'}));
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

    this.connect = function(done) {
      done();
    };

    this.register = function(deviceNode, done) {
      debug("hbConf.register", deviceNode.fullName);
      node.users[deviceNode.id] = deviceNode;
      debug("Register %s -> %s", deviceNode.type, deviceNode.fullName);
      reqisterQueue.push({
        device: deviceNode.device,
        type: deviceNode.type,
        name: deviceNode.name,
        fullName: deviceNode.fullName,
        node: node
      }, done);
      // debug("Register Queue - push", reqisterQueue.getStats());
    };

    this.deregister = function(deviceNode, done) {
      deviceNode.status({
        text: 'disconnected',
        shape: 'ring',
        fill: 'red'
      });
      // Should this also remove the homebridge registered event?
      //
      // debug("hbEvent deregistered:", deviceNode.name);
      if (homebridge.listenerCount(deviceNode.eventName)) {
        homebridge.removeListener(deviceNode.eventName, deviceNode.listener);
      }
      done();
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

    var node = this;

    node.command = function(event) {
      node.state = Object.assign(node.state, _convertHBcharactericToNode(event, node));
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
        text: 'sent',
        shape: 'dot',
        fill: 'green'
      });
      setTimeout(function() {
        node.status({});
      }, 30 * 1000);
      node.send(msg);
    };

    node.conf.register(node, function() {
      debug("hbEvent.register", node.fullName);
      this.hbDevice = hbDevices.findDevice(node.device);
      if (this.hbDevice) {
        _status(node.device, node, '', function(err, message) {
          if (!err) {
            node.state = _convertHBcharactericToNode(message.characteristics, node);
            debug("hbState received: %s = %s", node.fullName, JSON.stringify(message.characteristics), node.state);
          } else {
            debug("hbState _status: error", node.fullName, err);
          }
        });
        node.hbDevice = this.hbDevice;
        // Register for events
        node.listener = node.command;
        node.eventName = this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid;
        homebridge.on(this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid, node.command);
        node.status({
          text: 'connected',
          shape: 'dot',
          fill: 'green'
        });
      } else {
        node.error("Can't find device " + node.device, null);
        debug("Missing device", node.device);
      }
    });

    node.on('close', function(done) {
      node.conf.deregister(node, done);
    });
  }

  RED.nodes.registerType("hb-event", hbEvent);

  /**
   * hbState - description
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

  function hbState(n) {
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
      if (typeof msg.payload === "object") {
        var newMsg;
        if (!msg.payload.On) {
          // false / Turn Off
          // debug("hbState-Node", node);
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
              newMsg.Function = node.hbDevice.function;
            }
            newMsg.payload = node.state;
          } else {
            // last msg was off, pass thru
            node.state = msg.payload;
            newMsg = msg;
          }
        } else {
          // True / Turn on
          newMsg = msg;
        }
        node.status({
          text: 'sent',
          shape: 'dot',
          fill: 'green'
        });
        setTimeout(function() {
          node.status({});
        }, 30 * 1000);
        node.send(newMsg);
        node.lastMessageValue = newMsg.payload;
        node.lastMessageTime = Date.now();
        node.lastPayload = msg.payload;
      } else {
        debug("Error: hbState", node.fullName, "Invalid message");
        node.status({
          text: 'error - Invalid message',
          shape: 'ring',
          fill: 'red'
        });
      }
    });

    node.command = function(event) {
      // debug("hbState received event: %s ->", node.fullName, event);
      // debug("hbState - internals %s millis, old %s, event %s, previous %s", Date.now() - node.lastMessageTime, node.lastMessageValue, event.status, node.state);
      // Don't update for events originating from here
      // if Elapsed is greater than 5 seconds, update stored state
      // if Elapsed is less then 5, and lastMessage doesn't match event update stored state

      var payload = Object.assign({}, node.state);

      // debug("should be true", _getObjectDiff(payload, node.state).length);

      payload = Object.assign(payload, _convertHBcharactericToNode(event, node));

      // debug("should be false", _getObjectDiff(payload, node.state).length);

      debug("hbState.event %s %s -> %s", node.fullName, JSON.stringify(node.state), JSON.stringify(payload));

      if ((Date.now() - node.lastMessageTime) > 5000) {
        // debug("hbState - updating stored event >5", event.status);
        node.state = payload;
      } else if (_getObjectDiff(payload, node.lastMessageValue).length > 0) {
        // debug("hbState - updating stored event !=", event.status);
        node.state = payload;
      }
    };

    node.conf.register(node, function() {
      debug("hbState.register", node.fullName);
      this.hbDevice = hbDevices.findDevice(node.device);
      if (this.hbDevice) {
        _status(node.device, node, '', function(err, message) {
          if (!err) {
            node.state = _convertHBcharactericToNode(message.characteristics, node);
            debug("hbState received: %s = %s", node.fullName, JSON.stringify(message.characteristics), node.state);
          } else {
            debug("hbState _status: error", node.fullName, err);
          }
        });
        node.hbDevice = this.hbDevice;
        node.deviceType = this.hbDevice.deviceType;
        // Register for events
        node.listener = node.command;
        node.eventName = this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid;
        homebridge.on(this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid, node.command);
        node.status({
          text: 'sent',
          shape: 'dot',
          fill: 'green'
        });
        setTimeout(function() {
          node.status({});
        }, 30 * 1000);
      } else {
        node.error("Can't find device " + node.device, null);
        debug("Missing device", node.device);
      }
    });

    node.on('close', function(done) {
      node.conf.deregister(node, done);
    });
  }

  RED.nodes.registerType("hb-state", hbState);

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
      _control(node, msg.payload, function() {});
    });

    node.on('close', function(done) {
      done();
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
        node.eventName = this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid;
      } else {
        node.error("Can't find device " + node.device, null);
        debug("Missing device", node.device);
      }
    });

    node.on('input', function(msg) {
      _status(this.device, node, msg.payload, function(err, message) {
        if (!err) {
          debug("hbStatus received: %s = %s", JSON.stringify(node.fullName), JSON.stringify(message));
          var msg = {
            name: node.name,
            _rawMessage: message,
            payload: _convertHBcharactericToNode(message.characteristics, node),
            Homebridge: node.hbDevice.homebridge,
            Manufacturer: node.hbDevice.manufacturer,
            Service: node.hbDevice.deviceType,
            _device: node.device,
            _confId: node.confId
          };
          node.send(msg);
        } else {
          debug("hbStatus _status: error", node.fullName, err);
        }
      });
    });

    node.on('close', function(done) {
      done();
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

  RED.httpAdmin.post('/hap-device/refresh/:id', RED.auth.needsPermission('hb-state.read'), function(req, res) {
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

  RED.httpAdmin.get('/hap-device/evDevices/', RED.auth.needsPermission('hb-state.read'), function(req, res) {
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

  RED.httpAdmin.get('/hap-device/evDevices/:id', RED.auth.needsPermission('hb-state.read'), function(req, res) {
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
    // debug("_convertHBcharactericToNode", hbMessage);
    var device = hbDevices.findDevice(node.device);
    // debug("Device", device, device.characteristics[event.aid + '.' + event.iid]);
    var payload = {};
    // characteristics = Object.assign(characteristics, characteristic.characteristic);
    hbMessage.forEach(function(characteristic) {
      payload = Object.assign(payload, {
        [device.characteristics[characteristic.aid + '.' + characteristic.iid].characteristic]: characteristic.value
      });
    });

    return (payload);
  }

  /**
   * _createControlMessage - description
   *
   * @param  {type} msg    description
   * @param  {type} node   description
   * @param  {type} device description
   * @return {type}        description
   */

  function _createControlMessage(msg, node, device) {
    // debug("_createControlMessage", msg, device);
    // debug("Device", device, device.characteristics[event.aid + '.' + event.iid]);
    var payload = [];

    for (var key in msg) {
      // debug("IID", key, _getKey(device.characteristics, key));
      if (_getKey(device.characteristics, key)) {
        payload.push({
          "aid": device.aid,
          "iid": _getKey(device.characteristics, key).iid,
          "value": msg[key]
        });
      } else {
        debug("Error: missing characteristic", node.fullName, key, device);
      }
    }
    return ({
      "characteristics": payload
    });
  }

  /**
   * _status - description
   *
   * @param  {type} nrDevice description
   * @param  {type} node     description
   * @param  {type} value    description
   * @param  {type} done     description
   * @return {type}          description
   */

  function _status(nrDevice, node, value, done) {
    var device = hbDevices.findDevice(node.device);
    // debug("_status", device);
    if (device) {
      switch (device.service) {
        // Nothing specialized, yet
        default:
          var message = '?id=' + device.getCharacteristics;
          debug("hbStatus request: %s -> %s:%s ->", node.fullName, device.host, device.port, message);
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
              done(null, status);
            } else {
              debug("Error: Status %s:%s ->", device.host, device.port, err, status);
              node.status({
                text: 'error',
                shape: 'ring',
                fill: 'red'
              });
              done(err);
            }
          });
      } // End of switch
    } else {
      debug("hbStatus device not found", nrDevice);
      node.status({
        text: 'error',
        shape: 'ring',
        fill: 'red'
      });
      done();
    }
  }

  /**
   * _control - description
   *
   * @param  {type} nrDevice description
   * @param  {type} node     description
   * @param  {type} value    description
   * @param  {type} done     description
   * @return {type}          description
   */

  function _control(node, value, done) {
    // debug("_control", node);
    var device = hbDevices.findDevice(node.device);
    // debug("_control", device);
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
                text: 'sent',
                shape: 'dot',
                fill: 'green'
              });
              setTimeout(function() {
                node.status({});
              }, 30 * 1000);
              done(null);
            } else {
              debug("Error: Control %s:%s ->", device.host, device.port, err);
              node.status({
                text: 'error',
                shape: 'ring',
                fill: 'red'
              });
              done(err);
            }
          });
          break;
        default:
          message = _createControlMessage(value, node, device);
          debug("Control %s:%s ->", device.host, device.port, JSON.stringify(message));
          if (message.characteristics.length > 0) {
            homebridge.HAPcontrol(device.host, device.port, JSON.stringify(message), function(err, status) {
              if (!err && status.characteristics[0].status === 0) {
                debug("Controlled %s:%s ->", device.host, device.port, JSON.stringify(status));
                node.status({
                  text: 'sent',
                  shape: 'dot',
                  fill: 'green'
                });
                setTimeout(function() {
                  node.status({});
                }, 30 * 1000);
                done(null);
              } else {
                debug("Error: Control %s:%s ->", device.host, device.port, err, status);
                node.status({
                  text: 'error',
                  shape: 'ring',
                  fill: 'red'
                });
                done(err);
              }
            });
          } else {
            // Bad message
            debug("Error: Control %s:%s ->", device.host, device.port, "Invalid message");
            node.status({
              text: 'error - Invalid message',
              shape: 'ring',
              fill: 'red'
            });
          }
      } // End of switch
    } else {
      debug("Control Device not found", node.fullName);
      node.status({
        text: 'error',
        shape: 'ring',
        fill: 'red'
      });
      done();
    }
  }

  /**
   * _register - description
   *
   * @param  {type} node Node object
   * @Type  {object}
   * @property {boolean} name   - Node name
   * @property {string} device  - Node unique device identifier
   * @property {number} type    - Node type
   * @param  {type} done        - callback
   */

  function _register(node, done) {
    // debug("_register", node);
    var device = hbDevices.findDevice(node.device);
    // debug("Device", device);
    if (node.type === 'hb-event' || node.type === 'hb-state') {
      var message = {
        "characteristics": device.eventRegisters
      };
      // debug("Message", message);
      homebridge.HAPevent(device.host, device.port, JSON.stringify(message), function(err, status) {
        if (!err) {
          debug("%s registered: %s -> %s:%s", node.type, node.fullName, device.host, device.port, JSON.stringify(status));
          done(null);
        } else {
          console.log("%s Error: Event Register %s -> %s:%s ->", node.type, node.fullName, device.host, device.port, err, status);
          done(err);
        }
      });
    } else {
      done(null);
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
    if (obj[key].characteristic === value) {
      return obj[key];
    }
  }
  return null;
}
