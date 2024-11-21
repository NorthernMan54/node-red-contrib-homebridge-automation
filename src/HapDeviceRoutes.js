// HapDeviceRoutes.js

class HapDeviceRoutes {
  constructor(RED, hbDevices, debug) {
    this.RED = RED;
    this.hbDevices = hbDevices;
    this.debug = debug;
  }

  // POST /hap-device/refresh/:id
  refreshDevice(req, res) {
    const id = req.params.id;
    const conf = this.RED.nodes.getNode(id);
    if (conf) {
      res.status(200).send();
    } else {
      console.log("Can't refresh until deployed");
      res.status(404).send();
    }
  }

  // GET /hap-device/evDevices/
  getEvDevices(req, res) {
    this.debug("evDevices", this.hbDevices.toList({ perms: 'ev' }).length);
    if (this.hbDevices) {
      res.send(this.hbDevices.toList({ perms: 'ev' }));
    } else {
      res.status(404).send();
    }
  }

  // GET /hap-device/evDevices/:id
  getEvDeviceById(req, res) {
    this.debug("evDevices", this.hbDevices.toList({ perms: 'ev' }).length);
    if (this.hbDevices) {
      res.send(this.hbDevices.toList({ perms: 'ev' }));
    } else {
      res.status(404).send();
    }
  }

  // POST /hap-device/refresh/:id for hb-resume
  refreshResumeDevice(req, res) {
    const id = req.params.id;
    const conf = this.RED.nodes.getNode(id);
    if (conf) {
      res.status(200).send();
    } else {
      console.log("Can't refresh until deployed");
      res.status(404).send();
    }
  }

  // GET /hap-device/evDevices/ for hb-resume
  getEvDevicesForResume(req, res) {
    this.debug("evDevices", this.hbDevices.toList({ perms: 'ev' }).length);
    if (this.hbDevices) {
      res.send(this.hbDevices.toList({ perms: 'ev' }));
    } else {
      res.status(404).send();
    }
  }

  // GET /hap-device/evDevices/:id for hb-resume
  getEvDeviceByIdForResume(req, res) {
    this.debug("evDevices", this.hbDevices.toList({ perms: 'ev' }).length);
    if (this.hbDevices) {
      res.send(this.hbDevices.toList({ perms: 'ev' }));
    } else {
      res.status(404).send();
    }
  }

  // GET /hap-device/ctDevices/
  getCtDevices(req, res) {
    this.debug("ctDevices", this.hbDevices.toList({ perms: 'pw' }).length);
    if (this.hbDevices) {
      res.send(this.hbDevices.toList({ perms: 'pw' }));
    } else {
      res.status(404).send();
    }
  }

  // GET /hap-device/ctDevices/:id
  getCtDeviceById(req, res) {
    this.debug("ctDevices", this.hbDevices.toList({ perms: 'pw' }).length);
    if (this.hbDevices) {
      res.send(this.hbDevices.toList({ perms: 'pw' }));
    } else {
      res.status(404).send();
    }
  }

  // Register all routes
  registerRoutes() {
    this.RED.httpAdmin.post('/hap-device/refresh/:id', this.RED.auth.needsPermission('hb-event.read'), this.refreshDevice.bind(this));
    this.RED.httpAdmin.get('/hap-device/evDevices/', this.RED.auth.needsPermission('hb-event.read'), this.getEvDevices.bind(this));
    this.RED.httpAdmin.get('/hap-device/evDevices/:id', this.RED.auth.needsPermission('hb-event.read'), this.getEvDeviceById.bind(this));
    this.RED.httpAdmin.post('/hap-device/refresh/:id', this.RED.auth.needsPermission('hb-resume.read'), this.refreshResumeDevice.bind(this));
    this.RED.httpAdmin.get('/hap-device/evDevices/', this.RED.auth.needsPermission('hb-resume.read'), this.getEvDevicesForResume.bind(this));
    this.RED.httpAdmin.get('/hap-device/evDevices/:id', this.RED.auth.needsPermission('hb-resume.read'), this.getEvDeviceByIdForResume.bind(this));
    this.RED.httpAdmin.get('/hap-device/ctDevices/', this.RED.auth.needsPermission('hb-control.read'), this.getCtDevices.bind(this));
    this.RED.httpAdmin.get('/hap-device/ctDevices/:id', this.RED.auth.needsPermission('hb-control.read'), this.getCtDeviceById.bind(this));
  }
}

module.exports = HapDeviceRoutes;
