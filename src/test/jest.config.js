module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    modulePathIgnorePatterns: ['<rootDir>/build'],
    testMatch: ['**/src/test/unit/**/*.test.ts'],
};
