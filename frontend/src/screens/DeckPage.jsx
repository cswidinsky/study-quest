import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useGame } from '../state/game.js'
import { getDeckCards } from '../api.js'
import { daysFromToday, percent, relativeDay } from '../lib/format.js'
import { EASE_CINEMA, EASE_OUT, stagger, useRise } from '../lib/motion.js'
import { deckStyle, deckTransitionStyle, rememberOpenedDeck } from '../lib/deck.js'
import Button from '../components/Button.jsx'
import CountUp from '../components/CountUp.jsx'
import FillBar from '../components/FillBar.jsx'
import { ArrowRightIcon, CalendarIcon, FileIcon, PencilIcon } from '../components/icons.jsx'

// One deck. Its header is the same element as the deck's card on the dashboard
// (shared view-transition name), so the card grows into this page and shrinks back.

const pct = (n) => `${n}%`

export default function DeckPage({ id }) {
  const { data, showToast } = useGame()
  const rise = useRise()
  const deck = data?.decks.find((d) => d.id === id)
  const [cards, setCards] = useState(deck?.preview ?? null)

  useEffect(() => {
    rememberOpenedDeck(id) // so the card flies back into place when you leave
    if (deck?.preview) return
    let live = true
    getDeckCards(id).then((c) => live && setCards(c))
    return () => {
      live = false
    }
  }, [id, deck?.preview])

  if (!data) return null
  if (!deck) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 pt-7 sm:px-6 lg:pt-24">
        <h1 className="text-[32px] font-semibold tracking-tight">Deck not found</h1>
        <p className="mt-2 text-muted">It may have been deleted.</p>
        <Button as="a" href="#/" variant="secondary" className="mt-6">
          Back to your decks
        </Button>
      </div>
    )
  }

  const mastery = percent(deck.masteredCount, deck.cardCount)
  const examIn = deck.exam ? daysFromToday(deck.exam.at) : null
  const studied = relativeDay(deck.lastStudiedAt)
  const startReview = () =>
    showToast({ kind: 'info', message: `Reviewing “${deck.title}” will start here once the review screen is connected.` })

  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-6 pb-24 sm:px-6 lg:pt-24" style={deckStyle(deck)}>
      <motion.a
        href="#/"
        className="group mb-5 inline-flex items-center gap-2 text-sm text-muted transition-colors duration-150 hover:text-text"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <ArrowRightIcon className="size-4 rotate-180 transition-[translate] duration-200 ease-out group-hover:-translate-x-0.5" />
        All decks
      </motion.a>

      {/* The hero: shares its view-transition name with the dashboard card */}
      <section
        aria-labelledby="deck-title"
        style={deckTransitionStyle(deck)}
        className="vt-shared relative isolate overflow-hidden rounded-[28px] border border-border bg-surface/80 p-5 shadow-[var(--panel-edge)] sm:p-8"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-24 -z-10 size-[30rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--deck)_38%,transparent),transparent)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-48 -left-32 -z-10 size-[26rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--deck)_16%,transparent),transparent)]"
        />

        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="rounded-full bg-(--deck) px-2.5 py-0.5 text-xs font-semibold text-on-accent glow-deck">
            {deck.course.code || 'Deck'}
          </span>
          {deck.course.name}
        </p>
        <h1 id="deck-title" className="mt-4 text-[34px] leading-tight font-semibold tracking-tight sm:text-[48px]">
          {deck.title}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            {deck.source.type === 'pdf' ? <FileIcon className="size-4" /> : <PencilIcon className="size-4" />}
            {deck.source.type === 'pdf' ? deck.source.fileName : 'Written by you'}
          </span>
          <span>{studied ? `Studied ${studied}` : 'Not studied yet'}</span>
          {examIn !== null && examIn >= 0 && (
            <span className="flex items-center gap-1.5 text-text">
              <CalendarIcon className="size-4 text-muted" />
              {deck.exam.label} {relativeDay(deck.exam.at)}
            </span>
          )}
        </p>

        <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-lg">
          <Stat label="Cards">
            <CountUp value={deck.cardCount} className="num text-[28px] leading-none sm:text-[32px]" delay={0.35} />
          </Stat>
          <Stat label="Mastered">
            <CountUp value={mastery} format={pct} className="num text-[28px] leading-none sm:text-[32px]" delay={0.4} />
          </Stat>
          <Stat label="Due today">
            <CountUp value={deck.dueCount} className="num text-[28px] leading-none sm:text-[32px]" delay={0.45} />
          </Stat>
        </div>

        <div className="mt-6 sm:max-w-lg">
          <FillBar value={mastery / 100} colour="var(--deck)" glow delay={0.5} height="h-2" label="Mastery" />
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Button
            variant="deck"
            size="lg"
            onClick={startReview}
            disabled={deck.dueCount === 0 && deck.masteredCount > 0}
          >
            {deck.dueCount > 0 ? `Review ${deck.dueCount} due` : deck.masteredCount === 0 ? 'Start learning' : 'Nothing due'}
            <ArrowRightIcon />
          </Button>
        </div>
      </section>

      <section aria-labelledby="cards-heading" className="mt-10">
        <motion.h2
          id="cards-heading"
          className="text-sm font-semibold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {cards && cards.length < deck.cardCount ? `A few of the ${deck.cardCount} cards` : 'Cards'}
          <span className="ml-2 font-normal text-muted">Tap a card to see the answer</span>
        </motion.h2>

        {!cards ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="panel h-24 animate-pulse rounded-2xl" />
            ))}
          </ul>
        ) : (
          <motion.ul className="mt-4 grid gap-3 md:grid-cols-2" initial="hidden" animate="show" variants={stagger(0.07, 0.55)}>
            {cards.map((card) => (
              <motion.li key={card.question} variants={rise} className="h-full">
                <FlashCard card={card} />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, children }) {
  return (
    <div className="rounded-2xl bg-background/60 p-3 sm:p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2">{children}</p>
    </div>
  )
}

// A card that opens to show its answer.
function FlashCard({ card }) {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      className={`panel group h-full w-full rounded-2xl p-4 text-left transition-[border-color,scale] duration-200 ease-out active:scale-[0.99] sm:p-5 ${
        open ? 'border-(--deck)/60' : 'hover:border-(--deck)/40'
      }`}
    >
      <span className="flex items-start gap-3">
        <span
          className={`mt-1.5 size-2 shrink-0 rounded-full transition-[background-color,box-shadow] duration-300 ${
            open ? 'bg-(--deck) shadow-[0_0_10px_var(--deck)]' : 'bg-border'
          }`}
          aria-hidden="true"
        />
        <span className="text-[15px] font-medium">{card.question}</span>
      </span>
      <AnimatePresence initial={false}>
        {open && (
          <motion.span
            className="block overflow-hidden"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
          >
            <motion.span
              className="block pt-3 pl-5 text-sm text-muted"
              initial={reduce ? false : { transform: 'translateY(-6px)' }}
              animate={{ transform: 'translateY(0px)' }}
              transition={{ duration: 0.45, ease: EASE_CINEMA }}
            >
              {card.answer}
            </motion.span>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
