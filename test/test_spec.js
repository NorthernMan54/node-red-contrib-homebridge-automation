// var should = require('should');
var os = require('os');
var path = require('path');
var helper = require('node-red-node-test-helper');
helper.init(require.resolve('node-red'), { userDir: os.tmpdir() });

var flows = require('./flows');
var hapNode = require('../HAP-NodeRed.js');

describe('HAP node', function () {
  before(function (done) {
    helper.startServer(done);
  });

  after(function (done) {
    helper.stopServer(done);
  });

  afterEach(function () {
    helper.unload();
  });

  it('should be loaded', function (done) {
    var flow = flows.getDefault();

    helper.load(hapNode, flow, function () {
      var conf1 = helper.getNode('conf1');
      conf1.should.have.property('macAddress', 'AA:BB:CC:DD:EE:FF');
      var stat1 = helper.getNode('status1');
      stat1.should.have.property('name', 'StatusNode1');
      var ctl1 = helper.getNode('control1');
      ctl1.should.have.property('name', 'ControlNode1');
      var logEvents = helper.log().args.filter(function (evt) {
        return evt[0].type == 'hb-conf' || evt[0].type == 'hb-status';
      });
      logEvents.should.have.length(0);
      done();
    });
  });
});
