const debug = require('debug')('hapNodeRed:JEST');

const HBConfigNode = require('./hbConfigNode.js');

describe("toList", () => {
  var hbConfigNode;
  createNode = function () {
  };
  beforeAll(async () => {
    // eslint-disable-next-line no-console
    console.log('init');
    hbConfigNode = new HBConfigNode({ jest: true });
  });

  test("should return an empty array when inputs is empty", () => {
    const inputs = [];
    const perms = [];
    const result = hbConfigNode.toList(inputs, perms);
    expect(result).toEqual([]);
  });

  test("should map inputs to the expected output format", () => {
    const inputs = [
      {
        "aid": 167,
        "iid": 8,
        "uuid": "00000040-0000-1000-8000-0026BB765291",
        "type": "Fan",
        "humanType": "Fan",
        "serviceName": "Bunkie Fan",
        "serviceCharacteristics": [
          {
            "aid": 167,
            "iid": 10,
            "uuid": "00000025-0000-1000-8000-0026BB765291",
            "type": "On",
            "serviceType": "Fan",
            "serviceName": "Bunkie Fan",
            "description": "On",
            "value": 1,
            "format": "bool",
            "perms": [
              "ev",
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": true
          },
          {
            "aid": 167,
            "iid": 11,
            "uuid": "000000E3-0000-1000-8000-0026BB765291",
            "type": "ConfiguredName",
            "serviceType": "Fan",
            "serviceName": "Bunkie Fan",
            "description": "Configured Name",
            "value": "Bunkie Fan",
            "format": "string",
            "perms": [
              "ev",
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": true
          },
          {
            "aid": 167,
            "iid": 12,
            "uuid": "00000029-0000-1000-8000-0026BB765291",
            "type": "RotationSpeed",
            "serviceType": "Fan",
            "serviceName": "Bunkie Fan",
            "description": "Rotation Speed",
            "value": 33,
            "format": "float",
            "perms": [
              "ev",
              "pr",
              "pw"
            ],
            "unit": "percentage",
            "maxValue": 100,
            "minValue": 0,
            "minStep": 1,
            "canRead": true,
            "canWrite": true,
            "ev": true
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "Tasmota",
          "Model": "Sonoff iFan03",
          "Name": "Bunkie Fan",
          "Serial Number": "302D6B-jessie",
          "Firmware Revision": "9.5.0tasmota"
        },
        "values": {
          "On": 1,
          "ConfiguredName": "Bunkie Fan",
          "RotationSpeed": 33
        },
        "instance": {
          "name": "homebridge",
          "username": "1C:22:3D:E3:CF:34",
          "ipAddress": "192.168.1.11",
          "port": 35215,
          "services": [],
          "connectionFailedCount": 0
        },
        "uniqueId": "9fd9e494282f14d80d438aad8ffde153893f99a97195b816749786e9a012aa2f"
      },
      // Add more inputs here if needed
    ];

    const perms = { perms: 'ev' };

    const result = hbConfigNode.toList(inputs, perms);
    /*
    {
    "homebridge": "homebridge",
    "host": "192.168.1.11",
    "port": 35215,
    "id": "1C:22:3D:E3:CF:34",
    "manufacturer": "Tasmota",
    "aid": 75,
    "type": "00000043",
    "name": "West Bedroom",
    "service": "Lightbulb",
    "fullName": "West Bedroom - Lightbulb",
    "sortName": "West Bedroom:Lightbulb",
    "uniqueId": "homebridge1C:22:3D:E3:CF:34TasmotaWest Bedroom00000043",
    "descriptions": "On",
    "characteristics": {
        "75.10": {
            "characteristic": "On",
            "iid": 10
        }
    },
    "getCharacteristics": "75.10",
    "eventRegisters": [{
        "aid": 75,
        "iid": 10,
        "ev": true
    }]
    }
        */

    expect(result).toHaveLength(1);
    console.log(result);
    /*
    expect(result).toEqual([
      {
        uniqueId: "1",
        serviceName: "Service 1",
        characteristics: [
          {
            id: "1.1",
            type: "Type 1",
            description: "Description 1",
            value: "Value 1",
            format: "Format 1",
            unit: "Unit 1",
            perms: ["perm1", "perm2"],
            canRead: true,
            canWrite: false,
            ev: true
          },
          // Add more expected characteristics here if needed
        ]
      },
      // Add more expected outputs here if needed
    ]);
    */
  });

  afterAll(async () => {
    // eslint-disable-next-line no-console
    console.log('destroy');
    // await hap.destroy();
  });
});