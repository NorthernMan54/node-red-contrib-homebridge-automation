const debug = require('debug')('hapNodeRed:hbResumeNode');

function hbResumeNode(n) {
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

  node.on('input', function (msg) {
    this.msg = msg;
    debug("hbResume.input: %s input", node.fullName, JSON.stringify(msg));
    if (typeof msg.payload === "object") {
      // Using this to validate input message contains valid Accessory Characteristics
      if (node.hbDevice) { // not populated until initialization is complete
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
            text: JSON.stringify(newMsg.payload).slice(0, 30) + '...',
            shape: 'dot',
            fill: 'green'
          });
          clearTimeout(node.timeout);
          node.timeout = setTimeout(function () {
            node.status({});
          }, 10 * 1000);
          node.lastMessageValue = newMsg.payload;
          node.lastMessageTime = Date.now();
          // debug("hbResume.input: %s updating lastPayload %s", node.fullName, JSON.stringify(msg.payload));
          node.lastPayload = JSON.parse(JSON.stringify(msg.payload)); // store value not reference
        }
      } else {
        node.error("Homebridge not initialized - 1", this.msg);
        node.status({
          text: 'Homebridge not initialized -1',
          shape: 'ring',
          fill: 'red'
        });
      }
    } else {
      node.error("Payload should be an JSON object containing device characteristics and values, ie {\"On\":false, \"Brightness\":0 }\nValid values include: " + node.hbDevice.descriptions, this.msg);
      node.status({
        text: 'Invalid payload',
        shape: 'ring',
        fill: 'red'
      });
    }
  });

  node.command = function (event) {
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

    if (event.status === true && event.value !== undefined) {
      if ((Date.now() - node.lastMessageTime) > 5000) {
        debug("hbResume.update: %s - updating stored event >5", node.fullName, payload);
        node.state = JSON.parse(JSON.stringify(payload));
      } else if (_getObjectDiff(payload, node.lastMessageValue).length > 0) {
        // debug("hbResume - updating stored event !=", payload, node.lastMessageValue);
        // node.state = payload;
      }
    } else if (event.status === true) {
      node.status({
        text: 'connected',
        shape: 'dot',
        fill: 'green'
      });
    } else {
      node.status({
        text: 'disconnected: ' + event.status,
        shape: 'ring',
        fill: 'red'
      });
    }
  };

  node.conf.register(node, function () {
    debug("hbResume.register:", node.fullName);
    this.hbDevice = hbDevices.findDevice(node.device, {
      perms: 'pw'
    });
    if (this.hbDevice) {
      _status(node.device, node, {
        perms: 'pw'
      }, function (err, message) {
        if (!err) {
          node.state = _convertHBcharactericToNode(message.characteristics, node);
          debug("hbResume received: %s = %s", node.fullName, JSON.stringify(message.characteristics).slice(0, 80) + '...');
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
      this.hbDevice.eventRegisters.forEach(function (event) {
        homebridge.on(node.hbDevice.id + event.aid + event.iid, node.command);
        node.eventName.push(node.hbDevice.id + event.aid + event.iid);
      });
      node.status({
        text: 'connected',
        shape: 'dot',
        fill: 'green'
      });
      clearTimeout(node.timeout);
      node.timeout = setTimeout(function () {
        node.status({});
      }, 30 * 1000);
    } else {
      node.error("365:Can't find device " + node.device, null);
    }
  }.bind(this));

  node.on('close', function (callback) {
    node.conf.deregister(node, callback);
  });
}