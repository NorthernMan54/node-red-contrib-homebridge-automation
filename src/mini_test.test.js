// Test: Can we mutate the module object to mock HapClient?
import { vi, test, expect, beforeEach, afterEach } from 'vitest';

// Import hbConfigNode to ensure it's loaded and its HapClient reference is set
import HBConfigNode from './hbConfigNode.js';

// Get the module object
const hapClientLib = require('@homebridge/hap-client');

let OriginalHapClient;

beforeEach(() => {
  // Save original and replace with mock
  OriginalHapClient = hapClientLib.HapClient;
  console.log('Original:', hapClientLib.HapClient === OriginalHapClient);
});

afterEach(() => {
  hapClientLib.HapClient = OriginalHapClient;
});

test('check if module object is shared', () => {
  console.log('hapClientLib:', Object.keys(hapClientLib));
  console.log('same object?', hapClientLib === require('@homebridge/hap-client'));
  
  // Try mutating
  const MockHapClient = vi.fn();
  hapClientLib.HapClient = MockHapClient;
  console.log('After mutation:', require('@homebridge/hap-client').HapClient === MockHapClient);
});
