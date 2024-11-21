var debug = require('debug')('hapNodeRed:hbControlNode');

function hbControl(n) {
  RED.nodes.createNode(this, n);
  this.conf = RED.nodes.getNode(n.conf); // The configuration node
  this.confId = n.conf;
  this.device = n.device;
  this.service = n.Service;
  this.name = n.name;
  this.fullName = n.name + ' - ' + n.Service;

  var node = this;

  node.on('input', function (msg) {
    this.msg = msg;
    _control.call(this, node, msg.payload, function (err, data) {
      // debug('hbControl complete [%s] - [%s]', node, node.hbDevice); // Images produce alot of noise
      if (!err && data && (node.deviceType == '00000110' || node.deviceType == '00000111')) {
        const msg = {
          name: node.name,
          payload: node.state,
          _device: node.device,
          _confId: node.confId
        };
        if (node.hbDevice) {
          msg.Homebridge = node.hbDevice.homebridge;
          msg.Manufacturer = node.hbDevice.manufacturer;
          msg.Service = node.hbDevice.deviceType;
        }
        msg.payload = data;
        node.send(msg);
      } else if (err) {
        node.error(err, this.msg);
      }
    }.bind(this));

  });

  node.on('close', function (callback) {
    callback();
  });

  node.conf.register(node, function () {
    debug("hbControl.register:", node.fullName);
    this.hbDevice = hbDevices.findDevice(node.device);
  //  console.log('hbControl Register', this.hbDevice)
    if (this.hbDevice) {
      node.hbDevice = this.hbDevice;
      node.deviceType = this.hbDevice.type;
      // Register for events
      node.listener = node.command;
      // node.eventName = this.hbDevice.host + this.hbDevice.port + this.hbDevice.aid;
    } else {
      node.error("437:Can't find device " + node.device, null);
      // this.error("Missing device " + node.device);
    }
  });
}