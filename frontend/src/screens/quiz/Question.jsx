import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { masteryOf } from '../../lib/srs.js'
import { deckStyle } from '../../lib/deck.js'
import { EASE_CINEMA, EASE_OUT } from '../../lib/motion.js'
import MasteryGem from '../../components/MasteryGem.jsx'
import Button from '../../components/Button.jsx'
import { CheckIcon, CloseIcon, FlipIcon } from '../../components/icons.jsx'
import Feedback from './Feedback.jsx'

const LETTERS = ['A', 'B', 'C', 'D']
const DIFFICULTY = { easy: 1, medium: 2, hard: 3 }

// One question: header (deck, topic, difficulty, mastery), then either four options
// (multiple choice) or a card that flips (flashcards). After answering, the feedback panel.
// The correct option is unknown here until the server's answer arrives (answered.result).
export default function Question({ item, deck, flash, pending, answered, onAnswer, onReveal, onNext, nextLabel, onReport, reported, practice, liveCard }) {
  const level = masteryOf(liveCard.review)
  const difficulty = DIFFICULTY[item.card.difficulty] ? item.card.difficulty : null // may be missing

  return (
    <div style={deckStyle(deck)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-(--deck) shadow-[0_0_8px_var(--deck)]" aria-hidden="true" />
          <span className="text-text">{deck?.course.code || deck?.title}</span>
        </span>
        {item.card.topic && <span>{item.card.topic}</span>}
        {difficulty && (
          <span className="flex items-center gap-1" title={`Difficulty: ${difficulty}`}>
            {[1, 2, 3].map((n) => (
              <span key={n} className={`h-2.5 w-1 rounded-full ${n <= DIFFICULTY[difficulty] ? 'bg-(--deck)' : 'bg-border'}`} />
            ))}
            <span className="ml-1 capitalize">{difficulty}</span>
          </span>
        )}
        <span className="ml-auto">
          <MasteryGem level={level} withLabel className="size-4" />
        </span>
      </div>

      <h2 className="mt-4 text-[22px] leading-snug font-semibold tracking-tight text-balance sm:text-[28px]">{item.card.question}</h2>

      {flash ? (
        <FlashCard item={item} pending={pending} answered={answered} onAnswer={onAnswer} onReveal={onReveal} />
      ) : (
        <Choices item={item} pending={pending} answered={answered} onAnswer={onAnswer} />
      )}

      <AnimatePresence>
        {answered && (
          <Feedback
            key="feedback"
            item={item}
            deck={deck}
            answered={answered}
            onNext={onNext}
            nextLabel={nextLabel}
            onReport={onReport}
            reported={reported}
            practice={practice}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ——— Multiple choice ——— */

function Choices({ item, pending, answered, onAnswer }) {
  // Which option was right comes from the server's response, never from the card.
  const correctIndex = answered?.result.correctIndex ?? null
  return (
    <ol className="mt-6 grid gap-2.5 sm:mt-8 sm:gap-3">
      {item.options.map((text, i) => (
        <li key={i}>
          <Option
            index={i}
            text={text}
            answered={answered}
            checking={pending?.chosen === i}
            locked={Boolean(pending)}
            isCorrect={i === correctIndex}
            onPick={(origin) => onAnswer({ chosen: i, origin })}
          />
        </li>
      ))}
    </ol>
  )
}

function Option({ index, text, answered, checking, locked, isCorrect, onPick }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const [ripple, setRipple] = useState(null)
  const chosen = answered?.chosen === index
  // A live PDF quiz is marked all at once when it's submitted: until then a pick is only
  // saved, and picking another option replaces it.
  const changeable = Boolean(answered?.result.deferred)
  const state = !answered
    ? checking ? 'checking' : 'idle'
    : changeable
      ? chosen ? 'saved' : checking ? 'checking' : 'idle'
      : isCorrect ? (chosen ? 'right' : 'reveal') : chosen ? 'wrong' : 'dim'

  function pick(e) {
    if ((answered && !changeable) || (changeable && chosen) || locked) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX || rect.left + rect.width / 2
    const y = e.clientY || rect.top + rect.height / 2
    setRipple({ x: x - rect.left, y: y - rect.top })
    onPick({ x, y })
  }

  const styles = {
    idle: 'border-border bg-surface/80 hover:border-(--deck)/60 hover:bg-surface',
    // Picked, waiting for the server's verdict (usually a blink).
    checking: 'border-(--deck) bg-surface shadow-[0_0_0_1px_var(--deck)] motion-safe:animate-pulse',
    right: 'border-success bg-surface shadow-[0_0_0_1px_var(--color-success),0_12px_40px_-12px_var(--color-success)]',
    reveal: 'border-success/70 bg-surface',
    wrong: 'border-error bg-surface',
    saved: 'border-(--deck) bg-surface shadow-[0_0_0_1px_var(--deck)]',
    dim: 'border-border bg-surface/50 opacity-45',
  }

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={pick}
      disabled={(Boolean(answered) && !changeable && !chosen && !isCorrect) || (locked && !checking)}
      aria-disabled={(Boolean(answered) && !changeable) || locked}
      aria-pressed={changeable ? chosen : undefined}
      aria-busy={checking || undefined}
      aria-keyshortcuts={`${index + 1} ${LETTERS[index]}`}
      className={`relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border px-4 py-3.5 text-left text-[15px] transition-[border-color,background-color,opacity,box-shadow,scale] duration-200 ease-out sm:px-5 sm:py-4 sm:text-base ${
        !answered || changeable ? 'active:scale-[0.985]' : ''
      } ${styles[state]}`}
      animate={
        state === 'wrong' && !reduce
          ? { transform: ['translateX(0px)', 'translateX(-9px)', 'translateX(8px)', 'translateX(-6px)', 'translateX(4px)', 'translateX(0px)'] }
          : state === 'right' && !reduce
            ? { transform: ['scale(1)', 'scale(1.025)', 'scale(1)'] }
            : { transform: 'translateX(0px)' }
      }
      transition={{ duration: state === 'wrong' ? 0.45 : 0.4, ease: EASE_OUT }}
    >
      {/* Fill that spreads from where you clicked */}
      {ripple && (state === 'right' || state === 'wrong') && (
        <motion.span
          aria-hidden="true"
          className={`pointer-events-none absolute size-10 rounded-full ${state === 'right' ? 'bg-success/20' : 'bg-error/15'}`}
          style={{ left: ripple.x - 20, top: ripple.y - 20 }}
          initial={{ transform: 'scale(0.2)', opacity: 1 }}
          animate={{ transform: 'scale(60)', opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE_CINEMA }}
        />
      )}
      <span
        className={`num relative grid size-8 shrink-0 place-items-center rounded-lg border text-sm transition-[background-color,border-color,color] duration-200 ${
          state === 'right' || state === 'reveal'
            ? 'border-success bg-success text-on-accent'
            : state === 'wrong'
              ? 'border-error bg-error text-on-accent'
              : 'border-border bg-background text-muted'
        }`}
        aria-hidden="true"
      >
        {state === 'right' || state === 'reveal' ? (
          <motion.span initial={reduce ? false : { transform: 'scale(0.4) rotate(-20deg)' }} animate={{ transform: 'scale(1) rotate(0deg)' }} transition={{ type: 'spring', duration: 0.5, bounce: 0.5 }}>
            <CheckIcon className="size-4" strokeWidth="2.5" />
          </motion.span>
        ) : state === 'wrong' ? (
          <CloseIcon className="size-4" strokeWidth="2.5" />
        ) : (
          LETTERS[index]
        )}
      </span>
      <span className="relative">{text}</span>
      {state === 'right' && answered.result.xp > 0 && (
        <motion.span
          aria-hidden="true"
          className="num absolute top-1/2 right-4 -mt-3 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-on-accent glow-accent"
          initial={{ opacity: 0, transform: 'translateY(6px) scale(0.6)' }}
          animate={{ opacity: [0, 1, 1, 0], transform: ['translateY(6px) scale(0.6)', 'translateY(-6px) scale(1.1)', 'translateY(-18px) scale(1)', 'translateY(-46px) scale(0.9)'] }}
          transition={{ duration: 1.3, times: [0, 0.2, 0.6, 1], ease: 'easeOut' }}
        >
          +{answered.result.xp} XP
        </motion.span>
      )}
    </motion.button>
  )
}

/* ——— Flashcard: flip to see the answer, then say how it went ——— */

// The back of the card comes from the server when you flip (api.revealAnswer);
// then you grade yourself and the server records it.
function FlashCard({ pending, answered, onAnswer, onReveal }) {
  const reduce = useReducedMotion()
  const [flipped, setFlipped] = useState(false)
  const [back, setBack] = useState(null) // the answer text, once revealed
  const flipRef = useRef(null)

  useEffect(() => {
    if (!answered) flipRef.current?.focus()
  }, [answered])

  async function flip() {
    if (flipped) return
    setFlipped(true)
    try {
      const { answer } = await onReveal()
      setBack(answer)
    } catch (error) {
      setBack(`Couldn’t load the answer: ${error.message}`)
    }
  }

  const grade = (got, origin = null) => onAnswer({ selfGrade: got ? 'got' : 'missed', origin })
  const canGrade = flipped && back !== null && !answered && !pending

  // Keyboard: Space/Enter flips; then 1 = missed it, 2 = got it.
  useEffect(() => {
    if (answered) return
    const onKey = (e) => {
      if (!flipped && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        flip()
      } else if (canGrade && (e.key === '1' || e.key === '2')) {
        grade(e.key === '2')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="mt-6 sm:mt-8">
      <div className="[perspective:1200px]">
        <motion.div
          className="relative grid min-h-48 [transform-style:preserve-3d]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', duration: 0.8, bounce: 0.25 }}
        >
          <button
            ref={flipRef}
            type="button"
            onClick={flip}
            className="panel col-start-1 row-start-1 flex flex-col items-center justify-center gap-3 rounded-3xl p-6 text-center [backface-visibility:hidden]"
            aria-label="Show the answer"
            tabIndex={flipped ? -1 : 0}
          >
            <FlipIcon className="size-6 text-muted" />
            <span className="text-sm text-muted">Think of your answer, then tap to flip</span>
            <span className="text-xs text-muted">Space</span>
          </button>
          <div
            className="col-start-1 row-start-1 flex flex-col justify-center rounded-3xl border border-(--deck)/50 bg-surface p-6 shadow-[0_18px_50px_-20px_var(--deck)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
            aria-hidden={!flipped}
          >
            <p className="text-xs text-muted">Answer</p>
            <p className="mt-2 text-lg font-medium">{back ?? <span className="text-muted motion-safe:animate-pulse">Loading…</span>}</p>
          </div>
        </motion.div>
      </div>

      {canGrade && (
        <motion.div
          className="mt-4 grid grid-cols-2 gap-2.5"
          initial={{ opacity: 0, transform: 'translateY(10px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        >
          <Button variant="secondary" size="lg" onClick={() => grade(false)}>
            Missed it <span className="num text-xs text-muted">1</span>
          </Button>
          <Button
            size="lg"
            onClick={(e) => grade(true, { x: e.clientX, y: e.clientY })}
            className="bg-success hover:bg-success hover:brightness-110"
          >
            Got it <span className="num text-xs opacity-70">2</span>
          </Button>
        </motion.div>
      )}
    </div>
  )
}
