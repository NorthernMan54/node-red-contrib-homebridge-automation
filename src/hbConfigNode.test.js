// File: src/hbConfigNode.test.js
// @homebridge/hap-client is mocked via Module._load in vitest.setup.js.
// That patch runs before this file is evaluated, so the require() calls below
// already return the mock constructor rather than the real ESM package.
const HBConfigNode = require('./hbConfigNode');
const { HapClient } = require('@homebridge/hap-client');
const fs = require('fs');
const path = require('path');

// Helper function to load test fixtures
const loadFixture = (filename) => {
  const fixturePath = path.join(__dirname, '..', 'test', filename);
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
};

// Common test setup
const createTestNode = (config = {}) => {
  const mockConfig = {
    username: '123-45-678',
    macAddress: '00:11:22:33:44:55',
    ...config,
  };

  const RED = {
    nodes: {
      createNode: vi.fn(),
    },
  };

  const node = new HBConfigNode(mockConfig, RED);
  node.warn = vi.fn();
  node.log = vi.fn();
  node.error = vi.fn();

  return node;
};

describe('Issue 142 - Unsupported device types', () => {
  let node;

  beforeEach(() => {
    node = createTestNode();
  });

  test('should filter out unsupported device types and include supported window coverings', async () => {
    const endpoints = loadFixture('issue42-endpoints.json');
    const expectedDevices = loadFixture('issue42-hbDevices.json');

    node.hapClient.getAllServices.mockResolvedValue(endpoints);
    await node.handleReady();

    const result = node.toList({ perms: 'ev' });

    expect(result).toEqual(expectedDevices);
    expect(result.find(device => device.name === 'Garage Sensor')).toBeUndefined();
    expect(result.find(device => device.name === 'Kitchen Curtain')).toBeDefined();
    expect(result.find(device => device.name === 'Livingroom Curtain')).toBeDefined();
  });
});

describe('Device list generation', () => {
  let node;

  beforeEach(() => {
    node = createTestNode();
  });

  test('should generate correct device list from homebridge endpoints (v3)', async () => {
    const EXPECTED_DEVICE_COUNT = 138;
    const endpoints = loadFixture('homebridge-automation-endpoints.json');
    const expectedDevices = loadFixture('homebridge-automation-hbDevices-v3.json');

    node.hapClient.getAllServices.mockResolvedValue(endpoints);
    await node.handleReady();

    const result = node.toList({ perms: 'ev' });

    expect(result).toHaveLength(EXPECTED_DEVICE_COUNT);
    expect(result).toEqual(expectedDevices);
    expect(result.find(device => device.name === 'Garage Sensor')).toBeUndefined();
  });

  test('should correctly parse power bar devices', async () => {
    const EXPECTED_DEVICE_COUNT = 9;
    const endpoints = loadFixture('powerBar-endpoints.json');
    const expectedDevices = loadFixture('powerBar-hbDevices.json');

    node.hapClient.getAllServices.mockResolvedValue(endpoints);
    await node.handleReady();

    const result = node.toList({ perms: 'ev' });

    // fs.writeFileSync(path.join(__dirname, '..', 'test', 'powerBar-hbDevices.json'), JSON.stringify(result, null, 2), 'utf8');
    expect(result).toHaveLength(EXPECTED_DEVICE_COUNT);
    expect(result).toEqual(expectedDevices);
  });

  test('should correctly handle service label indexes', async () => {
    const EXPECTED_DEVICE_COUNT = 9;
    const endpoints = loadFixture('serviceLabelIndex-endpoints.json');
    const expectedDevices = loadFixture('serviceLabelIndex-hbDevices.json');

    node.hapClient.getAllServices.mockResolvedValue(endpoints);
    await node.handleReady();

    const result = node.toList({ perms: 'ev' });
    // fs.writeFileSync(path.join(__dirname, '..', 'test', 'serviceLabelIndex-hbDevices.json'), JSON.stringify(result, null, 2), 'utf8');
    expect(result).toHaveLength(EXPECTED_DEVICE_COUNT);
    expect(result).toEqual(expectedDevices);
  });

  test('composeDisplayName falls back gracefully when serviceName and accessoryInformation.Name are missing', async () => {
    const baseService = {
      aid: 1,
      iid: 8,
      uuid: 'AABBCCDD-0000-1000-8000-0026BB765291',
      type: 'Outlet',
      humanType: 'Outlet',
      serviceName: '',
      serviceCharacteristics: [
        {
          aid: 1,
          iid: 10,
          uuid: '00000025-0000-1000-8000-0026BB765291',
          type: 'On',
          serviceType: 'Outlet',
          serviceName: '',
          description: 'On',
          value: 0,
          format: 'bool',
          perms: ['ev', 'pr', 'pw'],
          canRead: true,
          canWrite: true,
          ev: true,
        },
      ],
      accessoryInformation: {
        Manufacturer: 'TestMfr',
        Model: 'TestModel',
        Name: '',
        'Serial Number': 'SN-001',
        'Firmware Revision': '1.0',
      },
      values: {},
      instance: { name: 'TestBridge', username: 'AA:BB:CC:DD:EE:FF', port: 51826 },
    };

    // Fallback 1: no serviceName, no Name → should use username-aid:iid
    const endpointsType = [{ ...baseService, serviceName: '', accessoryInformation: { ...baseService.accessoryInformation, Name: '' } }];
    node.hapClient.getAllServices.mockResolvedValue(endpointsType);
    await node.handleReady();
    const resultType = node.toList({ perms: 'ev' });
    expect(resultType).toHaveLength(1);
    expect(resultType[0].name).not.toContain('undefined');
    expect(resultType[0].name).toBe('AA:BB:CC:DD:EE:FF-1:8');
  });

  test('Devices with duplicate unique IDs should be handled and logged', async () => {
    const EXPECTED_DEVICE_COUNT = 1;
    const endpoints = loadFixture('duplicate-endpoints.json');
    const expectedDevices = loadFixture('duplicate-hbDevices.json');

    expect(node.warn).toHaveBeenCalledTimes(0);
    node.hapClient.getAllServices.mockResolvedValue(endpoints);
    await node.handleReady();

    const result = node.toList({ perms: 'ev' });
    // fs.writeFileSync(path.join(__dirname, '..', 'test', 'duplicate-hbDevices.json'), JSON.stringify(result, null, 2), 'utf8');
    expect(result).toHaveLength(EXPECTED_DEVICE_COUNT);
    expect(result).toEqual(expectedDevices);
    expect(node.warn).toHaveBeenCalledTimes(1);
    expect(node.warn).toHaveBeenCalledWith(expect.stringContaining('Duplicate uniqueId —'));
  });

  test("Cameras with additional CameraRTPStreamManagement services, should remove additional CameraRTPStreamManagement service", async () => {
    const EXPECTED_DEVICE_COUNT = 2;
    const endpoints = loadFixture('camera-endpoints.json');
    const expectedDevices = loadFixture('camera-hbDevices.json');

    expect(node.warn).toHaveBeenCalledTimes(0);
    node.hapClient.getAllServices.mockResolvedValue(endpoints);
    await node.handleReady();

    const result = node.toList({ perms: 'ev' });
    // fs.writeFileSync(path.join(__dirname, '..', 'test', 'camera-hbDevices.json'), JSON.stringify(result, null, 2), 'utf8');
    expect(result).toHaveLength(EXPECTED_DEVICE_COUNT);
    expect(result).toEqual(expectedDevices);
    expect(node.warn).toHaveBeenCalledTimes(0);
  });
});

describe('HapClient config options', () => {
  let RED;

  beforeEach(() => {
    HapClient.mockClear();
    RED = {
      nodes: {
        createNode: vi.fn().mockImplementation(function (node, config) {
          node.id = config.id;
        }),
      },
    };
    HBConfigNode.clearPersistedState();
  });

  test('passes hapClientDebug:true to HapClient when config.hapClientDebug is true', () => {
    const config = { username: '123-45-678', hapClientDebug: true };
    new HBConfigNode(config, RED);
    expect(HapClient).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ debug: true }),
      })
    );
  });

  test('passes hapClientDebug:false to HapClient when config.hapClientDebug is false', () => {
    const config = { username: '123-45-678', hapClientDebug: false };
    new HBConfigNode(config, RED);
    expect(HapClient).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ debug: false }),
      })
    );
  });

  test('config.debug (Debug Logging) does not affect HapClient debug option', () => {
    const config = { username: '123-45-678', debug: true, hapClientDebug: false };
    new HBConfigNode(config, RED);
    expect(HapClient).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ debug: false }),
      })
    );
  });

  test('passes instanceBlacklist array to HapClient when provided', () => {
    const config = {
      username: '123-45-678',
      instanceBlacklist: '34:42:4E:4A:38:00, 6E:69:51:34:54:00',
    };
    new HBConfigNode(config, RED);
    expect(HapClient).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          instanceBlacklist: ['34:42:4E:4A:38:00', '6E:69:51:34:54:00'],
        }),
      })
    );
  });

  test('does not pass instanceBlacklist to HapClient when not provided', () => {
    const config = { username: '123-45-678' };
    new HBConfigNode(config, RED);
    const callArg = HapClient.mock.calls[0][0];
    expect(callArg.config).not.toHaveProperty('instanceBlacklist');
  });

  test('does not pass instanceBlacklist to HapClient when empty string', () => {
    const config = { username: '123-45-678', instanceBlacklist: '' };
    new HBConfigNode(config, RED);
    const callArg = HapClient.mock.calls[0][0];
    expect(callArg.config).not.toHaveProperty('instanceBlacklist');
  });

  test('trims whitespace from instanceBlacklist entries', () => {
    const config = {
      username: '123-45-678',
      instanceBlacklist: '  34:42:4E:4A:38:00 ,  6E:69:51:34:54:00  ',
    };
    new HBConfigNode(config, RED);
    expect(HapClient).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          instanceBlacklist: ['34:42:4E:4A:38:00', '6E:69:51:34:54:00'],
        }),
      })
    );
  });

  test('recreates HapClient when instanceBlacklist changes on redeploy', () => {
    const config1 = { id: 'node-1', username: '123-45-678', instanceBlacklist: '' };
    const node1 = new HBConfigNode(config1, RED);
    node1.close(false, () => { });

    expect(HapClient).toHaveBeenCalledTimes(1);

    const config2 = { id: 'node-1', username: '123-45-678', instanceBlacklist: '34:42:4E:4A:38:00' };
    new HBConfigNode(config2, RED);

    expect(HapClient).toHaveBeenCalledTimes(2);
  });

  test('recreates HapClient when hapClientDebug changes on redeploy', () => {
    const config1 = { id: 'node-3', username: '123-45-678', hapClientDebug: false };
    const node1 = new HBConfigNode(config1, RED);
    node1.close(false, () => { });

    expect(HapClient).toHaveBeenCalledTimes(1);

    const config2 = { id: 'node-3', username: '123-45-678', hapClientDebug: true };
    new HBConfigNode(config2, RED);

    expect(HapClient).toHaveBeenCalledTimes(2);
  });

  test('reuses HapClient when config unchanged on redeploy', () => {
    const config = { id: 'node-2', username: '123-45-678', instanceBlacklist: '34:42:4E:4A:38:00' };
    const node1 = new HBConfigNode(config, RED);
    node1.close(false, () => { });

    expect(HapClient).toHaveBeenCalledTimes(1);

    new HBConfigNode(config, RED);

    expect(HapClient).toHaveBeenCalledTimes(1);
  });
});