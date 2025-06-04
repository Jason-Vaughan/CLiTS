module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        extensionsToTreatAsEsm: ['.ts'],
      },
    ],
  },
  testPathIgnorePatterns: ['/dist/'],
  transformIgnorePatterns: ['/node_modules/'],
}; 