/**
   * hbEventNode - Node that listens to HomeKit Events, and sends message into NodeRED
   *
   * @param  {type} n description
   * @return {type}   description
   */

function hbEventNode(n) {
  // debug("hbEvent", n);
  RED.nodes.createNode(this, n);
  this.conf = RED.nodes.getNode(n.conf);
  this.confId = n.conf;
  this.device = n.device;
  this.service = n.Service;
  this.name = n.name;
  this.fullName = n.name + ' - ' + n.Service;
  this.sendInitialState = n.sendInitialState === true;
  this.state = {};

  var node = this;

  node.command = function (event) {
    // False messages can be received from accessories with multiple services
    // if (Object.keys(_convertHBcharactericToNode(event, node)).length > 0) {
    // debug("hbEvent", node.name, event);
    if (event.status === true && event.value !== undefined) {
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
        text: JSON.stringify(msg.payload).slice(0, 30) + '...',
        shape: 'dot',
        fill: 'green'
      });
      clearTimeout(node.timeout);
      node.timeout = setTimeout(function () {
        node.status({});
      }, 10 * 1000);
      node.send(msg);
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
  // };

  node.conf.register(node, function () {
    debug("hbEvent.register", node.fullName);
    this.hbDevice = hbDevices.findDevice(node.device, {
      perms: 'pr'
    });
    if (this.hbDevice) {
      node.hbDevice = this.hbDevice;
      node.deviceType = this.hbDevice.deviceType;

      _status(node.device, node, {
        perms: 'ev'
      }, function (err, message) {
        if (!err) {
          node.state = _convertHBcharactericToNode(message.characteristics, node);
          debug("hbEvent received: %s = %s", node.fullName, JSON.stringify(message.characteristics).slice(0, 80) + '...');
          if (node.sendInitialState) {
            var msg = {
              name: node.name,
              payload: node.state,
              Homebridge: node.hbDevice.homebridge,
              Manufacturer: node.hbDevice.manufacturer,
              Service: node.hbDevice.deviceType,
              _device: node.device,
              _confId: node.confId,
              _rawMessage: message,
            };
            node.status({
              text: JSON.stringify(msg.payload).slice(0, 30) + '...',
              shape: 'dot',
              fill: 'green'
            });
            clearTimeout(node.timeout);
            node.timeout = setTimeout(function () {
              node.status({});
            }, 10 * 1000);
            node.send(msg);
          }
        } else {
          node.error("hbEvent _status: error", node.fullName, err);
        }
      });
      // Register for events
      node.listener = node.command;
      node.eventName = [];
      // node.eventName = this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid;
      // debug("DEVICE", this.hbDevice);
      this.hbDevice.eventRegisters.forEach(function (event) {
        homebridge.on(node.hbDevice.id + event.aid + event.iid, node.command);
        node.eventName.push(node.hbDevice.id + event.aid + event.iid);
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

  node.on('close', function (callback) {
    node.conf.deregister(node, callback);
  });
}

RED.nodes.registerType("hb-event", hbEventNode);