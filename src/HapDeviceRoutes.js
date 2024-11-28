const debug = require('debug')('hapNodeRed:HapDeviceRoutes');

class HapDeviceRoutes {
  constructor(RED) {
    this.RED = RED;
  }

  // POST /hap-device/refresh/:id
  refreshDevice(req, res) {
    const conf = this.RED.nodes.getNode(req.params.id);
    if (conf) {
      res.status(200).send();
    } else {
      debug("Can't refresh until deployed");
      res.status(404).send();
    }
  }

  // GET /hap-device/evDevices/
  getDevices(req, res, perms) {
    const devices = this.RED.nodes.getNode(req.params.id)?.evDevices;
    if (devices && devices.length) {
      res.send(devices);
    } else {
      res.status(404).send({ error: `No devices found for perms: ${perms}` });
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

  // Register all routes
  registerRoutes() {
    const routes = [
      { method: 'post', path: '/hap-device/refresh/:id', permission: 'hb-event.read', handler: this.refreshDevice },
      { method: 'get', path: '/hap-device/evDevices/', permission: 'hb-event.read', handler: (req, res) => this.getDevices(req, res, 'ev') },
      { method: 'get', path: '/hap-device/evDevices/:id', permission: 'hb-event.read', handler: (req, res) => this.getDeviceById(req, res, 'evDevices') },
      { method: 'post', path: '/hap-device/refresh/:id', permission: 'hb-resume.read', handler: this.refreshDevice },
      { method: 'get', path: '/hap-device/evDevices/', permission: 'hb-resume.read', handler: (req, res) => this.getDevices(req, res, 'ev') },
      { method: 'get', path: '/hap-device/evDevices/:id', permission: 'hb-resume.read', handler: (req, res) => this.getDeviceById(req, res, 'evDevices') },
      { method: 'get', path: '/hap-device/ctDevices/', permission: 'hb-control.read', handler: (req, res) => this.getDevices(req, res, 'pw') },
      { method: 'get', path: '/hap-device/ctDevices/:id', permission: 'hb-control.read', handler: (req, res) => this.getDeviceById(req, res, 'ctDevices') },
    ];

    routes.forEach(({ method, path, permission, handler }) => {
      this.RED.httpAdmin[method](path, this.RED.auth.needsPermission(permission), handler.bind(this));
    });
  }
}

module.exports = HapDeviceRoutes;
