import Module from 'node:module';

// Create a stable mock HapClient constructor for the lifetime of this worker process.
// A regular function (not an arrow function) is required because hbConfigNode.js
// instantiates HapClient with `new`; arrow functions cannot be used as constructors.
// A fresh object is returned per call, keeping test instances isolated.
const MockHapClient = vi.fn().mockImplementation(function () {
  return {
    getAllServices: vi.fn().mockResolvedValue([]),
    on: vi.fn(),
    removeListener: vi.fn(),
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn(),
    destroy: vi.fn(),
  };
});

// Patch Node's CJS module loader so that require('@homebridge/hap-client') inside
// hbConfigNode.js (a CJS module) returns the mock constructor.
// vi.mock() alone cannot intercept CJS require() calls in Vitest v4's forks pool
// because the module runner injects native createRequire() for CJS modules, which
// calls Module._load directly and bypasses Vitest's mock registry.
const _origLoad = Module._load;
Module._load = function (id, parent, isMain) {
  if (id === '@homebridge/hap-client') {
    return { HapClient: MockHapClient };
  }
  return _origLoad.apply(this, arguments);
};

// Clear constructor call history before each test so per-describe beforeEach blocks
// get a clean slate. Instance methods are fresh per instantiation (see mockImplementation).
beforeEach(() => {
  MockHapClient.mockClear();
});
