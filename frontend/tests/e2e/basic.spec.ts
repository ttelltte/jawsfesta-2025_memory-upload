import { test, expect } from '@playwright/test';

/**
 * 基本的なページ表示テスト
 * アプリケーションの基本動作を確認
 */
test.describe('基本的なページ表示', () => {
  test('アップロードページが表示される', async ({ page }) => {
    await page.goto('/');
    
    // ページタイトルの確認
    await expect(page).toHaveTitle(/JAWS FESTA 2025/);
    
    // メインヘッダーの確認
    await expect(page.locator('h1')).toContainText('思い出をアップロード');
  });

  test('ギャラリーページが表示される', async ({ page }) => {
    await page.goto('/gallery');
    
    // ページタイトルの確認
    await expect(page).toHaveTitle(/JAWS FESTA 2025/);
    
    // メインヘッダーの確認
    await expect(page.locator('h1')).toContainText('思い出ギャラリー');
  });

  test('ナビゲーションが機能する', async ({ page }) => {
    await page.goto('/');
    
    // ギャラリーリンクをクリック
    await page.click('[data-testid="nav-gallery"]');
    await expect(page).toHaveURL('/gallery');
    
    // アップロードリンクをクリック
    await page.click('[data-testid="nav-upload"]');
    await expect(page).toHaveURL('/');
  });
});