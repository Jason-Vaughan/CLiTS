/* global jest */

// Increase timeout for e2e tests
jest.setTimeout(30000);

// Mock browser environment for e2e tests
global.chrome = {
  debugger: {
    attach: jest.fn(),
    detach: jest.fn(),
    sendCommand: jest.fn(),
    onEvent: jest.fn()
  }
}; 