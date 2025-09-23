import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout } from './components'
import { HomePage, UploadPage, GalleryPage } from './pages'
import { TestPage } from './pages/TestPage'

function App() {
  return (
    <Layout>
      {/* @ts-ignore */}
      <Routes>
        {/* @ts-ignore */}
        <Route path="/" element={<HomePage />} />
        {/* @ts-ignore */}
        <Route path="/upload" element={<UploadPage />} />
        {/* @ts-ignore */}
        <Route path="/gallery" element={<GalleryPage />} />
        {/* @ts-ignore */}
        <Route path="/test" element={<TestPage />} />
      </Routes>
    </Layout>
  )
}

export default App
