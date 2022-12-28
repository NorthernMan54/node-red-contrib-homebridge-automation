var Homebridges = require('../lib/Homebridges.js').Homebridges;
var normalizeUUID = require('../node_modules/hap-node-client/lib/util.js').normalizeUUID;
var fs = require('fs');
var response = fs.readFileSync(process.argv[2]).toString();
var accessories = normalizeUUID(JSON.parse(response.replace(/\uFFFD/g, '')));

// accessories = JSON.parse(response.replace(/\uFFFD/g, ''));

var endPoints = [{
  ipAddress: "127.0.0.1",
  instance: {
    port: 51826,
    txt: {
      md: 'parseTest',
      pv: '1.0',
      id: 'CC:22:3D:E3:CE:30',
      'c#': '63',
      's#': '1',
      ff: '0',
      ci: '2',
      sf: '0',
      sh: 'kD1sXg=='
    }
  },
  accessories: accessories
}];
var hbDevices = new Homebridges(endPoints);

console.log(JSON.stringify(hbDevices.toList({
  perms: 'ev'
}), null, 4));

var list = hbDevices.toList({
  perms: 'ev'
});

var deleteSeen = [];

for (var i = 0; i < list.length; i++) {
  var endpoint = list[i];
  // console.log("Checking", endpoint.fullName);
  if (deleteSeen[endpoint.fullName]) {
    console.log("WARNING: Duplicate device name", endpoint.fullName);
    // response.event.payload.endpoints.splice(i, 1);
  } else {
    deleteSeen[endpoint.fullName] = true;
  }
}

deleteSeen = [];

for (i = 0; i < list.length; i++) {
  endpoint = list[i];
  // console.log("Checking uniqueId", endpoint.uniqueId);
  if (deleteSeen[endpoint.uniqueId]) {
    console.log("ERROR: Parsing failed, duplicate uniqueID.", endpoint.fullName);
    // response.event.payload.endpoints.splice(i, 1);
  } else {
    deleteSeen[endpoint.uniqueId] = true;
  }
}
