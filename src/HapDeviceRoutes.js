const debug = require('debug')('hapNodeRed:HapDeviceRoutes');

class HapDeviceRoutes {
  constructor(RED) {
    this.RED = RED;
  }

  // POST /hap-device/refresh/:id
  async refreshDevice(req, res) {
    const conf = this.RED.nodes.getNode(req.params.id);
    if (conf) {
      try {
        await conf.refreshDeviceList();
        res.status(200).send();
      } catch (e) {
        debug('Error refreshing devices: %s', e.message);
        res.status(500).send({ error: e.message });
      }
    } else {
      debug("Can't refresh until deployed");
      res.status(404).send();
    }
  }

  // GET /hap-device/evDevices/:id
  getDeviceById(req, res, key) {
    const devices = this.RED.nodes.getNode(req.params.id)?.[key];
    if (devices) {
      // debug(`${key} devices`, devices.length);
      res.send(devices);
    } else {
      res.status(404).send();
    }
  }

  // Register all routes — use hb-conf.read since all routes operate on
  // config node data and every homebridge node requires the config node
  registerRoutes() {
    const auth = this.RED.auth.needsPermission('hb-conf.read');

    this.RED.httpAdmin.post('/hap-device/refresh/:id', auth, this.refreshDevice.bind(this));
    this.RED.httpAdmin.get('/hap-device/evDevices/:id', auth, (req, res) => this.getDeviceById(req, res, 'evDevices'));
    this.RED.httpAdmin.get('/hap-device/ctDevices/:id', auth, (req, res) => this.getDeviceById(req, res, 'ctDevices'));
  }
}

module.exports = HapDeviceRoutes;
