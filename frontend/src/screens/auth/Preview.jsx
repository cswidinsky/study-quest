import { motion } from 'motion/react'
import StreakFlame from '../../components/StreakFlame.jsx'
import { CheckIcon } from '../../components/icons.jsx'

// A real moment from the quiz, shown on the welcome screen: an answered question, the XP it earned,
// the combo and the streak. It's a picture (aria-hidden), not something to click.
const OPTIONS = [
  { text: 'It shrinks and crinkles', state: 'dim' },
  { text: 'Water flows in and it may burst', state: 'right' },
  { text: 'Nothing changes', state: 'dim' },
]

export default function Preview() {
  return (
    <div data-ui className="relative max-w-[470px] select-none" aria-hidden="true">
      <div className="panel rounded-3xl p-5 shadow-[var(--panel-edge),var(--shadow-float)]" style={{ '--deck': 'var(--color-deck-lagoon)' }}>
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-(--deck)" />
            Cell Biology · Membrane transport
          </span>
          <span className="num">3 of 10</span>
        </div>
        <p className="mt-3 text-lg leading-snug font-medium">What happens to a red blood cell in a hypotonic solution?</p>
        <ul className="mt-4 space-y-2">
          {OPTIONS.map((o, i) => (
            <motion.li
              key={o.text}
              className={`flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-sm ${
                o.state === 'right' ? 'border-success bg-success/10 font-medium' : 'border-border bg-surface/50 text-muted'
              }`}
              initial={{ opacity: 0, transform: 'translateY(6px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: 0.45 + i * 0.06 }}
            >
              {o.text}
              {o.state === 'right' && <CheckIcon className="size-4 text-success" />}
            </motion.li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          Hypotonic means fewer solutes outside, so water moves in by osmosis. <span className="text-text">Page 3 of your notes.</span>
        </p>
      </div>

      <motion.span
        className="num absolute -top-4 right-6 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-on-accent glow-accent"
        initial={{ opacity: 0, transform: 'translateY(10px) scale(0.8)' }}
        animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.45, delay: 0.85 }}
      >
        +15 XP
      </motion.span>
      <motion.span
        className="absolute -top-3.5 right-28 rounded-full border border-secondary/50 bg-surface px-2.5 py-1 text-xs font-medium"
        initial={{ opacity: 0, transform: 'translateX(8px)' }}
        animate={{ opacity: 1, transform: 'translateX(0px)' }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.3, delay: 1 }}
      >
        ×1.5 combo
      </motion.span>
      <motion.span
        className="absolute -bottom-4 left-6 flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm shadow-[var(--shadow-float)]"
        initial={{ opacity: 0, transform: 'translateY(-6px)' }}
        animate={{ opacity: 1, transform: 'translateY(0px)' }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.3, delay: 1.1 }}
      >
        <StreakFlame lit className="size-4" />
        <span className="num font-medium">12</span>
        <span className="text-muted">day streak</span>
      </motion.span>
    </div>
  )
}
