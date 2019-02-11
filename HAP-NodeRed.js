var HAPNodeJSClient = require('hap-node-client').HAPNodeJSClient;
var debug = require('debug')('hapNodeRed');
var register = require('./lib/register.js');

module.exports = function(RED) {
  function HAPNodeRed(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    debug("This", node);
    var options = {
      "pin": "031-45-154",
      "refresh": 900,
      "debug": true
    };
    this.homebridge = new HAPNodeJSClient(options);

    this.homebridge.on('Ready', function(devices) {
      // debug('Discovered', devices);
      registerEvents(register.register(this.homebridge, devices), this.homebridge);
      // debug("Register", JSON.stringify(register.register(this.homebridge, devices)));
    }.bind(this));

    this.homebridge.on('hapEvent', function(message) {
      debug('Event', message);
      node.send({ "payload": message});
    }.bind(this));

    node.on('input', function(msg) {
      debug("Msg", msg);
      // msg.payload = msg.payload.toLowerCase();
      node.send(msg);
    });
  }
  RED.nodes.registerType("HAP-NodeRed", HAPNodeRed);
};

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
