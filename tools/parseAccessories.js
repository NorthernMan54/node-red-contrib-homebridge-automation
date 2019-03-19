var Homebridges = require('../lib/Homebridges.js').Homebridges;
var fs = require('fs');

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
  accessories: JSON.parse(fs.readFileSync(process.argv[2]).toString())
}];
var hbDevices = new Homebridges(endPoints);

console.log(hbDevices.toList({
  perms: 'ev'
}));
