import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

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
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      
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
      
      // ライフサイクル設定（将来の拡張用）
      lifecycleRules: [
        {
          id: 'DeleteIncompleteMultipartUploads',
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
      ],
      
      // 削除保護（本番環境では重要）
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
      
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
      
      // 追加ビヘイビア（画像ファイル用）
      additionalBehaviors: {
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
  }
}