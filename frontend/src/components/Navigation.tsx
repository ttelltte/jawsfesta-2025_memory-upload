import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const Navigation: React.FC = () => {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'ホーム', icon: 'fas fa-home' },
    { path: '/upload', label: 'アップロード', icon: 'fas fa-cloud-upload-alt' },
    { path: '/gallery', label: 'ギャラリー', icon: 'fas fa-images' },
    ...(import.meta.env.DEV ? [{ path: '/test', label: 'テスト', icon: 'fas fa-flask' }] : [])
  ]

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200" data-testid="navigation">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* ロゴ・タイトル - レスポンシブ */}
          <div className="flex items-center">
            <div className="flex items-center gap-3">
              <i className="fas fa-camera text-2xl text-blue-600"></i>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                <span className="hidden lg:inline">JAWS FESTA 2025 思い出アップロード</span>
                <span className="hidden md:inline lg:hidden">JAWS FESTA 2025</span>
                <span className="hidden sm:inline md:hidden">JAWS FESTA</span>
                <span className="sm:hidden">思い出</span>
              </h1>
            </div>
          </div>

          {/* ナビゲーションメニュー - レスポンシブ */}
          <div className="flex space-x-1 sm:space-x-2 md:space-x-4">
            {navItems.map((item) => (
              // @ts-ignore
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${location.pathname === item.path
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                data-testid={
                  item.path === '/' ? 'nav-home' :
                    item.path === '/upload' ? 'nav-upload' :
                      item.path === '/gallery' ? 'nav-gallery' :
                        'nav-test'
                }
              >
                <i className={`${item.icon} mr-1 sm:mr-2`}></i>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation