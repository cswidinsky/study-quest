import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import ThemeToggle from './components/ThemeToggle.jsx'
import XpBar from './components/XpBar.jsx'

// Placeholder screen: proves the tokens, fonts, dark mode and motion work.
// Not the real UI. Numbers are sample data.

const XP_PER_LEVEL = 500
const XP_PER_CLICK = 25
const EASE_OUT = [0.23, 1, 0.32, 1]

export default function App() {
  const [totalXp, setTotalXp] = useState(1840)
  const [gainId, setGainId] = useState(0)
  const reduceMotion = useReducedMotion()

  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1
  const xpInLevel = totalXp % XP_PER_LEVEL

  // Hide the "+25" a moment after the last click.
  useEffect(() => {
    if (!gainId) return
    const timer = setTimeout(() => setGainId(0), 900)
    return () => clearTimeout(timer)
  }, [gainId])

  function earnXp() {
    setTotalXp((xp) => xp + XP_PER_CLICK)
    setGainId((id) => id + 1)
  }

  // Each block rises 8px and fades in, 60ms after the one before.
  // With reduced motion: fade only, no movement.
  const rise = {
    hidden: reduceMotion
      ? { opacity: 0 }
      : { opacity: 0, transform: 'translateY(8px)' },
    show: {
      opacity: 1,
      transform: 'translateY(0px)',
      transition: { duration: 0.3, ease: EASE_OUT },
    },
  }

  return (
    <>
      <header className="mx-auto flex max-w-xl items-center justify-between px-4 py-5">
        <a href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <Mark />
          StudyQuest
        </a>
        <ThemeToggle />
      </header>

      <motion.main
        className="mx-auto max-w-xl px-4 pt-10 pb-16"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      >
        <motion.h1 variants={rise} className="text-3xl font-semibold tracking-tight">
          Tonight’s review
        </motion.h1>
        <motion.p variants={rise} className="mt-2 text-muted">
          Cell Biology, chapter 3 · <span className="num">12</span> cards due
        </motion.p>

        <motion.section
          variants={rise}
          aria-labelledby="progress-heading"
          className="mt-8 rounded-2xl border border-border bg-surface p-6"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="progress-heading" className="text-sm text-muted">
                Level
              </h2>
              <p className="num text-4xl leading-none font-medium">{level}</p>
            </div>

            <p className="num relative text-sm">
              <AnimatePresence>
                {gainId > 0 && (
                  <motion.span
                    key={gainId}
                    aria-hidden="true"
                    className="absolute -top-6 right-0 font-medium"
                    initial={{ opacity: 0, transform: reduceMotion ? 'none' : 'translateY(4px)' }}
                    animate={{ opacity: 1, transform: 'translateY(0px)' }}
                    exit={{ opacity: 0, transform: reduceMotion ? 'none' : 'translateY(-6px)' }}
                    transition={{ duration: 0.2, ease: EASE_OUT }}
                  >
                    +{XP_PER_CLICK}
                  </motion.span>
                )}
              </AnimatePresence>
              {xpInLevel}
              <span className="text-muted"> / {XP_PER_LEVEL} XP</span>
            </p>
          </div>

          <div className="mt-4">
            <XpBar value={xpInLevel} max={XP_PER_LEVEL} level={level} />
          </div>
          <p className="mt-2 text-sm text-muted">
            <span className="num">{XP_PER_LEVEL - xpInLevel}</span> XP to level{' '}
            <span className="num">{level + 1}</span>
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="text-muted">Last quiz</span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-success" aria-hidden="true" />
              <span className="num">8</span> correct
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-error" aria-hidden="true" />
              <span className="num">2</span> missed
            </span>
          </div>

          <button
            type="button"
            onClick={earnXp}
            className="mt-6 inline-flex h-11 items-center rounded-full bg-accent px-5 font-medium text-on-accent transition-[background-color,transform] duration-150 ease-out select-none hover:bg-accent-hover active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Earn {XP_PER_CLICK} XP
          </button>
        </motion.section>
      </motion.main>
    </>
  )
}

// Product mark: a quest flag on the accent colour.
function Mark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <rect width="24" height="24" rx="7" className="fill-accent" />
      <path
        d="M8.5 18V6l8 3.25-8 3.25"
        fill="none"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-on-accent"
      />
    </svg>
  )
}
