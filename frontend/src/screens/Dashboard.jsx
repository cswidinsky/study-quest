import { useEffect, useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useGame } from '../state/game.js'
import { percent, daysFromToday, greeting, longDate, plural, relativeDay, weekdayLetter, weekdayShort } from '../lib/format.js'
import { EASE_CINEMA, stagger, useRise } from '../lib/motion.js'
import { deckStyle, deckTransitionStyle, lastOpenedDeck, rememberOpenedDeck } from '../lib/deck.js'
import { scrollToElement } from '../lib/smoothScroll.js'
import Button from '../components/Button.jsx'
import CountUp from '../components/CountUp.jsx'
import FillBar from '../components/FillBar.jsx'
import StreakFlame from '../components/StreakFlame.jsx'
import TiltCard from '../components/TiltCard.jsx'
import { AlertIcon, ArrowRightIcon, CalendarIcon, PlusIcon } from '../components/icons.jsx'

// The screen answers "What should I study right now?" — "Due for review" is the biggest block.
// Choreography: the greeting rises word by word, then the blocks follow one after another;
// inside each, numbers count up and bars grow. Nothing waits for an animation to be clickable.
//
// Grid: centred 1,100px column, 12 columns, 16px gaps. Rows: 3/3/3/3, then 9/3, then 12.

const SECONDS_PER_CARD = 40
const MAX_DUE_ROWS = 4
const pct = (n) => `${n}%`

export default function Dashboard() {
  const { status, data, reload, showToast } = useGame()
  const rise = useRise()

  if (status === 'error') return <LoadError onRetry={reload} />
  if (!data) return <DashboardSkeleton />

  const { user, activity, upcoming, decks } = data
  const dueDecks = decks
    .filter((d) => d.dueCount > 0)
    .sort((a, b) => examOrder(a) - examOrder(b) || b.dueCount - a.dueCount)
  const dueTotal = dueDecks.reduce((sum, d) => sum + d.dueCount, 0)

  const startReview = () =>
    showToast({ kind: 'info', message: 'Review sessions aren’t connected yet. They’ll start from here.' })

  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-7 pb-24 sm:px-6 lg:pt-24">
      <Hero firstName={user.firstName} dueDecks={dueDecks} dueTotal={dueTotal} />

      <motion.div
        className="mt-9 grid grid-cols-12 gap-3 sm:gap-4 lg:mt-12"
        initial="hidden"
        animate="show"
        variants={stagger(0.07, 0.35)}
      >
        <motion.div variants={rise} className="col-span-6 lg:col-span-3">
          <StreakTile streak={user.streak} activity={activity} />
        </motion.div>
        <motion.div variants={rise} className="col-span-6 lg:col-span-3">
          <AccuracyTile activity={activity} />
        </motion.div>
        <motion.div variants={rise} className="col-span-6 lg:col-span-3">
          <ReviewedTile activity={activity} />
        </motion.div>
        <motion.div variants={rise} className="col-span-6 lg:col-span-3">
          <MasteredTile decks={decks} />
        </motion.div>

        <motion.div variants={rise} className="col-span-12 lg:col-span-9">
          <DuePanel dueDecks={dueDecks} dueTotal={dueTotal} onStart={startReview} upcoming={upcoming} />
        </motion.div>
        <motion.div variants={rise} className="col-span-12 lg:col-span-3">
          <ComingUp todayDate={activity[activity.length - 1].date} dueToday={dueTotal} upcoming={upcoming} />
        </motion.div>

        <motion.div variants={rise} className="col-span-12">
          <DecksPanel decks={decks} />
        </motion.div>
      </motion.div>
    </div>
  )
}

const examOrder = (deck) => (deck.exam ? daysFromToday(deck.exam.at) : Infinity)

/* ——— Hero: greeting + today's one finding, with a gentle parallax ——— */

function Hero({ firstName, dueDecks, dueTotal }) {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 400], [0, reduce ? 0 : 90])
  const opacity = useTransform(scrollY, [0, 320], [1, reduce ? 1 : 0.15])
  const words = `${greeting()}, ${firstName}`.split(' ')

  return (
    <motion.header style={{ y, opacity }}>
      <h1 className="text-[32px] leading-tight font-semibold tracking-tight sm:text-[44px]">
        {words.map((word, i) => (
          <motion.span
            key={i}
            className="inline-block whitespace-pre"
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(40%)', filter: 'blur(8px)' }}
            animate={{ opacity: 1, transform: 'translateY(0%)', filter: 'blur(0px)' }}
            transition={{ duration: 0.9, delay: 0.05 + i * 0.08, ease: EASE_CINEMA }}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        ))}
      </h1>
      <motion.p
        className="mt-2 max-w-2xl text-base text-muted sm:text-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        {longDate()}. <Finding dueDecks={dueDecks} dueTotal={dueTotal} />
      </motion.p>
    </motion.header>
  )
}

function Finding({ dueDecks, dueTotal }) {
  if (dueTotal === 0) return <>Nothing is due today. A good day to start a new deck.</>
  const top = dueDecks[0]
  const examIn = top.exam ? daysFromToday(top.exam.at) : null
  return (
    <>
      <span className="text-text">
        <span className="num">{dueTotal}</span> cards are due
      </span>
      {top.exam && examIn >= 0 ? (
        <>
          , <span className="num">{top.dueCount}</span> of them {top.course.name}. Your {top.exam.label.toLowerCase()} is{' '}
          {relativeDay(top.exam.at)}.
        </>
      ) : (
        '.'
      )}
    </>
  )
}

/* ——— Tiles ——— */

function Tile({ label, aside, children, glow }) {
  return (
    <section className="panel relative flex h-full min-h-[148px] flex-col overflow-hidden rounded-3xl p-4 sm:p-5">
      {glow && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full opacity-60"
          style={{ background: `radial-gradient(closest-side, ${glow}, transparent)` }}
        />
      )}
      <div className="relative flex items-baseline justify-between gap-2">
        <h2 className="text-sm text-muted">{label}</h2>
        {aside}
      </div>
      <div className="relative flex flex-1 flex-col">{children}</div>
    </section>
  )
}

const figure = 'num text-[30px] leading-none sm:text-[34px]'

function StreakTile({ streak, activity }) {
  const reduce = useReducedMotion()
  const days = activity.map((day, i) => ({
    date: day.date,
    isToday: i === activity.length - 1,
    studied: i === activity.length - 1 ? streak.studiedToday : day.answered > 0,
  }))

  return (
    <Tile
      label="Streak"
      glow={streak.studiedToday ? 'color-mix(in oklab, var(--color-accent) 40%, transparent)' : undefined}
      aside={
        <span className="text-xs text-muted">
          Best <span className="num">{streak.longest}</span>
        </span>
      }
    >
      <p className="mt-3 flex items-center gap-2">
        <StreakFlame lit={streak.studiedToday} className="size-7" label={streak.studiedToday ? 'Lit today' : 'Not lit today'} />
        <CountUp value={streak.current} className={figure} />
        <span className="text-sm text-muted">days</span>
      </p>
      <ol className="mt-auto flex justify-between pt-4" aria-label="Last 7 days">
        {days.map((day, i) => (
          <li key={day.date} className="flex flex-col items-center gap-1.5">
            <span className={`text-[11px] ${day.isToday ? 'font-semibold text-text' : 'text-muted'}`}>{weekdayLetter(day.date)}</span>
            <motion.span
              className={`size-2.5 rounded-full ${
                day.studied
                  ? 'bg-accent shadow-[0_0_8px_var(--color-accent)]'
                  : day.isToday
                    ? 'border-[1.5px] border-dashed border-muted'
                    : 'bg-border'
              }`}
              initial={reduce ? false : { transform: 'scale(0)', opacity: 0 }}
              animate={{ transform: 'scale(1)', opacity: 1 }}
              transition={{ type: 'spring', duration: 0.5, bounce: 0.5, delay: 0.7 + i * 0.06 }}
            />
            <span className="sr-only">
              {day.isToday ? 'Today' : weekdayShort(day.date)}: {day.studied ? 'studied' : 'not studied'}
            </span>
          </li>
        ))}
      </ol>
    </Tile>
  )
}

function AccuracyTile({ activity }) {
  const answered = activity.reduce((s, d) => s + d.answered, 0)
  const correct = activity.reduce((s, d) => s + d.correct, 0)
  const value = percent(correct, answered)
  return (
    <Tile label="Accuracy" glow="color-mix(in oklab, var(--color-secondary) 35%, transparent)">
      <div className="mt-3 flex items-center justify-between gap-2">
        <CountUp value={value} format={pct} className={figure} />
        <Ring value={value / 100} />
      </div>
      <p className="mt-auto pt-3 text-xs text-muted">
        <span className="num">{correct}</span> of <span className="num">{answered}</span> right, last 7 days
      </p>
    </Tile>
  )
}

// A thin ring that draws itself to the value, in the secondary colour.
function Ring({ value }) {
  const reduce = useReducedMotion()
  return (
    <svg viewBox="0 0 40 40" className="size-11 -rotate-90 [filter:drop-shadow(0_0_6px_var(--color-secondary))]" aria-hidden="true">
      <circle cx="20" cy="20" r="16" className="fill-none stroke-border" strokeWidth="4" />
      <motion.circle
        cx="20"
        cy="20"
        r="16"
        className="fill-none stroke-secondary"
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ pathLength: reduce ? value : 0 }}
        animate={{ pathLength: value }}
        transition={{ duration: 1.3, delay: 0.6, ease: EASE_CINEMA }}
      />
    </svg>
  )
}

function ReviewedTile({ activity }) {
  const reduce = useReducedMotion()
  const answered = activity.reduce((s, d) => s + d.answered, 0)
  const max = Math.max(...activity.map((d) => d.answered), 1)
  const best = activity.reduce((a, b) => (b.answered > a.answered ? b : a), activity[0])
  return (
    <Tile label="Cards reviewed">
      <div className="mt-3 flex items-end justify-between gap-3">
        <CountUp value={answered} className={figure} />
        <ol className="flex h-9 items-end gap-1" aria-label="Cards reviewed per day">
          {activity.map((day, i) => (
            <motion.li
              key={day.date}
              className="w-1.5 origin-bottom rounded-full bg-secondary/70"
              style={{ height: `${Math.max(8, (day.answered / max) * 100)}%`, opacity: day.answered ? 1 : 0.25 }}
              initial={reduce ? false : { transform: 'scaleY(0)' }}
              animate={{ transform: 'scaleY(1)' }}
              transition={{ duration: 0.7, delay: 0.6 + i * 0.05, ease: EASE_CINEMA }}
              aria-label={`${weekdayShort(day.date)}: ${day.answered}`}
            />
          ))}
        </ol>
      </div>
      <p className="mt-auto pt-3 text-xs text-muted">
        Last 7 days. Best: <span className="num">{best.answered}</span> on {weekdayShort(best.date)}
      </p>
    </Tile>
  )
}

function MasteredTile({ decks }) {
  const mastered = decks.reduce((s, d) => s + d.masteredCount, 0)
  const total = decks.reduce((s, d) => s + d.cardCount, 0)
  return (
    <Tile label="Cards mastered">
      <p className="mt-3 flex items-baseline gap-1.5">
        <CountUp value={mastered} className={figure} />
        <span className="text-sm text-muted">
          of <span className="num">{total}</span>
        </span>
      </p>
      <div className="mt-auto pt-4">
        <FillBar value={mastered / total} colour="var(--color-text)" delay={0.7} />
        <p className="mt-2 text-xs text-muted">
          <span className="num">{percent(mastered, total)}%</span> of everything you’re studying
        </p>
      </div>
    </Tile>
  )
}

/* ——— Due for review ——— */

function DuePanel({ dueDecks, dueTotal, onStart, upcoming }) {
  const rise = useRise(12)
  const minutes = Math.max(1, Math.round((dueTotal * SECONDS_PER_CARD) / 60))
  const shown = dueDecks.slice(0, MAX_DUE_ROWS)
  const hidden = dueDecks.length - shown.length

  return (
    <section aria-labelledby="due-heading" className="panel relative h-full overflow-hidden rounded-3xl p-4 sm:p-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-accent)_22%,transparent),transparent)]"
      />
      <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h2 id="due-heading" className="text-sm font-semibold">
            Due for review
          </h2>
          <p className="mt-2 flex items-baseline gap-2">
            <CountUp value={dueTotal} className="num text-[48px] leading-none" delay={0.4} />
            <span className="text-base text-muted">
              {dueTotal === 1 ? 'card' : 'cards'}
              {dueTotal > 0 && (
                <>
                  , about <span className="num">{minutes}</span> min
                </>
              )}
            </span>
          </p>
        </div>
        {dueTotal > 0 && (
          <Button size="lg" onClick={onStart} className="w-full sm:w-auto">
            Start review
            <ArrowRightIcon />
          </Button>
        )}
      </div>

      {dueTotal === 0 ? (
        <p className="relative mt-5 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted">
          You’re all caught up. <span className="num">{upcoming[0].due}</span> cards come due tomorrow.
        </p>
      ) : (
        <motion.ul className="relative mt-6 space-y-2" initial="hidden" animate="show" variants={stagger(0.06, 0.55)}>
          {shown.map((deck) => (
            <motion.li key={deck.id} variants={rise}>
              <DueRow deck={deck} />
            </motion.li>
          ))}
          {hidden > 0 && (
            <motion.li variants={rise} className="px-1 pt-1 text-sm text-muted">
              And {plural(hidden, 'more deck')} with cards due.
            </motion.li>
          )}
        </motion.ul>
      )}
    </section>
  )
}

function DueRow({ deck }) {
  const examIn = deck.exam ? daysFromToday(deck.exam.at) : null
  const exam = examIn !== null && examIn >= 0 && (
    <span className="flex items-center gap-1.5 text-xs">
      <CalendarIcon className="size-3.5 text-muted" />
      {deck.exam.label} {relativeDay(deck.exam.at)}
    </span>
  )
  return (
    <a
      href={`#/deck/${deck.id}`}
      style={deckStyle(deck)}
      className="group flex min-h-16 items-center gap-4 rounded-2xl border border-border bg-surface/70 px-4 py-2.5 transition-[border-color,background-color,scale] duration-200 ease-out hover:border-(--deck)/50 hover:bg-surface active:scale-[0.99]"
    >
      <span className="h-8 w-1 shrink-0 rounded-full bg-(--deck) glow-deck" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{deck.title}</p>
        <p className="truncate text-xs text-muted">
          {deck.course.code} · {deck.course.name}
        </p>
        {exam && <p className="mt-1 sm:hidden">{exam}</p>}
      </div>
      {exam && <span className="hidden sm:flex">{exam}</span>}
      <p className="w-14 shrink-0 text-right">
        <span className="num text-base">{deck.dueCount}</span>
        <span className="text-xs text-muted"> due</span>
      </p>
      <ArrowRightIcon className="size-4 shrink-0 text-muted transition-[translate,color] duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-text" />
    </a>
  )
}

/* ——— Coming up ——— */

function ComingUp({ todayDate, dueToday, upcoming }) {
  const reduce = useReducedMotion()
  const days = [{ date: todayDate, due: dueToday, isToday: true }, ...upcoming]
  const max = Math.max(...days.map((d) => d.due), 1)

  return (
    <section aria-labelledby="coming-heading" className="panel flex h-full flex-col rounded-3xl p-4 sm:p-6">
      <h2 id="coming-heading" className="text-sm font-semibold">
        Coming up
      </h2>
      <p className="mt-0.5 text-xs text-muted">Cards due each day</p>

      <ol className="mt-auto flex items-end gap-1.5 pt-6 [--bar-max:112px] lg:[--bar-max:200px]" aria-label="Cards due over the next 7 days">
        {days.map((day, i) => (
          <li key={day.date} className="flex min-w-0 flex-1 flex-col items-center">
            <span className={`num mb-1 text-[11px] ${day.isToday ? 'text-text' : 'text-muted'}`}>{day.due}</span>
            <motion.span
              className={`w-full max-w-7 origin-bottom rounded-t-md ${
                day.isToday ? 'bg-accent shadow-[0_0_16px_-2px_var(--color-accent)]' : 'bg-secondary/40'
              }`}
              style={{ height: day.due ? `max(2px, calc(var(--bar-max) * ${day.due / max}))` : 0 }}
              initial={reduce ? false : { transform: 'scaleY(0)' }}
              animate={{ transform: 'scaleY(1)' }}
              transition={{ duration: 0.9, delay: 0.7 + i * 0.06, ease: EASE_CINEMA }}
            />
            <span className={`mt-1.5 text-[11px] ${day.isToday ? 'font-semibold text-text' : 'text-muted'}`}>
              {day.isToday ? 'Today' : weekdayShort(day.date)}
            </span>
          </li>
        ))}
      </ol>
      {dueToday > 0 && (
        <p className="mt-4 text-xs text-muted">
          Skip today and tomorrow has <span className="num text-text">{dueToday + upcoming[0].due}</span>.
        </p>
      )}
    </section>
  )
}

/* ——— Decks ——— */

function DecksPanel({ decks }) {
  const { landedDeckId, clearLanded } = useGame()
  const sectionRef = useRef(null)
  const rise = useRise(24)

  // A deck you just created flies here from the create screen (shared transition);
  // then the page glides down to it so you see it land.
  useEffect(() => {
    if (!landedDeckId) return
    const t = setTimeout(() => scrollToElement(sectionRef.current, -80), 650)
    const done = setTimeout(clearLanded, 3600)
    return () => {
      clearTimeout(t)
      clearTimeout(done)
    }
  }, [landedDeckId, clearLanded])

  return (
    <section ref={sectionRef} aria-labelledby="decks-heading" className="panel rounded-3xl p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 id="decks-heading" className="flex items-center gap-2 text-sm font-semibold">
          Your decks
          <span className="num rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-normal text-muted">{decks.length}</span>
        </h2>
        <Button as="a" href="#/new" variant="secondary" size="sm">
          <PlusIcon />
          New deck
        </Button>
      </div>

      {decks.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted">
          No decks yet. Upload your first lecture PDF to make one.
        </p>
      ) : (
        <motion.ul className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3" initial="hidden" animate="show" variants={stagger(0.06, 0.6)}>
          {decks.map((deck) => {
            // A card arriving through a shared transition is already in place: no entrance.
            const arriving = deck.id === lastOpenedDeck() || deck.id === landedDeckId
            return (
              <motion.li key={deck.id} variants={arriving ? undefined : rise} initial={arriving ? false : undefined}>
                <DeckCard deck={deck} landed={deck.id === landedDeckId} />
              </motion.li>
            )
          })}
        </motion.ul>
      )}
    </section>
  )
}

function DeckCard({ deck, landed }) {
  const reduce = useReducedMotion()
  const mastery = percent(deck.masteredCount, deck.cardCount)
  const isNew = !deck.lastStudiedAt && deck.createdAt && daysFromToday(deck.createdAt) > -3
  const studied = relativeDay(deck.lastStudiedAt)

  return (
    <TiltCard
      as="a"
      href={`#/deck/${deck.id}`}
      onClick={() => rememberOpenedDeck(deck.id)}
      glow="var(--deck)"
      style={{ ...deckStyle(deck), ...deckTransitionStyle(deck) }}
      className="vt-shared flex h-full flex-col overflow-hidden rounded-[20px] border border-border bg-surface/80 p-4 sm:p-5"
    >
      {/* The deck's own colour, as light falling on the card */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-12 size-48 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--deck)_30%,transparent),transparent)]"
      />
      {landed && !reduce && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_2px_var(--deck),0_0_40px_-4px_var(--deck)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.3, 1, 0] }}
          transition={{ duration: 2.4, delay: 0.9, ease: 'easeInOut' }}
        />
      )}
      <div className="relative flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-base font-semibold tracking-tight">{deck.title}</h3>
        {isNew && <span className="shrink-0 rounded-full bg-(--deck) px-2 py-0.5 text-[11px] font-semibold text-on-accent">New</span>}
      </div>
      <p className="relative truncate text-xs text-muted">
        {deck.course.code ? `${deck.course.code} · ` : ''}
        {deck.course.name}
      </p>

      <div className="relative mt-5">
        <p className="mb-1.5 flex justify-between text-xs">
          <span className="text-muted">Mastered</span>
          <CountUp value={mastery} format={pct} delay={0.7} className="num" />
        </p>
        <FillBar value={mastery / 100} colour="var(--deck)" glow delay={0.75} label={`${deck.title} mastery`} />
      </div>

      <p className="relative mt-4 flex justify-between gap-3 text-xs text-muted">
        <span>
          <span className="num text-text">{deck.cardCount}</span> {deck.cardCount === 1 ? 'card' : 'cards'}
          {deck.dueCount > 0 && (
            <>
              {' · '}
              <span className="num text-text">{deck.dueCount}</span> due
            </>
          )}
        </span>
        <span>{studied ? `Studied ${studied}` : 'Not studied yet'}</span>
      </p>
    </TiltCard>
  )
}

/* ——— Loading and error ——— */

function DashboardSkeleton() {
  const block = 'rounded-lg bg-border/80 animate-pulse'
  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-7 pb-16 sm:px-6 lg:pt-24" aria-busy="true" aria-label="Loading your dashboard">
      <div className={`${block} h-10 w-72`} />
      <div className={`${block} mt-3 h-5 w-96 max-w-full`} />
      <div className="mt-9 grid grid-cols-12 gap-3 sm:gap-4 lg:mt-12">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="panel col-span-6 h-[148px] rounded-3xl lg:col-span-3" />
        ))}
        <div className="panel col-span-12 h-[380px] rounded-3xl lg:col-span-9" />
        <div className="panel col-span-12 h-[380px] rounded-3xl lg:col-span-3" />
      </div>
    </div>
  )
}

function LoadError({ onRetry }) {
  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-7 pb-16 sm:px-6 lg:pt-24">
      <h1 className="text-[32px] font-semibold tracking-tight">Home</h1>
      <div className="panel mt-8 flex items-center gap-3 rounded-3xl p-5 text-sm">
        <AlertIcon className="size-5 shrink-0 text-error" />
        <p className="flex-1">Couldn’t load your decks and progress. Check your connection and try again.</p>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  )
}
