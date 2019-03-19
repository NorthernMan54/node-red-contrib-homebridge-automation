var debug = require('debug')('Characteristic');
// var Service = require('./Service.js').Service;

module.exports = {
  Characteristic: Characteristic
};

/*
* Homebridges -> Homebridge -> Accessory -> Service -> Characteristic
*/

function Characteristic(devices, context) {
  // debug("Characteristic", devices);
  this.iid = devices.iid;
  this.type = devices.type.substring(0, 8);
  this.perms = devices.perms;
  this.value = devices.value;
  this.description = devices.description;
  this.characteristic = {};
  this.getCharacteristic = context.aid + '.' + this.iid;
  this.characteristic[this.getCharacteristic] = {
    characteristic: devices.description.replace(/ /g, "").replace(/\./g, "_"),
    iid: this.iid
  };
  this.eventRegister = {
    aid: context.aid,
    iid: this.iid,
    "ev": true
  };
}
