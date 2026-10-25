'use client'

import { useEffect, useState } from 'react'

/** 目录即输即筛:按 targetId 容器内的 tr/li 文本过滤,显示命中计数。纯客户端,零外呼。 */
export default function FilterBox({ targetId, placeholder = 'Type to filter…' }: { targetId: string; placeholder?: string }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<number | null>(null)

  useEffect(() => {
    const root = document.getElementById(targetId)
    if (!root) return
    const needle = q.trim().toLowerCase()
    let n = 0
    const rows = root.querySelectorAll<HTMLElement>('tr, li')
    for (const row of rows) {
      // 容器级 li(嵌着列表)不过滤,只滤叶子行
      const isLeaf = row.tagName === 'TR' || row.querySelectorAll('ul, table').length === 0
      if (!isLeaf) continue
      const match = !needle || (row.textContent ?? '').toLowerCase().includes(needle)
      row.style.display = match ? '' : 'none'
      if (match) n += 1
    }
    setHits(needle ? n : null)
  }, [q, targetId])

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label="Filter this list"
        className="w-full max-w-sm rounded-lg border border-ink/15 bg-white px-3.5 py-2 text-[14px] focus:border-brand focus:outline-none"
      />
      {hits != null ? (
        <span className="text-[13px] text-ink/50">
          {hits} match{hits === 1 ? '' : 'es'}
        </span>
      ) : null}
    </div>
  )
}
