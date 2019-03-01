var debug = require('debug')('Accessory');
var Service = require('./Service.js').Service;

module.exports = {
  Accessory: Accessory
};

/*
{ aid: 1,
  services:
   [ { iid: 1,
       type: '0000003E-0000-1000-8000-0026BB765291',
       characteristics: [Array],
       primary: false,
       hidden: false },
     { iid: 2000000008,
       type: '49FB9D4D-0FEA-4BF1-8FA6-E7B18AB86DCE',
       characteristics: [Array],
       primary: false,
       hidden: false } ] }
*/

function Accessory(devices) {
  // debug("Accessory", devices);
  this.aid = devices.aid;
  this.services = [];
  devices.services.forEach(function(element) {
    // debug("Service", element);
    switch (element.type.substring(0, 8)) {
      case "0000003E": // Accessory Information
        this.info = information(element.characteristics);
        break;
      default:
        var service = new Service(element);
        this.services.push(service);
    }
  }.bind(this));
  // debug("Info", this.info);
}

Accessory.prototype.toList = function(context) {
  var list = [];
  context.aid = this.aid;
  context.name = this.info.Name;
  context.manufacturer = this.info.Manufacturer;
  for (var index in this.services) {
    var service = this.services[index];
    list = list.concat(service.toList(context));
  }

  return (list);
};

/*
[ { iid: 2,
    type: '00000014-0000-1000-8000-0026BB765291',
    perms: [Array],
    format: 'bool',
    description: 'Identify' },
  { iid: 3,
    type: '00000020-0000-1000-8000-0026BB765291',
    perms: [Array],
    format: 'string',
    value: 'NorthernMan54',
    description: 'Manufacturer' },
  { iid: 4,
    type: '00000021-0000-1000-8000-0026BB765291',
    perms: [Array],
    format: 'string',
    value: 'dht22',
    description: 'Model' },
  { iid: 5,
    type: '00000023-0000-1000-8000-0026BB765291',
    perms: [Array],
    format: 'string',
    value: 'Basement',
    description: 'Name' },
  { iid: 6,
    type: '00000030-0000-1000-8000-0026BB765291',
    perms: [Array],
    format: 'string',
    value: 'penny-Basement',
    description: 'Serial Number' },
  { iid: 7,
    type: '00000052-0000-1000-8000-0026BB765291',
    perms: [Array],
    format: 'string',
    value: '0.1.21',
    description: 'Firmware Revision' } ],
    */

/*
{ Identify: undefined,
  Manufacturer: 'Default-Manufacturer',
  Model: 'Default-Model',
  Name: 'FHall',
  SerialNumber: 'Default-SerialNumber',
  FirmwareRevision: '1.0' }
  */

function information(characteristics) {
  var result = {};
  characteristics.forEach(function(characteristic) {
    if (characteristic.description) {
      var key = characteristic.description.replace(/ /g, '').replace(/\./g, '_');
      result[key] = characteristic.value;
    }
  });
  return result;
}
