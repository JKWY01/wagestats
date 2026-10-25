'use client'

import { useEffect, useState } from 'react'

/** 回顶按钮:滚过 600px 出现;平滑回顶但尊重系统的减少动效偏好。 */
export default function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!show) return null

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        })
      }
      className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 bg-white text-[16px] font-semibold text-ink/70 shadow-sm transition-colors hover:text-ink"
    >
      ↑
    </button>
  )
}
