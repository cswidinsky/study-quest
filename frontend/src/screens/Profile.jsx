import { useId, useState } from 'react'
import { motion } from 'motion/react'
import { useGame } from '../state/game.js'
import { levelProgress } from '../lib/levels.js'
import { formatNumber, plural } from '../lib/format.js'
import { deckStyle } from '../lib/deck.js'
import { stagger, useRise } from '../lib/motion.js'
import Button from '../components/Button.jsx'
import CountUp from '../components/CountUp.jsx'
import LevelBadge from '../components/LevelBadge.jsx'
import StreakFlame from '../components/StreakFlame.jsx'
import XpBar from '../components/XpBar.jsx'
import { Field, TextInput } from '../components/Field.jsx'
import { ArrowRightIcon } from '../components/icons.jsx'

// You: name, level, records, and the courses you're studying.
export default function Profile() {
  const { data, updateProfile, showToast } = useGame()
  const rise = useRise()
  const id = useId()
  const [first, setFirst] = useState(data?.user.firstName ?? '')
  const [last, setLast] = useState(data?.user.lastName ?? '')
  if (!data) return null

  const { user, decks } = data
  const level = levelProgress(user.xp.total)
  const since = user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'this month'
  const courses = [...decks.reduce((m, d) => m.set(d.course.name, [...(m.get(d.course.name) ?? []), d]), new Map())]
  const changed = first.trim() !== user.firstName || last.trim() !== user.lastName
  const totalCards = decks.reduce((s, d) => s + d.cardCount, 0)
  const mastered = decks.reduce((s, d) => s + d.masteredCount, 0)

  function save(e) {
    e.preventDefault()
    if (!first.trim()) return
    updateProfile({ firstName: first.trim(), lastName: last.trim() })
    showToast({ kind: 'info', message: 'Name saved.' })
  }

  return (
    <motion.div className="mx-auto max-w-[1100px] px-4 pt-7 pb-24 sm:px-6 lg:pt-24" initial="hidden" animate="show" variants={stagger(0.07, 0.05)}>
      <motion.header variants={rise} className="flex flex-wrap items-center gap-5">
        <span className="grid size-20 place-items-center rounded-full bg-[linear-gradient(135deg,var(--color-accent),var(--color-sun))] text-3xl font-semibold text-on-accent shadow-[0_12px_40px_-10px_var(--color-accent)]">
          {user.firstName[0]}
        </span>
        <div>
          <h1 className="text-[32px] leading-tight font-semibold tracking-tight sm:text-[44px]">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-base text-muted">Studying with StudyQuest since {since}</p>
        </div>
      </motion.header>

      <div className="mt-9 grid grid-cols-12 gap-3 sm:gap-4 lg:mt-12">
        <motion.section variants={rise} className="panel col-span-12 rounded-3xl p-4 sm:p-6 lg:col-span-7" aria-labelledby="level-heading">
          <div className="flex items-center gap-4">
            <LevelBadge level={level.level} size="size-14 text-2xl" />
            <div className="flex-1">
              <h2 id="level-heading" className="text-sm text-muted">
                Level
              </h2>
              <p className="text-xl font-semibold">
                Level <span className="num">{level.level}</span>
              </p>
            </div>
            <p className="num text-right text-sm text-muted">
              <span className="text-text">{formatNumber(level.inLevel)}</span>/{formatNumber(level.span)} XP
            </p>
          </div>
          <div className="mt-5">
            <XpBar value={level.inLevel} max={level.span} level={level.level} height="h-3" />
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Record label="Total XP">
              <CountUp value={user.xp.total} className="num text-2xl" />
            </Record>
            <Record label="Streak">
              <span className="flex items-center gap-1">
                <StreakFlame lit={user.streak.studiedToday} className="size-5" />
                <span className="num text-2xl">{user.streak.current}</span>
              </span>
            </Record>
            <Record label="Best streak">
              <span className="num text-2xl">{user.streak.longest}</span>
            </Record>
            <Record label="Mastered">
              <span className="num text-2xl">{mastered}</span>
              <span className="text-sm text-muted">/{totalCards}</span>
            </Record>
          </dl>
        </motion.section>

        <motion.form variants={rise} onSubmit={save} className="panel col-span-12 rounded-3xl p-4 sm:p-6 lg:col-span-5" aria-labelledby="name-heading">
          <h2 id="name-heading" className="text-sm font-semibold">
            Your name
          </h2>
          <p className="mt-0.5 text-xs text-muted">Shown on your dashboard greeting.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="First name" htmlFor={`${id}-first`}>
              <TextInput id={`${id}-first`} value={first} onChange={(e) => setFirst(e.target.value)} required autoComplete="given-name" />
            </Field>
            <Field label="Last name" htmlFor={`${id}-last`}>
              <TextInput id={`${id}-last`} value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" />
            </Field>
          </div>
          <Button type="submit" className="mt-5" disabled={!changed || !first.trim()}>
            Save name
          </Button>
        </motion.form>

        <motion.section variants={rise} className="panel col-span-12 rounded-3xl p-4 sm:p-6" aria-labelledby="courses-heading">
          <h2 id="courses-heading" className="text-sm font-semibold">
            Your courses
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map(([name, list]) => (
              <li key={name}>
                <a
                  href={`#/deck/${list[0].id}`}
                  style={deckStyle(list[0])}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-surface/70 p-3.5 transition-[border-color,scale] duration-200 hover:border-(--deck)/60 active:scale-[0.99]"
                >
                  <span className="size-3 shrink-0 rounded-full bg-(--deck) shadow-[0_0_10px_var(--deck)]" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{name}</span>
                    <span className="block truncate text-xs text-muted">
                      {list[0].course.code ? `${list[0].course.code} · ` : ''}
                      {plural(list.length, 'deck')}
                    </span>
                  </span>
                  <ArrowRightIcon className="size-4 text-muted transition-[translate] duration-200 group-hover:translate-x-0.5" />
                </a>
              </li>
            ))}
          </ul>
        </motion.section>
      </div>
    </motion.div>
  )
}

function Record({ label, children }) {
  return (
    <div className="rounded-2xl bg-background/60 p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1.5 flex items-baseline">{children}</dd>
    </div>
  )
}
