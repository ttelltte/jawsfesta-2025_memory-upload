// ローカルAPIのテスト用スクリプト
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3001';

// ヘルスチェック
async function testHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    console.log('✅ ヘルスチェック:', data);
    return true;
  } catch (error) {
    console.error('❌ ヘルスチェック失敗:', error.message);
    return false;
  }
}

// 設定取得テスト
async function testConfig() {
  try {
    const response = await fetch(`${API_BASE}/api/config`);
    const data = await response.json();
    console.log('✅ 設定取得:', data);
    return true;
  } catch (error) {
    console.error('❌ 設定取得失敗:', error.message);
    return false;
  }
}

// 画像一覧取得テスト
async function testPhotos() {
  try {
    const response = await fetch(`${API_BASE}/api/photos`);
    const data = await response.json();
    console.log('✅ 画像一覧取得:', data);
    return true;
  } catch (error) {
    console.error('❌ 画像一覧取得失敗:', error.message);
    return false;
  }
}

// 全テスト実行
async function runTests() {
  console.log('🧪 ローカルAPIテストを開始します...\n');
  
  const results = [];
  results.push(await testHealth());
  results.push(await testConfig());
  results.push(await testPhotos());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n📊 テスト結果: ${passed}/${total} 成功`);
  
  if (passed === total) {
    console.log('🎉 全てのテストが成功しました！');
  } else {
    console.log('⚠️  一部のテストが失敗しました。APIサーバーが起動しているか確認してください。');
  }
}

// Node.js 18以降のfetch APIを使用
if (typeof fetch === 'undefined') {
  console.error('❌ Node.js 18以降が必要です。現在のバージョン:', process.version);
  process.exit(1);
}

runTests();