import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { comboMultiplier } from '../../lib/levels.js'
import { EASE_CINEMA } from '../../lib/motion.js'
import CountUp from '../../components/CountUp.jsx'
import { BoltIcon, CloseIcon, SoundOffIcon, SoundOnIcon } from '../../components/icons.jsx'

// The quiz's own top bar: leave, progress, combo, XP earned this session, sound.
export default function QuizBar({ done, position, total, combo, sessionXp, sound, onToggleSound, onClose, roundLabel }) {
  const progress = total ? done / total : 0
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/95">
      <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="End session"
          title="End session"
          className="grid size-10 shrink-0 place-items-center rounded-full text-muted transition-[background-color,color,scale] duration-150 ease-out hover:bg-border/60 hover:text-text active:scale-[0.92]"
        >
          <CloseIcon className="size-5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-baseline justify-between text-xs text-muted">
            <span>{roundLabel}</span>
            <span className="num">
              <span className="text-text">{Math.min(position ?? done + 1, total)}</span>/{total}
            </span>
          </div>
          <div
            className="relative h-2 overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-label="Session progress"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={total}
          >
            <motion.div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-secondary),var(--color-accent))] shadow-[0_0_12px_var(--color-accent)]"
              initial={false}
              animate={{ transform: `translateX(${(progress - 1) * 100}%)` }}
              transition={{ duration: 0.7, ease: EASE_CINEMA }}
            />
          </div>
        </div>

        <ComboMeter combo={combo} />

        <span className="hidden items-center gap-1 text-sm sm:flex" title="XP earned this session">
          <BoltIcon className="size-4 text-accent" />
          <CountUp value={sessionXp} duration={0.6} className="num font-medium" />
          <span className="text-xs text-muted">XP</span>
        </span>

        <button
          type="button"
          onClick={onToggleSound}
          aria-label={sound ? 'Turn sound off' : 'Turn sound on'}
          aria-pressed={sound}
          title={sound ? 'Sound on' : 'Sound off'}
          className="grid size-10 shrink-0 place-items-center rounded-full text-muted transition-[background-color,color,scale] duration-150 ease-out hover:bg-border/60 hover:text-text active:scale-[0.92] aria-pressed:text-text"
        >
          {sound ? <SoundOnIcon className="size-5" /> : <SoundOffIcon className="size-5" />}
        </button>
      </div>
    </div>
  )
}

// ×1 → ×1.5 → ×2 → ×2.5 → ×3. Three pips fill towards the next tier; it heats up as it climbs.
export function ComboMeter({ combo }) {
  const reduce = useReducedMotion()
  const mult = comboMultiplier(combo)
  const pips = combo >= 12 ? 3 : combo % 3
  const hot = mult >= 2.5
  const colour = mult >= 2.5 ? 'var(--color-sun)' : mult > 1 ? 'var(--color-accent)' : 'var(--color-muted)'

  return (
    <div className="flex shrink-0 flex-col items-center" title={`Combo: ${combo} in a row`} aria-label={`Combo ${combo} in a row, times ${mult} XP`}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={mult}
          className="num text-base leading-none font-semibold"
          style={{ color: colour, textShadow: mult > 1 ? `0 0 14px ${colour}` : 'none' }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(1.8)' }}
          animate={{ opacity: 1, transform: 'scale(1)' }}
          exit={{ opacity: 0, transform: 'scale(0.6)' }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.5 }}
        >
          ×{mult}
        </motion.span>
      </AnimatePresence>
      <span className="mt-1.5 flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full"
            animate={{
              backgroundColor: i < pips ? colour : 'var(--color-border)',
              transform: i < pips && !reduce ? ['scale(1.8)', 'scale(1)'] : 'scale(1)',
            }}
            transition={{ duration: 0.35 }}
            style={hot && i < pips ? { boxShadow: `0 0 6px ${colour}` } : undefined}
          />
        ))}
      </span>
    </div>
  )
}
