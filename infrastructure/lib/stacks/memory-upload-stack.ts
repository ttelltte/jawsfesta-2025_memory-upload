import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';
import * as path from 'path';

export interface MemoryUploadStackProps extends cdk.StackProps {
  config: any;
  environment: string;
}

export class MemoryUploadStack extends cdk.Stack {
  // パブリックプロパティとして他のリソースからアクセス可能にする
  public readonly photosBucket: s3.Bucket;
  public readonly photosTable: dynamodb.Table;
  public readonly configTable: dynamodb.Table;
  public readonly distribution: cloudfront.Distribution;
  public readonly api: apigateway.RestApi;
  public readonly uploadFunction: lambda.Function;
  public readonly listFunction: lambda.Function;
  public readonly configFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: MemoryUploadStackProps) {
    super(scope, id, props);

    const { config, environment } = props;

    // ===========================================
    // S3 Bucket - 静的サイトホスティング + 画像保存
    // ===========================================
    this.photosBucket = new s3.Bucket(this, 'PhotosBucket', {
      // バケット名は自動生成（重複回避）
      bucketName: config.s3?.bucketName || undefined,
      
      // 静的サイトホスティング設定
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPAのため404もindex.htmlにリダイレクト
      
      // パブリック読み取りアクセス設定
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      
      // CORS設定（フロントエンドからのアクセス用）
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: config.s3?.corsAllowedOrigins || ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      
      // ライフサイクル設定
      lifecycleRules: [
        {
          id: 'DeleteIncompleteMultipartUploads',
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
        // 開発環境では30日後にオブジェクトを自動削除
        ...(environment !== 'prod' ? [{
          id: 'DeleteObjectsAfter30Days',
          expiration: cdk.Duration.days(30),
          prefix: 'images/', // 画像フォルダのみ対象
        }] : []),
      ],
      
      // 削除保護（本番環境では重要）
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      
      // バージョニング（本番環境では有効化）
      versioned: environment === 'prod',
    });

    // ===========================================
    // DynamoDB Table - Photos（画像メタデータ）
    // ===========================================
    this.photosTable = new dynamodb.Table(this, 'PhotosTable', {
      tableName: config.dynamodb?.photosTableName || undefined,
      
      // パーティションキーとソートキー
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK', 
        type: dynamodb.AttributeType.STRING,
      },
      
      // TTL設定（30日後の自動削除）
      timeToLiveAttribute: 'ttl',
      
      // 課金モード（開発環境はオンデマンド、本番環境はプロビジョンド）
      billingMode: environment === 'prod' 
        ? dynamodb.BillingMode.PROVISIONED
        : dynamodb.BillingMode.PAY_PER_REQUEST,
      
      // 本番環境の場合のプロビジョンドキャパシティ
      ...(environment === 'prod' && {
        readCapacity: 5,
        writeCapacity: 5,
      }),
      
      // 削除保護
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      
      // ポイントインタイムリカバリ（本番環境では有効化）
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: environment === 'prod',
      },
    });

    // GSI（Global Secondary Index）- 新着順ソート用
    this.photosTable.addGlobalSecondaryIndex({
      indexName: 'UploadTimeIndex',
      partitionKey: {
        name: 'GSI1PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'uploadTimeUnix',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ===========================================
    // DynamoDB Table - Config（確認項目設定）
    // ===========================================
    this.configTable = new dynamodb.Table(this, 'ConfigTable', {
      tableName: config.dynamodb?.configTableName || undefined,
      
      // パーティションキーとソートキー
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      
      // 課金モード（設定データは少量なのでオンデマンド）
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      
      // 削除保護
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      
      // ポイントインタイムリカバリ（本番環境では有効化）
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: environment === 'prod',
      },
    });

    // ===========================================
    // Lambda Functions
    // ===========================================
    
    // Upload Lambda 関数
    this.uploadFunction = new lambda.Function(this, 'UploadFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/upload')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        // DynamoDB テーブル名
        PHOTOS_TABLE_NAME: this.photosTable.tableName,
        CONFIG_TABLE_NAME: this.configTable.tableName,
        
        // S3 バケット名
        PHOTOS_BUCKET_NAME: this.photosBucket.bucketName,
        
        // 環境設定
        ENVIRONMENT: environment,
        REGION: this.region,
        
        // アプリケーション設定
        MAX_FILE_SIZE: config.upload?.maxFileSize || '10485760', // 10MB
        ALLOWED_FILE_TYPES: config.upload?.allowedFileTypes || 'image/*',
        TTL_DAYS: config.upload?.ttlDays || '30',
        
        // ログレベル
        LOG_LEVEL: config.logging?.level || (environment === 'prod' ? 'WARN' : 'DEBUG'),
        
        // CORS設定
        CORS_ALLOWED_ORIGINS: JSON.stringify(
          config.apiGateway?.corsAllowedOrigins || 
          (environment === 'prod' ? ['https://your-domain.com'] : ['*'])
        ),
      },
      description: `Lambda function for handling image uploads (${environment})`,
    });

    // List Lambda 関数
    this.listFunction = new lambda.Function(this, 'ListFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/list')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        // DynamoDB テーブル名
        PHOTOS_TABLE_NAME: this.photosTable.tableName,
        
        // S3 バケット名
        PHOTOS_BUCKET_NAME: this.photosBucket.bucketName,
        
        // 環境設定
        ENVIRONMENT: environment,
        REGION: this.region,
        
        // アプリケーション設定
        PRESIGNED_URL_EXPIRY: config.s3?.presignedUrlExpiry || '3600', // 1時間
        MAX_ITEMS_PER_PAGE: config.pagination?.maxItemsPerPage || '50',
        
        // ログレベル
        LOG_LEVEL: config.logging?.level || (environment === 'prod' ? 'WARN' : 'DEBUG'),
        
        // CORS設定
        CORS_ALLOWED_ORIGINS: JSON.stringify(
          config.apiGateway?.corsAllowedOrigins || 
          (environment === 'prod' ? ['https://your-domain.com'] : ['*'])
        ),
      },
      description: `Lambda function for retrieving photo list (${environment})`,
    });

    // Config Lambda 関数
    this.configFunction = new lambda.Function(this, 'ConfigFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/config')),
      timeout: cdk.Duration.seconds(15),
      memorySize: 128,
      environment: {
        // DynamoDB テーブル名
        CONFIG_TABLE_NAME: this.configTable.tableName,
        
        // 環境設定
        ENVIRONMENT: environment,
        REGION: this.region,
        
        // キャッシュ設定
        CACHE_TTL: config.cache?.configTtl || '300', // 5分
        
        // ログレベル
        LOG_LEVEL: config.logging?.level || (environment === 'prod' ? 'WARN' : 'DEBUG'),
        
        // CORS設定
        CORS_ALLOWED_ORIGINS: JSON.stringify(
          config.apiGateway?.corsAllowedOrigins || 
          (environment === 'prod' ? ['https://your-domain.com'] : ['*'])
        ),
      },
      description: `Lambda function for retrieving configuration (${environment})`,
    });

    // ===========================================
    // IAM 権限設定（最小権限の原則）
    // ===========================================
    
    // Upload Lambda の権限
    // S3: 画像アップロード用の最小権限（imagesフォルダのみ）
    this.photosBucket.grantPut(this.uploadFunction, 'images/*');
    this.photosBucket.grantPutAcl(this.uploadFunction, 'images/*');
    
    // DynamoDB: Photos テーブルへの書き込み権限
    this.photosTable.grantWriteData(this.uploadFunction);
    
    // DynamoDB: Config テーブルからの読み取り権限
    this.configTable.grantReadData(this.uploadFunction);

    // 追加のIAMポリシー: Upload Lambda用
    this.uploadFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:PutObject',
        's3:PutObjectAcl',
      ],
      resources: [
        `${this.photosBucket.bucketArn}/images/*`,
      ],
      conditions: {
        StringEquals: {
          's3:x-amz-server-side-encryption': 'AES256',
        },
        NumericLessThan: {
          's3:max-keys': '1',
        },
      },
    }));

    // List Lambda の権限
    // S3: 画像読み取り用の最小権限（Presigned URL生成用）
    this.photosBucket.grantRead(this.listFunction, 'images/*');
    
    // DynamoDB: Photos テーブルからの読み取り権限（GSI含む）
    this.photosTable.grantReadData(this.listFunction);

    // 追加のIAMポリシー: List Lambda用（Presigned URL生成）
    this.listFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
      ],
      resources: [
        `${this.photosBucket.bucketArn}/images/*`,
      ],
    }));

    // Config Lambda の権限
    // DynamoDB: Config テーブルからの読み取り権限のみ
    this.configTable.grantReadData(this.configFunction);

    // 追加のIAMポリシー: Config Lambda用（特定のアイテムのみ読み取り）
    this.configFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:Query',
      ],
      resources: [
        this.configTable.tableArn,
      ],
      conditions: {
        'ForAllValues:StringEquals': {
          'dynamodb:Attributes': ['PK', 'SK', 'items', 'updatedAt'],
        },
      },
    }));

    // CloudWatch Logs権限（全Lambda関数共通）
    const cloudWatchLogsPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: [
        `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/*`,
      ],
    });

    this.uploadFunction.addToRolePolicy(cloudWatchLogsPolicy);
    this.listFunction.addToRolePolicy(cloudWatchLogsPolicy);
    this.configFunction.addToRolePolicy(cloudWatchLogsPolicy);

    // ===========================================
    // API Gateway
    // ===========================================
    
    this.api = new apigateway.RestApi(this, 'MemoryUploadApi', {
      restApiName: `JAWS FESTA Memory Upload API (${environment})`,
      description: 'API for JAWS FESTA Memory Upload application',
      
      // CORS設定 - セキュリティを考慮した基本設定
      defaultCorsPreflightOptions: {
        allowOrigins: config.apiGateway?.corsAllowedOrigins || 
          (environment === 'prod' ? ['https://your-domain.com'] : apigateway.Cors.ALL_ORIGINS),
        allowMethods: config.apiGateway?.corsAllowedMethods || ['GET', 'POST', 'OPTIONS'],
        allowHeaders: config.apiGateway?.corsAllowedHeaders || [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Requested-With',
        ],
        maxAge: cdk.Duration.seconds(86400), // 24時間キャッシュ
      },
      
      // バイナリメディアタイプ（画像アップロード用）
      binaryMediaTypes: ['image/*', 'multipart/form-data'],
      
      // エンドポイント設定
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
      
      // CloudWatch ログ設定
      cloudWatchRole: true,
      deployOptions: {
        stageName: environment,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'prod', // 本番環境では詳細ログを無効化
        metricsEnabled: true,
        throttlingRateLimit: 100, // リクエスト制限
        throttlingBurstLimit: 200,
      },
      
      // 失敗時の設定
      failOnWarnings: false,
      
      // API キー設定（将来の拡張用）
      apiKeySourceType: apigateway.ApiKeySourceType.HEADER,
    });

    // API リソースとメソッドの設定
    const apiResource = this.api.root.addResource('api', {
      defaultCorsPreflightOptions: {
        allowOrigins: config.apiGateway?.corsAllowedOrigins || 
          (environment === 'prod' ? ['https://your-domain.com'] : apigateway.Cors.ALL_ORIGINS),
        allowMethods: config.apiGateway?.corsAllowedMethods || ['GET', 'POST', 'OPTIONS'],
        allowHeaders: config.apiGateway?.corsAllowedHeaders || [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Requested-With',
        ],
      },
    });
    
    // /api/upload エンドポイント - 画像アップロード用
    const uploadResource = apiResource.addResource('upload');
    uploadResource.addMethod('POST', new apigateway.LambdaIntegration(this.uploadFunction, {
      // プロキシ統合を使用してシンプルに設定
      proxy: true,
    }));
    
    // /api/photos エンドポイント - 画像一覧取得用
    const photosResource = apiResource.addResource('photos');
    photosResource.addMethod('GET', new apigateway.LambdaIntegration(this.listFunction, {
      // プロキシ統合を使用してシンプルに設定
      proxy: true,
    }));
    
    // /api/config エンドポイント - 確認項目設定取得用
    const configResource = apiResource.addResource('config');
    configResource.addMethod('GET', new apigateway.LambdaIntegration(this.configFunction, {
      // プロキシ統合を使用してシンプルに設定
      proxy: true,
    }));

    // ===========================================
    // CloudFront Distribution
    // ===========================================
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      // デフォルトビヘイビア（静的サイト用）
      defaultBehavior: {
        origin: new origins.S3StaticWebsiteOrigin(this.photosBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        
        // キャッシュポリシー（静的アセット用）
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        
        // オリジンリクエストポリシー
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
      },
      
      // 追加ビヘイビア
      additionalBehaviors: {
        // 画像ファイル用
        '/images/*': {
          origin: new origins.S3StaticWebsiteOrigin(this.photosBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          
          // 画像用のキャッシュポリシー（長期キャッシュ）
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        },
        
        // API Gateway用
        '/api/*': {
          origin: new origins.RestApiOrigin(this.api),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          
          // API用のキャッシュポリシー（キャッシュしない）
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
      },
      
      // デフォルトルートオブジェクト
      defaultRootObject: 'index.html',
      
      // エラーページ設定（SPA用）
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      
      // 価格クラス（地域制限）
      priceClass: config.cloudfront?.priceClass === 'PriceClass_All' 
        ? cloudfront.PriceClass.PRICE_CLASS_ALL
        : cloudfront.PriceClass.PRICE_CLASS_100,
      
      // HTTP/2とHTTP/3サポート
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      
      // 有効化
      enabled: true,
      
      // コメント
      comment: `CloudFront Distribution for JAWS FESTA Memory Upload (${environment})`,
    });

    // ===========================================
    // CloudFormation Outputs
    // ===========================================
    
    // スタック情報
    new cdk.CfnOutput(this, 'StackName', {
      value: this.stackName,
      description: 'Name of the CloudFormation stack',
    });

    new cdk.CfnOutput(this, 'Environment', {
      value: environment,
      description: 'Deployment environment',
    });

    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region',
    });

    // S3バケット情報
    new cdk.CfnOutput(this, 'PhotosBucketName', {
      value: this.photosBucket.bucketName,
      description: 'Name of the S3 bucket for photos and static site',
      exportName: `${this.stackName}-PhotosBucketName`,
    });

    new cdk.CfnOutput(this, 'PhotosBucketWebsiteUrl', {
      value: this.photosBucket.bucketWebsiteUrl,
      description: 'Website URL of the S3 bucket',
      exportName: `${this.stackName}-PhotosBucketWebsiteUrl`,
    });

    // DynamoDB テーブル情報
    new cdk.CfnOutput(this, 'PhotosTableName', {
      value: this.photosTable.tableName,
      description: 'Name of the DynamoDB table for photos metadata',
      exportName: `${this.stackName}-PhotosTableName`,
    });

    new cdk.CfnOutput(this, 'ConfigTableName', {
      value: this.configTable.tableName,
      description: 'Name of the DynamoDB table for configuration',
      exportName: `${this.stackName}-ConfigTableName`,
    });

    // CloudFront情報
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `${this.stackName}-CloudFrontDistributionId`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
      exportName: `${this.stackName}-CloudFrontDomainName`,
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Website URL (CloudFront)',
      exportName: `${this.stackName}-WebsiteUrl`,
    });

    // API Gateway情報
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
      exportName: `${this.stackName}-ApiGatewayUrl`,
    });

    new cdk.CfnOutput(this, 'ApiGatewayId', {
      value: this.api.restApiId,
      description: 'API Gateway ID',
      exportName: `${this.stackName}-ApiGatewayId`,
    });

    // Lambda Functions情報
    new cdk.CfnOutput(this, 'UploadFunctionName', {
      value: this.uploadFunction.functionName,
      description: 'Upload Lambda Function Name',
      exportName: `${this.stackName}-UploadFunctionName`,
    });

    new cdk.CfnOutput(this, 'ListFunctionName', {
      value: this.listFunction.functionName,
      description: 'List Lambda Function Name',
      exportName: `${this.stackName}-ListFunctionName`,
    });

    new cdk.CfnOutput(this, 'ConfigFunctionName', {
      value: this.configFunction.functionName,
      description: 'Config Lambda Function Name',
      exportName: `${this.stackName}-ConfigFunctionName`,
    });
  }
}