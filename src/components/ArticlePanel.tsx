'use client'

import { useEffect, useState } from 'react'
import { WikiGeoResult, WikiSummary } from '@/types'
import { fetchArticleSummary } from '@/lib/wikipedia'

interface Props {
  article: WikiGeoResult | null
  onClose: () => void
}

export default function ArticlePanel({ article, onClose }: Props) {
  const [summary, setSummary] = useState<WikiSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!article) {
      setSummary(null)
      return
    }
    console.log('ArticlePanel received article:', article.title)
    setLoading(true)
    setError(null)
    setSummary(null)
    fetchArticleSummary(article.title)
      .then((data) => {
        console.log('Article summary loaded:', data.title)
        setSummary(data)
      })
      .catch((e) => {
        console.error('Article summary fetch error:', e)
        setError(e.message)
      })
      .finally(() => setLoading(false))
  }, [article])

  const isOpen = !!article

  return (
    <div
      className={`fixed left-6 top-24 z-[1002] w-[320px] max-h-[calc(100dvh-120px)] glass transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] transform rounded-[24px] overflow-hidden flex flex-col highlight-white/10 ${
        isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-90 pointer-events-none'
      }`}
    >
      {/* Header Image or Placeholder */}
      <div className="relative h-48 bg-zinc-900 shrink-0 group overflow-hidden">
        {summary?.thumbnail ? (
          <img
            src={summary.thumbnail.source}
            alt={article?.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700 bg-zinc-900/50">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-950/80 to-transparent pointer-events-none" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition-all active:scale-90 shadow-lg"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">
            {article?.title}
          </h2>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-3 bg-white/5 rounded w-full" />
            <div className="h-3 bg-white/5 rounded w-full" />
            <div className="h-3 bg-white/5 rounded w-5/6" />
            <div className="h-3 bg-white/5 rounded w-4/6" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-medium">
            Wikipedia detail service unavailable.
          </div>
        ) : (
          summary && (
            <>
              <div className="relative">
                <p className="text-zinc-400 leading-relaxed text-[14px] font-medium">
                  {summary.extract}
                </p>
              </div>

              <div className="pt-4">
                <a
                  href={summary.content_urls.desktop.page}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex items-center justify-center gap-2 w-full bg-blue-600/90 text-white font-bold py-3.5 px-6 rounded-2xl hover:bg-blue-600 transition-all active:scale-[0.98] shadow-[0_8px_20px_-4px_rgba(59,130,246,0.5)] border border-blue-400/30 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Read full article
                </a>
              </div>
            </>
          )
        )}
      </div>
    </div>
  )
}
