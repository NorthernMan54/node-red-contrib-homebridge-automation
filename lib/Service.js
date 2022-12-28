var debug = require('debug')('Service');
var Characteristic = require('./Characteristic.js').Characteristic;

module.exports = {
  Service: Service
};

/*
 * Homebridges -> Homebridge -> Accessory -> Service -> Characteristic
 */

/*

This is a typical Service

{
  "iid": 8,
  "type": "0000008A-0000-1000-8000-0026BB765291",
  "characteristics": [{
    "iid": 9,
    "type": "00000023-0000-1000-8000-0026BB765291",
    "perms": ["pr"],
    "format": "string",
    "value": "Cold Cellar",
    "description": "Name"
  }, {
    "iid": 10,
    "type": "00000011-0000-1000-8000-0026BB765291",
    "perms": ["pr", "ev"],
    "format": "float",
    "value": 4.9,
    "description": "Current Temperature",
    "unit": "celsius",
    "maxValue": 100,
    "minValue": -100,
    "minStep": 0.1
  }, {
    "iid": 11,
    "type": "00000010-0000-1000-8000-0026BB765291",
    "perms": ["pr", "ev"],
    "format": "float",
    "value": 51,
    "description": "Current Relative Humidity",
    "unit": "percentage",
    "maxValue": 100,
    "minValue": 0,
    "minStep": 1
  }, {
    "iid": 12,
    "type": "E863F10F-079E-48FF-8F27-9C2605A29F52",
    "perms": ["pr", "ev"],
    "format": "uint8",
    "value": 1011,
    "description": "Air Pressure",
    "unit": "mbar",
    "maxValue": 1200,
    "minValue": 800,
    "minStep": 1
  }],
  "primary": false,
  "hidden": false
}
*/

function Service(devices, context) {
  // debug("Service", JSON.stringify(devices));
  this.iid = devices.iid;
  this.type = devices.type.substring(0, 8);
  this.service = _normalizeName(this.type);
  this.aid = context.aid;
  this.host = context.host;
  this.port = context.port;
  this.homebridge = context.homebridge;
  this.id = context.id;
  this.characteristics = [];
  // Fix for homebridge 1.3.0
  devices.characteristics.forEach(function(element) {
    // var service = new Characteristic(element, this);
    if (element.type.substring(0, 8) === '00000023' && element.description === "Name") {
      this.name = element.value;
    } else if (element.type.substring(0, 8) === '000000E3' && element.description === "Configured Name") {
      this.configuredName = element.value;
    } else {
      // this.characteristics.push(service);
    }
  }.bind(this));
  devices.characteristics.forEach(function(element) {
    var service = new Characteristic(element, this);
    if (element.type.substring(0, 8) === '00000023' && element.description === "Name") {
      this.name = element.value;
    } else if (element.type.substring(0, 8) === '000000E3' && element.description === "Configured Name") {
      this.configuredName = element.value;
    } else {
      this.characteristics.push(service);
    }
  }.bind(this));
  if (this.configuredName) {
    this.name = this.configuredName;
  }
// Uncomment to display services not defined
//  if (!this.service) {
//    console.log('Missing', devices);
//  }
}

Service.prototype.toList = function(context) {
  var descriptions;
  var getCharacteristics;
  var putCharacteristics = [];
  var eventRegisters = [];
  var characteristics = {};
  var fullName = context.name;

  if (this.name) {
    // Fix for #30
    if (context.manufacturer === "Nest" && (this.name === "Fan" || this.name === "Eco Mode")) {
      fullName = context.name + " - " + this.name;
    } else {
      context.name = this.name;
      fullName = context.name;
    }
  }

  for (var index in this.characteristics) {
    var characteristic = this.characteristics[index];
    // debug("characteristic", characteristic)
    // debug("perms", context.opt);
    // debug("perms", (context.opt ? "perms" + context.opt.perms + characteristic.perms.includes(context.opt.perms) : "noperms"));
    if (characteristic.type !== '00000023' && (context.opt ? characteristic.perms.includes(context.opt.perms) : true)) {
      // debug("Yes", context.name, characteristic.description, characteristic.perms);
      descriptions = (descriptions ? descriptions + ', ' : '') + characteristic.description.replace(/ /g, "").replace(/\./g, "_");
      getCharacteristics = (getCharacteristics ? getCharacteristics + ',' : '') + characteristic.getCharacteristic;
      // characteristics = (characteristics ? characteristics + ',' : '') + characteristic.characteristic;
      characteristics = Object.assign(characteristics, characteristic.characteristic);
      putCharacteristics = putCharacteristics.concat(characteristic.putCharacteristic);
      eventRegisters = eventRegisters.concat(characteristic.eventRegister);
    } else {
      // debug("No", context.name, characteristic.description, characteristic.perms);
    }
  }
  if (this.service && descriptions) {
    return ({
      homebridge: context.homebridge,
      host: context.host,
      port: context.port,
      id: context.id,
      manufacturer: context.manufacturer,
      aid: this.aid,
      type: this.type,
      name: fullName,
      service: this.service,
      fullName: fullName + ' - ' + this.service,
      sortName: fullName + ':' + this.service,
      uniqueId: context.homebridge + this.id + context.manufacturer + fullName + this.type,
      descriptions: descriptions,
      characteristics: characteristics,
      getCharacteristics: getCharacteristics,
      eventRegisters: eventRegisters
    });
  }
};

function _normalizeName(id) {
  switch (id) {
    case "00000111":
      return ("Camera Control");
    case "00000088":
      return ("Stateful Programmable Switch");
    case "000000A1":
      return ("Bridge Configuration");
    case "00000062":
      return ("Bridging State");
    case "00000055":
      return ("Pairing");
    case "000000A2":
      return ("Protocol Information");
    case "0000005A":
      return ("Relay");
    case "00000099":
      return ("Time Information");
    case "00000056":
      return ("Tunneled BTLEAccessory Service");
    case "00000129":
      return ("Data Stream Transport Management");
    case "00000122":
      return ("Target Control Management");
    case "00000125":
      return ("Target Control");
    case "00000127":
      return ("Audio Stream Management");
    case "00000133":
      return ("Siri");
    case "000000D8":
      return ("Television");
    case "000000D9":
      return ("Input Source");
    case "000000DA":
      return ("Access Control");
    case "0000003E":
      return ("Accessory Information");
    case "000000BB":
      return ("Air Purifier");
    case "0000008D":
      return ("Air Quality Sensor");
    case "00000096":
      return ("Battery Service");
    case "00000110":
      return ("Camera RTPStream Management");
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
    case "00000228":
      return ("Smart Speaker");
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
    case "0000021A":
      return ("Camera Operating Mode");
    case "00000204":
      return ("Camera Event Recording Management");
    case "0000020A":
      return ("WiFi Router");
    case "0000020F":
      return ("WiFi Satellite");
    case "00000221":
      return ("Power Management");
    case "00000203":
      return ("Transfer Transport Management");
    case "00000012":
      return ("Heartrate");
      // Eve types
    case "B77831FD":
      return ("Air Pressure Service");
    case "E863F007":
      return ("History Service");
    default:
      debug("Missing HB Type", id);
  }
}
