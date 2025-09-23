/**
 * 管理者API テストスクリプト
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';
const ADMIN_PASSWORD = '19931124';

// テスト用のサンプル画像データ（1x1ピクセルの透明PNG）
const SAMPLE_IMAGE_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==';

/**
 * APIリクエストを送信
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`\n🔗 ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(data, null, 2));
    
    return { response, data };
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return { error };
  }
}

/**
 * 画像をアップロードしてIDを取得
 */
async function uploadTestImage() {
  console.log('\n=== 📤 テスト画像アップロード ===');
  
  const uploadData = {
    imageData: SAMPLE_IMAGE_BASE64,
    uploaderName: 'テストユーザー',
    comment: 'テスト用の画像です',
    checkedItems: ['public_agreement', 'code_of_conduct', 'auto_deletion']
  };
  
  const { response, data, error } = await apiRequest('/api/upload', {
    method: 'POST',
    body: JSON.stringify(uploadData)
  });
  
  if (error || !response.ok) {
    console.error('❌ アップロードに失敗しました');
    return null;
  }
  
  console.log('✅ アップロード成功');
  return data.data.id;
}

/**
 * 画像一覧を取得
 */
async function getPhotos() {
  console.log('\n=== 📋 画像一覧取得 ===');
  
  const { response, data, error } = await apiRequest('/api/photos');
  
  if (error || !response.ok) {
    console.error('❌ 画像一覧取得に失敗しました');
    return [];
  }
  
  console.log(`✅ 画像一覧取得成功 (${data.photos?.length || 0}件)`);
  return data.photos || [];
}

/**
 * 管理者機能：画像情報更新テスト
 */
async function testUpdatePhoto(photoId) {
  console.log('\n=== ✏️ 管理者機能：画像情報更新テスト ===');
  
  const updateData = {
    uploaderName: '更新されたユーザー名',
    comment: '更新されたコメントです',
    rotation: 90
  };
  
  const { response, data, error } = await apiRequest(
    `/api/admin/photos/${photoId}?admin=${ADMIN_PASSWORD}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    }
  );
  
  if (error || !response.ok) {
    console.error('❌ 画像更新に失敗しました');
    return false;
  }
  
  console.log('✅ 画像更新成功');
  return true;
}

/**
 * 管理者機能：画像削除テスト
 */
async function testDeletePhoto(photoId) {
  console.log('\n=== 🗑️ 管理者機能：画像削除テスト ===');
  
  const { response, data, error } = await apiRequest(
    `/api/admin/photos/${photoId}?admin=${ADMIN_PASSWORD}`,
    {
      method: 'DELETE'
    }
  );
  
  if (error || !response.ok) {
    console.error('❌ 画像削除に失敗しました');
    return false;
  }
  
  console.log('✅ 画像削除成功');
  return true;
}

/**
 * 認証エラーテスト
 */
async function testUnauthorizedAccess(photoId) {
  console.log('\n=== 🔒 認証エラーテスト ===');
  
  // 間違ったパスワードでアクセス
  const { response, data, error } = await apiRequest(
    `/api/admin/photos/${photoId}?admin=wrongpassword`,
    {
      method: 'DELETE'
    }
  );
  
  if (response && response.status === 401) {
    console.log('✅ 認証エラーが正しく動作しています');
    return true;
  } else {
    console.error('❌ 認証エラーが正しく動作していません');
    return false;
  }
}

/**
 * メインテスト実行
 */
async function runTests() {
  console.log('🚀 管理者API テスト開始');
  console.log(`📍 API URL: ${API_BASE_URL}`);
  
  try {
    // 1. テスト画像をアップロード
    const photoId = await uploadTestImage();
    if (!photoId) {
      console.error('❌ テスト画像のアップロードに失敗したため、テストを中止します');
      return;
    }
    
    // 2. 画像一覧を確認
    const photos = await getPhotos();
    const uploadedPhoto = photos.find(p => p.id === photoId);
    if (!uploadedPhoto) {
      console.error('❌ アップロードした画像が一覧に見つかりません');
      return;
    }
    
    // 3. 認証エラーテスト
    await testUnauthorizedAccess(photoId);
    
    // 4. 画像情報更新テスト
    const updateSuccess = await testUpdatePhoto(photoId);
    if (!updateSuccess) {
      console.error('❌ 画像更新テストに失敗しました');
    }
    
    // 5. 更新後の画像一覧を確認
    console.log('\n=== 📋 更新後の画像一覧確認 ===');
    await getPhotos();
    
    // 6. 画像削除テスト
    const deleteSuccess = await testDeletePhoto(photoId);
    if (!deleteSuccess) {
      console.error('❌ 画像削除テストに失敗しました');
    }
    
    // 7. 削除後の画像一覧を確認
    console.log('\n=== 📋 削除後の画像一覧確認 ===');
    const finalPhotos = await getPhotos();
    const deletedPhoto = finalPhotos.find(p => p.id === photoId);
    
    if (deletedPhoto) {
      console.error('❌ 画像が削除されていません');
    } else {
      console.log('✅ 画像が正しく削除されました');
    }
    
    console.log('\n🎉 管理者API テスト完了');
    
  } catch (error) {
    console.error('❌ テスト実行中にエラーが発生しました:', error);
  }
}

// Node.js環境でfetchを使用するための設定
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

// テスト実行
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  uploadTestImage,
  getPhotos,
  testUpdatePhoto,
  testDeletePhoto,
  testUnauthorizedAccess
};