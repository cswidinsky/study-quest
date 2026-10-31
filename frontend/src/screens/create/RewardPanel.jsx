import { useGame } from '../../state/game.js'
import { XP_REWARDS, levelProgress } from '../../lib/levels.js'
import { formatNumber } from '../../lib/format.js'
import StreakFlame from '../../components/StreakFlame.jsx'
import XpBar from '../../components/XpBar.jsx'

// Beside the form: what this deck is worth to you right now.
export default function RewardPanel() {
  const { data } = useGame()
  if (!data) return null

  const { xp, streak } = data.user
  const reward = XP_REWARDS.deckCreated
  const now = levelProgress(xp.total)
  const crosses = reward >= now.toNext

  return (
    <div className="space-y-3 sm:space-y-4">
      <section aria-labelledby="reward-heading" className="rounded-2xl bg-background p-4 sm:p-5">
        <h2 id="reward-heading" className="text-sm font-semibold">
          What you’ll earn
        </h2>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="num text-[28px] leading-none">+{reward}</span>
          <span className="text-sm text-muted">XP for a new deck</span>
        </p>

        <div className="mt-5">
          <p className="mb-1.5 flex justify-between text-xs text-muted">
            <span>
              Level <span className="num">{now.level}</span>
            </span>
            <span className="num">
              {formatNumber(now.inLevel)}/{formatNumber(now.span)}
            </span>
          </p>
          <XpBar value={now.inLevel} max={now.span} level={now.level} height="h-1.5" />
        </div>
        <p className="mt-3 text-sm">
          {crosses ? (
            <>
              This deck takes you to <span className="font-semibold">level <span className="num">{now.level + 1}</span></span>.
            </>
          ) : (
            <>
              <span className="num">{now.toNext - reward}</span> XP to level <span className="num">{now.level + 1}</span>{' '}
              after this.
            </>
          )}
        </p>

        <p className="mt-4 flex items-start gap-2.5 text-sm">
          <StreakFlame lit={streak.studiedToday} className="mt-px size-[18px]" />
          {streak.studiedToday ? (
            <span>
              Today’s flame is lit. <span className="num">{streak.current}</span>-day streak.
            </span>
          ) : (
            <span>
              It also lights today’s flame:{' '}
              <span className="num">
                {streak.current} → {streak.current + 1}
              </span>{' '}
              days.
            </span>
          )}
        </p>
      </section>

      <section aria-labelledby="tips-heading" className="rounded-2xl bg-background p-4 sm:p-5">
        <h2 id="tips-heading" className="text-sm font-semibold">
          Uploads that work best
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>One lecture or chapter per deck, so reviews stay focused.</li>
          <li>Slides exported as PDF, not photos of slides.</li>
          <li>Notes with headings: they become the topics questions are grouped by.</li>
        </ul>
      </section>
    </div>
  )
}
