'use client'

import { EMOJI_FILTERS, EmojiFilter } from '@/lib/emojiFilters'

interface Props {
  selected: string | null
  onChange: (filterId: string | null) => void
}

export default function CategoryFilter({ selected, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
      {EMOJI_FILTERS.map((filter: EmojiFilter) => {
        const isSelected = selected === filter.id
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onChange(isSelected ? null : filter.id)}
            title={filter.label}
            className={`shrink-0 h-10 px-4 flex items-center gap-2 rounded-full text-sm font-medium transition-all glass pointer-events-auto whitespace-nowrap active:scale-95 ${
              isSelected
                ? 'bg-blue-600/40 text-blue-100 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border-white/5'
            }`}
          >
            <span className="text-base leading-none drop-shadow-sm">{filter.emoji}</span>
            <span className="text-xs font-semibold tracking-tight uppercase">{filter.label}</span>
          </button>
        )
      })}
    </div>
  )
}
