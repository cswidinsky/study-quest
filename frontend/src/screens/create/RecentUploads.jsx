import { relativeDay } from '../../lib/format.js'
import { FileIcon } from '../../components/icons.jsx'

const SHOWN = 3

// Your last few PDFs and the decks they became.
export default function RecentUploads({ decks }) {
  const uploads = decks
    .filter((d) => d.source.type === 'pdf' && d.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, SHOWN)

  if (uploads.length === 0) return null

  return (
    <section aria-labelledby="recent-heading" className="mt-3 rounded-2xl bg-background p-4 sm:mt-4 sm:p-5">
      <h2 id="recent-heading" className="text-sm font-semibold">
        Recent uploads
      </h2>
      <ul className="mt-3 space-y-2">
        {uploads.map((deck) => {
          const when = relativeDay(deck.createdAt)
          return (
            <li
              key={deck.id}
              className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5"
            >
              <FileIcon className="size-4 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{deck.source.fileName}</p>
                <p className="truncate text-xs text-muted">
                  Became “{deck.title}” · <span className="num">{deck.cardCount}</span> cards
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted">{when[0].toUpperCase() + when.slice(1)}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
