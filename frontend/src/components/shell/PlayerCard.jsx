import { useGame } from '../../state/game.js'
import { levelProgress } from '../../lib/levels.js'
import { formatNumber } from '../../lib/format.js'

// Who you are: name, level and total XP. (The live XP bar lives in the HUD.)
export default function PlayerCard() {
  const { data } = useGame()
  if (!data) return <div className="h-14 rounded-2xl bg-border/40" />

  const { user } = data
  const level = levelProgress(user.xp.total)

  return (
    <div className="flex items-center gap-2.5 rounded-2xl p-2">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--color-accent),var(--color-sun))] text-sm font-semibold text-on-accent"
        aria-hidden="true"
      >
        {user.firstName[0]}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-medium">
          {user.firstName} {user.lastName}
        </p>
        <p className="truncate text-xs text-muted">
          Level <span className="num">{level.level}</span> · <span className="num">{formatNumber(user.xp.total)}</span> XP
        </p>
      </div>
    </div>
  )
}
