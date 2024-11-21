var debug = require('debug')('hapNodeRed');

// var register = require('./lib/register.js');

const HBConfNode = require('./hbConfigNode');
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

  function hbConfNode(config) {
    RED.nodes.createNode(this, config);
    this.username = config.username;
    this.macAddress = config.macAddress || '';
    this.password = this.credentials.password;

    this.hbConfNode = new HBConfNode(config, RED); // Initialize the class instance

    this.on('close', function () {
      this.hbConf.close(); // Close any open connections
    });
  }
  console.log('Registering node types', "hb-conf", hbConfNode);
  RED.nodes.registerType("hb-conf", hbConfNode, {
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
  function hbEventNode(n) {
    RED.nodes.createNode(this, n);

    // Create instance of HbEventNode class to handle events
    new HbEventNode(this, n); // Pass current node and config object
  }

  RED.nodes.registerType("hb-event", hbEventNode);

  /**
   * hbResumeNode - description
   */
  function hbResumeNode(n) {
    RED.nodes.createNode(this, n);

    // Create instance of HbEventNode class to handle events
    new HbResumeNode(this, n); // Pass current node and config object
  }

  RED.nodes.registerType("hb-resume", hbResumeNode);

  function hbControlNode(n) {
    RED.nodes.createNode(this, n);

    // Create instance of HbEventNode class to handle events
    new HbControlNode(this, n); // Pass current node and config object
  }

  RED.nodes.registerType("hb-control", hbControlNode);

  /**
   * hbStatus - description
   *
   * @param  {type} n description
   * @return {type}   description
   */


  function hbStatusNode(n) {
    RED.nodes.createNode(this, n);

    // Create instance of HbEventNode class to handle events
    new HbStatusNode(this, n); // Pass current node and config object
  }

  RED.nodes.registerType("hb-status", hbStatusNode);

  const hapDeviceRoutes = new HapDeviceRoutes(RED, hbDevices, debug);
  hapDeviceRoutes.registerRoutes();

};
