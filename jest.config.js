// @ts-check

/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
const config = {
  // extensionsToTreatAsEsm: ['.ts'],
  // collectCoverage: true,
  // coverageReporters: ['lcov', 'text-summary'],
  projects: [
    {
      transform: {
        '^.+\\.(t|j)sx?$': '@swc/jest',
        '^.+\\.mjs$': '@swc/jest',
      },
      // Recent msw versions pull in ESM-only deps; let swc transpile them to CommonJS
      transformIgnorePatterns: ['/node_modules/(?!(rettime|until-async|@open-draft)/)'],
      testEnvironment: 'node',
      clearMocks: true,
      testMatch: ['<rootDir>/**/*.spec.ts'],
      // collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
      rootDir: './',
      // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    },
  ],
}
export default config
