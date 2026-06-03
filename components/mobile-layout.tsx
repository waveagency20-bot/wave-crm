// ---------------------------------------------------------------------------
// MobileLayout — shared wrapper for all dashboard pages
// On mobile: adds top padding so content clears the hamburger button
// On desktop: adds ml-60 so content clears the fixed sidebar
// Usage: wrap the page content div with <MobileLayout>...</MobileLayout>
// ---------------------------------------------------------------------------
'use client'

import { useEffect, useState } from 'react'

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div
      style={{
        marginLeft: isMobile ? 0 : '240px',
        paddingTop: isMobile ? '64px' : 0,
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  )
}