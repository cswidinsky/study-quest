import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { XP_RULES } from '../../lib/levels.js'
import { EASE_CINEMA, stagger, useRise } from '../../lib/motion.js'
import { deckStyle, deckTransitionStyle } from '../../lib/deck.js'
import Button from '../../components/Button.jsx'
import { ArrowRightIcon } from '../../components/icons.jsx'

// The new deck lands: it drops in from above in its own colour, with a flash of light.
// Its card shares a transition name with its dashboard card, so "Back to dashboard"
// flies it straight into its place in the grid.
export default function DeckReady({ deck, cards, onAnother }) {
  const headingRef = useRef(null)
  const reduce = useReducedMotion()
  const rise = useRise(14)
  useEffect(() => headingRef.current?.focus(), [])

  const fromPdf = deck.source.type === 'pdf'
  const preview = cards.slice(0, 3)
  // What learning these cards is worth (first time, before combos and flashcard discounts).
  const worth = cards.reduce((s, c) => s + XP_RULES.baseByDifficulty[c.difficulty], 0)

  return (
    <section className="panel rounded-3xl p-4 sm:p-6" aria-labelledby="ready-heading" style={deckStyle(deck)}>
      <div className="flex items-center gap-3.5">
        <SuccessMark />
        <div className="min-w-0">
          <h2 id="ready-heading" ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">
            Your deck is ready
          </h2>
          <p className="truncate text-sm text-muted">{fromPdf ? `Written from ${deck.source.fileName}` : 'Written by you'}</p>
        </div>
      </div>

      {/* The deck itself, landing */}
      <motion.div
        style={deckTransitionStyle(deck)}
        className="vt-shared relative mt-6 overflow-hidden rounded-[20px] border border-(--deck)/50 bg-surface p-5 shadow-[0_20px_60px_-24px_var(--deck)]"
        initial={reduce ? false : { opacity: 0, transform: 'translateY(-80px) scale(1.08) rotate(-1.5deg)' }}
        animate={{ opacity: 1, transform: 'translateY(0px) scale(1) rotate(0deg)' }}
        transition={{ type: 'spring', duration: 0.9, bounce: 0.32, delay: 0.15 }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--deck)_40%,transparent),transparent)]"
        />
        {!reduce && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--deck)_60%,transparent),transparent_70%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.1, delay: 0.55, ease: EASE_CINEMA }}
          />
        )}
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <span className="rounded-full bg-(--deck) px-2 py-0.5 text-[11px] font-semibold text-on-accent">New</span>
            <p className="mt-3 truncate text-lg font-semibold tracking-tight">{deck.title}</p>
            <p className="truncate text-xs text-muted">
              {deck.course.code ? `${deck.course.code} · ` : ''}
              {deck.course.name}
            </p>
          </div>
          <p className="flex items-baseline gap-4 text-sm">
            <span>
              <span className="num text-lg">{cards.length}</span> <span className="text-muted">{cards.length === 1 ? 'card' : 'cards'}</span>
            </span>
            <span>
              <span className="text-muted">worth </span>
              <span className="num text-lg">{worth}+</span> <span className="text-muted">XP to learn</span>
            </span>
          </p>
        </div>
      </motion.div>

      <h3 className="mt-7 text-sm font-medium">
        {preview.length < cards.length ? `First ${preview.length} of ${cards.length} cards` : 'Cards'}
      </h3>
      <motion.ul className="mt-3 space-y-2" initial="hidden" animate="show" variants={stagger(0.08, 0.7)}>
        {preview.map((card) => (
          <motion.li key={card.question} variants={rise} className="rounded-2xl border border-border bg-surface/80 px-4 py-3.5">
            <p className="text-sm font-medium">{card.question}</p>
            <p className="mt-1 text-sm text-muted">{card.answer}</p>
          </motion.li>
        ))}
      </motion.ul>

      <div className="mt-7 flex flex-wrap gap-2">
        <Button as="a" href={`#/review/deck/${deck.id}`} size="lg">
          Learn it now
          <ArrowRightIcon />
        </Button>
        <Button as="a" href="#/" variant="secondary" size="lg">
          Back to dashboard
        </Button>
        <Button variant="ghost" size="lg" onClick={onAnother}>
          Create another
        </Button>
      </div>
    </section>
  )
}

// A green disc that bounces in, then the tick draws itself.
function SuccessMark() {
  const reduce = useReducedMotion()
  return (
    <motion.svg
      viewBox="0 0 40 40"
      className="size-11 shrink-0 [filter:drop-shadow(0_0_10px_color-mix(in_oklab,var(--color-success)_70%,transparent))]"
      aria-hidden="true"
      initial={reduce ? false : { transform: 'scale(0.4)', opacity: 0 }}
      animate={{ transform: 'scale(1)', opacity: 1 }}
      transition={{ type: 'spring', duration: 0.6, bounce: 0.5 }}
    >
      <circle cx="20" cy="20" r="20" className="fill-success" />
      <motion.path
        d="M12.5 20.5 17.5 25.5 27.5 15"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-on-accent"
        initial={{ pathLength: reduce ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, delay: 0.25, ease: [0.23, 1, 0.32, 1] }}
      />
    </motion.svg>
  )
}
