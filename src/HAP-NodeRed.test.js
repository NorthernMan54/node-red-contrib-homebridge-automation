// Smoke test: Node-RED loads the package's nodes and they bind to the config node.
// Uses node-red-node-test-helper to run a real Node-RED runtime in-process.
// hap-client is mocked because it's an ESM module that jest can't load without
// transform config — and a smoke test doesn't need real bonjour discovery anyway.
jest.mock('@homebridge/hap-client', () => ({
  HapClient: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    getAllServices: jest.fn().mockResolvedValue([]),
    monitorCharacteristics: jest.fn(),
    destroy: jest.fn(),
  })),
}));

const os = require('os');
const helper = require('node-red-node-test-helper');
const hapNode = require('./HAP-NodeRed.js');

helper.init(require.resolve('node-red'), { userDir: os.tmpdir() });

const flow = [
  {
    id: 'status1',
    type: 'hb-status',
    name: 'StatusNode1',
    Homebridge: 'homebridge',
    Manufacturer: 'TestModule',
    Service: 'Switch',
    device: 'homebridgeAA:BB:CC:DD:EE:FF0StatusNode100000049',
    conf: 'conf1',
    wires: [['n2']],
  },
  {
    id: 'control1',
    type: 'hb-control',
    name: 'ControlNode1',
    Homebridge: 'homebridge',
    Manufacturer: 'TestModule',
    Service: 'Outlet',
    device: 'homebridgeAA:BB:CC:DD:EE:FF0ControlNode1h00000047',
    conf: 'conf1',
    outputs: 0,
    wires: [],
  },
  {
    id: 'conf1',
    type: 'hb-conf',
    username: '031-45-154',
    macAddress: 'AA:BB:CC:DD:EE:FF',
  },
  { id: 'n2', type: 'helper' },
];

describe('HAP-NodeRed loads in Node-RED', () => {
  beforeAll(() => new Promise(resolve => helper.startServer(resolve)));

  afterAll(() => new Promise(resolve => helper.stopServer(resolve)));

  afterEach(async () => {
    // Clear module-level persisted HapClient state between tests so each load gets a fresh client
    const HBConfigNode = require('./hbConfigNode');
    HBConfigNode.clearPersistedState?.();
    await helper.unload();
  });

  test('config + client nodes load with expected names', async () => {
    await helper.load(hapNode, flow);
    const conf1 = helper.getNode('conf1');
    const stat1 = helper.getNode('status1');
    const ctl1 = helper.getNode('control1');
    expect(conf1).toHaveProperty('macAddress', 'AA:BB:CC:DD:EE:FF');
    expect(stat1).toHaveProperty('name', 'StatusNode1');
    expect(ctl1).toHaveProperty('name', 'ControlNode1');
    const logEvents = helper.log().args.filter(
      evt => evt[0].type === 'hb-conf' || evt[0].type === 'hb-status'
    );
    expect(logEvents).toHaveLength(0);
  });
});
