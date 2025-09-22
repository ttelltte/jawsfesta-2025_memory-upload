import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // ビルド設定
  build: {
    // 出力ディレクトリ
    outDir: 'dist',
    
    // アセットのインライン化の閾値（4KB未満はbase64でインライン化）
    assetsInlineLimit: 4096,
    
    // CSS コード分割を有効化
    cssCodeSplit: true,
    
    // ソースマップ生成（本番環境では無効化）
    sourcemap: process.env.NODE_ENV !== 'production',
    
    // 最小化設定
    minify: 'esbuild',
    
    // チャンク分割設定
    rollupOptions: {
      output: {
        // 静的アセットのファイル名パターン
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext || '')) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        
        // JavaScriptチャンクのファイル名パターン
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        
        // チャンク分割戦略
        manualChunks: {
          // React関連を別チャンクに分離
          react: ['react', 'react-dom'],
          // React Router を別チャンクに分離
          router: ['react-router-dom'],
        },
      },
    },
    
    // 警告を表示する閾値（500KB）
    chunkSizeWarningLimit: 500,
    
    // 空のアウトディレクトリをクリア
    emptyOutDir: true,
  },
  
  // 開発サーバー設定
  server: {
    port: 3000,
    host: true, // 外部からのアクセスを許可
    
    // プロキシ設定（開発時にAPI Gatewayにプロキシ）
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  
  // プレビューサーバー設定
  preview: {
    port: 3000,
    host: true,
  },
  
  // 環境変数の設定
  define: {
    // ビルド時の環境変数
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
  
  // 最適化設定
  optimizeDeps: {
    // 事前バンドル対象の依存関係
    include: [
      'react',
      'react-dom',
      'react-router-dom',
    ],
  },
})
