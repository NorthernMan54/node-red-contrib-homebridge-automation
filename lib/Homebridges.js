var debug = require('debug')('Homebridges');
var Homebridge = require('./Homebridge.js').Homebridge;

module.exports = {
  Homebridges: Homebridges
};

function Homebridges(devices) {
  // debug("Homebridges", devices);
  this.homebridges = [];
  devices.forEach(function(element) {
    var homebridge = new Homebridge(element);
    this.homebridges.push(homebridge);
  }.bind(this));
}

Homebridges.prototype.toList = function(opt) {
  var list = [];
  for (var index in this.homebridges) {
    var homebridge = this.homebridges[index];
    // list.push(homebridge.toList());
    list = list.concat(homebridge.toList(opt));
  }

  list.sort((a, b) => (a.sortName > b.sortName) ? 1 : ((b.sortName > a.sortName) ? -1 : 0));
  return (list);
};
