import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { masteryIndex, masteryLabel } from '../../lib/srs.js'
import { EASE_CINEMA, EASE_OUT } from '../../lib/motion.js'
import MasteryGem from '../../components/MasteryGem.jsx'
import Button from '../../components/Button.jsx'
import { ArrowRightIcon, FlagIcon, QuoteIcon } from '../../components/icons.jsx'

// After an answer: was it right, what it earned (and why), the explanation,
// the line from your own notes, and whether the card moved up a mastery level.
export default function Feedback({ item, deck, answered, onNext, onReport, reported, practice }) {
  const reduce = useReducedMotion()
  const nextRef = useRef(null)
  const { correct, result } = answered
  const up = masteryIndex(result.masteryAfter) > masteryIndex(result.masteryBefore)
  const card = item.card

  useEffect(() => {
    const t = setTimeout(() => nextRef.current?.focus({ preventScroll: true }), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.section
      aria-live="polite"
      className={`mt-5 overflow-hidden rounded-3xl border bg-surface/90 p-4 sm:p-6 ${
        correct ? 'border-success/40 shadow-[0_20px_60px_-30px_var(--color-success)]' : 'border-error/30'
      }`}
      initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(24px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', duration: 0.6, bounce: 0.2, delay: 0.12 }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className={`text-lg font-semibold ${correct ? 'text-text' : 'text-text'}`}>
          <span className={`mr-2 inline-block size-2.5 rounded-full align-middle ${correct ? 'bg-success shadow-[0_0_10px_var(--color-success)]' : 'bg-error'}`} />
          {correct ? (result.reason === 'comeback' ? 'Comeback!' : 'Correct') : 'Not quite'}
        </p>
        <XpLine correct={correct} result={result} practice={practice} />
      </div>

      {up && (
        <motion.div
          className="mt-4 flex items-center gap-2 rounded-2xl bg-accent-soft px-3 py-2 text-sm"
          initial={reduce ? false : { opacity: 0, transform: 'scale(0.9)' }}
          animate={{ opacity: 1, transform: 'scale(1)' }}
          transition={{ type: 'spring', duration: 0.6, bounce: 0.45, delay: 0.35 }}
        >
          <span className="font-medium">Mastery up</span>
          <MasteryGem level={result.masteryBefore} className="size-4" />
          <span className="text-muted">{masteryLabel(result.masteryBefore)}</span>
          <ArrowRightIcon className="size-3.5 text-muted" />
          <motion.span
            initial={reduce ? false : { transform: 'scale(0.3) rotate(-30deg)' }}
            animate={{ transform: 'scale(1) rotate(0deg)' }}
            transition={{ type: 'spring', duration: 0.7, bounce: 0.6, delay: 0.55 }}
          >
            <MasteryGem level={result.masteryAfter} className="size-5" />
          </motion.span>
          <span className="font-medium">{masteryLabel(result.masteryAfter)}</span>
        </motion.div>
      )}

      {card.explanation && (
        <motion.p
          className="mt-4 text-[15px] leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25, ease: EASE_CINEMA }}
        >
          {card.explanation}
        </motion.p>
      )}

      {card.sourceSnippet && (
        <motion.figure
          className="mt-4 rounded-2xl border border-border bg-background/60 p-4"
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{ duration: 0.5, delay: 0.35, ease: EASE_OUT }}
        >
          <figcaption className="mb-1.5 flex items-center gap-1.5 text-xs text-muted">
            <QuoteIcon className="size-3.5" />
            From your notes{deck?.source?.fileName ? ` · ${deck.source.fileName}` : ''}
          </figcaption>
          <blockquote className="text-sm leading-relaxed text-text/90 italic">“{card.sourceSnippet}”</blockquote>
        </motion.figure>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onReport}
          disabled={reported}
          className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted transition-colors duration-150 hover:text-text disabled:opacity-70"
        >
          <FlagIcon className="size-3.5" />
          {reported ? 'Reported. Thanks!' : 'Report this question'}
        </button>
        <Button ref={nextRef} size="lg" onClick={onNext} aria-keyshortcuts="Enter">
          Continue
          <ArrowRightIcon />
        </Button>
      </div>
    </motion.section>
  )
}

// What this answer earned, and the maths behind it (it teaches how XP works).
function XpLine({ correct, result, practice }) {
  const chip = 'num rounded-full px-2 py-0.5 text-xs'
  if (!correct) {
    return <span className="text-sm text-muted">No XP lost. It comes back at the end, and again tomorrow.</span>
  }
  if (result.reason === 'comeback') {
    return <span className={`${chip} bg-accent font-semibold text-on-accent glow-accent`}>+{result.xp} XP comeback bonus</span>
  }
  if (result.xp === 0) {
    return (
      <span className="text-sm text-muted">
        {practice || result.reason === 'practice' ? 'Practice: no XP, this card isn’t due yet.' : 'No XP on a second try.'}
      </span>
    )
  }
  const { base, memory, graded, combo } = result.parts
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className={`${chip} bg-accent font-semibold text-on-accent glow-accent`}>+{result.xp} XP</span>
      <span className={`${chip} border border-border text-muted`}>{base} base</span>
      {memory > 1 && <span className={`${chip} border border-border text-muted`}>×{memory} memory</span>}
      {graded < 1 && <span className={`${chip} border border-border text-muted`}>×{graded} self-graded</span>}
      {combo > 1 && <span className={`${chip} border border-accent/60 font-medium text-text`}>×{combo} combo</span>}
    </span>
  )
}
