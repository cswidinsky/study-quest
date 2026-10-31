import { useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useGame } from '../state/game.js'
import { EASE_CINEMA, EASE_OUT, stagger, useRise } from '../lib/motion.js'
import { FileIcon, PencilIcon } from '../components/icons.jsx'
import PdfFlow from './create/PdfFlow.jsx'
import ManualForm from './create/ManualForm.jsx'
import DeckReady from './create/DeckReady.jsx'
import RewardPanel from './create/RewardPanel.jsx'
import RecentUploads from './create/RecentUploads.jsx'

// Issue #15: make a deck from a PDF, or write one by hand.
// Same 1,100px column and 12-column grid as the dashboard: 8 + 4.
// Choreography: title, tabs, the work area, then the side panels; the form
// dissolves away and the finished deck lands in its place.

const MODES = [
  { id: 'pdf', label: 'From a PDF', Icon: FileIcon },
  { id: 'manual', label: 'Write it yourself', Icon: PencilIcon },
]

export default function CreateDeck() {
  const { data, addDeck } = useGame()
  const reduce = useReducedMotion()
  const rise = useRise()
  const decks = data?.decks ?? []
  const [mode, setMode] = useState('pdf')
  const [created, setCreated] = useState(null)
  const [round, setRound] = useState(0) // bump to start a fresh form

  function handleDone(result) {
    setCreated(result)
    addDeck(result.deck, result.cards)
  }

  function startAnother() {
    setCreated(null)
    setRound((r) => r + 1)
  }

  return (
    <motion.div
      className="mx-auto max-w-[1100px] px-4 pt-7 pb-24 sm:px-6 lg:pt-24"
      initial="hidden"
      animate="show"
      variants={stagger(0.08, 0.05)}
    >
      <motion.header variants={rise}>
        <h1 className="text-[32px] leading-tight font-semibold tracking-tight sm:text-[44px]">New deck</h1>
        <p className="mt-2 text-base text-muted sm:text-lg">Upload your lecture notes and get a quiz back, or write the cards yourself.</p>
      </motion.header>

      <div className="mt-9 grid grid-cols-12 gap-3 sm:gap-4 lg:mt-12">
        <motion.div variants={rise} className="col-span-12 lg:col-span-8">
          <AnimatePresence mode="wait" initial={false}>
            {created ? (
              <motion.div key="ready" initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
                <DeckReady deck={created.deck} cards={created.cards} onAnother={startAnother} />
              </motion.div>
            ) : (
              <motion.div
                key={`form-${round}`}
                initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(16px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.97)', filter: 'blur(6px)' }}
                transition={{ duration: 0.45, ease: EASE_CINEMA }}
              >
                <ModeTabs mode={mode} onChange={setMode} />
                <div className="panel mt-4 rounded-3xl p-4 sm:p-6">
                  {/* Both stay mounted so switching tabs keeps what you typed. */}
                  <TabPanel id="pdf" active={mode === 'pdf'}>
                    <PdfFlow key={`pdf-${round}`} decks={decks} onDone={handleDone} />
                  </TabPanel>
                  <TabPanel id="manual" active={mode === 'manual'}>
                    <ManualForm key={`manual-${round}`} decks={decks} onDone={handleDone} />
                  </TabPanel>
                </div>
                {mode === 'pdf' && <RecentUploads decks={decks} />}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.aside variants={rise} className="col-span-12 lg:col-span-4">
          <RewardPanel />
        </motion.aside>
      </div>
    </motion.div>
  )
}

// The visible tab fades and rises in; the hidden one stays mounted (keeps its state).
function TabPanel({ id, active, children }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      id={`panel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      hidden={!active}
      initial={false}
      animate={active ? { opacity: 1, transform: 'translateY(0px)' } : { opacity: 0, transform: reduce ? 'none' : 'translateY(8px)' }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}

function ModeTabs({ mode, onChange }) {
  const pillId = useId()
  return (
    <div role="tablist" aria-label="How to make the deck" className="panel inline-flex rounded-full p-1">
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
            className={`relative flex h-10 items-center gap-2 rounded-full px-4 text-sm transition-[color,scale] duration-150 ease-out active:scale-[0.97] ${
              active ? 'text-background' : 'text-muted hover:text-text'
            }`}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-full bg-text"
                transition={{ type: 'spring', duration: 0.5, bounce: 0.25 }}
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
