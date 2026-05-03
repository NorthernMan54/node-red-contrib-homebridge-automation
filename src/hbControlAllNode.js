const HbGlobalNode = require('./hbGlobalNode');
const { filterIfOff } = require('./utils');
const debug = require('debug')('hapNodeRed:hbControlAllNode');

class HbControlAllNode extends HbGlobalNode {
  constructor(config, RED) {
    super(config, RED);
    this.on('input', this.handleInput.bind(this));
  }

  async handleInput(msg, _send, done) {
    const deviceName = msg.name;
    const chars = msg.payload;
    if (!deviceName) {
      this.status({ fill: 'red', shape: 'dot', text: 'missing name' });
      done('msg.name is required');
      return;
    }
    if (!chars || typeof chars !== 'object' || Object.keys(chars).length === 0) {
      this.status({ fill: 'red', shape: 'dot', text: 'empty payload' });
      done('No characteristics to set');
      return;
    }

    // Find device by friendlyName (same value hb-event-all emits as msg.name).
    // When multiple services share a name (e.g. "Hallway" as Lightbulb +
    // Occupancy Sensor), prefer the one that has the requested characteristics.
    const candidates = this.hbConfigNode.hbDevices.filter(
      s => s.friendlyName === deviceName
    );
    const device = candidates.find(
      s => s.setCharacteristicsByTypes && Object.keys(chars).some(k => k in s.values)
    ) || candidates[0];

    if (!device) {
      this.status({ fill: 'red', shape: 'dot', text: `${deviceName}?` });
      done(`Device not found: "${deviceName}"`);
      return;
    }

    if (typeof device.setCharacteristicsByTypes !== 'function') {
      this.status({ fill: 'red', shape: 'dot', text: 'no control' });
      done(`Device "${deviceName}" does not support setCharacteristicsByTypes`);
      return;
    }

    try {
      debug('setCharacteristicsByTypes', deviceName, JSON.stringify(chars));
      await device.setCharacteristicsByTypes(filterIfOff(chars));
      this.status({ fill: 'green', shape: 'dot', text: deviceName });
      done();
    } catch (error) {
      this.status({ fill: 'red', shape: 'dot', text: error.message.slice(0, 20) });
      this.error(`${deviceName}: ${error.message}`);
      this.hbConfigNode.disconnectClientNodes(device.instance);
      done(error.message);
    }
  }
}

module.exports = HbControlAllNode;
