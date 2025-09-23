import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { HomePage } from './pages'
import { TestPage } from './pages/TestPage'

function App() {
  return (
    <>
      {/* @ts-ignore */}
      <Routes>
        {/* @ts-ignore */}
        <Route path="/" element={<HomePage />} />
        {/* @ts-ignore */}
        <Route path="/test" element={<TestPage />} />
      </Routes>
    </>
  )
}

export default App
