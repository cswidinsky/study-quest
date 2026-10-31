import { useGame } from '../../state/game.js'
import { levelProgress } from '../../lib/levels.js'
import { formatNumber } from '../../lib/format.js'
import StreakFlame from '../StreakFlame.jsx'
import XpBar from '../XpBar.jsx'

// Who you are and where you stand: streak, level, XP. Lives in the sidebar
// and in the phone menu, so it's visible from every screen.
export default function PlayerCard() {
  const { data } = useGame()
  if (!data) return <div className="h-[132px] rounded-2xl bg-border/40" />

  const { user } = data
  const level = levelProgress(user.xp.total)
  const { streak } = user

  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <div className="flex items-center gap-2.5">
        <span
          className="grid size-8 place-items-center rounded-full bg-accent-soft text-sm font-semibold"
          aria-hidden="true"
        >
          {user.firstName[0]}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-medium">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-muted">
            Level <span className="num">{level.level}</span>
          </p>
        </div>
      </div>

      <div className="mt-3.5">
        <XpBar value={level.inLevel} max={level.span} level={level.level} height="h-1.5" />
        <p className="mt-1.5 flex justify-between text-xs text-muted">
          <span className="num">
            {formatNumber(level.inLevel)}/{formatNumber(level.span)} XP
          </span>
          <span>
            <span className="num">{level.toNext}</span> to go
          </span>
        </p>
      </div>

      <div className="mt-3 flex items-start gap-2">
        <StreakFlame lit={streak.studiedToday} className="mt-px size-[18px]" />
        <div className="leading-tight">
          <p className="text-sm">
            <span className="num font-medium">{streak.current}</span>-day streak
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {streak.studiedToday ? 'Lit for today' : 'Study today to keep it'}
          </p>
        </div>
      </div>
    </div>
  )
}
