import { useGame } from '../../state/game.js'
import { useAuth } from '../../state/auth.js'
import { levelProgress } from '../../lib/levels.js'
import { formatNumber } from '../../lib/format.js'
import { LogOutIcon } from '../icons.jsx'

// Who you are: name, level and total XP, and the log-out button. (The live XP bar lives in the HUD.)
export default function PlayerCard() {
  const { data } = useGame()
  const { signOut } = useAuth()
  if (!data) return <div className="h-14 rounded-2xl bg-border/40" />

  const { user } = data
  const level = levelProgress(user.xp.total)

  return (
    <div className="flex items-center gap-2.5 rounded-2xl p-2">
      <a href="#/profile" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--color-accent),var(--color-sun))] text-sm font-semibold text-on-accent"
          aria-hidden="true"
        >
          {user.firstName[0]?.toUpperCase()}
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-medium">
            {user.firstName} {user.lastName}
          </span>
          <span className="block truncate text-xs text-muted">
            <span className="sr-only">Level</span>
            <span aria-hidden="true">Lv</span> <span className="num">{level.level}</span> · <span className="num">{formatNumber(user.xp.total)}</span> XP
          </span>
        </span>
      </a>
      <button
        type="button"
        onClick={signOut}
        aria-label="Log out"
        title="Log out"
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-[background-color,color,scale] duration-150 ease-out hover:bg-border/60 hover:text-text active:scale-[0.92]"
      >
        <LogOutIcon className="size-[18px]" />
      </button>
    </div>
  )
}
