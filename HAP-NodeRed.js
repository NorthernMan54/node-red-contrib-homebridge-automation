var HAPNodeJSClient = require('hap-node-client').HAPNodeJSClient;
var debug = require('debug')('hapNodeRed');
var register = require('./lib/register.js');

module.exports = function(RED) {
  var devices = [];



  /*
  homebridge.on('hapEvent', function(message) {
    debug('Event', message);
    node.send({
      "payload": message
    });
  }.bind(this));
  */




  function HAPNodeRed(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    // debug("This", node);
  }


  RED.nodes.registerType("HAP-NodeRed", HAPNodeRed);

  function hapConf(n) {
    RED.nodes.createNode(this, n);
    this.username = n.username;
    this.password = this.credentials.password;

    var options = {
      "pin": n.username,
      "refresh": 900,
      "debug": true
    };

    this.users = {};

    var node = this;

    // getDevices(node.username, node.password, node.id);

    this.connect = function() {

      var homebridge = new HAPNodeJSClient(options);

      homebridge.on('Ready', function(accessories) {

        devices = register.register(homebridge, accessories);
        debug('Discovered', devices.length);
        // debug('Discovered', accessories);
        // registerEvents(register.register(homebridge, accessories), homebridge);
        // debug("Register", JSON.stringify(register.register(this.homebridge, devices)));
      }.bind(this));



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
    }

    this.setStatus = function(status) {
      for (var id in node.users) {
        if (node.users.hasOwnProperty(id)) {
          node.users[id].status(status);
        }
      }
    }

    this.register = function(deviceNode) {
      node.users[deviceNode.id] = deviceNode;
      if (Object.keys(node.users).length === 1) {
        //connect
        node.connect();
      }
    };

    this.deregister = function(deviceNode, done) {
      delete node.users[deviceNode.id];

      if (Object.keys(node.users).length === 0) {
        //disconnect
        if (node.client && node.client.connected) {
          node.client.end(done);
        } else {
          node.client.end();
          done();
        }
      }

      done();
    };

    this.acknoledge = function(messageId, device, success, extra) {
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
      //node.removeAllListeners();
      //delete devices[node.id];
    });
  };

  RED.nodes.registerType("hap-conf", hapConf, {
    credentials: {
      password: {
        type: "password"
      }
    }
  });

  function hapDevice(n) {
    RED.nodes.createNode(this, n);
    this.conf = RED.nodes.getNode(n.conf);
    this.confId = n.conf;
    this.device = n.device;
    this.topic = n.topic;
    this.acknoledge = n.acknoledge;
    this.name = n.name;

    debug("hapDevice", this);

    var node = this;

    node.command = function(message) {
      var msg = {
        topic: node.topic || "",
        name: node.name,
        _messageId: message.header.messageId,
        _applianceId: message.payload.appliance.applianceId,
        _confId: node.confId,
        command: message.header.name,
        extraInfo: message.payload.appliance.additionalApplianceDetails
      }

      var responseExtra;
      var respond = true;

      node.send(msg);
      if (node.acknoledge && respond) {
        node.conf.acknoledge(message.header.messageId, node.device, true, responseExtra);
      }
    }

    node.conf.register(node);

    node.on('close', function(done) {
      node.conf.deregister(node, done);
    });

  }


  RED.nodes.registerType("hap-device", hapDevice);

  RED.httpAdmin.post('/hap-device/refresh/',function(req,res){
      var id = req.params.id;
      var conf = RED.nodes.getNode(id);
      if (conf) {
          var username = conf.username;
          var password = conf.credentials.password;
          getDevices(username,password,id);
          res.status(200).send();
      } else {
          //not deployed yet
          console.log("Can't refresh until deployed");
          res.status(404).send();
      }
  });

  RED.httpAdmin.get('/hap-device/devices/',function(req,res){
    // debug("Devices", devices);
    if (devices) {
      res.send(devices);
    } else {
      res.status(404).send();
    }
  });

  RED.httpAdmin.get('/hap-device/devices/:id',function(req,res){
    // debug("Devices", devices);
    if (devices) {
      res.send(devices);
    } else {
      res.status(404).send();
    }
  });
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
