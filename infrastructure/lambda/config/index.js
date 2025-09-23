const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

// DynamoDB クライアントを初期化
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-1'
});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * 確認項目設定を取得するLambda関数
 */
exports.handler = async (event) => {
  console.log('Config Lambda function started');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // CORS ヘッダー
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json'
  };
  
  try {
    // OPTIONS リクエストの処理
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'OK' })
      };
    }
    
    // GET リクエストの処理
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: 'Only GET method is allowed'
          }
        })
      };
    }
    
    // DynamoDB から設定を取得
    const tableName = process.env.CONFIG_TABLE_NAME;
    if (!tableName) {
      throw new Error('CONFIG_TABLE_NAME environment variable is not set');
    }
    
    console.log(`Getting config from table: ${tableName}`);
    
    const getCommand = new GetCommand({
      TableName: tableName,
      Key: {
        PK: 'CONFIG',
        SK: 'UPLOAD_CHECKLIST'
      }
    });
    
    const result = await docClient.send(getCommand);
    
    if (!result.Item) {
      console.log('No config found in database');
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'CONFIG_NOT_FOUND',
            message: 'Configuration not found'
          }
        })
      };
    }
    
    console.log('Config retrieved successfully');
    
    // レスポンスを返す
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: {
          confirmationItems: result.Item.items,
          lastUpdated: new Date(result.Item.updatedAt).toISOString(),
          version: '1.0'
        }
      })
    };
    
  } catch (error) {
    console.error('Error in config handler:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      })
    };
  }
};