import React, { useState, useEffect } from 'react'

/**
 * ブラウザ互換性とモバイル対応のテストページ
 * 手動テスト用の機能確認ページ
 */
export const TestPage: React.FC = () => {
  const [deviceInfo, setDeviceInfo] = useState<{
    userAgent: string
    screenSize: string
    viewportSize: string
    pixelRatio: number
    touchSupport: boolean
    orientation: string
  } | null>(null)

  const [testResults, setTestResults] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // デバイス情報を取得
    const updateDeviceInfo = () => {
      setDeviceInfo({
        userAgent: navigator.userAgent,
        screenSize: `${screen.width} x ${screen.height}`,
        viewportSize: `${window.innerWidth} x ${window.innerHeight}`,
        pixelRatio: window.devicePixelRatio || 1,
        touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        orientation: screen.orientation?.type || 'unknown'
      })
    }

    updateDeviceInfo()
    window.addEventListener('resize', updateDeviceInfo)
    window.addEventListener('orientationchange', updateDeviceInfo)

    return () => {
      window.removeEventListener('resize', updateDeviceInfo)
      window.removeEventListener('orientationchange', updateDeviceInfo)
    }
  }, [])

  const runTest = (testName: string, testFunction: () => boolean) => {
    try {
      const result = testFunction()
      setTestResults(prev => ({ ...prev, [testName]: result }))
    } catch (error) {
      console.error(`Test ${testName} failed:`, error)
      setTestResults(prev => ({ ...prev, [testName]: false }))
    }
  }

  const tests = [
    {
      name: 'CSS Grid Support',
      test: () => CSS.supports('display', 'grid')
    },
    {
      name: 'CSS Flexbox Support',
      test: () => CSS.supports('display', 'flex')
    },
    {
      name: 'CSS Custom Properties Support',
      test: () => CSS.supports('--custom-property', 'value')
    },
    {
      name: 'File API Support',
      test: () => typeof FileReader !== 'undefined'
    },
    {
      name: 'Drag and Drop Support',
      test: () => 'draggable' in document.createElement('div')
    },
    {
      name: 'Camera API Support',
      test: () => 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
    },
    {
      name: 'Local Storage Support',
      test: () => {
        try {
          localStorage.setItem('test', 'test')
          localStorage.removeItem('test')
          return true
        } catch {
          return false
        }
      }
    },
    {
      name: 'Fetch API Support',
      test: () => typeof fetch !== 'undefined'
    },
    {
      name: 'Promise Support',
      test: () => typeof Promise !== 'undefined'
    },
    {
      name: 'ES6 Arrow Functions Support',
      test: () => {
        try {
          new Function('() => {}')
          return true
        } catch {
          return false
        }
      }
    }
  ]

  const runAllTests = () => {
    tests.forEach(test => {
      runTest(test.name, test.test)
    })
  }

  const testFileInput = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment' // カメラ起動テスト
    input.click()
  }

  const testNotification = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('テスト通知', {
            body: 'ブラウザ通知が正常に動作しています',
            icon: '/vite.svg'
          })
        }
      })
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">
        ブラウザ互換性テストページ
      </h1>

      {/* デバイス情報 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">デバイス情報</h2>
        {deviceInfo && (
          <div className="space-y-2 text-sm">
            <div><strong>User Agent:</strong> {deviceInfo.userAgent}</div>
            <div><strong>画面サイズ:</strong> {deviceInfo.screenSize}</div>
            <div><strong>ビューポートサイズ:</strong> {deviceInfo.viewportSize}</div>
            <div><strong>ピクセル比:</strong> {deviceInfo.pixelRatio}</div>
            <div><strong>タッチサポート:</strong> {deviceInfo.touchSupport ? 'あり' : 'なし'}</div>
            <div><strong>画面向き:</strong> {deviceInfo.orientation}</div>
          </div>
        )}
      </div>

      {/* 機能テスト */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">機能サポートテスト</h2>
        <button
          onClick={runAllTests}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mb-4"
        >
          全テスト実行
        </button>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tests.map(test => (
            <div
              key={test.name}
              className={`p-3 rounded-lg border ${
                testResults[test.name] === true
                  ? 'bg-green-50 border-green-200'
                  : testResults[test.name] === false
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{test.name}</span>
                <div className="flex items-center space-x-2">
                  {testResults[test.name] === true && (
                    <span className="text-green-600">✓</span>
                  )}
                  {testResults[test.name] === false && (
                    <span className="text-red-600">✗</span>
                  )}
                  <button
                    onClick={() => runTest(test.name, test.test)}
                    className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
                  >
                    テスト
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* インタラクティブテスト */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">インタラクティブテスト</h2>
        <div className="space-y-4">
          <div>
            <button
              onClick={testFileInput}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              ファイル選択・カメラテスト
            </button>
            <p className="text-sm text-gray-600 mt-1">
              モバイルでカメラが起動するかテストします
            </p>
          </div>
          
          <div>
            <button
              onClick={testNotification}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              通知テスト
            </button>
            <p className="text-sm text-gray-600 mt-1">
              ブラウザ通知が動作するかテストします
            </p>
          </div>
        </div>
      </div>

      {/* レスポンシブテスト */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">レスポンシブテスト</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-sm font-medium">モバイル</div>
            <div className="text-xs text-gray-600">~640px</div>
            <div className="block sm:hidden text-green-600 mt-2">✓ 表示中</div>
          </div>
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <div className="text-sm font-medium">タブレット</div>
            <div className="text-xs text-gray-600">640px~768px</div>
            <div className="hidden sm:block md:hidden text-green-600 mt-2">✓ 表示中</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <div className="text-sm font-medium">デスクトップ</div>
            <div className="text-xs text-gray-600">768px~1024px</div>
            <div className="hidden md:block lg:hidden text-green-600 mt-2">✓ 表示中</div>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg text-center">
            <div className="text-sm font-medium">大画面</div>
            <div className="text-xs text-gray-600">1024px~</div>
            <div className="hidden lg:block text-green-600 mt-2">✓ 表示中</div>
          </div>
        </div>
      </div>
    </div>
  )
}