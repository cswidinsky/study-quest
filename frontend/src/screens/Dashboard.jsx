import { useGame } from '../state/game.js'
import { levelProgress } from '../lib/levels.js'
import {
  daysFromToday,
  formatNumber,
  greeting,
  longDate,
  percent,
  plural,
  relativeDay,
  weekdayLetter,
  weekdayShort,
} from '../lib/format.js'
import Button from '../components/Button.jsx'
import StreakFlame from '../components/StreakFlame.jsx'
import XpBar from '../components/XpBar.jsx'
import { AlertIcon, ArrowRightIcon, CalendarIcon, PlusIcon } from '../components/icons.jsx'

// The screen answers one question: "What should I study right now?"
// So "Due for review" is the biggest block and holds the main button.
//
// Grid: a centred 1,100px column, 12 columns of ~77px with 16px gaps
// (12 × 77 + 11 × 16 = 1,100). Rows split 3/3/3/3, then 9/3, then 12,
// so the edge between "Due" and "Coming up" lines up with the last tile.

const SECONDS_PER_CARD = 40
const MAX_DUE_ROWS = 4

export default function Dashboard() {
  const { status, data, reload, showToast } = useGame()

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
    <div className="mx-auto max-w-[1100px] px-4 pt-6 pb-16 sm:px-6 lg:pt-16">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
          {greeting()}, {user.firstName}
        </h1>
        <p className="mt-1.5 text-[15px] text-muted">
          {longDate()}. <Finding dueDecks={dueDecks} dueTotal={dueTotal} />
        </p>
      </header>

      <div className="mt-8 grid grid-cols-12 gap-3 sm:gap-4 lg:mt-12">
        <LevelTile xp={user.xp.total} />
        <StreakTile streak={user.streak} activity={activity} />
        <AccuracyTile activity={activity} />
        <ReviewedTile activity={activity} />

        <DuePanel dueDecks={dueDecks} dueTotal={dueTotal} onStart={startReview} upcoming={upcoming} />
        <ComingUp todayDate={activity[activity.length - 1].date} dueToday={dueTotal} upcoming={upcoming} />

        <DecksPanel decks={decks} />
      </div>
    </div>
  )
}

// Decks with an exam first (soonest first), then the rest.
const examOrder = (deck) => (deck.exam ? daysFromToday(deck.exam.at) : Infinity)

// The one line that matters most today, written from the data.
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
          , <span className="num">{top.dueCount}</span> of them {top.course.name}. Your{' '}
          {top.exam.label.toLowerCase()} is {relativeDay(top.exam.at)}.
        </>
      ) : (
        <>.</>
      )}
    </>
  )
}

/* ——— Tiles ——— */

function Tile({ label, children, aside }) {
  return (
    <section className="col-span-6 flex min-h-[128px] flex-col rounded-2xl bg-background p-4 lg:col-span-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm text-muted">{label}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Figure({ children, unit }) {
  return (
    <p className="mt-2 flex items-baseline gap-1">
      <span className="num text-[28px] leading-none">{children}</span>
      {unit && <span className="text-sm text-muted">{unit}</span>}
    </p>
  )
}

function LevelTile({ xp }) {
  const level = levelProgress(xp)
  return (
    <Tile label="Level">
      <Figure>{level.level}</Figure>
      <div className="mt-auto pt-4">
        <XpBar value={level.inLevel} max={level.span} level={level.level} height="h-1.5" />
        <p className="mt-1.5 flex justify-between gap-2 text-xs text-muted">
          <span className="num">
            {formatNumber(level.inLevel)}/{formatNumber(level.span)}
          </span>
          <span>
            <span className="num">{level.toNext}</span> XP to <span className="num">{level.level + 1}</span>
          </span>
        </p>
      </div>
    </Tile>
  )
}

function StreakTile({ streak, activity }) {
  // Past six days from activity, today from the streak (it can light without reviews).
  const days = activity.map((day, i) => ({
    date: day.date,
    isToday: i === activity.length - 1,
    studied: i === activity.length - 1 ? streak.studiedToday : day.answered > 0,
  }))

  return (
    <Tile
      label="Streak"
      aside={
        <span className="text-xs text-muted">
          Best <span className="num">{streak.longest}</span>
        </span>
      }
    >
      <p className="mt-2 flex items-center gap-1.5">
        <StreakFlame lit={streak.studiedToday} className="size-6" label={streak.studiedToday ? 'Lit today' : 'Not lit today'} />
        <span className="num text-[28px] leading-none">{streak.current}</span>
        <span className="text-sm text-muted">days</span>
      </p>
      <ol className="mt-auto flex justify-between pt-3" aria-label="Last 7 days">
        {days.map((day) => (
          <li key={day.date} className="flex flex-col items-center gap-1">
            <span className={`text-[11px] ${day.isToday ? 'font-semibold text-text' : 'text-muted'}`}>
              {weekdayLetter(day.date)}
            </span>
            <span
              className={`size-2.5 rounded-full ${
                day.studied
                  ? 'bg-accent'
                  : day.isToday
                    ? 'border-[1.5px] border-dashed border-muted'
                    : 'bg-border'
              }`}
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
  return (
    <Tile label="Accuracy">
      <Figure unit="%">{answered ? percent(correct, answered) : '—'}</Figure>
      <p className="mt-auto pt-3 text-xs text-muted">
        <span className="num">{formatNumber(correct)}</span> of <span className="num">{formatNumber(answered)}</span>{' '}
        right, last 7 days
      </p>
    </Tile>
  )
}

function ReviewedTile({ activity }) {
  const answered = activity.reduce((s, d) => s + d.answered, 0)
  const best = activity.reduce((a, b) => (b.answered > a.answered ? b : a), activity[0])
  return (
    <Tile label="Cards reviewed">
      <Figure>{formatNumber(answered)}</Figure>
      <p className="mt-auto pt-3 text-xs text-muted">
        Last 7 days. Best: <span className="num">{best.answered}</span> on {weekdayShort(best.date)}
      </p>
    </Tile>
  )
}

/* ——— Due for review ——— */

function DuePanel({ dueDecks, dueTotal, onStart, upcoming }) {
  const minutes = Math.max(1, Math.round((dueTotal * SECONDS_PER_CARD) / 60))
  const shown = dueDecks.slice(0, MAX_DUE_ROWS)
  const hidden = dueDecks.length - shown.length

  return (
    <section
      aria-labelledby="due-heading"
      className="col-span-12 flex flex-col rounded-2xl bg-background p-4 sm:p-5 lg:col-span-9"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h2 id="due-heading" className="text-sm font-semibold">
            Due for review
          </h2>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="num text-[40px] leading-none">{dueTotal}</span>
            <span className="text-[15px] text-muted">
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
        <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted">
          You’re all caught up. <span className="num">{upcoming[0].due}</span> cards come due tomorrow.
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {shown.map((deck) => (
            <DueRow key={deck.id} deck={deck} />
          ))}
          {hidden > 0 && (
            <li className="px-1 pt-1 text-sm text-muted">
              And {plural(hidden, 'more deck')} with cards due.
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

function DueRow({ deck }) {
  const examIn = deck.exam ? daysFromToday(deck.exam.at) : null
  return (
    <li className="flex min-h-[63px] items-center gap-4 rounded-xl border border-border bg-surface px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{deck.title}</p>
        <p className="truncate text-xs text-muted">
          {deck.course.code} · {deck.course.name}
        </p>
        {examIn !== null && examIn >= 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-xs sm:hidden">
            <CalendarIcon className="size-3.5 text-muted" />
            {deck.exam.label} {relativeDay(deck.exam.at)}
          </p>
        )}
      </div>
      {examIn !== null && examIn >= 0 && (
        <p className="hidden items-center gap-1.5 text-xs sm:flex">
          <CalendarIcon className="size-3.5 text-muted" />
          {deck.exam.label} {relativeDay(deck.exam.at)}
        </p>
      )}
      <p className="w-14 shrink-0 text-right">
        <span className="num text-base">{deck.dueCount}</span>
        <span className="text-xs text-muted"> due</span>
      </p>
    </li>
  )
}

/* ——— Coming up: cards due per day ——— */

// Bars are taller on desktop so the chart fills the card beside "Due for review".
const BAR_AREA = '[--bar-max:112px] lg:[--bar-max:220px]'

function ComingUp({ todayDate, dueToday, upcoming }) {
  const days = [{ date: todayDate, due: dueToday, isToday: true }, ...upcoming]
  const max = Math.max(...days.map((d) => d.due), 1)
  const tomorrow = upcoming[0]

  return (
    <section
      aria-labelledby="coming-heading"
      className="col-span-12 flex flex-col rounded-2xl bg-background p-4 sm:p-5 lg:col-span-3"
    >
      <h2 id="coming-heading" className="text-sm font-semibold">
        Coming up
      </h2>
      <p className="mt-0.5 text-xs text-muted">Cards due each day</p>

      <ol className={`mt-auto flex items-end gap-1.5 pt-6 ${BAR_AREA}`} aria-label="Cards due over the next 7 days">
        {days.map((day) => (
          <li key={day.date} className="flex min-w-0 flex-1 flex-col items-center">
            <span className={`num mb-1 text-[11px] ${day.isToday ? 'text-text' : 'text-muted'}`}>{day.due}</span>
            <span
              className={`w-full max-w-7 rounded-t-[4px] ${day.isToday ? 'bg-accent' : 'bg-muted/35'}`}
              style={{ height: day.due ? `max(2px, calc(var(--bar-max) * ${day.due / max}))` : 0 }}
            />
            <span
              className={`mt-1.5 text-[11px] ${day.isToday ? 'font-semibold text-text' : 'text-muted'}`}
            >
              {day.isToday ? 'Today' : weekdayShort(day.date)}
            </span>
          </li>
        ))}
      </ol>

      {dueToday > 0 && (
        <p className="mt-4 text-xs text-muted">
          Skip today and tomorrow has <span className="num text-text">{dueToday + tomorrow.due}</span>.
        </p>
      )}
    </section>
  )
}

/* ——— Decks ——— */

function DecksPanel({ decks }) {
  return (
    <section aria-labelledby="decks-heading" className="col-span-12 rounded-2xl bg-background p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 id="decks-heading" className="flex items-center gap-2 text-sm font-semibold">
          Your decks
          <span className="num rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-normal text-muted">
            {decks.length}
          </span>
        </h2>
        <Button as="a" href="#/new" variant="secondary" size="sm">
          <PlusIcon />
          New deck
        </Button>
      </div>

      {decks.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted">
          No decks yet. Upload your first lecture PDF to make one.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </ul>
      )}
    </section>
  )
}

function DeckCard({ deck }) {
  const mastery = percent(deck.masteredCount, deck.cardCount)
  const isNew = !deck.lastStudiedAt && deck.createdAt
  const studied = relativeDay(deck.lastStudiedAt)

  return (
    <li className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-[15px] font-medium">{deck.title}</h3>
        {isNew && (
          <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium">New</span>
        )}
      </div>
      <p className="truncate text-xs text-muted">
        {deck.course.code ? `${deck.course.code} · ` : ''}
        {deck.course.name}
      </p>

      <div className="mt-4">
        <p className="mb-1.5 flex justify-between text-xs">
          <span className="text-muted">Mastered</span>
          <span className="num">{mastery}%</span>
        </p>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-label={`${deck.title} mastery`}
          aria-valuenow={mastery}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-text" style={{ width: `${mastery}%` }} />
        </div>
      </div>

      <p className="mt-3 flex justify-between gap-3 text-xs text-muted">
        <span>
          <span className="num text-text">{deck.cardCount}</span> cards
          {deck.dueCount > 0 && (
            <>
              {' · '}
              <span className="num text-text">{deck.dueCount}</span> due
            </>
          )}
        </span>
        <span>{studied ? `Studied ${studied}` : 'Not studied yet'}</span>
      </p>
    </li>
  )
}

/* ——— Loading and error ——— */

// Same layout as the real screen, with flat grey blocks where values will go.
function DashboardSkeleton() {
  const block = 'rounded-md bg-border/70'
  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-6 pb-16 sm:px-6 lg:pt-16" aria-busy="true" aria-label="Loading your dashboard">
      <div className={`${block} h-8 w-64`} />
      <div className={`${block} mt-3 h-4 w-96 max-w-full`} />
      <div className="mt-8 grid grid-cols-12 gap-3 sm:gap-4 lg:mt-12">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="col-span-6 h-[128px] rounded-2xl bg-background p-4 lg:col-span-3">
            <div className={`${block} h-3.5 w-16`} />
            <div className={`${block} mt-3 h-7 w-12`} />
          </div>
        ))}
        <div className="col-span-12 h-[360px] rounded-2xl bg-background lg:col-span-9" />
        <div className="col-span-12 h-[360px] rounded-2xl bg-background lg:col-span-3" />
      </div>
    </div>
  )
}

function LoadError({ onRetry }) {
  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-6 pb-16 sm:px-6 lg:pt-16">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Home</h1>
      <div className="mt-8 flex items-center gap-3 rounded-2xl bg-background p-5 text-sm">
        <AlertIcon className="size-5 shrink-0 text-error" />
        <p className="flex-1">Couldn’t load your decks and progress. Check your connection and try again.</p>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  )
}
