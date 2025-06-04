{
  "name": "crypto-chart-tests",
  "version": "1.0.0",
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@types/jest": "^29.5.5",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "ts-jest": "^29.1.1"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "jsdom",
    "roots": ["<rootDir>/src"],
    "testMatch": ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
    "collectCoverageFrom": [
      "src/**/*.{ts,tsx}",
      "!src/**/*.d.ts",
      "!src/**/*.stories.{ts,tsx}"
    ]
  }
}
