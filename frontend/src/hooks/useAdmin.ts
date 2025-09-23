import { useState, useEffect } from 'react'

const ADMIN_PASSWORD = '19931124'

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdminStatus = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const adminParam = urlParams.get('admin')
      setIsAdmin(adminParam === ADMIN_PASSWORD)
    }

    checkAdminStatus()
    
    // URLが変更された時にも再チェック
    window.addEventListener('popstate', checkAdminStatus)
    
    return () => {
      window.removeEventListener('popstate', checkAdminStatus)
    }
  }, [])

  return isAdmin
}