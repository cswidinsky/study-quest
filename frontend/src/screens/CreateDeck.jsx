import { useId, useState } from 'react'
import { motion } from 'motion/react'
import { useGame } from '../state/game.js'
import { FileIcon, PencilIcon } from '../components/icons.jsx'
import PdfFlow from './create/PdfFlow.jsx'
import ManualForm from './create/ManualForm.jsx'
import DeckReady from './create/DeckReady.jsx'
import RewardPanel from './create/RewardPanel.jsx'
import RecentUploads from './create/RecentUploads.jsx'

// Issue #15: make a deck from a PDF, or write one by hand.
// Same 1,100px column and 12-column grid as the dashboard: 8 + 4.

const MODES = [
  { id: 'pdf', label: 'From a PDF', Icon: FileIcon },
  { id: 'manual', label: 'Write it yourself', Icon: PencilIcon },
]

export default function CreateDeck() {
  const { data, addDeck } = useGame()
  const decks = data?.decks ?? []
  const [mode, setMode] = useState('pdf')
  const [created, setCreated] = useState(null)
  const [round, setRound] = useState(0) // bump to start a fresh form

  function handleDone(deck) {
    setCreated(deck)
    addDeck(deck)
  }

  function startAnother() {
    setCreated(null)
    setRound((r) => r + 1)
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-6 pb-16 sm:px-6 lg:pt-16">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">New deck</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          Upload your lecture notes and get a quiz back, or write the cards yourself.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-12 gap-3 sm:gap-4 lg:mt-12">
        <div className="col-span-12 lg:col-span-8">
          {created ? (
            <DeckReady deck={created} onAnother={startAnother} />
          ) : (
            <>
              <ModeTabs mode={mode} onChange={setMode} />
              <div className="mt-4 rounded-2xl bg-background p-4 sm:p-5">
                {/* Both stay mounted so switching tabs keeps what you typed. */}
                <div id="panel-pdf" role="tabpanel" aria-labelledby="tab-pdf" hidden={mode !== 'pdf'}>
                  <PdfFlow key={`pdf-${round}`} decks={decks} onDone={handleDone} />
                </div>
                <div id="panel-manual" role="tabpanel" aria-labelledby="tab-manual" hidden={mode !== 'manual'}>
                  <ManualForm key={`manual-${round}`} decks={decks} onDone={handleDone} />
                </div>
              </div>
              {mode === 'pdf' && <RecentUploads decks={decks} />}
            </>
          )}
        </div>

        <aside className="col-span-12 lg:col-span-4">
          <RewardPanel />
        </aside>
      </div>
    </div>
  )
}

function ModeTabs({ mode, onChange }) {
  const pillId = useId()
  return (
    <div role="tablist" aria-label="How to make the deck" className="inline-flex rounded-full bg-background p-1">
      {MODES.map(({ id, label, Icon }) => {
        const active = mode === id
        return (
          <button
            key={id}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`panel-${id}`}
            onClick={() => onChange(id)}
            className={`relative flex h-9 items-center gap-2 rounded-full px-4 text-sm transition-[color,scale] duration-150 ease-out active:scale-[0.97] ${
              active ? 'text-text' : 'text-muted hover:text-text'
            }`}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-full border border-border bg-surface"
                transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
              />
            )}
            <Icon className="relative size-4" />
            <span className="relative font-medium">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
