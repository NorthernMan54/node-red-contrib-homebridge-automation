var HAPNodeJSClient = require('hap-node-client').HAPNodeJSClient;
var debug = require('debug')('hapNodeRed');
var register = require('./lib/register.js');
var Queue = require('better-queue');

module.exports = function(RED) {
  var evDevices = [];
  var ctDevices = [];
  var homebridge;

  function hbConf(n) {
    RED.nodes.createNode(this, n);
    this.username = n.username;
    this.password = this.credentials.password;

    var q = new Queue(function(options, cb) {
      _register(options, cb);
    }, {
      concurrent: 1,
      autoResume: false
    });

    var options = {
      "pin": n.username,
      "refresh": 900,
      "debug": true
    };

    this.users = {};

    if (!homebridge) {
      homebridge = new HAPNodeJSClient(options);
      q.pause();
      homebridge.on('Ready', function(accessories) {
        evDevices = register.registerEv(homebridge, accessories);
        ctDevices = register.registerCt(homebridge, accessories);
        debug('Discovered %s evDevices', evDevices.length);

        evDevices.sort((a, b) => (a.sortName > b.sortName) ? 1 : ((b.sortName > a.sortName) ? -1 : 0));
        ctDevices.sort((a, b) => (a.sortName > b.sortName) ? 1 : ((b.sortName > a.sortName) ? -1 : 0));

        debug('Discovered %s ctDevices', ctDevices.length);
        // debug("Register Queue", q.getStats().peak);
        q.resume();
      });
    }

    var node = this;

    this.connect = function(done) {
      done();
    };

    this.register = function(deviceNode, done) {
      node.users[deviceNode.id] = deviceNode;
      debug("Register %s -> %s", deviceNode.type, deviceNode.name);
      q.push({
        device: deviceNode.device,
        type: deviceNode.type,
        name: deviceNode.name,
        node: node
      }, done);
    };

    this.deregister = function(deviceNode, done) {
      deviceNode.status({
        text: 'disconnected',
        shape: 'ring',
        fill: 'red'
      });
      // Should this also remove the homebridge registered event?
      //
      debug("hbEvent deregistered:", deviceNode.name);
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

  function hbEvent(n) {
    RED.nodes.createNode(this, n);
    this.conf = RED.nodes.getNode(n.conf);
    this.confId = n.conf;
    this.device = n.device;
    this.hapEndpoint = n.hapEndpoint;
    this.deviceType = n.deviceType;
    this.hbDevice = n.hbDevice;
    this.name = n.name;

    var node = this;

    node.command = function(event) {
      debug("hbEvent received event: %s ->", node.name, event);
      var msg = {
        name: node.name,
        payload: event.status,
        Homebridge: node.hbDevice.homebridge,
        Manufacturer: node.hbDevice.manufacturer,
        Type: node.hbDevice.deviceType,
        Function: node.hbDevice.function,
        _device: node.device,
        _confId: node.confId,
        _rawEvent: event
      };
      node.send(msg);
    };

    node.conf.register(node, function() {
      this.hbDevice = _findEndpoint(evDevices, node.device);
      if (this.hbDevice) {
        node.hapEndpoint = 'host: ' + this.hbDevice.host + ':' + this.hbDevice.port + ', aid: ' + this.hbDevice.aid + ', iid: ' + this.hbDevice.iid;
        node.hbDevice = this.hbDevice;
        node.deviceType = this.hbDevice.deviceType;
        // Register for events
        node.listener = node.command;
        node.eventName = this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid + this.hbDevice.iid;
        homebridge.on(this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid + this.hbDevice.iid, node.command);
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

  function hbState(n) {
    RED.nodes.createNode(this, n);
    this.conf = RED.nodes.getNode(n.conf);
    this.confId = n.conf;
    this.device = n.device;
    this.hapEndpoint = n.hapEndpoint;
    this.deviceType = n.deviceType;
    this.hbDevice = n.hbDevice;
    this.name = n.name;
    var node = this;

    node.state = null;

    // State operating model
    // - Store msg into node.lastpayload
    // - Store device state into node.state on events
    //
    // Turn on message just passes thru
    // - if msg = on
    //
    // First turn off message restores state from Turn on
    // - if msg = off and node.lastpayload === on
    //
    // Second turn off message just passes thru
    // - if msg = off and node.lastpayload === off
    // - Update stored device state to off

    node.on('input', function(msg) {
      var newMsg;
      if (!msg.payload) {
        // false / Turn Off
        newMsg = {
          name: node.name,
          Homebridge: node.hbDevice.homebridge,
          Manufacturer: node.hbDevice.manufacturer,
          Type: node.hbDevice.deviceType,
          Function: node.hbDevice.function,
          _device: node.device,
          _confId: node.confId
        };
        if (node.lastpayload) {
          // last msg was on, restore previous state
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
      node.send(newMsg);
      node.lastpayload = msg.payload;
    });

    node.command = function(event) {
      debug("hbState received event: %s ->", node.name, event);
      node.state = event.status;
    };

    node.conf.register(node, function() {
      this.hbDevice = _findEndpoint(evDevices, node.device);
      if (this.hbDevice) {
        _status(node.device, node, '', function(err, message) {
          if (!err) {
            debug("hbStatus received: %s = %s", node.name, message.characteristics[0].value);
            node.state = message.characteristics[0].value;
          } else {
            debug("hbStatus _status: error", node.name, err);
          }
        });
        node.hapEndpoint = 'host: ' + this.hbDevice.host + ':' + this.hbDevice.port + ', aid: ' + this.hbDevice.aid + ', iid: ' + this.hbDevice.iid;
        node.hbDevice = this.hbDevice;
        node.deviceType = this.hbDevice.deviceType;
        // Register for events
        node.listener = node.command;
        node.eventName = this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid + this.hbDevice.iid;
        homebridge.on(this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid + this.hbDevice.iid, node.command);
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

  RED.nodes.registerType("hb-state", hbState);

  function hbControl(n) {
    RED.nodes.createNode(this, n);
    this.conf = RED.nodes.getNode(n.conf); // The configuration node
    this.confId = n.conf;
    this.device = n.device;
    this.hapEndpoint = n.hapEndpoint;
    this.deviceType = n.deviceType;
    this.hbDevice = n.hbDevice;
    this.name = n.name;

    var node = this;

    node.on('input', function(msg) {
      _control(this.device, node, msg.payload, function() {});
    });

    node.on('close', function(done) {
      done();
    });
  }

  RED.nodes.registerType("hb-control", hbControl);

  function hbStatus(n) {
    RED.nodes.createNode(this, n);
    this.conf = RED.nodes.getNode(n.conf); // The configuration node
    this.confId = n.conf;
    this.device = n.device;
    this.deviceType = n.Type;
    this.hbDevice = _findEndpoint(evDevices, n.device);
    this.name = n.name;

    var node = this;

    node.conf.register(node, function() {
      debug("hbStatus Registered:", node.name);
      this.hbDevice = _findEndpoint(evDevices, node.device);
      if (this.hbDevice) {
        node.hapEndpoint = 'host: ' + this.hbDevice.host + ':' + this.hbDevice.port + ', aid: ' + this.hbDevice.aid + ', iid: ' + this.hbDevice.iid;
        node.hbDevice = this.hbDevice;
        node.deviceType = this.hbDevice.deviceType;
        // Register for events
        node.listener = node.command;
        node.eventName = this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid + this.hbDevice.iid;
      } else {
        node.error("Can't find device " + node.device, null);
        debug("Missing device", node.device);
      }
    });

    node.on('input', function(msg) {
      _status(this.device, node, msg.payload, function(err, message) {
        if (!err) {
          debug("hbStatus received: %s = %s", node.name, message.characteristics[0].value);
          var msg = {
            name: node.name,
            payload: message.characteristics[0].value,
            Homebridge: node.hbDevice.homebridge,
            Manufacturer: node.hbDevice.manufacturer,
            Type: node.hbDevice.deviceType,
            Function: node.hbDevice.function,
            _device: node.device,
            _confId: node.confId
          };
          node.send(msg);
        } else {
          debug("hbStatus _status: error", node.name, err);
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
    debug("evDevices", evDevices.length);
    if (evDevices) {
      res.send(evDevices);
    } else {
      res.status(404).send();
    }
  });

  RED.httpAdmin.get('/hap-device/evDevices/:id', RED.auth.needsPermission('hb-event.read'), function(req, res) {
    debug("evDevices", evDevices.length);
    if (evDevices) {
      res.send(evDevices);
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
    debug("evDevices", evDevices.length);
    if (evDevices) {
      res.send(evDevices);
    } else {
      res.status(404).send();
    }
  });

  RED.httpAdmin.get('/hap-device/evDevices/:id', RED.auth.needsPermission('hb-state.read'), function(req, res) {
    debug("evDevices", evDevices.length);
    if (evDevices) {
      res.send(evDevices);
    } else {
      res.status(404).send();
    }
  });

  RED.httpAdmin.get('/hap-device/ctDevices/', RED.auth.needsPermission('hb-control.read'), function(req, res) {
    debug("ctDevices", ctDevices.length);
    if (ctDevices) {
      res.send(ctDevices);
    } else {
      res.status(404).send();
    }
  });

  RED.httpAdmin.get('/hap-device/ctDevices/:id', RED.auth.needsPermission('hb-control.read'), function(req, res) {
    debug("ctDevices", ctDevices.length);
    if (ctDevices) {
      res.send(ctDevices);
    } else {
      res.status(404).send();
    }
  });

  function _status(nrDevice, node, value, done) {
    var endpoint = _findEndpoint(evDevices, nrDevice);
    if (endpoint) {
      switch (endpoint.service) {
        // Nothing specialized, yet
        default:
          var message = '?id=' + endpoint.aid + '.' + endpoint.iid;
          debug("hbStatus request: %s -> %s:%s ->", node.name, endpoint.host, endpoint.port, message);
          homebridge.HAPstatus(endpoint.host, endpoint.port, message, function(err, status) {
            if (!err) {
              // debug("Status %s:%s ->", endpoint.host, endpoint.port, status);
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
              debug("Error: Status %s:%s ->", endpoint.host, endpoint.port, err, status);
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

  function _control(nrDevice, node, value, done) {
    debug("_control", nrDevice, ctDevices.length);
    var endpoint = _findEndpoint(ctDevices, nrDevice);
    if (endpoint) {
      var message;
      switch (endpoint.service) {
        case "00000111": // Camera
          message = {
            "resource-type": "image",
            "image-width": 1920,
            "image-height": 1080
          };
          debug("Control %s:%s ->", endpoint.host, endpoint.port, message);
          homebridge.HAPresource(endpoint.host, endpoint.port, JSON.stringify(message), function(err, status) {
            if (!err) {
              debug("Controlled %s:%s ->", endpoint.host, endpoint.port);
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
              debug("Error: Control %s:%s ->", endpoint.host, endpoint.port, err);
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
          message = {
            "characteristics": [{
              "aid": endpoint.aid,
              "iid": endpoint.iid,
              "value": value
            }]
          };
          debug("Control %s:%s ->", endpoint.host, endpoint.port, message);
          homebridge.HAPcontrol(endpoint.host, endpoint.port, JSON.stringify(message), function(err, status) {
            if (!err) {
              debug("Controlled %s:%s ->", endpoint.host, endpoint.port, status);
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
              debug("Error: Control %s:%s ->", endpoint.host, endpoint.port, err, status);
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
      debug("Control Device not found", nrDevice);
      node.status({
        text: 'error',
        shape: 'ring',
        fill: 'red'
      });
      done();
    }
  }

  function _register(options, done) {
    var endpoint = _findEndpoint(evDevices, options.device);
    if (endpoint && (options.type === 'hb-event' || options.type === 'hb-state')) {
      var message = {
        "characteristics": [{
          "aid": endpoint.aid,
          "iid": endpoint.iid,
          "ev": true
        }]
      };
      homebridge.HAPcontrol(endpoint.host, endpoint.port, JSON.stringify(message), function(err, status) {
        if (!err) {
          debug("hbEvent registered: %s -> %s:%s", options.name, endpoint.host, endpoint.port, status);
          done(null);
        } else {
          debug("hbEvent Error: Event Register %s:%s ->", endpoint.host, endpoint.port, err, status);
          done(err);
        }
      });
    } else {
      done(null);
    }
  }
};

function _findEndpoint(devices, nrDevice) {
  var match = null;
  devices.forEach(function(device) {
    if (device.uniqueId === nrDevice) {
      match = device;
    }
  });
  return match;
}
