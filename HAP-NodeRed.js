var HAPNodeJSClient = require('hap-node-client').HAPNodeJSClient;
var debug = require('debug')('hapNodeRed');
var register = require('./lib/register.js');

module.exports = function(RED) {
  var evDevices = [];
  var ctDevices = [];
  var homebridge;

  function hbConf(n) {
    debug("hbConf", n);
    RED.nodes.createNode(this, n);
    this.username = n.username;
    this.password = this.credentials.password;
    var registerQueue = [];

    var processItems = function(x) {
      if (x < registerQueue.length) {
        debug("registerQueue", x, registerQueue[x]);
        if (registerQueue[x]) {
          _register(registerQueue[x].device, node,
            function() {
              processItems(x + 1);
              var done = registerQueue[x].done;
              delete registerQueue[x];
              done();
            });
        } else {
          debug("ERROR: registerQueue");
        }
      }
    };

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

        evDevices.sort((a,b) => (a.sortName > b.sortName) ? 1 : ((b.sortName > a.sortName) ? -1 : 0));
        ctDevices.sort((a,b) => (a.sortName > b.sortName) ? 1 : ((b.sortName > a.sortName) ? -1 : 0));

        debug('Discovered %s ctDevices', ctDevices.length);
        debug("registerQueue", registerQueue.length);

        processItems(0);
      });
    }

    var node = this;

    // getDevices(node.username, node.password, node.id);

    this.connect = function(done) {
      done();
    };

    this.register = function(deviceNode, done) {
      debug("register", deviceNode.name);
      node.users[deviceNode.id] = deviceNode;
      if (deviceNode.device) {
        registerQueue.push({
          "device": deviceNode.device,
          "done": done
        });

        if (homebridge && evDevices.length > 0) {
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

  RED.nodes.registerType("hb-conf", hbConf, {
    credentials: {
      password: {
        type: "password"
      }
    }
  });

  /*
  name: 'Ceiling One light - On',
  Homebridge: 'Raj',
  Manufacturer: 'hampton-bay',
  Type: 'Lightbulb',
  Function: 'On',
  device: 'RajCC:22:3D:E3:CF:32hampton-bayCeiling One light0000004300000025',
  */

  function hbEvent(n) {
    RED.nodes.createNode(this, n);
    this.conf = RED.nodes.getNode(n.conf);
    this.confId = n.conf;
    this.device = n.device;
    this.hapEndpoint = n.hapEndpoint;
    this.deviceType = n.deviceType;
    this.hbDevice = n.hbDevice;
    this.name = n.name;

    debug("hbEvent", JSON.stringify(n));

    /*
    {"id":"7a703739.8abc5",
    "type":"hb-event",
    "z":"8cc57342.e61928",
    "name":"Table light - On",
    "Homebridge":"Raj-Hue",
    "Manufacturer":"ecoplug",
    "Type":"Outlet",
    "Function":"On",
    "device":"Raj-HueCC:22:3D:E3:CF:33ecoplugTable light0000004700000025",
    "conf":"ed5aee3b.502bd8","x":180,"y":280,"wires":[["9686581c.02b84","623a0ae2.2310dc"]]}
    */

    var node = this;

    node.command = function(event) {
      debug("Sending event", event);
      var msg = {
        name: node.name,
        payload: event.status,
        Homebridge: node.hbDevice.homebridge,
        Manufacturer: node.hbDevice.manufacturer,
        Type: node.hbDevice.deviceType,
        Function: node.hbDevice.function,
        _confId: node.confId,
        _rawEvent: event
      };
      node.send(msg);
    };

    node.conf.register(node, function() {
      debug("Registered", node.name);
      this.hbDevice = _findEndpoint(evDevices, node.device);
      if (this.hbDevice) {
        node.hapEndpoint = 'host: ' + this.hbDevice.host + ':' + this.hbDevice.port + ', aid: ' + this.hbDevice.aid + ', iid: ' + this.hbDevice.iid;
        node.hbDevice = this.hbDevice;
        node.deviceType = this.hbDevice.deviceType;
        // Register for events
        node.listener = node.command;
        node.eventName = this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid + this.hbDevice.iid;
        homebridge.on(this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid + this.hbDevice.iid, node.command);
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

  RED.nodes.registerType("hb-event", hbEvent);

  function hbControl(n) {
    RED.nodes.createNode(this, n);
    this.conf = RED.nodes.getNode(n.conf); // The configuration node
    this.confId = n.conf;
    this.device = n.device;
    this.hapEndpoint = n.hapEndpoint;
    this.deviceType = n.deviceType;
    this.hbDevice = n.hbDevice;
    this.name = n.name;

    debug("hbControl", n);

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

  RED.nodes.registerType("hb-control", hbControl);

  /* Device object
  { host: '192.168.1.253',
  port: 51827,
  hbName: 'Raj-Hue',
  id: 'CC:22:3D:E3:CF:33',
  aid: 15,
  manufacturer: 'ecoplug',
  name: 'Bunkie Porch',
  friendlyName: 'Raj-Hue Bunkie Porch Outlet On',
  iid: 10,
  description: 'On',
  service: '00000047',
  characteristic: '00000025',
  deviceType: 'Outlet',
  uniqueId: 'Raj-HueCC:22:3D:E3:CF:33ecoplugBunkie Porch0000004700000025' },
  */

  RED.httpAdmin.post('/hap-device/refresh/:id', RED.auth.needsPermission('hb-event.read'), function(req, res) {
    var id = req.params.id;
    var conf = RED.nodes.getNode(id);
    if (conf) {
      var username = conf.username;
      var password = conf.credentials.password;
      // getDevices(username, password, id);
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
      done(false);
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
