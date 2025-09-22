import { Routes, Route } from 'react-router-dom'
import { Layout, Loading, ErrorMessage } from './components'

// ホームページコンポーネント
const HomePage = () => (
  <div>
    <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
      画像アップロード
    </h1>
    <div className="text-center space-y-4">
      <p className="text-gray-600 mb-4">アプリケーションの基盤が正常に構築されました。</p>
      <p className="text-sm text-gray-500">Vite + React + TypeScript + Tailwind CSS + React Router</p>
      
      {/* 共通コンポーネントのデモ */}
      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold text-gray-700">共通コンポーネントのデモ</h2>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Loading コンポーネント</h3>
          <Loading message="データを読み込み中..." size="sm" />
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow space-y-2">
          <h3 className="text-lg font-medium mb-2">ErrorMessage コンポーネント</h3>
          <ErrorMessage message="これはエラーメッセージの例です" type="error" />
          <ErrorMessage message="これは警告メッセージの例です" type="warning" />
          <ErrorMessage message="これは情報メッセージの例です" type="info" />
        </div>
      </div>
    </div>
  </div>
)

// ギャラリーページコンポーネント
const GalleryPage = () => (
  <div>
    <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
      画像ギャラリー
    </h1>
    <p className="text-center text-gray-600">ギャラリーページ（今後実装予定）</p>
  </div>
)

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gallery" element={<GalleryPage />} />
      </Routes>
    </Layout>
  )
}

export default App
