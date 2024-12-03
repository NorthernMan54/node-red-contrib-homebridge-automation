
const { HapClient } = require('@homebridge/hap-client');
const HBConfigNode = require('./hbConfigNode'); // Update the path as necessary

jest.mock('@homebridge/hap-client');

describe('HBConfigNode', () => {
  let mockConfig;
  let RED;
  let node;

  beforeEach(() => {
    mockConfig = {
      username: '123-45-678',
      macAddress: '00:11:22:33:44:55',
      jest: true,
    };

    RED = {
      nodes: {
        createNode: jest.fn(),
      },
    };

    node = new HBConfigNode(mockConfig, RED);
    node.hbDevices = [
      {
        humanType: 'Lightbulb',
        serviceName: 'Living Room Light',
        type: 'Lightbulb',
        instance: {
          name: 'Bridge1',
          username: '00:11:22:33:44:55',
        },
        accessoryInformation: {
          Manufacturer: 'Acme',
        },
        uuid: '12345678-1234-5678-1234-567812345678',
      },
      {
        humanType: 'Switch',
        serviceName: 'Kitchen Switch',
        type: 'Switch',
        instance: {
          name: 'Bridge2',
          username: '11:22:33:44:55:66',
        },
        accessoryInformation: {
          Manufacturer: 'Acme',
        },
        uuid: '87654321-4321-8765-4321-876543218765',
      },
      {
        humanType: 'UnknownType', // This should be filtered out
        serviceName: 'Garage Sensor',
        type: 'Sensor',
        instance: {
          name: 'Bridge3',
          username: '22:33:44:55:66:77',
        },
        accessoryInformation: {
          Manufacturer: 'Acme',
        },
        uuid: '11223344-5566-7788-99aa-bbccddeeff00',
      },
      {
        "aid": 1,
        "iid": 54,
        "uuid": "000000A2-0000-1000-8000-0026BB765291",
        "type": "ProtocolInformation",
        "humanType": "Protocol Information",
        "serviceName": "Deck 6EED",
        "serviceCharacteristics": [
          {
            "aid": 1,
            "iid": 55,
            "uuid": "00000037-0000-1000-8000-0026BB765291",
            "type": "Version",
            "serviceType": "ProtocolInformation",
            "serviceName": "Deck 6EED",
            "description": "Version",
            "value": "1.1.0",
            "format": "string",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "HikVision",
          "Model": "ECI-T24F2",
          "Name": "Deck 6EED",
          "Serial Number": "Default-SerialNumber",
          "Firmware Revision": "0.0.0"
        },
        "values": {
          "Version": "1.1.0"
        },
        "instance": {
          "name": "ECI-T24F2",
          "username": "8E:88:AB:7A:D0:54",
          "ipAddress": "192.168.1.11",
          "port": 33811,
          "services": [],
          "connectionFailedCount": 0,
          "configurationNumber": "3"
        },
        "uniqueId": "df9f624e673eae7295adbddf6178e854c11245b7e76303550fc4b288058872ae"
      },
      {
        "aid": 1,
        "iid": 8,
        "uuid": "00000085-0000-1000-8000-0026BB765291",
        "type": "MotionSensor",
        "humanType": "Motion Sensor",
        "serviceName": "Canoe",
        "serviceCharacteristics": [
          {
            "aid": 1,
            "iid": 10,
            "uuid": "00000022-0000-1000-8000-0026BB765291",
            "type": "MotionDetected",
            "serviceType": "MotionSensor",
            "serviceName": "Canoe",
            "description": "Motion Detected",
            "value": 0,
            "format": "bool",
            "perms": [
              "ev",
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": true
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "HikVision",
          "Model": "ECI-T24F2",
          "Name": "Canoe 5036",
          "Serial Number": "Default-SerialNumber",
          "Firmware Revision": "0.0.0"
        },
        "values": {
          "MotionDetected": 0
        },
        "instance": {
          "name": "ECI-T24F2",
          "username": "5C:EE:FE:4D:64:B4",
          "ipAddress": "192.168.1.11",
          "port": 39757,
          "services": [],
          "connectionFailedCount": 0,
          "configurationNumber": "3"
        },
        "uniqueId": "10dbaceb026b81f56c6226eca2c30b7ba06c29de632253972402bd3f489096f1"
      },
      {
        "aid": 1,
        "iid": 14,
        "uuid": "00000110-0000-1000-8000-0026BB765291",
        "type": "CameraRTPStreamManagement",
        "humanType": "Camera Rtp Stream Management",
        "serviceName": "Canoe 5036",
        "serviceCharacteristics": [
          {
            "aid": 1,
            "iid": 17,
            "uuid": "00000120-0000-1000-8000-0026BB765291",
            "type": "StreamingStatus",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Streaming Status",
            "value": "AQEA",
            "format": "tlv8",
            "perms": [
              "ev",
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": true
          },
          {
            "aid": 1,
            "iid": 18,
            "uuid": "00000115-0000-1000-8000-0026BB765291",
            "type": "SupportedAudioStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Supported Audio Stream Configuration",
            "value": "AQ4BAQMCCQEBAQIBAAMBAgAAAQ4BAQICCQEBAQIBAAMBAQIBAA==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 19,
            "uuid": "00000116-0000-1000-8000-0026BB765291",
            "type": "SupportedRTPConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Supported RTP Configuration",
            "value": "AgEA",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 20,
            "uuid": "00000114-0000-1000-8000-0026BB765291",
            "type": "SupportedVideoStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Supported Video Stream Configuration",
            "value": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 21,
            "uuid": "000000B0-0000-1000-8000-0026BB765291",
            "type": "Active",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Active",
            "value": 1,
            "format": "uint8",
            "perms": [
              "ev",
              "pr",
              "pw"
            ],
            "maxValue": 1,
            "minValue": 0,
            "minStep": 1,
            "canRead": true,
            "canWrite": true,
            "ev": true
          },
          {
            "aid": 1,
            "iid": 15,
            "uuid": "00000117-0000-1000-8000-0026BB765291",
            "type": "SelectedRTPStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Selected RTP Stream Configuration",
            "value": "AQMCAQI=",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 16,
            "uuid": "00000118-0000-1000-8000-0026BB765291",
            "type": "SetupEndpoints",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Setup Endpoints",
            "value": "AgEC",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "HikVision",
          "Model": "ECI-T24F2",
          "Name": "Canoe 5036",
          "Serial Number": "Default-SerialNumber",
          "Firmware Revision": "0.0.0"
        },
        "values": {
          "StreamingStatus": "AQEA",
          "SupportedAudioStreamConfiguration": "AQ4BAQMCCQEBAQIBAAMBAgAAAQ4BAQICCQEBAQIBAAMBAQIBAA==",
          "SupportedRTPConfiguration": "AgEA",
          "SupportedVideoStreamConfiguration": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
          "Active": 1,
          "SelectedRTPStreamConfiguration": "AQMCAQI=",
          "SetupEndpoints": "AgEC"
        },
        "instance": {
          "name": "ECI-T24F2",
          "username": "5C:EE:FE:4D:64:B4",
          "ipAddress": "192.168.1.11",
          "port": 39757,
          "services": [],
          "connectionFailedCount": 0,
          "configurationNumber": "3"
        },
        "uniqueId": "9959f43e6f32e451a9c13e0c028d863fa148c39cbbcb57f93d8d825fc31f8865"
      },
      {
        "aid": 1,
        "iid": 22,
        "uuid": "00000110-0000-1000-8000-0026BB765291",
        "type": "CameraRTPStreamManagement",
        "humanType": "Camera Rtp Stream Management",
        "serviceName": "Canoe 5036",
        "serviceCharacteristics": [
          {
            "aid": 1,
            "iid": 25,
            "uuid": "00000120-0000-1000-8000-0026BB765291",
            "type": "StreamingStatus",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Streaming Status",
            "value": "AQEA",
            "format": "tlv8",
            "perms": [
              "ev",
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": true
          },
          {
            "aid": 1,
            "iid": 26,
            "uuid": "00000115-0000-1000-8000-0026BB765291",
            "type": "SupportedAudioStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Supported Audio Stream Configuration",
            "value": "AQ4BAQMCCQEBAQIBAAMBAgAAAQ4BAQICCQEBAQIBAAMBAQIBAA==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 27,
            "uuid": "00000116-0000-1000-8000-0026BB765291",
            "type": "SupportedRTPConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Supported RTP Configuration",
            "value": "AgEA",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 28,
            "uuid": "00000114-0000-1000-8000-0026BB765291",
            "type": "SupportedVideoStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Supported Video Stream Configuration",
            "value": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 29,
            "uuid": "000000B0-0000-1000-8000-0026BB765291",
            "type": "Active",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Active",
            "value": 1,
            "format": "uint8",
            "perms": [
              "ev",
              "pr",
              "pw"
            ],
            "maxValue": 1,
            "minValue": 0,
            "minStep": 1,
            "canRead": true,
            "canWrite": true,
            "ev": true
          },
          {
            "aid": 1,
            "iid": 23,
            "uuid": "00000117-0000-1000-8000-0026BB765291",
            "type": "SelectedRTPStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Selected RTP Stream Configuration",
            "value": "AQMCAQI=",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 24,
            "uuid": "00000118-0000-1000-8000-0026BB765291",
            "type": "SetupEndpoints",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Setup Endpoints",
            "value": "AgEC",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "HikVision",
          "Model": "ECI-T24F2",
          "Name": "Canoe 5036",
          "Serial Number": "Default-SerialNumber",
          "Firmware Revision": "0.0.0"
        },
        "values": {
          "StreamingStatus": "AQEA",
          "SupportedAudioStreamConfiguration": "AQ4BAQMCCQEBAQIBAAMBAgAAAQ4BAQICCQEBAQIBAAMBAQIBAA==",
          "SupportedRTPConfiguration": "AgEA",
          "SupportedVideoStreamConfiguration": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
          "Active": 1,
          "SelectedRTPStreamConfiguration": "AQMCAQI=",
          "SetupEndpoints": "AgEC"
        },
        "instance": {
          "name": "ECI-T24F2",
          "username": "5C:EE:FE:4D:64:B4",
          "ipAddress": "192.168.1.11",
          "port": 39757,
          "services": [],
          "connectionFailedCount": 0,
          "configurationNumber": "3"
        },
        "uniqueId": "b0824c5bbe7c7e4dd6a8ab26d483cb0138ee56b34e444a0999ab5c24d1d33a58"
      },
      {
        "aid": 1,
        "iid": 30,
        "uuid": "00000110-0000-1000-8000-0026BB765291",
        "type": "CameraRTPStreamManagement",
        "humanType": "Camera Rtp Stream Management",
        "serviceName": "Canoe 5036",
        "serviceCharacteristics": [
          {
            "aid": 1,
            "iid": 33,
            "uuid": "00000120-0000-1000-8000-0026BB765291",
            "type": "StreamingStatus",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Streaming Status",
            "value": "AQEA",
            "format": "tlv8",
            "perms": [
              "ev",
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": true
          },
          {
            "aid": 1,
            "iid": 34,
            "uuid": "00000115-0000-1000-8000-0026BB765291",
            "type": "SupportedAudioStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Supported Audio Stream Configuration",
            "value": "AQ4BAQMCCQEBAQIBAAMBAgAAAQ4BAQICCQEBAQIBAAMBAQIBAA==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 35,
            "uuid": "00000116-0000-1000-8000-0026BB765291",
            "type": "SupportedRTPConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Supported RTP Configuration",
            "value": "AgEA",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 36,
            "uuid": "00000114-0000-1000-8000-0026BB765291",
            "type": "SupportedVideoStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Supported Video Stream Configuration",
            "value": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 37,
            "uuid": "000000B0-0000-1000-8000-0026BB765291",
            "type": "Active",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Active",
            "value": 1,
            "format": "uint8",
            "perms": [
              "ev",
              "pr",
              "pw"
            ],
            "maxValue": 1,
            "minValue": 0,
            "minStep": 1,
            "canRead": true,
            "canWrite": true,
            "ev": true
          },
          {
            "aid": 1,
            "iid": 31,
            "uuid": "00000117-0000-1000-8000-0026BB765291",
            "type": "SelectedRTPStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Selected RTP Stream Configuration",
            "value": "AQMCAQI=",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 32,
            "uuid": "00000118-0000-1000-8000-0026BB765291",
            "type": "SetupEndpoints",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Setup Endpoints",
            "value": "AgEC",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "HikVision",
          "Model": "ECI-T24F2",
          "Name": "Canoe 5036",
          "Serial Number": "Default-SerialNumber",
          "Firmware Revision": "0.0.0"
        },
        "values": {
          "StreamingStatus": "AQEA",
          "SupportedAudioStreamConfiguration": "AQ4BAQMCCQEBAQIBAAMBAgAAAQ4BAQICCQEBAQIBAAMBAQIBAA==",
          "SupportedRTPConfiguration": "AgEA",
          "SupportedVideoStreamConfiguration": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
          "Active": 1,
          "SelectedRTPStreamConfiguration": "AQMCAQI=",
          "SetupEndpoints": "AgEC"
        },
        "instance": {
          "name": "ECI-T24F2",
          "username": "5C:EE:FE:4D:64:B4",
          "ipAddress": "192.168.1.11",
          "port": 39757,
          "services": [],
          "connectionFailedCount": 0,
          "configurationNumber": "3"
        },
        "uniqueId": "629af36fdec5d22c5537a1f0312d88b6f3765ba57e29b7def8c96538a4ffb16b"
      },
      {
        "aid": 1,
        "iid": 38,
        "uuid": "00000110-0000-1000-8000-0026BB765291",
        "type": "CameraRTPStreamManagement",
        "humanType": "Camera Rtp Stream Management",
        "serviceName": "Canoe 5036",
        "serviceCharacteristics": [
          {
            "aid": 1,
            "iid": 41,
            "uuid": "00000120-0000-1000-8000-0026BB765291",
            "type": "StreamingStatus",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Streaming Status",
            "value": "AQEA",
            "format": "tlv8",
            "perms": [
              "ev",
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": true
          },
          {
            "aid": 1,
            "iid": 42,
            "uuid": "00000115-0000-1000-8000-0026BB765291",
            "type": "SupportedAudioStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Supported Audio Stream Configuration",
            "value": "AQ4BAQMCCQEBAQIBAAMBAgAAAQ4BAQICCQEBAQIBAAMBAQIBAA==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 43,
            "uuid": "00000116-0000-1000-8000-0026BB765291",
            "type": "SupportedRTPConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Supported RTP Configuration",
            "value": "AgEA",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 44,
            "uuid": "00000114-0000-1000-8000-0026BB765291",
            "type": "SupportedVideoStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Supported Video Stream Configuration",
            "value": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 45,
            "uuid": "000000B0-0000-1000-8000-0026BB765291",
            "type": "Active",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Active",
            "value": 1,
            "format": "uint8",
            "perms": [
              "ev",
              "pr",
              "pw"
            ],
            "maxValue": 1,
            "minValue": 0,
            "minStep": 1,
            "canRead": true,
            "canWrite": true,
            "ev": true
          },
          {
            "aid": 1,
            "iid": 39,
            "uuid": "00000117-0000-1000-8000-0026BB765291",
            "type": "SelectedRTPStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Selected RTP Stream Configuration",
            "value": "AQMCAQI=",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 40,
            "uuid": "00000118-0000-1000-8000-0026BB765291",
            "type": "SetupEndpoints",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Setup Endpoints",
            "value": "AgEC",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "HikVision",
          "Model": "ECI-T24F2",
          "Name": "Canoe 5036",
          "Serial Number": "Default-SerialNumber",
          "Firmware Revision": "0.0.0"
        },
        "values": {
          "StreamingStatus": "AQEA",
          "SupportedAudioStreamConfiguration": "AQ4BAQMCCQEBAQIBAAMBAgAAAQ4BAQICCQEBAQIBAAMBAQIBAA==",
          "SupportedRTPConfiguration": "AgEA",
          "SupportedVideoStreamConfiguration": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
          "Active": 1,
          "SelectedRTPStreamConfiguration": "AQMCAQI=",
          "SetupEndpoints": "AgEC"
        },
        "instance": {
          "name": "ECI-T24F2",
          "username": "5C:EE:FE:4D:64:B4",
          "ipAddress": "192.168.1.11",
          "port": 39757,
          "services": [],
          "connectionFailedCount": 0,
          "configurationNumber": "3"
        },
        "uniqueId": "b3b668fc3a29d9589bfcfa0395d7ce1e1029e6b70b4ca6129579cb0103cc6ea9"
      },
      {
        "aid": 1,
        "iid": 46,
        "uuid": "00000110-0000-1000-8000-0026BB765291",
        "type": "CameraRTPStreamManagement",
        "humanType": "Camera Rtp Stream Management",
        "serviceName": "Canoe 5036",
        "serviceCharacteristics": [
          {
            "aid": 1,
            "iid": 49,
            "uuid": "00000120-0000-1000-8000-0026BB765291",
            "type": "StreamingStatus",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Streaming Status",
            "value": "AQEA",
            "format": "tlv8",
            "perms": [
              "ev",
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": true
          },
          {
            "aid": 1,
            "iid": 50,
            "uuid": "00000115-0000-1000-8000-0026BB765291",
            "type": "SupportedAudioStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Supported Audio Stream Configuration",
            "value": "AQ4BAQMCCQEBAQIBAAMBAgAAAQ4BAQICCQEBAQIBAAMBAQIBAA==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 51,
            "uuid": "00000116-0000-1000-8000-0026BB765291",
            "type": "SupportedRTPConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Supported RTP Configuration",
            "value": "AgEA",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 52,
            "uuid": "00000114-0000-1000-8000-0026BB765291",
            "type": "SupportedVideoStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Supported Video Stream Configuration",
            "value": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 53,
            "uuid": "000000B0-0000-1000-8000-0026BB765291",
            "type": "Active",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Active",
            "value": 1,
            "format": "uint8",
            "perms": [
              "ev",
              "pr",
              "pw"
            ],
            "maxValue": 1,
            "minValue": 0,
            "minStep": 1,
            "canRead": true,
            "canWrite": true,
            "ev": true
          },
          {
            "aid": 1,
            "iid": 47,
            "uuid": "00000117-0000-1000-8000-0026BB765291",
            "type": "SelectedRTPStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Selected RTP Stream Configuration",
            "value": "AQMCAQI=",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          },
          {
            "aid": 1,
            "iid": 48,
            "uuid": "00000118-0000-1000-8000-0026BB765291",
            "type": "SetupEndpoints",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Canoe 5036",
            "description": "Setup Endpoints",
            "value": "AgEC",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "HikVision",
          "Model": "ECI-T24F2",
          "Name": "Canoe 5036",
          "Serial Number": "Default-SerialNumber",
          "Firmware Revision": "0.0.0"
        },
        "values": {
          "StreamingStatus": "AQEA",
          "SupportedAudioStreamConfiguration": "AQ4BAQMCCQEBAQIBAAMBAgAAAQ4BAQICCQEBAQIBAAMBAQIBAA==",
          "SupportedRTPConfiguration": "AgEA",
          "SupportedVideoStreamConfiguration": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
          "Active": 1,
          "SelectedRTPStreamConfiguration": "AQMCAQI=",
          "SetupEndpoints": "AgEC"
        },
        "instance": {
          "name": "ECI-T24F2",
          "username": "5C:EE:FE:4D:64:B4",
          "ipAddress": "192.168.1.11",
          "port": 39757,
          "services": [],
          "connectionFailedCount": 0,
          "configurationNumber": "3"
        },
        "uniqueId": "57cf7042ca8aac16275fa2d6d135b1855a6faaadcd2e46499ecba278bbf241d3"
      },
      {
        "aid": 1,
        "iid": 54,
        "uuid": "000000A2-0000-1000-8000-0026BB765291",
        "type": "ProtocolInformation",
        "humanType": "Protocol Information",
        "serviceName": "Canoe 5036",
        "serviceCharacteristics": [
          {
            "aid": 1,
            "iid": 55,
            "uuid": "00000037-0000-1000-8000-0026BB765291",
            "type": "Version",
            "serviceType": "ProtocolInformation",
            "serviceName": "Canoe 5036",
            "description": "Version",
            "value": "1.1.0",
            "format": "string",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "HikVision",
          "Model": "ECI-T24F2",
          "Name": "Canoe 5036",
          "Serial Number": "Default-SerialNumber",
          "Firmware Revision": "0.0.0"
        },
        "values": {
          "Version": "1.1.0"
        },
        "instance": {
          "name": "ECI-T24F2",
          "username": "5C:EE:FE:4D:64:B4",
          "ipAddress": "192.168.1.11",
          "port": 39757,
          "services": [],
          "connectionFailedCount": 0,
          "configurationNumber": "3"
        },
        "uniqueId": "660f0569500a9c2570f435943368c4f33c9a9c5162f366c66c1eb520f874c84e"
      },
      {
        "aid": 1,
        "iid": 2000000008,
        "uuid": "000000A2-0000-1000-8000-0026BB765291",
        "type": "ProtocolInformation",
        "humanType": "Protocol Information",
        "serviceName": "EufySecurity 9F7C",
        "serviceCharacteristics": [
          {
            "aid": 1,
            "iid": 9,
            "uuid": "00000037-0000-1000-8000-0026BB765291",
            "type": "Version",
            "serviceType": "ProtocolInformation",
            "serviceName": "EufySecurity 9F7C",
            "description": "Version",
            "value": "1.1.0",
            "format": "string",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "homebridge.io",
          "Model": "homebridge",
          "Name": "EufySecurity 9F7C",
          "Serial Number": "0E:89:A7:DA:D3:21",
          "Firmware Revision": "1.8.5"
        },
        "values": {
          "Version": "1.1.0"
        },
        "instance": {
          "name": "homebridge",
          "username": "0E:89:A7:DA:D3:21",
          "ipAddress": "192.168.1.11",
          "port": 40929,
          "services": [],
          "connectionFailedCount": 0,
          "configurationNumber": "21"
        },
        "uniqueId": "c516aeaf2812436318a5aee6443ee633a459015a07676d78c73ca9decdf899b2"
      },
      {
        "aid": 6,
        "iid": 9,
        "uuid": "0000021A-0000-1000-8000-0026BB765291",
        "type": "CameraOperatingMode",
        "humanType": "Camera Operating Mode",
        "serviceName": "Backyard",
        "serviceCharacteristics": [
          {
            "aid": 6,
            "iid": 12,
            "uuid": "0000021B-0000-1000-8000-0026BB765291",
            "type": "HomeKitCameraActive",
            "serviceType": "CameraOperatingMode",
            "serviceName": "Backyard",
            "description": "HomeKit Camera Active",
            "value": 1,
            "format": "uint8",
            "perms": [
              "ev",
              "pr",
              "pw"
            ],
            "maxValue": 1,
            "minValue": 0,
            "canRead": true,
            "canWrite": true,
            "ev": true
          },
          {
            "aid": 6,
            "iid": 13,
            "uuid": "00000227-0000-1000-8000-0026BB765291",
            "type": "ManuallyDisabled",
            "serviceType": "CameraOperatingMode",
            "serviceName": "Backyard",
            "description": "Manually Disabled",
            "value": 0,
            "format": "bool",
            "perms": [
              "ev",
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": true
          },
          {
            "aid": 6,
            "iid": 14,
            "uuid": "0000021D-0000-1000-8000-0026BB765291",
            "type": "CameraOperatingModeIndicator",
            "serviceType": "CameraOperatingMode",
            "serviceName": "Backyard",
            "description": "Camera Operating Mode Indicator",
            "value": 1,
            "format": "bool",
            "perms": [
              "ev",
              "pr",
              "pw",
              "tw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": true
          },
          {
            "aid": 6,
            "iid": 15,
            "uuid": "0000011B-0000-1000-8000-0026BB765291",
            "type": "NightVision",
            "serviceType": "CameraOperatingMode",
            "serviceName": "Backyard",
            "description": "Night Vision",
            "value": 1,
            "format": "bool",
            "perms": [
              "ev",
              "pr",
              "pw",
              "tw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": true
          },
          {
            "aid": 6,
            "iid": 11,
            "uuid": "00000223-0000-1000-8000-0026BB765291",
            "type": "EventSnapshotsActive",
            "serviceType": "CameraOperatingMode",
            "serviceName": "Backyard",
            "description": "Event Snapshots Active",
            "value": 0,
            "format": "uint8",
            "perms": [
              "ev",
              "pr",
              "pw"
            ],
            "maxValue": 1,
            "minValue": 0,
            "canRead": true,
            "canWrite": true,
            "ev": true
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "Eufy",
          "Model": "INDOOR_CAMERA",
          "Name": "Backyard",
          "Serial Number": "T8400P2020283341",
          "Firmware Revision": "2.2.0.2",
          "Hardware Revision": "P2"
        },
        "values": {
          "HomeKitCameraActive": 1,
          "ManuallyDisabled": 0,
          "CameraOperatingModeIndicator": 1,
          "NightVision": 1,
          "EventSnapshotsActive": 0
        },
        "instance": {
          "name": "homebridge",
          "username": "0E:89:A7:DA:D3:21",
          "ipAddress": "192.168.1.11",
          "port": 40929,
          "services": [],
          "connectionFailedCount": 0,
          "configurationNumber": "21"
        },
        "uniqueId": "260fba559f22053724ac5561be62f8e803281c3c8c82f872e05d839fc3fa95de"
      },
      {
        "aid": 6,
        "iid": 16,
        "uuid": "00000085-0000-1000-8000-0026BB765291",
        "type": "MotionSensor",
        "humanType": "Motion Sensor",
        "serviceName": "Backyard",
        "serviceCharacteristics": [
          {
            "aid": 6,
            "iid": 18,
            "uuid": "00000022-0000-1000-8000-0026BB765291",
            "type": "MotionDetected",
            "serviceType": "MotionSensor",
            "serviceName": "Backyard",
            "description": "Motion Detected",
            "value": 0,
            "format": "bool",
            "perms": [
              "ev",
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": true
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "Eufy",
          "Model": "INDOOR_CAMERA",
          "Name": "Backyard",
          "Serial Number": "T8400P2020283341",
          "Firmware Revision": "2.2.0.2",
          "Hardware Revision": "P2"
        },
        "values": {
          "MotionDetected": 0
        },
        "instance": {
          "name": "homebridge",
          "username": "0E:89:A7:DA:D3:21",
          "ipAddress": "192.168.1.11",
          "port": 40929,
          "services": [],
          "connectionFailedCount": 0,
          "configurationNumber": "21"
        },
        "uniqueId": "c9efb02acc5cabb2b164d4c479355551a6360345571b31de50e90f4a1fa42df6"
      },
      {
        "aid": 6,
        "iid": 19,
        "uuid": "00000110-0000-1000-8000-0026BB765291",
        "type": "CameraRTPStreamManagement",
        "humanType": "Camera Rtp Stream Management",
        "serviceName": "Backyard",
        "serviceCharacteristics": [
          {
            "aid": 6,
            "iid": 22,
            "uuid": "00000120-0000-1000-8000-0026BB765291",
            "type": "StreamingStatus",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Backyard",
            "description": "Streaming Status",
            "value": "AQEA",
            "format": "tlv8",
            "perms": [
              "ev",
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": true
          },
          {
            "aid": 6,
            "iid": 23,
            "uuid": "00000115-0000-1000-8000-0026BB765291",
            "type": "SupportedAudioStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Backyard",
            "description": "Supported Audio Stream Configuration",
            "value": "AQ4BAQICCQEBAQIBAAMBAQIBAA==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 6,
            "iid": 24,
            "uuid": "00000116-0000-1000-8000-0026BB765291",
            "type": "SupportedRTPConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Backyard",
            "description": "Supported RTP Configuration",
            "value": "AgEA",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 6,
            "iid": 25,
            "uuid": "00000114-0000-1000-8000-0026BB765291",
            "type": "SupportedVideoStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Backyard",
            "description": "Supported Video Stream Configuration",
            "value": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 6,
            "iid": 26,
            "uuid": "000000B0-0000-1000-8000-0026BB765291",
            "type": "Active",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Backyard",
            "description": "Active",
            "value": 1,
            "format": "uint8",
            "perms": [
              "ev",
              "pr",
              "pw"
            ],
            "maxValue": 1,
            "minValue": 0,
            "minStep": 1,
            "canRead": true,
            "canWrite": true,
            "ev": true
          },
          {
            "aid": 6,
            "iid": 20,
            "uuid": "00000117-0000-1000-8000-0026BB765291",
            "type": "SelectedRTPStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Backyard",
            "description": "Selected RTP Stream Configuration",
            "value": "AQMCAQI=",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          },
          {
            "aid": 6,
            "iid": 21,
            "uuid": "00000118-0000-1000-8000-0026BB765291",
            "type": "SetupEndpoints",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Backyard",
            "description": "Setup Endpoints",
            "value": "AgEC",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "Eufy",
          "Model": "INDOOR_CAMERA",
          "Name": "Backyard",
          "Serial Number": "T8400P2020283341",
          "Firmware Revision": "2.2.0.2",
          "Hardware Revision": "P2"
        },
        "values": {
          "StreamingStatus": "AQEA",
          "SupportedAudioStreamConfiguration": "AQ4BAQICCQEBAQIBAAMBAQIBAA==",
          "SupportedRTPConfiguration": "AgEA",
          "SupportedVideoStreamConfiguration": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
          "Active": 1,
          "SelectedRTPStreamConfiguration": "AQMCAQI=",
          "SetupEndpoints": "AgEC"
        },
        "instance": {
          "name": "homebridge",
          "username": "0E:89:A7:DA:D3:21",
          "ipAddress": "192.168.1.11",
          "port": 40929,
          "services": [],
          "connectionFailedCount": 0,
          "configurationNumber": "21"
        },
        "uniqueId": "924c9390e6a89452936dfff957faa127d87e78e3c1b5084863495a184804fe56"
      },
      {
        "aid": 6,
        "iid": 27,
        "uuid": "00000110-0000-1000-8000-0026BB765291",
        "type": "CameraRTPStreamManagement",
        "humanType": "Camera Rtp Stream Management",
        "serviceName": "Backyard",
        "serviceCharacteristics": [
          {
            "aid": 6,
            "iid": 30,
            "uuid": "00000120-0000-1000-8000-0026BB765291",
            "type": "StreamingStatus",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Backyard",
            "description": "Streaming Status",
            "value": "AQEA",
            "format": "tlv8",
            "perms": [
              "ev",
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": true
          },
          {
            "aid": 6,
            "iid": 31,
            "uuid": "00000115-0000-1000-8000-0026BB765291",
            "type": "SupportedAudioStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Backyard",
            "description": "Supported Audio Stream Configuration",
            "value": "AQ4BAQICCQEBAQIBAAMBAQIBAA==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 6,
            "iid": 32,
            "uuid": "00000116-0000-1000-8000-0026BB765291",
            "type": "SupportedRTPConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Backyard",
            "description": "Supported RTP Configuration",
            "value": "AgEA",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 6,
            "iid": 33,
            "uuid": "00000114-0000-1000-8000-0026BB765291",
            "type": "SupportedVideoStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Backyard",
            "description": "Supported Video Stream Configuration",
            "value": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 6,
            "iid": 34,
            "uuid": "000000B0-0000-1000-8000-0026BB765291",
            "type": "Active",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Backyard",
            "description": "Active",
            "value": 1,
            "format": "uint8",
            "perms": [
              "ev",
              "pr",
              "pw"
            ],
            "maxValue": 1,
            "minValue": 0,
            "minStep": 1,
            "canRead": true,
            "canWrite": true,
            "ev": true
          },
          {
            "aid": 6,
            "iid": 28,
            "uuid": "00000117-0000-1000-8000-0026BB765291",
            "type": "SelectedRTPStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Backyard",
            "description": "Selected RTP Stream Configuration",
            "value": "AQMCAQI=",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          },
          {
            "aid": 6,
            "iid": 29,
            "uuid": "00000118-0000-1000-8000-0026BB765291",
            "type": "SetupEndpoints",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Backyard",
            "description": "Setup Endpoints",
            "value": "AgEC",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "Eufy",
          "Model": "INDOOR_CAMERA",
          "Name": "Backyard",
          "Serial Number": "T8400P2020283341",
          "Firmware Revision": "2.2.0.2",
          "Hardware Revision": "P2"
        },
        "values": {
          "StreamingStatus": "AQEA",
          "SupportedAudioStreamConfiguration": "AQ4BAQICCQEBAQIBAAMBAQIBAA==",
          "SupportedRTPConfiguration": "AgEA",
          "SupportedVideoStreamConfiguration": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
          "Active": 1,
          "SelectedRTPStreamConfiguration": "AQMCAQI=",
          "SetupEndpoints": "AgEC"
        },
        "instance": {
          "name": "homebridge",
          "username": "0E:89:A7:DA:D3:21",
          "ipAddress": "192.168.1.11",
          "port": 40929,
          "services": [],
          "connectionFailedCount": 0,
          "configurationNumber": "21"
        },
        "uniqueId": "17e308a4de9af9ba95e5bcd32c1f56516403b14855f3397e8a48135e9cc78f14"
      },
      {
        "aid": 7,
        "iid": 9,
        "uuid": "0000021A-0000-1000-8000-0026BB765291",
        "type": "CameraOperatingMode",
        "humanType": "Camera Operating Mode",
        "serviceName": "Side door",
        "serviceCharacteristics": [
          {
            "aid": 7,
            "iid": 12,
            "uuid": "0000021B-0000-1000-8000-0026BB765291",
            "type": "HomeKitCameraActive",
            "serviceType": "CameraOperatingMode",
            "serviceName": "Side door",
            "description": "HomeKit Camera Active",
            "value": 1,
            "format": "uint8",
            "perms": [
              "ev",
              "pr",
              "pw"
            ],
            "maxValue": 1,
            "minValue": 0,
            "canRead": true,
            "canWrite": true,
            "ev": true
          },
          {
            "aid": 7,
            "iid": 13,
            "uuid": "00000227-0000-1000-8000-0026BB765291",
            "type": "ManuallyDisabled",
            "serviceType": "CameraOperatingMode",
            "serviceName": "Side door",
            "description": "Manually Disabled",
            "value": 0,
            "format": "bool",
            "perms": [
              "ev",
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": true
          },
          {
            "aid": 7,
            "iid": 14,
            "uuid": "0000021D-0000-1000-8000-0026BB765291",
            "type": "CameraOperatingModeIndicator",
            "serviceType": "CameraOperatingMode",
            "serviceName": "Side door",
            "description": "Camera Operating Mode Indicator",
            "value": 1,
            "format": "bool",
            "perms": [
              "ev",
              "pr",
              "pw",
              "tw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": true
          },
          {
            "aid": 7,
            "iid": 15,
            "uuid": "0000011B-0000-1000-8000-0026BB765291",
            "type": "NightVision",
            "serviceType": "CameraOperatingMode",
            "serviceName": "Side door",
            "description": "Night Vision",
            "value": 1,
            "format": "bool",
            "perms": [
              "ev",
              "pr",
              "pw",
              "tw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": true
          },
          {
            "aid": 7,
            "iid": 11,
            "uuid": "00000223-0000-1000-8000-0026BB765291",
            "type": "EventSnapshotsActive",
            "serviceType": "CameraOperatingMode",
            "serviceName": "Side door",
            "description": "Event Snapshots Active",
            "value": 0,
            "format": "uint8",
            "perms": [
              "ev",
              "pr",
              "pw"
            ],
            "maxValue": 1,
            "minValue": 0,
            "canRead": true,
            "canWrite": true,
            "ev": true
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "Eufy",
          "Model": "INDOOR_CAMERA",
          "Name": "Side door",
          "Serial Number": "T8400P20202844ED",
          "Firmware Revision": "2.2.0.2",
          "Hardware Revision": "P2"
        },
        "values": {
          "HomeKitCameraActive": 1,
          "ManuallyDisabled": 0,
          "CameraOperatingModeIndicator": 1,
          "NightVision": 1,
          "EventSnapshotsActive": 0
        },
        "instance": {
          "name": "homebridge",
          "username": "0E:89:A7:DA:D3:21",
          "ipAddress": "192.168.1.11",
          "port": 40929,
          "services": [],
          "connectionFailedCount": 0,
          "configurationNumber": "21"
        },
        "uniqueId": "08895731d0736b8028cfd89ba93229c24cead807a2dbdbb9b209ff771b88c31a"
      },
      {
        "aid": 7,
        "iid": 16,
        "uuid": "00000085-0000-1000-8000-0026BB765291",
        "type": "MotionSensor",
        "humanType": "Motion Sensor",
        "serviceName": "Side door",
        "serviceCharacteristics": [
          {
            "aid": 7,
            "iid": 18,
            "uuid": "00000022-0000-1000-8000-0026BB765291",
            "type": "MotionDetected",
            "serviceType": "MotionSensor",
            "serviceName": "Side door",
            "description": "Motion Detected",
            "value": 0,
            "format": "bool",
            "perms": [
              "ev",
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": true
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "Eufy",
          "Model": "INDOOR_CAMERA",
          "Name": "Side door",
          "Serial Number": "T8400P20202844ED",
          "Firmware Revision": "2.2.0.2",
          "Hardware Revision": "P2"
        },
        "values": {
          "MotionDetected": 0
        },
        "instance": {
          "name": "homebridge",
          "username": "0E:89:A7:DA:D3:21",
          "ipAddress": "192.168.1.11",
          "port": 40929,
          "services": [],
          "connectionFailedCount": 0,
          "configurationNumber": "21"
        },
        "uniqueId": "f4827932577f2073ae5584a4a66607a1dd67af9b3e5bf22d59dffdc702d0f240"
      },
      {
        "aid": 7,
        "iid": 19,
        "uuid": "00000110-0000-1000-8000-0026BB765291",
        "type": "CameraRTPStreamManagement",
        "humanType": "Camera Rtp Stream Management",
        "serviceName": "Side door",
        "serviceCharacteristics": [
          {
            "aid": 7,
            "iid": 22,
            "uuid": "00000120-0000-1000-8000-0026BB765291",
            "type": "StreamingStatus",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Side door",
            "description": "Streaming Status",
            "value": "AQEA",
            "format": "tlv8",
            "perms": [
              "ev",
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": true
          },
          {
            "aid": 7,
            "iid": 23,
            "uuid": "00000115-0000-1000-8000-0026BB765291",
            "type": "SupportedAudioStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Side door",
            "description": "Supported Audio Stream Configuration",
            "value": "AQ4BAQICCQEBAQIBAAMBAQIBAA==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 7,
            "iid": 24,
            "uuid": "00000116-0000-1000-8000-0026BB765291",
            "type": "SupportedRTPConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Side door",
            "description": "Supported RTP Configuration",
            "value": "AgEA",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 7,
            "iid": 25,
            "uuid": "00000114-0000-1000-8000-0026BB765291",
            "type": "SupportedVideoStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Side door",
            "description": "Supported Video Stream Configuration",
            "value": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 7,
            "iid": 26,
            "uuid": "000000B0-0000-1000-8000-0026BB765291",
            "type": "Active",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Side door",
            "description": "Active",
            "value": 1,
            "format": "uint8",
            "perms": [
              "ev",
              "pr",
              "pw"
            ],
            "maxValue": 1,
            "minValue": 0,
            "minStep": 1,
            "canRead": true,
            "canWrite": true,
            "ev": true
          },
          {
            "aid": 7,
            "iid": 20,
            "uuid": "00000117-0000-1000-8000-0026BB765291",
            "type": "SelectedRTPStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Side door",
            "description": "Selected RTP Stream Configuration",
            "value": "AQMCAQI=",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          },
          {
            "aid": 7,
            "iid": 21,
            "uuid": "00000118-0000-1000-8000-0026BB765291",
            "type": "SetupEndpoints",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Side door",
            "description": "Setup Endpoints",
            "value": "AgEC",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "Eufy",
          "Model": "INDOOR_CAMERA",
          "Name": "Side door",
          "Serial Number": "T8400P20202844ED",
          "Firmware Revision": "2.2.0.2",
          "Hardware Revision": "P2"
        },
        "values": {
          "StreamingStatus": "AQEA",
          "SupportedAudioStreamConfiguration": "AQ4BAQICCQEBAQIBAAMBAQIBAA==",
          "SupportedRTPConfiguration": "AgEA",
          "SupportedVideoStreamConfiguration": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
          "Active": 1,
          "SelectedRTPStreamConfiguration": "AQMCAQI=",
          "SetupEndpoints": "AgEC"
        },
        "instance": {
          "name": "homebridge",
          "username": "0E:89:A7:DA:D3:21",
          "ipAddress": "192.168.1.11",
          "port": 40929,
          "services": [],
          "connectionFailedCount": 0,
          "configurationNumber": "21"
        },
        "uniqueId": "e8e6aec782cd554108e95e4a61b7fa4e941f2c63b9e656e6c828ac89e26e2dbd"
      },
      {
        "aid": 7,
        "iid": 27,
        "uuid": "00000110-0000-1000-8000-0026BB765291",
        "type": "CameraRTPStreamManagement",
        "humanType": "Camera Rtp Stream Management",
        "serviceName": "Side door",
        "serviceCharacteristics": [
          {
            "aid": 7,
            "iid": 30,
            "uuid": "00000120-0000-1000-8000-0026BB765291",
            "type": "StreamingStatus",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Side door",
            "description": "Streaming Status",
            "value": "AQEA",
            "format": "tlv8",
            "perms": [
              "ev",
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": true
          },
          {
            "aid": 7,
            "iid": 31,
            "uuid": "00000115-0000-1000-8000-0026BB765291",
            "type": "SupportedAudioStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Side door",
            "description": "Supported Audio Stream Configuration",
            "value": "AQ4BAQICCQEBAQIBAAMBAQIBAA==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 7,
            "iid": 32,
            "uuid": "00000116-0000-1000-8000-0026BB765291",
            "type": "SupportedRTPConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Side door",
            "description": "Supported RTP Configuration",
            "value": "AgEA",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 7,
            "iid": 33,
            "uuid": "00000114-0000-1000-8000-0026BB765291",
            "type": "SupportedVideoStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Side door",
            "description": "Supported Video Stream Configuration",
            "value": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
            "format": "tlv8",
            "perms": [
              "pr"
            ],
            "canRead": true,
            "canWrite": false,
            "ev": false
          },
          {
            "aid": 7,
            "iid": 34,
            "uuid": "000000B0-0000-1000-8000-0026BB765291",
            "type": "Active",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Side door",
            "description": "Active",
            "value": 1,
            "format": "uint8",
            "perms": [
              "ev",
              "pr",
              "pw"
            ],
            "maxValue": 1,
            "minValue": 0,
            "minStep": 1,
            "canRead": true,
            "canWrite": true,
            "ev": true
          },
          {
            "aid": 7,
            "iid": 28,
            "uuid": "00000117-0000-1000-8000-0026BB765291",
            "type": "SelectedRTPStreamConfiguration",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Side door",
            "description": "Selected RTP Stream Configuration",
            "value": "AQMCAQI=",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          },
          {
            "aid": 7,
            "iid": 29,
            "uuid": "00000118-0000-1000-8000-0026BB765291",
            "type": "SetupEndpoints",
            "serviceType": "CameraRTPStreamManagement",
            "serviceName": "Side door",
            "description": "Setup Endpoints",
            "value": "AgEC",
            "format": "tlv8",
            "perms": [
              "pr",
              "pw"
            ],
            "canRead": true,
            "canWrite": true,
            "ev": false
          }
        ],
        "accessoryInformation": {
          "Manufacturer": "Eufy",
          "Model": "INDOOR_CAMERA",
          "Name": "Side door",
          "Serial Number": "T8400P20202844ED",
          "Firmware Revision": "2.2.0.2",
          "Hardware Revision": "P2"
        },
        "values": {
          "StreamingStatus": "AQEA",
          "SupportedAudioStreamConfiguration": "AQ4BAQICCQEBAQIBAAMBAQIBAA==",
          "SupportedRTPConfiguration": "AgEA",
          "SupportedVideoStreamConfiguration": "AcUBAQACHQEBAAAAAQEBAAABAQICAQAAAAIBAQAAAgECAwEAAwsBAkABAgK0AAMBHgAAAwsBAkABAgLwAAMBDwAAAwsBAkABAgLwAAMBHgAAAwsBAuABAgIOAQMBHgAAAwsBAuABAgJoAQMBHgAAAwsBAoACAgJoAQMBHgAAAwsBAoACAgLgAQMBHgAAAwsBAgAFAgLQAgMBHgAAAwsBAgAFAgLAAwMBHgAAAwsBAoAHAgI4BAMBHgAAAwsBAkAGAgKwBAMBHg==",
          "Active": 1,
          "SelectedRTPStreamConfiguration": "AQMCAQI=",
          "SetupEndpoints": "AgEC"
        },
        "instance": {
          "name": "homebridge",
          "username": "0E:89:A7:DA:D3:21",
          "ipAddress": "192.168.1.11",
          "port": 40929,
          "services": [],
          "connectionFailedCount": 0,
          "configurationNumber": "21"
        },
        "uniqueId": "67fa85f535234f003c95e01c90897d1d3aff7a5523ee1b5cd593aedbebc1b30d"
      }
    ];
  });

  test('toList filters and maps devices correctly', () => {
    const result = node.toList({ perms: 'ev' });
    expect(result).toEqual([
      {
        name: 'Living Room Light',
        fullName: 'Living Room Light - Lightbulb',
        sortName: 'Living Room Light:Lightbulb',
        uniqueId: 'Bridge100:11:22:33:44:55AcmeLiving Room Light12345678',
        homebridge: 'Bridge1',
        service: 'Lightbulb',
        manufacturer: 'Acme',
      },
      {
        name: 'Kitchen Switch',
        fullName: 'Kitchen Switch - Switch',
        sortName: 'Kitchen Switch:Switch',
        uniqueId: 'Bridge211:22:33:44:55:66AcmeKitchen Switch87654321',
        homebridge: 'Bridge2',
        service: 'Switch',
        manufacturer: 'Acme',
      },
      {
        "fullName": "Canoe - MotionSensor",
        "homebridge": "ECI-T24F2",
        "manufacturer": "HikVision",
        "name": "Canoe",
        "service": "MotionSensor",
        "sortName": "Canoe:MotionSensor",
        "uniqueId": "ECI-T24F25C:EE:FE:4D:64:B4HikVisionCanoe00000085",
      },
      {
        "fullName": "Canoe 5036 - CameraRTPStreamManagement",
        "homebridge": "ECI-T24F2",
        "manufacturer": "HikVision",
        "name": "Canoe 5036",
        "service": "CameraRTPStreamManagement",
        "sortName": "Canoe 5036:CameraRTPStreamManagement",
        "uniqueId": "ECI-T24F25C:EE:FE:4D:64:B4HikVisionCanoe 503600000110",
      },
      {
        name: 'Backyard',
        fullName: 'Backyard - MotionSensor',
        sortName: 'Backyard:MotionSensor',
        uniqueId: 'homebridge0E:89:A7:DA:D3:21EufyBackyard00000085',
        homebridge: 'homebridge',
        service: 'MotionSensor',
        manufacturer: 'Eufy'
      },
      {
        name: 'Backyard',
        fullName: 'Backyard - CameraRTPStreamManagement',
        sortName: 'Backyard:CameraRTPStreamManagement',
        uniqueId: 'homebridge0E:89:A7:DA:D3:21EufyBackyard00000110',
        homebridge: 'homebridge',
        service: 'CameraRTPStreamManagement',
        manufacturer: 'Eufy'
      },
      {
        name: 'Side door',
        fullName: 'Side door - MotionSensor',
        sortName: 'Side door:MotionSensor',
        uniqueId: 'homebridge0E:89:A7:DA:D3:21EufySide door00000085',
        homebridge: 'homebridge',
        service: 'MotionSensor',
        manufacturer: 'Eufy'
      },
      {
        name: 'Side door',
        fullName: 'Side door - CameraRTPStreamManagement',
        sortName: 'Side door:CameraRTPStreamManagement',
        uniqueId: 'homebridge0E:89:A7:DA:D3:21EufySide door00000110',
        homebridge: 'homebridge',
        service: 'CameraRTPStreamManagement',
        manufacturer: 'Eufy'
      }
    ]);

    // Ensure the unsupported type was filtered out
    expect(result.find(device => device.name === 'Garage Sensor')).toBeUndefined();
  });


});
