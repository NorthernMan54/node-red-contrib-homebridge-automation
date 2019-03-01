var debug = require('debug')('Characteristic');
// var Service = require('./Service.js').Service;

module.exports = {
  Characteristic: Characteristic
};

/*
{ iid: 10,
      type: '0000000F-0000-1000-8000-0026BB765291',
      perms: [Array],
      format: 'uint8',
      value: 1,
      description: 'Current Heating Cooling State',
      'valid-values': [Array],
      maxValue: 2,
      minValue: 0 }
*/

function Characteristic(devices) {
  // debug("Characteristic", devices);
  this.iid = devices.iid;
  this.type = devices.type.substring(0, 8);
  this.perms = devices.perms;
  this.value = devices.value;
  this.description = devices.description;
  // this.characteristics = [];
  // devices.characteristics.forEach(function(element) {
  // debug("Characteristic", element);
  // var service = new Service(element);
  // this.characteristics.push(service);
  // });
}

/*
{ host: '192.168.1.4',
  port: 51826,
  homebridge: 'Penny',
  id: 'CC:22:3D:E3:CE:30',
  aid: 36,
  manufacturer: 'MCUIOT',
  name: 'Cold Cellar',
  iid: 11,
  function: 'Current Relative Humidity',
  service: '0000008A',
  characteristic: '00000010',
  deviceType: 'Temperature',
  fullName: 'Cold Cellar - Temperature - Current Relative Humidity',
  sortName: 'Cold Cellar:Temperature:Current Relative Humidity',
  uniqueId: 'PennyCC:22:3D:E3:CE:30MCUIOTCold Cellar0000008A00000010' }
  */

Characteristic.prototype.toList = function(context) {
  // var list = [];
  context.iid = this.iid;
  context.type = this.type;
  return ({
    host: context.host,
    port: context.port,
    homebridge: context.homebridge,
    id: context.id,
    aid: context.aid,
    iid: this.iid,
    function: this.description,
    service: context.service,
    characteristic: this.type,
    name: context.name,
    deviceType: context.deviceType,
    fullName: context.name + ' - ' + context.deviceType + ' - ' + this.description,
    sortName: context.name + ':' + context.deviceType + ':' + this.description,
    uniqueId: context.homebridge + context.id + context.manufacturer + context.name + context.service + this.type
  });
};
