import { masteryIndex, masteryLabel } from '../lib/srs.js'

// One gem per mastery level. It gains facets, colour and glow as a card climbs:
// New (outline) → Learning (sky) → Familiar (lagoon) → Strong (sun) → Mastered (tangerine, glowing).

const STYLE = {
  new: { fill: 'none', stroke: 'var(--color-muted)', glow: null },
  learning: { fill: 'var(--color-deck-sky)', stroke: 'var(--color-deck-sky)', glow: null },
  familiar: { fill: 'var(--color-secondary)', stroke: 'var(--color-secondary)', glow: null },
  strong: { fill: 'var(--color-sun)', stroke: 'var(--color-sun)', glow: 'var(--color-sun)' },
  mastered: { fill: 'var(--color-accent)', stroke: 'var(--color-accent)', glow: 'var(--color-accent)' },
}


export default function MasteryGem({ level = 'new', className = 'size-4', withLabel = false, labelClassName = 'text-xs' }) {
  const s = STYLE[level] ?? STYLE.new
  const facets = masteryIndex(level)
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg
        viewBox="0 0 24 24"
        className={`shrink-0 ${className}`}
        style={s.glow ? { filter: `drop-shadow(0 0 5px ${s.glow})` } : undefined}
        role="img"
        aria-label={`Mastery: ${masteryLabel(level)}`}
      >
        <path d="M12 2.5 20.5 9 12 21.5 3.5 9Z" fill={s.fill} stroke={s.stroke} strokeWidth="1.6" strokeLinejoin="round" fillOpacity={level === 'new' ? 0 : 0.9} />
        {facets >= 2 && <path d="M3.5 9h17M12 2.5 8.5 9 12 21.5 15.5 9Z" fill="none" stroke="rgb(255 255 255 / 0.55)" strokeWidth="1" strokeLinejoin="round" />}
        {facets >= 4 && <path d="M8.5 9 12 5.5 15.5 9" fill="rgb(255 255 255 / 0.45)" />}
      </svg>
      {withLabel && <span className={labelClassName}>{masteryLabel(level)}</span>}
    </span>
  )
}
