// Jest setup file for CDK tests
// This file is executed before each test file

// Mock AWS SDK calls during testing
jest.mock('aws-sdk', () => ({
  // Add mocks as needed for testing
}));

// Set test environment variables
process.env.AWS_DEFAULT_REGION = 'ap-northeast-1';
process.env.CDK_DEFAULT_ACCOUNT = '123456789012';