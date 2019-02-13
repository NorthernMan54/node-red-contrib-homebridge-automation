var HAPNodeJSClient = require('hap-node-client').HAPNodeJSClient;
var debug = require('debug')('hapNodeRed');
var register = require('./lib/register.js');

module.exports = function(RED) {
  var evDevices = [];
  var ctDevices = [];
  var homebridge;

  function hapConf(n) {
    debug("hapConf", n);
    RED.nodes.createNode(this, n);
    this.username = n.username;
    this.password = this.credentials.password;
    var registerQueue = [];

    var options = {
      "pin": n.username,
      "refresh": 900,
      "debug": true
    };

    this.users = {};

    if (!homebridge) {
      homebridge = new HAPNodeJSClient(options);
      homebridge.on('Ready', function(accessories) {
        evDevices = register.registerEv(homebridge, accessories);
        ctDevices = register.registerCt(homebridge, accessories);
        debug('Discovered %s evDevices', evDevices.length);
        debug('Discovered %s ctDevices', ctDevices.length);
        debug("registerQueue", registerQueue.length);

        var processItems = function(x) {
          if (x < registerQueue.length) {
            _register(registerQueue[x].device, node,
              function() {
                processItems(x + 1);
                registerQueue[x].done();
              });
          }
        };

        processItems(0);
      });
    }

    var node = this;

    // getDevices(node.username, node.password, node.id);

    this.connect = function(done) {
      done();
    };

    /*
      node.client = mqtt.connect(options);
      node.client.setMaxListeners(0);

      node.client.on('connect', function() {
        node.setStatus({
          text: 'connected',
          shape: 'dot',
          fill: 'green'
        });
        node.client.removeAllListeners('message');
        node.client.subscribe("command/" + node.username + "/#");
        node.client.on('message', function(topic, message) {
          var msg = JSON.parse(message.toString());
          var applianceId = msg.payload.appliance.applianceId;
          for (var id in node.users) {
            if (node.users.hasOwnProperty(id)) {
              if (node.users[id].device === applianceId) {
                node.users[id].command(msg);
              }
            }
          }
        });
      });

      node.client.on('offline', function() {
        node.setStatus({
          text: 'disconnected',
          shape: 'dot',
          fill: 'red'
        });
      });

      node.client.on('reconnect', function() {
        node.setStatus({
          text: 'reconnecting',
          shape: 'ring',
          fill: 'red'
        });
      });

      node.client.on('error', function(err) {
        //console.log(err);
        node.setStatus({
          text: 'disconnected',
          shape: 'dot',
          fill: 'red'
        });
        node.error(err);
      });
      */

    /*
    this.setStatus = function(status) {
      debug("setStatus", status);
      for (var id in node.users) {
        if (node.users.hasOwnProperty(id)) {
          // debug("setStatus-1", id);
          node.users[id].status(status);
        }
      }
    };
    */

    this.register = function(deviceNode, done) {
      debug("register", deviceNode.name);
      node.users[deviceNode.id] = deviceNode;
      if (deviceNode.device) {
        registerQueue.push({
          "device": deviceNode.device,
          "done": done
        });

        if (homebridge && registerQueue.length === 1) {
          var processItems = function(x) {
            if (x < registerQueue.length) {
              _register(registerQueue[x].device, node,
                function() {
                  processItems(x + 1);
                  registerQueue[x].done();
                });
            }
          };
          processItems(0);
        }
      } else {
        debug("No device to register", deviceNode.device);
      }
    };

    this.deregister = function(deviceNode, done) {
      debug("deregister", deviceNode);
      deviceNode.status({
        text: 'disconnected',
        shape: 'ring',
        fill: 'red'
      });
      debug("before count", homebridge.listenerCount(deviceNode.eventName));
      if (homebridge.listenerCount(deviceNode.eventName)) {
        homebridge.removeListener(deviceNode.eventName, deviceNode.listener);
      }
      debug("after count", homebridge.listenerCount(deviceNode.eventName));
      done();
    };

    this.acknoledge = function(messageId, device, success, extra) {
      debug("acknoledge", device);
      var response = {
        messageId: messageId,
        success: success
      };

      if (extra) {
        response.extra = extra;
      }

      // console.log("response: " + response);

      var topic = 'response/' + node.username + '/' + device;
      if (node.client && node.client.connected) {
        node.client.publish(topic, JSON.stringify(response));
      }
    };

    this.on('close', function() {
      if (node.client && node.client.connected) {
        node.client.end();
      }
      // node.removeAllListeners();
      // delete devices[node.id];
    });
  }

  RED.nodes.registerType("hap-conf", hapConf, {
    credentials: {
      password: {
        type: "password"
      }
    }
  });

  function hapEvent(n) {
    RED.nodes.createNode(this, n);
    this.conf = RED.nodes.getNode(n.conf);
    this.confId = n.conf;
    this.device = n.device;
    this.hapEndpoint = n.hapEndpoint;
    this.deviceType = n.deviceType;
    this.description = n.description;
    this.name = n.name;

    debug("hapEvent", n);

    var node = this;

    node.command = function(event) {
      debug("Sending event", event);
      var msg = {
        name: node.name,
        _confId: node.confId,
        _rawEvent: event,
        payload: event.status
      };
      node.send(msg);
    };

    node.conf.register(node, function() {
      debug("Registered", node.name);
      this.hapDevice = _findEndpoint(evDevices, node.device);
      if (this.hapDevice) {
        node.hapEndpoint = 'host: ' + this.hapDevice.host + ':' + this.hapDevice.port + ', aid: ' + this.hapDevice.aid + ', iid: ' + this.hapDevice.iid;
        node.description = this.hapDevice.description;
        node.deviceType = this.hapDevice.deviceType;
        // Register for events
        node.listener = node.command;
        node.eventName = this.hapDevice.host + this.hapDevice.port + this.hapDevice.aid + this.hapDevice.iid;
        homebridge.on(this.hapDevice.host + this.hapDevice.port + this.hapDevice.aid + this.hapDevice.iid, node.command);
        debug("after reg count", homebridge.listenerCount(node.eventName));
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

  RED.nodes.registerType("hap-event", hapEvent);

  function hapControl(n) {
    RED.nodes.createNode(this, n);
    this.conf = RED.nodes.getNode(n.conf); // The configuration node
    this.confId = n.conf;
    this.device = n.device;
    this.hapEndpoint = n.hapEndpoint;
    this.deviceType = n.deviceType;
    this.description = n.description;
    this.name = n.name;

    debug("hapControl", n);

    var node = this;

    node.on('input', function(msg) {
      _control(this.device, node, msg.payload, function() {
        // debug("Complete");
      });
    });

    node.on('close', function(done) {
      // Emitted when closing, not needed
      done();
      // node.conf.deregister(node, done);
    });
  }

  RED.nodes.registerType("hap-control", hapControl);

  RED.httpAdmin.post('/hap-device/refresh/', function(req, res) {
    var id = req.params.id;
    var conf = RED.nodes.getNode(id);
    if (conf) {
      var username = conf.username;
      var password = conf.credentials.password;
      getDevices(username, password, id);
      res.status(200).send();
    } else {
      // not deployed yet
      console.log("Can't refresh until deployed");
      res.status(404).send();
    }
  });

  RED.httpAdmin.get('/hap-device/evDevices/', function(req, res) {
    // debug("Devices", devices);
    if (evDevices) {
      res.send(evDevices);
    } else {
      res.status(404).send();
    }
  });

  RED.httpAdmin.get('/hap-device/evDevices/:id', function(req, res) {
    // debug("Devices", devices);
    if (evDevices) {
      res.send(evDevices);
    } else {
      res.status(404).send();
    }
  });

  RED.httpAdmin.get('/hap-device/ctDevices/', function(req, res) {
    // debug("Devices", devices);
    if (ctDevices) {
      res.send(ctDevices);
    } else {
      res.status(404).send();
    }
  });

  RED.httpAdmin.get('/hap-device/ctDevices/:id', function(req, res) {
    // debug("Devices", devices);
    if (ctDevices) {
      res.send(ctDevices);
    } else {
      res.status(404).send();
    }
  });

  //

  function _control(nrDevice, node, value, done) {
    debug("_control", nrDevice, ctDevices.length);
    var endpoint = _findEndpoint(ctDevices, nrDevice);
    if (endpoint) {
      var message = {
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
            node.status({
            });
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
    } else {
      debug("Control Device not found", nrDevice);
      done();
    }
  }

  function _register(nrDevice, node, done) {
    debug("_register", nrDevice, evDevices.length);
    var endpoint = _findEndpoint(evDevices, nrDevice);
    if (endpoint) {
      var message = {
        "characteristics": [{
          "aid": endpoint.aid,
          "iid": endpoint.iid,
          "ev": true
        }]
      };
      debug("Event Register %s:%s ->", endpoint.host, endpoint.port, message);
      homebridge.HAPcontrol(endpoint.host, endpoint.port, JSON.stringify(message), function(err, status) {
        if (!err) {
          debug("Registered Event %s:%s ->", endpoint.host, endpoint.port, status);
          done(null);
        } else {
          debug("Error: Event Register %s:%s ->", endpoint.host, endpoint.port, err, status);
          done(err);
        }
      });
    } else {
      done();
    }
  }
};

function _findEndpoint(devices, nrDevice) {
  var match = null;
  devices.forEach(function(device) {
    // debug("_find", device.uniqueId, "===", nrDevice);
    if (device.uniqueId === nrDevice) {
      match = device;
    }
  });
  return match;
}

function registerEvents(message, homebridge) {
  // debug("Register", message);

  var HBMessage = [];

  message.forEach(function(endpoint) {

    var device = {
      "aid": endpoint.aid,
      "iid": endpoint.iid,
      "ev": true
    };

    var x = {
      "host": endpoint.host,
      "port": endpoint.port
    };

    if (HBMessage[JSON.stringify(x)]) {
      HBMessage[JSON.stringify(x)].characteristics.push(device);
    } else {
      HBMessage[JSON.stringify(x)] = {
        "characteristics": [device]
      };
    }
  })
  for (var register in HBMessage) {
    // console.log("send", instance, HBMessage[instance]);
    var hbInstance = JSON.parse(register);
    debug("Event Register %s:%s ->", hbInstance.host, hbInstance.port, HBMessage[register]);
    homebridge.HAPcontrol(hbInstance.host, hbInstance.port, JSON.stringify(HBMessage[register]), function(err, status) {
      if (!err) {
        debug("Registered Event %s:%s ->", hbInstance.host, hbInstance.port, status);
      } else {
        debug("Error: Event Register %s:%s ->", hbInstance.host, hbInstance.port, err, status);
      }
    });
  }
}
