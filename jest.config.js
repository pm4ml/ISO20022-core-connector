module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    modulePathIgnorePatterns: ['<rootDir>/build'],
    testMatch: ['<rootDir>/src/test/unit/**/*.test.ts'],
    setupFiles: ['<rootDir>/src/test/unit/test-setup.ts'],
};
