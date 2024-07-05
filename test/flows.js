const Flows = {
  getDefault: function (options) {
    let defaultFlow = [
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
      { id: 'n3', type: 'helper' },
    ];

    defaultFlow[0] = Object.assign(defaultFlow[0], options);
    return defaultFlow;
  },
};

module.exports = Flows;
