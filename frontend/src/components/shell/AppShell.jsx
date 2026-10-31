import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useGame } from '../../state/game.js'
import ThemeToggle from '../ThemeToggle.jsx'
import StreakFlame from '../StreakFlame.jsx'
import { CloseIcon, MenuIcon } from '../icons.jsx'
import Logo from './Logo.jsx'
import PlayerCard from './PlayerCard.jsx'
import { NAV_ITEMS } from './nav.js'

// Desktop (lg, 1024px+): a 228px sidebar on the tinted ground, and the page on a
// white "sheet" inset 8px from the window's top, right and bottom edges.
// Phone and tablet: a top bar with the streak and a menu button; the sheet fills the screen.

export default function AppShell({ path, children }) {
  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar path={path} />
      <MobileBar path={path} />
      <main className="min-w-0 flex-1 lg:py-2 lg:pr-2">
        <div className="min-h-[calc(100dvh-3.5rem)] bg-surface lg:min-h-[calc(100dvh-1rem)] lg:rounded-[20px] lg:border lg:border-border">
          {children}
        </div>
      </main>
    </div>
  )
}

function NavLinks({ path, onNavigate, large = false }) {
  return (
    <nav aria-label="Main">
      <ul className="space-y-0.5">
        {NAV_ITEMS.map(({ path: to, label, Icon }) => {
          const active = path === to
          return (
            <li key={to}>
              <a
                href={`#${to}`}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-xl px-3 transition-[background-color,color] duration-150 ease-out ${
                  large ? 'h-12 text-base' : 'h-9 text-sm'
                } ${active ? 'bg-border/70 font-medium text-text' : 'text-muted hover:bg-border/40 hover:text-text'}`}
              >
                <Icon className={large ? 'size-5' : 'size-4'} />
                {label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function Sidebar({ path }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[228px] shrink-0 flex-col px-3 pt-4 pb-3 lg:flex">
      <div className="px-2 pb-6">
        <Logo />
      </div>
      <NavLinks path={path} />
      <div className="mt-auto space-y-3">
        <PlayerCard />
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}

function MobileBar({ path }) {
  const { data } = useGame()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const streak = data?.user.streak

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-background px-4 lg:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          {streak && (
            <span className="flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm" title="Daily streak">
              <StreakFlame lit={streak.studiedToday} className="size-[18px]" />
              <span className="num font-medium">{streak.current}</span>
              <span className="sr-only">-day streak</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="grid size-11 place-items-center rounded-full text-text transition-[background-color,scale] duration-150 ease-out hover:bg-border/50 active:scale-[0.94]"
          >
            <MenuIcon className="size-5" />
          </button>
        </div>
      </header>
      <AnimatePresence>{open && <MenuSheet path={path} onClose={close} />}</AnimatePresence>
    </>
  )
}

// Phone menu: a sheet that slides up from the bottom (thumb reach).
function MenuSheet({ path, onClose }) {
  const reduceMotion = useReducedMotion()
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <motion.div
        className="absolute inset-0 bg-background/75"
        onClick={onClose}
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-border bg-background px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgb(0_0_0/0.12)]"
        initial={reduceMotion ? { opacity: 0 } : { transform: 'translateY(100%)' }}
        animate={reduceMotion ? { opacity: 1 } : { transform: 'translateY(0%)' }}
        exit={reduceMotion ? { opacity: 0 } : { transform: 'translateY(100%)', transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] } }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
        <div className="flex items-center justify-between pb-3">
          <span className="text-sm text-muted">Menu</span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid size-11 place-items-center rounded-full transition-[background-color,scale] duration-150 ease-out hover:bg-border/50 active:scale-[0.94]"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
        <NavLinks path={path} onNavigate={onClose} large />
        <div className="mt-4 space-y-3">
          <PlayerCard />
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-muted">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
