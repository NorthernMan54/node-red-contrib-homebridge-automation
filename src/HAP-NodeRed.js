var debug = require('debug')('hapNodeRed');

const HBConfigNode = require('./hbConfigNode.js');
const HbEventNode = require('./hbEventNode'); // Import the class
const HbResumeNode = require('./hbResumeNode'); // Import the class
const HbControlNode = require('./hbControlNode');
const HbStatusNode = require('./hbStatusNode');

const HapDeviceRoutes = require('./HapDeviceRoutes');

module.exports = function (RED) {
  var hbDevices;

  class hbConfigNode extends HBConfigNode {
    constructor(config) {
      debug('hbConfigNode', config);
      super(config, RED);
    }
  }

  RED.nodes.registerType("hb-conf", hbConfigNode, {
    credentials: {
      password: {
        type: "password"
      }
    }
  });

  class hbEventNode extends HbEventNode {
    constructor(config) {
      debug('hbEventNode', config);
      super(config, RED);
    }
  }

  RED.nodes.registerType("hb-event", hbEventNode);

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
