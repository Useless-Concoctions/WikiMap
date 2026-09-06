'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { WikiGeoResult } from '@/types'
import { searchArticles } from '@/lib/wikipedia'

interface Props {
  onSelectArticle: (article: WikiGeoResult) => void
  isBusy?: boolean
}

export default function SearchAutocomplete({ onSelectArticle, isBusy = false }: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<WikiGeoResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch suggestions debounced as user types - NEVER move the map here
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      setIsSearching(false)
      return
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchArticles(trimmed)
        setSuggestions(results)
        setIsOpen(results.length > 0)
        setActiveIndex(-1)
      } catch (err) {
        console.error('Autocomplete search failed:', err)
        setSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [query])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback(
    (article: WikiGeoResult) => {
      setQuery(article.title)
      setIsOpen(false)
      setActiveIndex(-1)
      inputRef.current?.blur()
      onSelectArticle(article)
    },
    [onSelectArticle]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        e.preventDefault()
        // If Enter is hit without open dropdown, trigger instant search
        searchArticles(query.trim()).then((results) => {
          if (results.length > 0) {
            handleSelect(results[0])
          }
        })
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0]
      if (target) {
        handleSelect(target)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    setIsOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative shrink-0 w-[320px] pointer-events-auto">
      <div className="flex items-center glass rounded-full overflow-hidden h-11 w-full transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500/50">
        <div className="px-5 h-full flex items-center gap-2 border-r border-white/5 bg-blue-600/20 text-blue-400 shrink-0">
          {isSearching || isBusy ? (
            <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="opacity-80">
              <path d="M12.09 4.41l-.11.23-.12-.23c-2.43-4.86-9.15-4.86-11.58 0-.28.56.09 1.25.71 1.25h1.22c.28 0 .54-.15.68-.39.54-1.09 1.56-2.12 3.09-2.12 2.37 0 4.14 2 4.14 4.5 0 .28-.22.5-.5.5h-1c-.28 0-.5.22-.5.5s.22.5.5.5h1c.28 0 .5.22.5.5v11.5c0 .28.22.5.5.5s.5-.22.5-.5V10.5c0-.28.22-.5.5-.5h1c.28 0 .5-.22.5-.5s-.22-.5-.5-.5h-1c-.28 0-.5-.22-.5-.5 0-2.5 1.77-4.5 4.14-4.5 1.53 0 2.55 1.03 3.09 2.12.14.24.4.39.68.39h1.22c.62 0 .99-.69.71-1.25-2.43-4.86-9.15-4.86-11.58 0z" />
            </svg>
          )}
        </div>
        <div className="flex items-center px-4 flex-1 h-full">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search Wikipedia..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true)
            }}
            onKeyDown={handleKeyDown}
            className="w-full h-full text-zinc-100 font-medium text-sm bg-transparent border-none focus:ring-0 placeholder:text-zinc-500 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-zinc-200"
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 glass rounded-2xl overflow-hidden shadow-2xl border border-white/10 max-h-[360px] overflow-y-auto no-scrollbar z-[1050] divide-y divide-white/5 animate-in fade-in-50 slide-in-from-top-1 duration-200">
          {suggestions.map((item, idx) => {
            const isHighlighted = idx === activeIndex
            return (
              <button
                key={item.pageid}
                type="button"
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`w-full text-left p-3 flex items-center gap-3 transition-colors ${
                  isHighlighted ? 'bg-blue-600/30 text-white' : 'hover:bg-white/5 text-zinc-200'
                }`}
              >
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail.source}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover shrink-0 bg-zinc-800 border border-white/10"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-zinc-400">
                    <span className="text-base">📍</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate text-white leading-snug">
                    {item.title}
                  </div>
                  {item.extract && (
                    <div className="text-xs text-zinc-400 truncate mt-0.5">
                      {item.extract}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
