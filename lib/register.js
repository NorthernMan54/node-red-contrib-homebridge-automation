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
    // debug('Accessory', accessory);
    events = events.concat(_service({
      "host": instance.ipAddress,
      "port": instance.instance.port,
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
        //      case "0000003E": // AccessoryInformation
      case "0000004A": // Thermostat
      case "00000080": // Contact Sensor
      case "00000085": // Motion Sensor
        // debug('Supported Service', service);
        events = events.concat(_characteristics(context, service));
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
    if (characteristic.perms.includes('ev')) {
      context.iid = characteristic.iid;
      context.description = characteristic.description;
      // debug("Register", context);
      events.push(JSON.parse(JSON.stringify(context)));
    }
  });
  // debug("Char Events", events);
  return (events);
}
