var debug = require('debug')('hapNodeRed');

// var register = require('./lib/register.js');

const HBConfigNode = require('./hbConfigNode.js');
const HbEventNode = require('./hbEventNode'); // Import the class
const HbResumeNode = require('./hbResumeNode'); // Import the class
const HbControlNode = require('./hbControlNode');
const HbStatusNode = require('./hbStatusNode');

const HapDeviceRoutes = require('./HapDeviceRoutes');

module.exports = function (RED) {
  var evDevices = [];
  var ctDevices = [];
  var hbDevices;
  var homebridge;

  /**
   * hbConf - Configuration
   *
   * @param  {type} n description
   * @return {type}   description
   */

  class hbConfigNode extends HBConfigNode {
    constructor(config) {
      debug('hbConfigNode', config);
      super(config, RED);
    }
  }

  // console.log('Registering node types', "hb-conf", hbConfigNode);
  RED.nodes.registerType("hb-conf", hbConfigNode, {
    credentials: {
      password: {
        type: "password"
      }
    }
  });


  /**
   *  hbEventNode - description
   * @param {*} n 
   */
  class hbEventNode extends HbEventNode {
    constructor(config) {
      debug('hbEventNode', config);
      super(config, RED);
    }
  }

  RED.nodes.registerType("hb-event", hbEventNode);

  /**
   * hbResumeNode - description
   */
  class hbResumeNode extends HbResumeNode {
    constructor(config) {
      debug('hbResumeNode', config);
      super(config, RED);
    }
  }

  RED.nodes.registerType("hb-resume", hbResumeNode);

  class hbControlNode extends HbControlNode {
    constructor(config) {
      debug('hbControlNode', config);
      super(config, RED);
    }
  }

  RED.nodes.registerType("hb-control", hbControlNode);

  /**
   * hbStatus - description
   *
   * @param  {type} n description
   * @return {type}   description
   */
  class hbStatusNode extends HbStatusNode {
    constructor(config) {
      debug('hbStatusNode', config);
      super(config, RED);
    }
  }

  RED.nodes.registerType("hb-status", hbStatusNode);

  const hapDeviceRoutes = new HapDeviceRoutes(RED, hbDevices);
  hapDeviceRoutes.registerRoutes();

};
