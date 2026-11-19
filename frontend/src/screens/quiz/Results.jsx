import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { masteryIndex, masteryLabel } from '../../lib/srs.js'
import { deckStyle } from '../../lib/deck.js'
import { EASE_CINEMA, stagger, useRise } from '../../lib/motion.js'
import { play } from '../../lib/sound.js'
import Button from '../../components/Button.jsx'
import CountUp from '../../components/CountUp.jsx'
import MasteryGem from '../../components/MasteryGem.jsx'
import Sparks from '../../components/Sparks.jsx'
import StreakFlame from '../../components/StreakFlame.jsx'
import { ArrowRightIcon, RefreshIcon } from '../../components/icons.jsx'

// The end of a session, revealed like a closing scene: the score ring draws,
// numbers count up, cards that climbed a mastery level pop in, then your weak spots.
export default function Results({ log, bestCombo, decks, streak, streakLitNow, onRematch }) {
  const reduce = useReducedMotion()
  const rise = useRise(20)
  const ringRef = useRef(null)
  const [burst, setBurst] = useState(null)

  const main = log.filter((l) => l.round === 'main')
  const right = main.filter((l) => l.correct).length
  const score = main.length ? Math.round((right / main.length) * 100) : 0
  const xp = log.reduce((s, l) => s + l.xp, 0)
  const comebacks = log.filter((l) => l.reason === 'comeback').length
  const ups = main.filter((l) => l.correct && masteryIndex(l.masteryAfter) > masteryIndex(l.masteryBefore))
  const missed = main.filter((l) => !l.correct)
  const weakTopics = [
    ...missed.reduce((m, l) => {
      const key = `${l.card.deckId}::${l.card.topic}`
      const row = m.get(key) ?? { topic: l.card.topic, deck: decks.find((d) => d.id === l.card.deckId), count: 0 }
      row.count += 1
      return m.set(key, row)
    }, new Map()).values(),
  ]
  const headline = score === 100 ? 'Flawless.' : score >= 80 ? 'Sharp session.' : score >= 50 ? 'Solid work.' : 'Good practice.'

  useEffect(() => {
    play('results')
    if (score < 80 || reduce) return
    const t = setTimeout(() => {
      const r = ringRef.current?.getBoundingClientRect()
      if (r) setBurst({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }, 1300)
    return () => clearTimeout(t)
  }, [score, reduce])

  return (
    <motion.div className="mx-auto max-w-3xl px-4 pt-8 pb-24 sm:px-6 sm:pt-16" initial="hidden" animate="show" variants={stagger(0.09, 0.15)}>
      {burst && <Sparks x={burst.x} y={burst.y} count={70} power={1.3} onDone={() => setBurst(null)} />}

      <div className="flex flex-col items-center text-center">
        <motion.div
          ref={ringRef}
          className="relative size-44 sm:size-52"
          initial={reduce ? false : { opacity: 0, transform: 'scale(0.7)' }}
          animate={{ opacity: 1, transform: 'scale(1)' }}
          transition={{ type: 'spring', duration: 1, bounce: 0.3 }}
        >
          <span aria-hidden="true" className="absolute -inset-10 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-accent)_40%,transparent),transparent)]" />
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90 [filter:drop-shadow(0_0_10px_var(--color-accent))]" aria-hidden="true">
            <circle cx="60" cy="60" r="52" className="fill-none stroke-border" strokeWidth="7" />
            <motion.circle
              cx="60"
              cy="60"
              r="52"
              className="fill-none"
              stroke="url(#results-grad)"
              strokeWidth="7"
              strokeLinecap="round"
              initial={{ pathLength: reduce ? score / 100 : 0 }}
              animate={{ pathLength: Math.max(0.001, score / 100) }}
              transition={{ duration: 1.4, delay: 0.3, ease: EASE_CINEMA }}
            />
            <defs>
              <linearGradient id="results-grad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="var(--color-secondary)" />
                <stop offset="1" stopColor="var(--color-accent)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div>
              <CountUp value={score} format={(n) => `${n}%`} delay={0.3} duration={1.4} className="num block text-5xl font-medium sm:text-6xl" />
              <span className="text-sm text-muted">
                <span className="num">{right}</span> of <span className="num">{main.length}</span> right
              </span>
            </div>
          </div>
        </motion.div>

        <motion.h1 variants={rise} className="mt-7 text-[34px] leading-tight font-semibold tracking-tight sm:text-[44px]">
          {headline}
        </motion.h1>
        <motion.p variants={rise} className="mt-1 text-lg text-muted">
          Session complete.
        </motion.p>
      </div>

      <motion.dl variants={stagger(0.08, 0.5)} className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat rise={rise} label="XP earned" glow>
          <CountUp value={xp} format={(n) => `+${n}`} delay={0.7} className="num text-[30px] leading-none" />
        </Stat>
        <Stat rise={rise} label="Best combo">
          <span className="num text-[30px] leading-none">{bestCombo}</span>
          <span className="ml-1 text-sm text-muted">in a row</span>
        </Stat>
        <Stat rise={rise} label="Mastery ups">
          <CountUp value={ups.length} delay={0.8} className="num text-[30px] leading-none" />
        </Stat>
        <Stat rise={rise} label="Streak">
          <span className="flex items-center gap-1.5">
            <StreakFlame lit={streak.studiedToday} className="size-6" />
            <span className="num text-[30px] leading-none">{streak.current}</span>
          </span>
          {streakLitNow && <span className="mt-1 block text-xs font-medium">Lit today!</span>}
        </Stat>
      </motion.dl>

      {comebacks > 0 && (
        <motion.p variants={rise} className="mt-4 text-center text-sm text-muted">
          Plus <span className="num text-text">{comebacks}</span> comeback{comebacks === 1 ? '' : 's'} in the rematch round.
        </motion.p>
      )}

      {ups.length > 0 && (
        <motion.section variants={rise} className="panel mt-6 rounded-3xl p-4 sm:p-6" aria-labelledby="ups-heading">
          <h2 id="ups-heading" className="text-sm font-semibold">
            Cards that moved up
          </h2>
          <motion.ul className="mt-3 space-y-2" variants={stagger(0.08, 0.9)} initial="hidden" animate="show">
            {ups.map((l) => (
              <motion.li key={l.card.id} variants={rise} className="flex items-center gap-3 rounded-2xl bg-surface/70 px-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{l.card.question}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                  <MasteryGem level={l.masteryBefore} className="size-3.5" />
                  <ArrowRightIcon className="size-3" />
                  <MasteryGem level={l.masteryAfter} className="size-4" />
                  <span className="text-text">{masteryLabel(l.masteryAfter)}</span>
                </span>
              </motion.li>
            ))}
          </motion.ul>
        </motion.section>
      )}

      <motion.section variants={rise} className="panel mt-4 rounded-3xl p-4 sm:p-6" aria-labelledby="weak-heading">
        <h2 id="weak-heading" className="text-sm font-semibold">
          Weak spots
        </h2>
        {weakTopics.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None this time. Every first answer was right.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {weakTopics.map((t) => (
              <li key={`${t.deck?.id}-${t.topic}`} style={deckStyle(t.deck)} className="flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-sm">
                <span className="size-2 rounded-full bg-(--deck)" aria-hidden="true" />
                {t.topic}
                <span className="num text-xs text-muted">{t.count} missed</span>
              </li>
            ))}
          </ul>
        )}
      </motion.section>

      <motion.div variants={rise} className="mt-8 flex flex-wrap justify-center gap-2">
        {missed.length > 0 && (
          <Button size="lg" onClick={onRematch}>
            <RefreshIcon />
            Rematch {missed.length} missed
          </Button>
        )}
        <Button as="a" href="#/" variant={missed.length ? 'secondary' : 'primary'} size="lg">
          Back to dashboard
          <ArrowRightIcon />
        </Button>
      </motion.div>
    </motion.div>
  )
}

function Stat({ label, children, glow, rise }) {
  return (
    <motion.div variants={rise} className={`panel relative overflow-hidden rounded-3xl p-4 ${glow ? 'border-accent/40' : ''}`}>
      {glow && (
        <span aria-hidden="true" className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-accent)_45%,transparent),transparent)]" />
      )}
      <dt className="relative text-xs text-muted">{label}</dt>
      <dd className="relative mt-2">{children}</dd>
    </motion.div>
  )
}
