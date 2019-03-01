var debug = require('debug')('Service');
var Characteristic = require('./Characteristic.js').Characteristic;

module.exports = {
  Service: Service
};

/*
{ iid: 2000000008,
  type: '49FB9D4D-0FEA-4BF1-8FA6-E7B18AB86DCE',
  characteristics:
   [ { iid: 9,
       type: '77474A2F-FA98-485E-97BE-4762458774D8',
       perms: [Array],
       format: 'uint8',
       value: 0,
       description: 'State',
       maxValue: 1,
       minValue: 0,
       minStep: 1 },
     { iid: 10,
       type: 'FD9FE4CC-D06F-4FFE-96C6-595D464E1026',
       perms: [Array],
       format: 'string',
       value: '1.0',
       description: 'Version' },
     { iid: 11,
       type: '5819A4C2-E1B0-4C9D-B761-3EB1AFF43073',
       perms: [Array],
       format: 'data',
       value: null,
       description: 'Control Point' } ],
  primary: false,
  hidden: false }
*/

function Service(devices) {
  // debug("Service", devices);
  this.iid = devices.iid;
  this.service = devices.type.substring(0, 8);
  this.deviceType = _normalizeName(this.service);
  this.characteristics = [];
  devices.characteristics.forEach(function(element) {
    var service = new Characteristic(element);
    if (element.type.substring(0, 8) === '00000023') {
      this.name = element.value;
    } else {
      this.characteristics.push(service);
    }
  }.bind(this));
}

Service.prototype.toList = function(context) {
  var list = [];
  context.iid = this.iid;
  context.service = this.service;
  context.deviceType = this.deviceType;
  if (this.name) {
    context.name = this.name;
  }
  for (var index in this.characteristics) {
    var characteristic = this.characteristics[index];
    // debug("Characteristic", characteristic);
    if (characteristic.perms.includes(context.opt) && context.deviceType) {
      list = list.concat(characteristic.toList(context));
    }
  }
  return (list);
};

function _normalizeName(id) {
  switch (id) {
    case "0000003E":
      return ("Accessory Information");
    case "000000BB":
      return ("Air Purifier");
    case "0000008D":
      return ("Air Quality Sensor");
    case "00000096":
      return ("Battery Service");
    case "00000110":
      return ("Camera RTP Stream Management");
    case "00000097":
      return ("Carbon Dioxide Sensor");
    case "0000007F":
      return ("Carbon Monoxide Sensor");
    case "00000080":
      return ("Contact Sensor");
    case "00000081":
      return ("Door");
    case "00000121":
      return ("Doorbell");
    case "00000040":
      return ("Fan");
    case "000000B7":
      return ("Fan v2");
    case "000000BA":
      return ("Filter Maintenance");
    case "000000D7":
      return ("Faucet");
    case "00000041":
      return ("Garage Door Opener");
    case "000000BC":
      return ("Heater Cooler");
    case "000000BD":
      return ("Humidifier Dehumidifier");
    case "00000082":
      return ("Humidity Sensor");
    case "000000CF":
      return ("Irrigation System");
    case "00000083":
      return ("Leak Sensor");
    case "00000084":
      return ("Light Sensor");
    case "00000043":
      return ("Lightbulb");
    case "00000044":
      return ("Lock Management");
    case "00000045":
      return ("Lock Mechanism");
    case "00000112":
      return ("Microphone");
    case "00000085":
      return ("Motion Sensor");
    case "00000086":
      return ("Occupancy Sensor");
    case "00000047":
      return ("Outlet");
    case "0000007E":
      return ("Security System");
    case "000000CC":
      return ("Service Label");
    case "000000B9":
      return ("Slat");
    case "00000087":
      return ("Smoke Sensor");
    case "00000113":
      return ("Speaker");
    case "00000089":
      return ("Stateless Programmable Switch");
    case "00000049":
      return ("Switch");
    case "0000008A":
      return ("Temperature Sensor");
    case "0000004A":
      return ("Thermostat");
    case "000000D0":
      return ("Valve");
    case "0000008B":
      return ("Window");
    case "0000008C":
      return ("Window Covering");
    case "00000111":
      return ("Camera");
    default:
      debug("Missing HB Type", id);
  }
}
