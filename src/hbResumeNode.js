const HbBaseNode = require('./hbBaseNode'); // Path to the HbBaseNode file
const debug = require('debug')('hapNodeRed:hbResumeNode');

class HbResumeNode extends HbBaseNode {
  constructor(config, RED) {
    super(config, RED);


    this.state = null;
    this.lastMessageTime = null;
    this.lastMessageValue = null;
    this.lastPayload = { On: false };
    this.timeout = null;

    // Set up input and command handlers
    // this.on('input', this.handleInput.bind(this));
    this.command = this.handleCommand.bind(this);

    // Handle device registration
    debug('hbResume - hbConfigNode', this.hbConfigNode);
    // debug('hbResume - hbConfigNode', this.configNode.hbConfigNode);
    this.hbConfigNode.register(this.config, this.registerNode.bind(this));
  }

  handleInput(msg) {
    this.msg = msg;
    debug("hbResume.input: %s input", this.fullName, JSON.stringify(msg));

    if (typeof msg.payload === "object") {
      if (this.hbDevice) {
        const message = this._createControlMessage.call(this, msg.payload, this, this.hbDevice);

        if (message.characteristics.length > 0) {
          let newMsg;
          if (!msg.payload.On) {
            if (this.lastPayload.On) {
              newMsg = {
                name: this.name,
                _device: this.device,
                _confId: this.confId,
                payload: this.state,
                Homebridge: this.hbDevice?.homebridge,
                Manufacturer: this.hbDevice?.manufacturer,
                Type: this.hbDevice?.deviceType,
              };
            } else {
              this.state = JSON.parse(JSON.stringify(msg.payload));
              newMsg = msg;
            }
          } else {
            newMsg = msg;
          }

          this.send(newMsg.payload.On ? newMsg : { ...newMsg, payload: { On: false } });
          debug("hbResume.input: %s output", this.fullName, JSON.stringify(newMsg));
          this.updateStatus(newMsg.payload);
          this.lastMessageValue = newMsg.payload;
          this.lastMessageTime = Date.now();
          this.lastPayload = JSON.parse(JSON.stringify(msg.payload));
        }
      } else {
        this.handleError("Homebridge not initialized - 1");
      }
    } else {
      this.handleError(
        "Payload should be a JSON object containing device characteristics and values, e.g., {\"On\":false, \"Brightness\":0 }"
      );
    }
  }

  handleCommand(event) {
    const payload = { ...this.state, ...this._convertHBcharactericToNode([event], this) };
    debug("hbResume.event: %s %s -> %s", this.fullName, JSON.stringify(this.state), JSON.stringify(payload));

    if (event.status === true && event.value !== undefined) {
      if (Date.now() - this.lastMessageTime > 5000) {
        debug("hbResume.update: %s - updating stored event >5", this.fullName, payload);
        this.state = JSON.parse(JSON.stringify(payload));
      }
    } else if (event.status === true) {
      this.updateStatus({ text: 'connected', shape: 'dot', fill: 'green' });
    } else {
      this.updateStatus({ text: `disconnected: ${event.status}`, shape: 'ring', fill: 'red' });
    }
  }

  handleDeviceRegistration() {
    debug("hbResume.register:", this.fullName);
    this.hbDevice = hbDevices.findDevice(this.device, { perms: 'pw' });

    if (this.hbDevice) {
      this._status(this.device, this, { perms: 'pw' }, (err, message) => {
        if (!err) {
          this.state = this._convertHBcharactericToNode(message.characteristics, this);
          debug("hbResume received: %s = %s", this.fullName, JSON.stringify(message.characteristics).slice(0, 80) + '...');
        } else {
          this.error(err);
        }
      });

      this.deviceType = this.hbDevice.deviceType;
      this.listener = this.command;
      this.eventName = [];

      this.hbDevice.eventRegisters.forEach((event) => {
        homebridge.on(this.hbDevice.id + event.aid + event.iid, this.command);
        this.eventName.push(this.hbDevice.id + event.aid + event.iid);
      });

      this.updateStatus({ text: 'connected', shape: 'dot', fill: 'green' });
      this.resetTimeout(30000);
    } else {
      this.error(`Can't find device ${this.device}`);
    }
  }

  updateStatus(status) {
    this.status(status);
    this.resetTimeout(10000);
  }

  resetTimeout(duration) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.status({}), duration);
  }

  handleError(message) {
    this.error(message, this.msg);
    this.updateStatus({ text: message, shape: 'ring', fill: 'red' });
  }
}

module.exports = HbResumeNode;
