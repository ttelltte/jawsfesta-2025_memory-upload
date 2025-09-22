import { Routes, Route } from 'react-router-dom'
import { Layout } from './components'
import { UploadPage } from './pages'

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
        <Route path="/" element={<UploadPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
      </Routes>
    </Layout>
  )
}

export default App
