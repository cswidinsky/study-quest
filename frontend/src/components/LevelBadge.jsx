import { AnimatePresence, motion } from 'motion/react'

// Your level in a glowing tangerine coin. The number rolls when it changes.
export default function LevelBadge({ level, size = 'size-8 text-sm' }) {
  return (
    <span
      className={`num relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent font-semibold text-on-accent glow-accent ${size}`}
      title={`Level ${level}`}
    >
      <span className="sr-only">Level </span>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={level}
          initial={{ opacity: 0, transform: 'translateY(80%)' }}
          animate={{ opacity: 1, transform: 'translateY(0%)' }}
          exit={{ opacity: 0, transform: 'translateY(-80%)' }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.35 }}
        >
          {level}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
