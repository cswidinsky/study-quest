import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { XP_REWARDS } from '../../lib/levels.js'
import Button from '../../components/Button.jsx'
import { ArrowRightIcon } from '../../components/icons.jsx'

// Success: the new deck, its first few cards, and where to go next.
export default function DeckReady({ deck, onAnother }) {
  const headingRef = useRef(null)
  useEffect(() => headingRef.current?.focus(), [])

  const fromPdf = deck.source.type === 'pdf'

  return (
    <section className="rounded-2xl bg-background p-4 sm:p-6" aria-labelledby="ready-heading">
      <div className="flex items-center gap-3.5">
        <SuccessMark />
        <div className="min-w-0">
          <h2 id="ready-heading" ref={headingRef} tabIndex={-1} className="text-lg font-semibold tracking-tight outline-none">
            Your deck is ready
          </h2>
          <p className="truncate text-sm text-muted">
            {fromPdf ? `Written from ${deck.source.fileName}` : 'Written by you'}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium">{deck.title}</p>
          <p className="truncate text-xs text-muted">
            {deck.course.code ? `${deck.course.code} · ` : ''}
            {deck.course.name}
          </p>
        </div>
        <p className="flex items-baseline gap-4 text-sm">
          <span>
            <span className="num">{deck.cardCount}</span> <span className="text-muted">cards</span>
          </span>
          <span>
            <span className="num">+{XP_REWARDS.deckCreated}</span> <span className="text-muted">XP</span>
          </span>
        </p>
      </div>

      <h3 className="mt-7 text-sm font-medium">
        {deck.preview.length < deck.cardCount ? `First ${deck.preview.length} of ${deck.cardCount} cards` : 'Cards'}
      </h3>
      <ul className="mt-3 space-y-2">
        {deck.preview.map((card) => (
          <li key={card.question} className="rounded-xl border border-border bg-surface px-4 py-3.5">
            <p className="text-sm font-medium">{card.question}</p>
            <p className="mt-1 text-sm text-muted">{card.answer}</p>
          </li>
        ))}
      </ul>

      <div className="mt-7 flex flex-wrap gap-2">
        <Button as="a" href="#/" size="lg">
          Back to dashboard
          <ArrowRightIcon />
        </Button>
        <Button variant="secondary" size="lg" onClick={onAnother}>
          Create another
        </Button>
      </div>
    </section>
  )
}

// A green disc that settles in, then the tick draws itself.
function SuccessMark() {
  const reduceMotion = useReducedMotion()
  return (
    <motion.svg
      viewBox="0 0 40 40"
      className="size-10 shrink-0"
      aria-hidden="true"
      initial={reduceMotion ? false : { transform: 'scale(0.8)', opacity: 0 }}
      animate={{ transform: 'scale(1)', opacity: 1 }}
      transition={{ type: 'spring', duration: 0.45, bounce: 0.35 }}
    >
      <circle cx="20" cy="20" r="20" className="fill-success" />
      <motion.path
        d="M12.5 20.5 17.5 25.5 27.5 15"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-on-accent"
        initial={{ pathLength: reduceMotion ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
      />
    </motion.svg>
  )
}
