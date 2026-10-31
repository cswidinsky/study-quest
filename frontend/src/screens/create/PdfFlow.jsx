import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { generateDeckFromPdf, generationStages } from '../../api.js'
import { formatBytes } from '../../lib/format.js'
import Button from '../../components/Button.jsx'
import { Field, TextInput } from '../../components/Field.jsx'
import { AlertIcon, CheckIcon, FileIcon } from '../../components/icons.jsx'
import { courseOptions, suggestFromFile, toCourse } from './course.js'

// PDF → quiz, in three phases: pick a file, check the details, watch it generate.

const MAX_BYTES = 20 * 1024 * 1024
const QUESTION_COUNTS = [10, 20, 30]
const EASE_OUT = [0.23, 1, 0.32, 1]

function validate(file) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  if (!isPdf) {
    const ext = file.name.includes('.') ? file.name.split('.').pop().toUpperCase() : 'non-PDF'
    return `That’s a ${ext} file. StudyQuest reads PDFs for now.`
  }
  if (file.size > MAX_BYTES) return `That PDF is ${formatBytes(file.size)}. The limit is 20 MB.`
  return null
}

export default function PdfFlow({ decks, onDone }) {
  const [phase, setPhase] = useState('pick') // 'pick' | 'details' | 'generating'
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)
  const [details, setDetails] = useState({ title: '', course: '', questionCount: 20 })
  const [job, setJob] = useState({ stageIndex: 0, progress: 0 })
  const abortRef = useRef(null)

  // Stop the browser from opening a PDF dropped just outside the box.
  useEffect(() => {
    const stop = (e) => e.preventDefault()
    window.addEventListener('dragover', stop)
    window.addEventListener('drop', stop)
    return () => {
      window.removeEventListener('dragover', stop)
      window.removeEventListener('drop', stop)
      abortRef.current?.abort()
    }
  }, [])

  function pickFile(next) {
    const problem = validate(next)
    setError(problem)
    if (problem) return
    setFile(next)
    setDetails((d) => ({ ...d, ...suggestFromFile(next.name, decks) }))
    setPhase('details')
  }

  async function generate() {
    const controller = new AbortController()
    abortRef.current = controller
    setJob({ stageIndex: 0, progress: 0 })
    setPhase('generating')
    try {
      const deck = await generateDeckFromPdf(
        file,
        {
          title: details.title.trim(),
          course: toCourse(details.course, decks),
          questionCount: details.questionCount,
        },
        { onProgress: setJob, signal: controller.signal },
      )
      onDone(deck)
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Something went wrong while writing your quiz. Try again.')
        setPhase('details')
      }
    }
  }

  function cancel() {
    abortRef.current?.abort()
    setPhase('details')
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {phase === 'pick' && (
        <Phase key="pick">
          <Dropzone onFile={pickFile} />
          {error && (
            <p role="alert" className="mt-3 flex items-center gap-2 text-sm">
              <AlertIcon className="size-4 shrink-0 text-error" />
              {error}
            </p>
          )}
        </Phase>
      )}
      {phase === 'details' && (
        <Phase key="details">
          <Details
            file={file}
            details={details}
            setDetails={setDetails}
            decks={decks}
            error={error}
            onChangeFile={() => {
              setFile(null)
              setError(null)
              setPhase('pick')
            }}
            onGenerate={generate}
          />
        </Phase>
      )}
      {phase === 'generating' && (
        <Phase key="generating">
          <Generating file={file} job={job} questionCount={details.questionCount} onCancel={cancel} />
        </Phase>
      )}
    </AnimatePresence>
  )
}

// Phases swap with a quick blurred crossfade, so it reads as one thing changing.
function Phase({ children }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0, filter: reduceMotion ? 'none' : 'blur(2px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: reduceMotion ? 'none' : 'blur(2px)', transition: { duration: 0.12 } }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}

/* ——— 1. Drop zone ——— */

function Dropzone({ onFile }) {
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0) // drag events fire for every child; count them

  return (
    <label
      onDragEnter={(e) => {
        e.preventDefault()
        depth.current += 1
        setDragging(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current -= 1
        if (depth.current === 0) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        depth.current = 0
        setDragging(false)
        const dropped = e.dataTransfer.files[0]
        if (dropped) onFile(dropped)
      }}
      className={`group flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-2xl border-[1.5px] border-dashed px-6 py-12 text-center transition-[border-color,background-color] duration-200 ease-out has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent ${
        dragging ? 'border-accent bg-accent-soft' : 'border-muted/40 bg-surface hover:border-muted/70'
      }`}
    >
      <input
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        onChange={(e) => {
          const picked = e.target.files?.[0]
          if (picked) onFile(picked)
          e.target.value = ''
        }}
      />
      <PaperStack lifted={dragging} />
      <p className="mt-6 text-[15px] font-medium">
        {dragging ? (
          'Let go to upload'
        ) : (
          <>
            Drop a PDF here, or <span className="underline decoration-muted/50 underline-offset-4 group-hover:decoration-text">browse</span>
          </>
        )}
      </p>
      <p className="mt-1 text-sm text-muted">Lecture slides or notes, up to 20 MB</p>
    </label>
  )
}

// Two sheets of paper. While a file hovers over the box they fan apart, as if making room.
function PaperStack({ lifted }) {
  const sheet = 'absolute inset-0 rounded-lg border border-border bg-surface transition-transform duration-300 ease-out'
  return (
    <div className="relative h-[76px] w-[60px]" aria-hidden="true">
      <div className={`${sheet} ${lifted ? '-translate-x-2.5 -rotate-12' : '-rotate-6'}`} />
      <div className={`${sheet} p-2.5 ${lifted ? 'translate-x-1 -translate-y-2.5 rotate-6' : ''}`}>
        <div className="space-y-1.5">
          <div className="h-1 rounded-full bg-border" />
          <div className="h-1 w-4/5 rounded-full bg-border" />
          <div className="h-1 rounded-full bg-border" />
          <div className="h-1 w-3/5 rounded-full bg-border" />
        </div>
        <span className="absolute bottom-2 left-2 rounded-[4px] bg-accent px-1 text-[11px] leading-4 font-semibold text-on-accent">
          PDF
        </span>
      </div>
    </div>
  )
}

/* ——— 2. Details ——— */

function Details({ file, details, setDetails, decks, error, onChangeFile, onGenerate }) {
  const id = useId()
  const reduceMotion = useReducedMotion()
  const canGenerate = details.title.trim().length > 0
  const set = (key) => (e) => setDetails((d) => ({ ...d, [key]: e.target.value }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (canGenerate) onGenerate()
      }}
    >
      {/* The file lands: a small scale-up from a blur. */}
      <motion.div
        className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
        initial={reduceMotion ? false : { opacity: 0, transform: 'scale(0.96)', filter: 'blur(2px)' }}
        animate={{ opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-background">
          <FileIcon className="size-5 text-muted" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="num text-xs text-muted">{formatBytes(file.size)}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onChangeFile}>
          Change
        </Button>
      </motion.div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Deck name" htmlFor={`${id}-title`}>
          <TextInput id={`${id}-title`} value={details.title} onChange={set('title')} required />
        </Field>
        <Field label="Course" htmlFor={`${id}-course`}>
          <TextInput
            id={`${id}-course`}
            list={`${id}-courses`}
            value={details.course}
            onChange={set('course')}
            placeholder="e.g. Organic Chemistry II"
            autoComplete="off"
          />
          <datalist id={`${id}-courses`}>
            {courseOptions(decks).map((c) => (
              <option key={c.name} value={c.name}>
                {c.code}
              </option>
            ))}
          </datalist>
        </Field>
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium">Questions</legend>
        <div className="inline-flex rounded-full border border-border bg-surface p-0.5">
          {QUESTION_COUNTS.map((n) => {
            const checked = details.questionCount === n
            return (
              <label
                key={n}
                className={`relative grid h-9 min-w-14 cursor-pointer place-items-center rounded-full px-3 text-sm transition-[color] duration-150 ease-out has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-accent ${
                  checked ? 'text-text' : 'text-muted hover:text-text'
                }`}
              >
                <input
                  type="radio"
                  name={`${id}-count`}
                  value={n}
                  checked={checked}
                  onChange={() => setDetails((d) => ({ ...d, questionCount: n }))}
                  className="sr-only"
                />
                {checked && (
                  <motion.span
                    layoutId={`${id}-count-pill`}
                    className="absolute inset-0 rounded-full bg-background"
                    transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                  />
                )}
                <span className="num relative">{n}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="mt-4 flex items-center gap-2 text-sm">
          <AlertIcon className="size-4 shrink-0 text-error" />
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={!canGenerate} aria-describedby={canGenerate ? undefined : `${id}-why`}>
          Generate quiz
        </Button>
        {!canGenerate && (
          <p id={`${id}-why`} className="text-sm text-muted">
            Give the deck a name first.
          </p>
        )}
      </div>
    </form>
  )
}

/* ——— 3. Generating ——— */

function Generating({ file, job, questionCount, onCancel }) {
  const pct = Math.round(job.progress * 100)
  const label = (stage) => (stage.id === 'write' ? `Writing ${questionCount} questions` : stage.label)

  return (
    <div aria-live="polite">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[15px] font-semibold">Writing your quiz</h2>
        <span className="num text-sm">{pct}%</span>
      </div>
      <p className="mt-0.5 truncate text-sm text-muted">From {file.name}</p>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-label="Quiz generation progress"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Linear and short, so the polled updates blend into one steady movement. */}
        <div
          className="h-full rounded-full bg-accent transition-transform duration-100 ease-linear"
          style={{ transform: `translateX(${(job.progress - 1) * 100}%)` }}
        />
      </div>

      <ol className="mt-6 space-y-3.5">
        {generationStages.map((stage, i) => {
          const state = i < job.stageIndex || job.progress >= 1 ? 'done' : i === job.stageIndex ? 'current' : 'todo'
          return (
            <li key={stage.id} className="flex items-center gap-3 text-sm">
              <StageMark state={state} />
              <span className={state === 'todo' ? 'text-muted' : ''}>{label(stage)}</span>
            </li>
          )
        })}
      </ol>

      <div className="mt-7">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function StageMark({ state }) {
  if (state === 'done') {
    return (
      <motion.span
        className="grid size-5 shrink-0 place-items-center rounded-full bg-success text-on-accent"
        initial={{ opacity: 0, transform: 'scale(0.6)' }}
        animate={{ opacity: 1, transform: 'scale(1)' }}
        transition={{ type: 'spring', duration: 0.35, bounce: 0.3 }}
      >
        <CheckIcon className="size-3" strokeWidth="3" />
        <span className="sr-only">Done:</span>
      </motion.span>
    )
  }
  if (state === 'current') {
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-accent">
        <span className="size-1.5 animate-pulse rounded-full bg-accent" />
        <span className="sr-only">In progress:</span>
      </span>
    )
  }
  return <span className="size-5 shrink-0 rounded-full border-[1.5px] border-border" />
}
