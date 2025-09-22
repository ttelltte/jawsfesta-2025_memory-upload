import { Routes, Route } from 'react-router-dom'
import { Layout } from './components'
import { UploadPage, GalleryPage } from './pages'
import { TestPage } from './pages/TestPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/test" element={<TestPage />} />
      </Routes>
    </Layout>
  )
}

export default App
