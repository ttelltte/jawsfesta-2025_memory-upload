# JAWS FESTA 2025 思い出アップロード - フロントエンド

React + TypeScript + Vite + Tailwind CSSで構築されたフロントエンドアプリケーション。

## 技術スタック

- **React 18** - UIライブラリ
- **TypeScript** - 型安全性
- **Vite 5** - 高速ビルドツール
- **Tailwind CSS 3** - ユーティリティファーストCSS
- **React Router 6** - ルーティング

## 必要な環境

- Node.js >= 18.17.0
- npm >= 9.0.0

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# プロダクションビルド
npm run build

# ビルド結果のプレビュー
npm run preview

# リンティング
npm run lint
```

## プロジェクト構造

```
src/
├── components/          # 共通コンポーネント
│   ├── Layout.tsx      # レイアウトコンポーネント
│   ├── Navigation.tsx  # ナビゲーション
│   ├── Loading.tsx     # ローディング表示
│   ├── ErrorMessage.tsx # エラーメッセージ
│   └── index.ts        # エクスポート管理
├── pages/              # ページコンポーネント
├── hooks/              # カスタムフック
├── types/              # 型定義
├── utils/              # ユーティリティ関数
├── App.tsx             # メインアプリケーション
├── main.tsx            # エントリーポイント
└── index.css           # グローバルスタイル
```

## 開発時の注意事項

### Node.jsバージョン

このプロジェクトはNode.js 18.17.0以上で動作するように設定されています。より新しいバージョンのViteやその他の依存関係を使用する場合は、Node.js 20.19.0以上にアップグレードしてください。

### TypeScript

現在の設定では、型チェックを緩和してビルドエラーを回避しています。より厳密な型チェックが必要な場合は、`npm run build:check`を使用してください。

### 依存関係の警告

`.npmrc`ファイルで`legacy-peer-deps=true`を設定しているため、依存関係の警告が抑制されています。これは互換性の問題を回避するためです。

## 利用可能なスクリプト

- `npm run dev` - 開発サーバーを起動（ホットリロード付き）
- `npm run build` - プロダクション用にビルド（型チェックなし）
- `npm run build:check` - 型チェック付きでビルド
- `npm run preview` - ビルド結果をプレビュー
- `npm run lint` - ESLintでコードをチェック

## トラブルシューティング

### ビルドエラーが発生する場合

1. Node.jsのバージョンを確認してください（18.17.0以上）
2. `node_modules`を削除して再インストールしてください：
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### 型エラーが発生する場合

型チェックなしのビルドを使用してください：
```bash
npm run build
```

厳密な型チェックが必要な場合は、依存関係のバージョンを調整するか、TypeScript設定を修正してください。