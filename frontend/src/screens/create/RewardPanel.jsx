import { useGame } from '../../state/game.js'
import { XP_RULES, levelProgress } from '../../lib/levels.js'
import { formatNumber } from '../../lib/format.js'
import StreakFlame from '../../components/StreakFlame.jsx'
import XpBar from '../../components/XpBar.jsx'

// Beside the form: how a deck turns into XP (learning it, not making it).
export default function RewardPanel() {
  const { data } = useGame()
  if (!data) return null

  const { xp, streak } = data.user
  const now = levelProgress(xp.total)
  const { easy, medium, hard } = XP_RULES.baseByDifficulty

  return (
    <div className="space-y-3 sm:space-y-4">
      <section aria-labelledby="reward-heading" className="panel rounded-3xl p-4 sm:p-6">
        <h2 id="reward-heading" className="text-sm font-semibold">
          How a deck earns XP
        </h2>
        <p className="mt-2 text-sm text-muted">Making a deck is free. Learning it is what pays:</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li className="flex justify-between gap-3">
            <span>Each new card you get right</span>
            <span className="num shrink-0">
              {easy}–{hard} XP
            </span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Remembering it weeks later</span>
            <span className="num shrink-0">up to ×2</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Right answers in a row</span>
            <span className="num shrink-0">up to ×3</span>
          </li>
        </ul>
        <p className="mt-2 text-xs text-muted">
          A medium card is worth <span className="num">{medium}</span> XP before bonuses.
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
          <p className="mt-2 text-sm">
            <span className="num">{now.toNext}</span> XP to level <span className="num">{now.level + 1}</span>.
          </p>
        </div>

        <p className="mt-4 flex items-start gap-2.5 text-sm">
          <StreakFlame lit={streak.studiedToday} className="mt-px size-[18px]" />
          {streak.studiedToday ? (
            <span>
              Today’s flame is lit. <span className="num">{streak.current}</span>-day streak.
            </span>
          ) : (
            <span>Your first right answer today lights the flame and keeps your streak.</span>
          )}
        </p>
      </section>

      <section aria-labelledby="tips-heading" className="panel rounded-3xl p-4 sm:p-6">
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
