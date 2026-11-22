import { useEffect, useId } from 'react'
import { motion } from 'motion/react'
import { deckStyle } from '../../lib/deck.js'
import { stagger, useRise } from '../../lib/motion.js'
import { plural } from '../../lib/format.js'
import Button from '../../components/Button.jsx'
import { ArrowRightIcon, CardsIcon, FlipIcon, RefreshIcon } from '../../components/icons.jsx'

const SECONDS_PER_CARD = 35

// Before a session: what's in it, how long it takes, and how to play.
export default function Intro({ session, decks, mode, onMode, onStart, weakCount }) {
  const rise = useRise()
  const pillId = useId()
  const count = session.items.length
  const hasChoices = session.items.some((i) => i.options)

  // Enter starts the session.
  useEffect(() => {
    if (!count) return
    const onKey = (e) => e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON' && onStart()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count, onStart])

  if (!count) return <AllCaughtUp decks={decks} weakCount={weakCount} />

  // Decks in this session, with how many cards each.
  const perDeck = [...session.items.reduce((m, i) => m.set(i.card.deckId, (m.get(i.card.deckId) ?? 0) + 1), new Map())]
  const minutes = Math.max(1, Math.round((count * SECONDS_PER_CARD) / 60))

  return (
    <motion.div className="mx-auto max-w-2xl px-4 pt-10 pb-24 sm:px-6 sm:pt-20" initial="hidden" animate="show" variants={stagger(0.08, 0.05)}>
      <motion.p variants={rise} className="text-sm font-medium text-muted">
        {session.practice ? 'Practice run' : session.kind === 'rematch' ? 'Rematch' : 'Ready when you are'}
      </motion.p>
      <motion.h1 variants={rise} className="mt-2 text-[34px] leading-tight font-semibold tracking-tight sm:text-[48px]">
        {session.title}
      </motion.h1>
      <motion.p variants={rise} className="mt-2 text-lg text-muted">
        {plural(count, 'card')}, about <span className="num">{minutes}</span> min
        {session.practice && '. Nothing here is due yet, so this run earns no XP.'}
      </motion.p>

      <motion.ul variants={rise} className="mt-6 flex flex-wrap gap-2">
        {perDeck.map(([deckId, n]) => {
          const deck = decks.find((d) => d.id === deckId)
          return (
            <li key={deckId} style={deckStyle(deck)} className="panel flex items-center gap-2 rounded-full px-3 py-1.5 text-sm">
              <span className="size-2 rounded-full bg-(--deck) shadow-[0_0_8px_var(--deck)]" aria-hidden="true" />
              {deck?.title}
              <span className="num text-muted">{n}</span>
            </li>
          )
        })}
      </motion.ul>

      <motion.fieldset variants={rise} className="mt-8">
        <legend className="mb-2 text-sm font-medium">How do you want to play?</legend>
        <div className="panel inline-flex rounded-full p-1" role="radiogroup">
          {[
            { id: 'mc', label: 'Multiple choice', Icon: CardsIcon, disabled: !hasChoices },
            { id: 'flash', label: 'Flashcards', Icon: FlipIcon, disabled: session.gradedByFlask },
          ].map(({ id, label, Icon, disabled }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={mode === id}
              disabled={disabled}
              onClick={() => onMode(id)}
              className={`relative flex h-10 items-center gap-2 rounded-full px-4 text-sm transition-[color,scale] duration-150 ease-out active:scale-[0.97] disabled:opacity-40 ${
                mode === id ? 'text-background' : 'text-muted hover:text-text'
              }`}
            >
              {mode === id && (
                <motion.span layoutId={pillId} className="absolute inset-0 rounded-full bg-text" transition={{ type: 'spring', duration: 0.5, bounce: 0.25 }} />
              )}
              <Icon className="relative size-4" />
              <span className="relative font-medium">{label}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          {session.gradedByFlask
            ? 'The StudyQuest server checks each answer. Flashcards unlock once you’ve seen the answers.'
            : mode === 'flash'
              ? 'You grade yourself, so flashcards earn 75% of the XP.'
              : 'Four options, one right. Keys 1–4 work too.'}
        </p>
      </motion.fieldset>

      <motion.ul variants={rise} className="mt-8 grid gap-2 text-sm text-muted sm:grid-cols-3">
        <li className="panel rounded-2xl p-3">
          <span className="block font-medium text-text">Due cards pay</span>
          Harder ones and ones you held on to longer pay more.
        </li>
        <li className="panel rounded-2xl p-3">
          <span className="block font-medium text-text">Combos multiply</span>3 right in a row: ×1.5, up to ×3.
        </li>
        <li className="panel rounded-2xl p-3">
          <span className="block font-medium text-text">Misses come back</span>A rematch round at the end, then tomorrow.
        </li>
      </motion.ul>

      <motion.div variants={rise} className="mt-10">
        <Button size="lg" onClick={onStart} className="h-12 px-7 text-base" autoFocus>
          Start
          <ArrowRightIcon />
        </Button>
        <span className="ml-3 text-xs text-muted">or press Enter</span>
      </motion.div>
    </motion.div>
  )
}

// Nothing to review: never a dead end, always a next step.
function AllCaughtUp({ decks, weakCount }) {
  const rise = useRise()
  const learnable = decks.filter((d) => d.newCount > 0)
  const empty = decks.length === 0 // a brand-new account
  return (
    <motion.div className="mx-auto max-w-2xl px-4 pt-10 pb-24 sm:px-6 sm:pt-20" initial="hidden" animate="show" variants={stagger(0.08, 0.05)}>
      <motion.h1 variants={rise} className="text-[34px] leading-tight font-semibold tracking-tight sm:text-[48px]">
        {empty ? 'Nothing to review yet' : 'All caught up'}
      </motion.h1>
      <motion.p variants={rise} className="mt-2 text-lg text-muted">
        {empty ? 'Reviews start once you have a deck. Upload a lecture PDF and StudyQuest writes the first quiz.' : 'Nothing is due right now. Here’s what you can do instead.'}
      </motion.p>
      <motion.div variants={rise} className="mt-8 grid gap-3">
        {weakCount > 0 && (
          <a href="#/review/rematch" className="panel group flex items-center gap-4 rounded-2xl p-4 transition-[border-color,scale] duration-200 hover:border-accent/50 active:scale-[0.99]">
            <RefreshIcon className="size-5 text-accent" />
            <span className="flex-1">
              <span className="block font-medium">Rematch weak spots</span>
              <span className="text-sm text-muted">{plural(weakCount, 'card')} you got wrong last time. Practise them now (no XP until they’re due again).</span>
            </span>
            <ArrowRightIcon className="size-4 text-muted" />
          </a>
        )}
        {learnable.map((deck) => (
          <a
            key={deck.id}
            href={`#/review/deck/${deck.id}`}
            style={deckStyle(deck)}
            className="panel group flex items-center gap-4 rounded-2xl p-4 transition-[border-color,scale] duration-200 hover:border-(--deck)/60 active:scale-[0.99]"
          >
            <span className="size-3 rounded-full bg-(--deck) shadow-[0_0_10px_var(--deck)]" />
            <span className="flex-1">
              <span className="block font-medium">Learn “{deck.title}”</span>
              <span className="text-sm text-muted">{plural(deck.newCount, 'new card')}. New cards earn XP.</span>
            </span>
            <ArrowRightIcon className="size-4 text-muted" />
          </a>
        ))}
        {empty ? (
          <Button as="a" href="#/new" size="lg" className="justify-self-start">
            Upload your first PDF
            <ArrowRightIcon />
          </Button>
        ) : (
          <Button as="a" href="#/" variant="secondary" size="lg" className="justify-self-start">
            Back to dashboard
          </Button>
        )}
      </motion.div>
    </motion.div>
  )
}

// Between the main round and the rematch round.
export function RematchBreak({ count, practice, onStart, onSkip }) {
  const rise = useRise()
  useEffect(() => {
    const onKey = (e) => e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON' && onStart()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStart])
  return (
    <motion.div className="mx-auto max-w-2xl px-4 pt-16 pb-24 text-center sm:px-6 sm:pt-28" initial="hidden" animate="show" variants={stagger(0.09, 0.05)}>
      <motion.div variants={rise} className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-on-accent glow-accent">
        <RefreshIcon className="size-7" />
      </motion.div>
      <motion.h1 variants={rise} className="mt-6 text-[34px] leading-tight font-semibold tracking-tight sm:text-[44px]">
        Rematch round
      </motion.h1>
      <motion.p variants={rise} className="mx-auto mt-2 max-w-md text-lg text-muted">
        {plural(count, 'card')} you missed, while the answers are fresh.
        {practice ? ' This is practice, so there’s no XP.' : ' Get one right for a small comeback bonus, once per card.'}
      </motion.p>
      <motion.div variants={rise} className="mt-8 flex flex-wrap justify-center gap-2">
        <Button size="lg" onClick={onStart} autoFocus>
          Start rematch
          <ArrowRightIcon />
        </Button>
        <Button variant="ghost" size="lg" onClick={onSkip}>
          Skip to results
        </Button>
      </motion.div>
    </motion.div>
  )
}
