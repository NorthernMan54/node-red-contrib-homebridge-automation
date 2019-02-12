var debug = require('debug')('register');

module.exports = {
  register: register
};

function register(homebridge, devices) {
  // debug('Discovered', devices);
  var events = [];
  devices.forEach(function(element) {
    // debug('Device', element);
    events = events.concat(_instance(element));
  });
  return (events);
}

function _instance(instance) {
  // debug('Accessories', instance.accessories.accessories);
  var events = [];
  instance.accessories.accessories.forEach(function(accessory) {
    // debug('Accessory', instance.instance.txt);
    events = events.concat(_service({
      "host": instance.ipAddress,
      "port": instance.instance.port,
      "hbName": instance.instance.txt.md,
      "id": instance.instance.txt.id,
      "aid": accessory.aid
    }, accessory.services));
  });
  return (events);
}

function _service(context, accessory) {
  var events = [];
  accessory.forEach(function(service) {
    // debug('Service', service);
    switch (service.type.substring(0, 8)) {
      case "00000043": // Lightbulb
      case "00000047": // Outlet
      case "00000049": // Switch
      case "00000040": // Fan
      case "0000008C": // WindowCovering
      case "0000008A": // TemperatureSensor
      case "000000B7": // Fan 2 aka Dyson
      case "00000041": // Garage Door
      case "000000D0": // Valve aka sprinkler
        // case "0000003E": // AccessoryInformation
      case "0000004A": // Thermostat
      case "00000080": // Contact Sensor
      case "00000085": // Motion Sensor
        // debug('Supported Service', service);
        events = events.concat(_characteristics(context, service));
        // debug("Events", events);
        break;
      case "0000003E": // AccessoryInformation
        names = _name(context, service);
        // debug("Events", events);
        break;
      default:

    }
  });
  return (events);
}

function _characteristics(context, service) {
  // debug("Char", service, Array.isArray(service));

  var events = [];
  service.characteristics.forEach(function(characteristic) {
    switch (characteristic.type.substring(0, 8)) {
      case "00000020": // manufacturer
        context.manufacturer = characteristic.value;
        break;
      case "00000023": // name
        context.name = characteristic.value;
        break;
    }
    if (characteristic.perms.includes('ev')) {
      context.friendlyName = context.hbName + ' ' + context.name + ' ' + context.service;
      context.iid = characteristic.iid;
      context.description = characteristic.description;
      context.service = service.type.substring(0, 8);
      context.characteristic = characteristic.type.substring(0, 8);
      context.deviceType = _normalizeName(context.service);
      // debug("Register", context);
      context.friendlyName = context.hbName + ' ' + context.name + ' ' + _normalizeName(context.service) + ' ' + context.description;
      context.uniqueId = context.hbName + context.id + context.manufacturer + context.name + context.service + context.characteristic;

      events.push(JSON.parse(JSON.stringify(context)));
    }
  });
  // debug("Char Events", events);
  return (events);
}

function _name(context, service) {
  // debug("Char", service, Array.isArray(service));

  var manufacturer, name;
  service.characteristics.forEach(function(characteristic) {
    switch (characteristic.type.substring(0, 8)) {
      case "00000020": // manufacturer
        context.manufacturer = characteristic.value;
        break;
      case "00000023": // name
        context.name = characteristic.value;
        break;
    }
  });
  // debug("Char Events", events);
  // return ({ "manufacturer": manufacturer, "name": name});
}

function _normalizeName(id) {
  switch (id) {
    case "00000043": // Lightbulb
      return ("Lightbulb");
    case "00000047": // Outlet
      return ("Outlet");
    case "00000049": // Switch
      return ("Switch");
    case "000000B7": // Fan 2 aka Dyson
    case "00000040": // Fan
      return ("Fan");
    case "0000008C": // WindowCovering
      return ("Blinds");
    case "0000008A": // TemperatureSensor
      return ("Temperature");
    case "00000041": // Garage Door
      return ("Garage Door");
    case "000000D0": // Valve aka sprinkler
      return ("Sprinkler");
      // case "0000003E": // AccessoryInformation
    case "0000004A": // Thermostat
      return ("Thermostat");
    case "00000080": // Contact Sensor
      return ("Contact");
    case "00000085": // Motion Sensor
      return ("Motion");
    default:
      debug("Missing HB Type", id);
  }
}
