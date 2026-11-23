import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useGame } from '../../state/game.js'
import { levelProgress } from '../../lib/levels.js'
import { lockScroll } from '../../lib/smoothScroll.js'
import ThemeToggle from '../ThemeToggle.jsx'
import StreakFlame from '../StreakFlame.jsx'
import XpBar from '../XpBar.jsx'
import CountUp from '../CountUp.jsx'
import LevelBadge from '../LevelBadge.jsx'
import { CloseIcon, MenuIcon } from '../icons.jsx'
import Logo from './Logo.jsx'
import PlayerCard from './PlayerCard.jsx'
import DemoBadge from './DemoBadge.jsx'
import { NAV_ITEMS } from './nav.js'

// Desktop (1024px+): a floating sidebar and an XP HUD pinned to the top right.
// Phone/tablet: a top bar with streak, level and XP, and a springy menu sheet.
// The sidebar, HUD and top bar have view-transition names (vt-*), so they stay
// perfectly still while screens change underneath them.
// Everything sits on a "stage" that pulls back like a camera during level-up.

// `focus`: the quiz gets the whole stage (no sidebar, HUD or phone bar).
export default function AppShell({ active, focus = false, children }) {
  if (focus) {
    return (
      <div className="stage min-h-dvh">
        <main className="relative">{children}</main>
        <DemoBadge className="fixed bottom-4 left-4 z-30 hidden lg:inline-flex" />
      </div>
    )
  }
  return (
    <div className="stage min-h-dvh lg:flex">
      <Sidebar active={active} />
      <MobileBar active={active} />
      <main className="relative min-w-0 flex-1">
        <Hud />
        {children}
      </main>
    </div>
  )
}

function NavLinks({ active, onNavigate, large = false, pillId }) {
  const { data } = useGame()
  const due = data ? data.decks.reduce((s, d) => s + d.dueCount, 0) : 0
  return (
    <nav aria-label="Main">
      <ul className="space-y-1">
        {NAV_ITEMS.map(({ name, path, label, Icon, badge }) => {
          const current = active === name
          const count = badge === 'due' ? due : 0
          return (
            <li key={path}>
              <a
                href={`#${path}`}
                onClick={onNavigate}
                aria-current={current ? 'page' : undefined}
                className={`relative flex items-center gap-3 rounded-xl px-3 transition-[color,scale] duration-150 ease-out active:scale-[0.98] ${
                  large ? 'h-13 text-base' : 'h-10 text-sm'
                } ${current ? 'font-medium text-text' : 'text-muted hover:text-text'}`}
              >
                {/* One pill that slides between items */}
                {current && (
                  <motion.span
                    layoutId={pillId}
                    className="absolute inset-0 rounded-xl bg-surface shadow-[var(--panel-edge),0_6px_20px_-12px_rgb(0_0_0/0.4)]"
                    transition={{ type: 'spring', duration: 0.5, bounce: 0.22 }}
                  />
                )}
                <Icon className={`relative ${large ? 'size-5' : 'size-4'} ${current ? 'text-accent' : ''}`} />
                <span className="relative">{label}</span>
                {count > 0 && (
                  <span className="num relative ml-auto rounded-full bg-accent px-1.5 text-xs leading-5 font-semibold text-on-accent" aria-label={`${count} due`}>
                    {count}
                  </span>
                )}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function Sidebar({ active }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 p-3 lg:block">
      <div className="vt-sidebar panel flex h-full flex-col rounded-3xl px-3 pt-5 pb-3">
        <div className="flex items-center justify-between pb-6 pl-2">
          <Logo />
          <ThemeToggle />
        </div>
        <DemoBadge className="mb-4 ml-2 self-start" />
        <NavLinks active={active} pillId="nav-pill-desktop" />
        <div className="mt-auto">
          <PlayerCard />
        </div>
      </div>
    </aside>
  )
}

// The XP HUD: streak, level and XP bar, always in the same place on every screen.
function Hud() {
  const { data } = useGame()
  if (!data) return null
  const { user } = data
  const level = levelProgress(user.xp.total)

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 hidden justify-end px-6 lg:flex">
      <div className="vt-hud panel pointer-events-auto relative flex h-12 items-center gap-4 rounded-full pr-5 pl-2 shadow-[var(--panel-edge),var(--shadow-float)]">
        <span className="flex items-center gap-1.5 pl-2 text-sm" title="Daily streak">
          <StreakFlame lit={user.streak.studiedToday} className="size-[18px]" />
          <CountUp value={user.streak.current} className="num font-medium" />
          <span className="sr-only">-day streak</span>
        </span>
        <span className="h-5 w-px bg-border" aria-hidden="true" />
        <LevelBadge level={level.level} />
        <div className="w-44">
          <XpBar value={level.inLevel} max={level.span} level={level.level} height="h-2" />
        </div>
        <span className="num w-[88px] text-right text-xs text-muted">
          <CountUp value={level.inLevel} className="text-text" />/{level.span} XP
        </span>
        <XpGainChip total={user.xp.total} />
      </div>
    </div>
  )
}

// "+50 XP" pops out under the HUD whenever XP goes up.
function XpGainChip({ total }) {
  const last = useRef(total)
  const [gain, setGain] = useState(null)

  useEffect(() => {
    if (total > last.current) setGain({ id: total, amount: total - last.current })
    last.current = total
  }, [total])

  useEffect(() => {
    if (!gain) return
    const t = setTimeout(() => setGain(null), 1600)
    return () => clearTimeout(t)
  }, [gain])

  return (
    <AnimatePresence>
      {gain && (
        <motion.span
          key={gain.id}
          aria-hidden="true"
          className="num pointer-events-none absolute -bottom-8 right-6 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-on-accent glow-accent"
          initial={{ opacity: 0, transform: 'translateY(-8px) scale(0.7)' }}
          animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
          exit={{ opacity: 0, transform: 'translateY(10px) scale(0.9)' }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.45 }}
        >
          +{gain.amount} XP
        </motion.span>
      )}
    </AnimatePresence>
  )
}

function MobileBar({ active }) {
  const { data } = useGame()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const user = data?.user
  const level = user ? levelProgress(user.xp.total) : null

  return (
    <>
      <header className="vt-mobilebar sticky top-0 z-30 border-b border-border bg-background/95 lg:hidden">
        <div className="flex h-14 items-center justify-between pr-2 pl-4">
          <div className="flex min-w-0 items-center gap-2">
            <Logo className="h-6" />
            <DemoBadge short />
          </div>
          <div className="flex items-center gap-0.5">
            {user && (
              <>
                <span className="flex h-9 items-center gap-1.5 px-2 text-sm" title="Daily streak">
                  <StreakFlame lit={user.streak.studiedToday} className="size-[18px]" />
                  <span className="num font-medium">{user.streak.current}</span>
                  <span className="sr-only">-day streak</span>
                </span>
                <LevelBadge level={level.level} size="size-7 text-xs" />
              </>
            )}
            <ThemeToggle className="ml-1" />
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="grid size-10 place-items-center rounded-full text-text transition-[background-color,scale] duration-150 ease-out hover:bg-border/60 active:scale-[0.92]"
            >
              <MenuIcon className="size-5" />
            </button>
          </div>
        </div>
        {level && (
          <div className="px-4 pb-2">
            <XpBar value={level.inLevel} max={level.span} level={level.level} height="h-1" glow={false} />
          </div>
        )}
      </header>
      <AnimatePresence>{open && <MenuSheet active={active} onClose={close} />}</AnimatePresence>
    </>
  )
}

// Phone menu: springs up from the bottom; its contents follow one after another.
function MenuSheet({ active, onClose }) {
  const reduce = useReducedMotion()
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    lockScroll(true)
    return () => {
      window.removeEventListener('keydown', onKey)
      lockScroll(false)
    }
  }, [onClose])

  const item = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(16px)' },
    show: { opacity: 1, transform: 'translateY(0px)', transition: { type: 'spring', duration: 0.6, bounce: 0.3 } },
  }

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <motion.div
        className="absolute inset-0 bg-background/70"
        onClick={onClose}
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="absolute inset-x-2 bottom-2 rounded-[28px] border border-border bg-surface px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-float)]"
        initial={reduce ? { opacity: 0 } : { transform: 'translateY(110%)' }}
        animate={reduce ? { opacity: 1 } : { transform: 'translateY(0%)' }}
        exit={reduce ? { opacity: 0 } : { transform: 'translateY(110%)', transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.28 }}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } } }}>
          <motion.div variants={item} className="flex items-center justify-between pb-2">
            <span className="text-sm text-muted">Menu</span>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="grid size-11 place-items-center rounded-full transition-[background-color,scale] duration-150 ease-out hover:bg-border/60 active:scale-[0.92]"
            >
              <CloseIcon className="size-5" />
            </button>
          </motion.div>
          <motion.div variants={item}>
            <NavLinks active={active} onNavigate={onClose} large pillId="nav-pill-mobile" />
          </motion.div>
          <motion.div variants={item} className="mt-4">
            <PlayerCard />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}
