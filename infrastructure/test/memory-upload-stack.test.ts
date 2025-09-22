import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MemoryUploadStack } from '../lib/stacks/memory-upload-stack';

describe('MemoryUploadStack', () => {
  let app: cdk.App;
  let stack: MemoryUploadStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();

    const mockConfig = {
      stackName: 'TestStack',
      environment: 'test',
      region: 'ap-northeast-1',
      tags: {
        Project: 'JawsFestaMemoryUpload',
        Environment: 'test'
      }
    };

    stack = new MemoryUploadStack(app, 'TestMemoryUploadStack', {
      config: mockConfig,
      environment: 'test',
    });

    template = Template.fromStack(stack);
  });

  test('Stack creates successfully', () => {
    expect(stack).toBeDefined();
  });

  test('Stack has correct outputs', () => {
    template.hasOutput('StackName', {
      Description: 'Name of the CloudFormation stack',
    });

    template.hasOutput('Environment', {
      Description: 'Deployment environment',
    });

    template.hasOutput('Region', {
      Description: 'AWS Region',
    });
  });

  test('Stack synthesizes without errors', () => {
    expect(() => {
      app.synth();
    }).not.toThrow();
  });
});