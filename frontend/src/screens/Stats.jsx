import { motion, useReducedMotion } from 'motion/react'
import { useGame } from '../state/game.js'
import { levelProgress } from '../lib/levels.js'
import { MASTERY_LEVELS } from '../lib/srs.js'
import { masteryCounts, topicStats } from '../lib/selectors.js'
import { percent, weekdayShort } from '../lib/format.js'
import { deckStyle } from '../lib/deck.js'
import { EASE_CINEMA, stagger, useRise } from '../lib/motion.js'
import CountUp from '../components/CountUp.jsx'
import FillBar from '../components/FillBar.jsx'
import MasteryGem from '../components/MasteryGem.jsx'
import Button from '../components/Button.jsx'
import { RefreshIcon } from '../components/icons.jsx'

// How your memory is doing: activity, where every card sits, and your weakest topics.
export default function Stats() {
  const { data } = useGame()
  const rise = useRise()
  if (!data) return null

  const { user, activity, cards, decks } = data
  const level = levelProgress(user.xp.total)
  const answered = activity.reduce((s, d) => s + d.answered, 0)
  const correct = activity.reduce((s, d) => s + d.correct, 0)
  const counts = masteryCounts(cards)
  const topics = topicStats(cards, decks)

  return (
    <motion.div className="mx-auto max-w-[1100px] px-4 pt-7 pb-24 sm:px-6 lg:pt-24" initial="hidden" animate="show" variants={stagger(0.07, 0.05)}>
      <motion.header variants={rise}>
        <h1 className="text-[32px] leading-tight font-semibold tracking-tight sm:text-[44px]">Stats</h1>
        <p className="mt-2 text-base text-muted sm:text-lg">What you’ve answered, what you remember, and where to aim next.</p>
      </motion.header>

      <div className="mt-9 grid grid-cols-12 gap-3 sm:gap-4 lg:mt-12">
        <Tile rise={rise} label="Total XP">
          <CountUp value={user.xp.total} className="num text-[30px] leading-none sm:text-[34px]" />
        </Tile>
        <Tile rise={rise} label="Level">
          <span className="num text-[30px] leading-none sm:text-[34px]">{level.level}</span>
          <span className="ml-2 text-sm text-muted">
            <span className="num">{level.toNext}</span> XP to go
          </span>
        </Tile>
        <Tile rise={rise} label="Accuracy, 7 days">
          <CountUp value={percent(correct, answered)} format={(n) => `${n}%`} className="num text-[30px] leading-none sm:text-[34px]" />
        </Tile>
        <Tile rise={rise} label="Cards mastered">
          <CountUp value={counts.mastered} className="num text-[30px] leading-none sm:text-[34px]" />
          <span className="ml-1.5 text-sm text-muted">
            of <span className="num">{cards.length}</span>
          </span>
        </Tile>

        <motion.section variants={rise} className="panel col-span-12 rounded-3xl p-4 sm:p-6 lg:col-span-7" aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="text-sm font-semibold">
            Last 7 days
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Answers per day. <span className="text-text">Teal</span> = right.
          </p>
          <ActivityChart activity={activity} />
        </motion.section>

        <motion.section variants={rise} className="panel col-span-12 rounded-3xl p-4 sm:p-6 lg:col-span-5" aria-labelledby="mastery-heading">
          <h2 id="mastery-heading" className="text-sm font-semibold">
            Where your cards are
          </h2>
          <p className="mt-0.5 text-xs text-muted">Cards climb a level each time they survive a longer gap.</p>
          <MasteryBar counts={counts} total={cards.length} />
          <ul className="mt-5 space-y-2">
            {MASTERY_LEVELS.map((l) => (
              <li key={l.id} className="flex items-center gap-2 text-sm">
                <MasteryGem level={l.id} className="size-4" />
                <span className="flex-1">{l.label}</span>
                <span className="text-xs text-muted">
                  {l.id === 'new' ? 'never studied' : l.id === 'mastered' ? 'held 3+ weeks' : l.id === 'strong' ? '10–20 days' : l.id === 'familiar' ? '3–9 days' : 'under 3 days'}
                </span>
                <span className="num w-8 text-right">{counts[l.id]}</span>
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.section variants={rise} className="panel col-span-12 rounded-3xl p-4 sm:p-6" aria-labelledby="topics-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="topics-heading" className="text-sm font-semibold">
                Accuracy by topic
              </h2>
              <p className="mt-0.5 text-xs text-muted">Weakest first. Right answers out of every answer so far.</p>
            </div>
            {topics.some((t) => t.weak > 0) && (
              <Button as="a" href="#/review/rematch" variant="secondary" size="sm">
                <RefreshIcon />
                Rematch weak spots
              </Button>
            )}
          </div>
          <ul className="mt-5 grid gap-x-8 gap-y-4 md:grid-cols-2">
            {topics.map((t, i) => (
              <li key={`${t.deck?.id}-${t.topic}`} style={deckStyle(t.deck)}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-2 shrink-0 rounded-full bg-(--deck)" aria-hidden="true" />
                    <span className="truncate">{t.topic}</span>
                    <span className="truncate text-xs text-muted">{t.deck?.course.code}</span>
                  </span>
                  <span className="num shrink-0">
                    {t.accuracy}%{t.weak > 0 && <span className="ml-2 text-xs text-muted">{t.weak} weak</span>}
                  </span>
                </div>
                <FillBar value={t.accuracy / 100} colour="var(--deck)" delay={0.4 + i * 0.04} label={`${t.topic} accuracy`} />
              </li>
            ))}
          </ul>
        </motion.section>
      </div>
    </motion.div>
  )
}

function Tile({ label, children, rise }) {
  return (
    <motion.section variants={rise} className="panel col-span-6 flex min-h-[120px] flex-col rounded-3xl p-4 sm:p-5 lg:col-span-3">
      <h2 className="text-sm text-muted">{label}</h2>
      <p className="mt-auto flex items-baseline pt-4">{children}</p>
    </motion.section>
  )
}

// Stacked columns: right answers (teal) under wrong ones (grey). Round, labelled scale.
function ActivityChart({ activity }) {
  const reduce = useReducedMotion()
  const max = Math.max(10, ...activity.map((d) => d.answered))
  const top = Math.ceil(max / 10) * 10
  return (
    <div className="mt-6 flex gap-3">
      <div className="num flex h-44 flex-col justify-between text-right text-[11px] text-muted" aria-hidden="true">
        <span>{top}</span>
        <span>{top / 2}</span>
        <span>0</span>
      </div>
      <ol className="flex h-44 flex-1 items-end gap-2 border-b border-border sm:gap-4" aria-label="Answers per day">
        {activity.map((d, i) => {
          const wrong = d.answered - d.correct
          return (
            <li key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" aria-label={`${weekdayShort(d.date)}: ${d.correct} right of ${d.answered}`}>
              <span className="num mb-1 text-[11px] text-muted">{d.answered || ''}</span>
              <motion.span
                className="flex w-full max-w-10 origin-bottom flex-col overflow-hidden rounded-t-md"
                style={{ height: `${(d.answered / top) * 100}%` }}
                initial={reduce ? false : { transform: 'scaleY(0)' }}
                animate={{ transform: 'scaleY(1)' }}
                transition={{ duration: 0.9, delay: 0.3 + i * 0.06, ease: EASE_CINEMA }}
              >
                <span className="bg-muted/35" style={{ flexGrow: wrong }} />
                <span className="bg-secondary shadow-[0_0_12px_-2px_var(--color-secondary)]" style={{ flexGrow: d.correct }} />
              </motion.span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function MasteryBar({ counts, total }) {
  const reduce = useReducedMotion()
  const colours = {
    new: 'var(--color-border)',
    learning: 'var(--color-deck-sky)',
    familiar: 'var(--color-secondary)',
    strong: 'var(--color-sun)',
    mastered: 'var(--color-accent)',
  }
  return (
    <motion.div
      className="mt-5 flex h-4 origin-left gap-0.5 overflow-hidden rounded-full"
      initial={reduce ? false : { transform: 'scaleX(0)' }}
      animate={{ transform: 'scaleX(1)' }}
      transition={{ duration: 1.1, delay: 0.4, ease: EASE_CINEMA }}
      role="img"
      aria-label={MASTERY_LEVELS.map((l) => `${l.label} ${counts[l.id]}`).join(', ')}
    >
      {MASTERY_LEVELS.map((l) =>
        counts[l.id] ? <span key={l.id} style={{ flexGrow: counts[l.id] / Math.max(1, total), backgroundColor: colours[l.id] }} /> : null,
      )}
    </motion.div>
  )
}

