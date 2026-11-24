import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { generateDeckFromPdf, generationKeywords, generationStages, isLive } from '../../api.js'
import { formatBytes } from '../../lib/format.js'
import Button from '../../components/Button.jsx'
import { Field, TextInput } from '../../components/Field.jsx'
import { AlertIcon, CheckIcon, FileIcon } from '../../components/icons.jsx'
import { courseOptions, suggestFromFile, toCourse } from './course.js'

// PDF → quiz, in three phases: pick a file, check the details, watch it generate.

// On Vercel, a function accepts request bodies up to 4.5 MB (Flask itself allows 10 MiB:
// MAX_CONTENT_LENGTH in backend/app.py). The limit counts the whole upload request, so leave a
// little room for the form data around the file.
const MAX_MB = 4
const MAX_BYTES = MAX_MB * 1024 * 1024 - 64 * 1024
// How many questions to write. Flask asks the AI for this many and keeps the ones it can check
// against the PDF (at least 80% of them), so a few may be dropped; the ready screen says so.
const QUESTION_COUNTS = [3, 5, 10]
const DEFAULT_QUESTION_COUNT = 5
const EASE_OUT = [0.23, 1, 0.32, 1]

function validate(file) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  if (!isPdf) {
    const ext = file.name.includes('.') ? file.name.split('.').pop().toUpperCase() : 'non-PDF'
    return `That’s a ${ext} file. StudyQuest reads PDFs for now.`
  }
  if (file.size > MAX_BYTES) return `That PDF is ${formatBytes(file.size)}. The limit is ${MAX_MB} MB.`
  return null
}

export default function PdfFlow({ decks, onDone }) {
  const [phase, setPhase] = useState('pick') // 'pick' | 'details' | 'generating'
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)
  const [details, setDetails] = useState({ title: '', course: '', questionCount: DEFAULT_QUESTION_COUNT })
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
      const result = await generateDeckFromPdf(
        file,
        {
          title: details.title.trim(),
          course: toCourse(details.course, decks),
          questionCount: details.questionCount,
        },
        { onProgress: setJob, signal: controller.signal },
      )
      onDone(result)
    } catch (err) {
      if (err.name !== 'AbortError') {
        // Show the server's own message (it says what went wrong: timeout, bad PDF, offline…).
        setError(err.message || 'Something went wrong while writing your quiz. Try again.')
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
      <p className="mt-1 text-sm text-muted">Lecture slides or notes, up to {MAX_MB} MB</p>
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
      {/* The file drops in from above and settles with a little bounce. */}
      <motion.div
        className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-surface p-3 shadow-[0_10px_30px_-14px_var(--color-accent)]"
        initial={reduceMotion ? false : { opacity: 0, transform: 'translateY(-56px) scale(1.06) rotate(-2deg)' }}
        animate={{ opacity: 1, transform: 'translateY(0px) scale(1) rotate(0deg)' }}
        transition={{ type: 'spring', duration: 0.7, bounce: 0.38 }}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-on-accent glow-accent">
          <FileIcon className="size-5" />
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

// The PDF is pulled into a glowing core, which turns while the quiz is written.
// Key ideas float out of it as they are "found"; each finished step makes it pulse.
function Generating({ file, job, questionCount, onCancel }) {
  const pct = Math.round(job.progress * 100)
  // Live: Flask decides how many questions survive its checks, so don't promise a number.
  const label = (stage) =>
    stage.id === 'write' ? (isLive() ? 'Writing your questions' : `Writing ${questionCount} questions`) : stage.label

  return (
    <div aria-live="polite">
      <div className="relative flex flex-col items-center pt-2 pb-4">
        <AbsorbedFile name={file.name} />
        <Core stageIndex={job.stageIndex} pct={pct} />
        <h2 className="mt-5 text-lg font-semibold tracking-tight">Writing your quiz</h2>
        <p className="mt-0.5 max-w-full truncate text-sm text-muted">From {file.name}</p>
      </div>

      <div
        className="relative mt-2 h-2 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-label="Quiz generation progress"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Linear and short, so the polled updates blend into one steady movement. */}
        <div
          className="sheen relative h-full overflow-hidden rounded-full bg-[linear-gradient(90deg,var(--color-accent),var(--color-sun))] transition-transform duration-100 ease-linear"
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

// The file chip slides down into the core and shrinks away: "absorbed".
function AbsorbedFile({ name }) {
  const reduce = useReducedMotion()
  if (reduce) return null
  return (
    <motion.div
      aria-hidden="true"
      className="absolute top-0 left-1/2 z-10 flex max-w-[16rem] items-center gap-2 rounded-xl border border-accent/40 bg-surface px-3 py-2 text-sm shadow-[0_10px_30px_-14px_var(--color-accent)]"
      initial={{ opacity: 1, transform: 'translateX(-50%) translateY(0px) scale(1)' }}
      animate={{ opacity: 0, transform: 'translateX(-50%) translateY(84px) scale(0.15)' }}
      transition={{ duration: 0.75, ease: [0.55, 0, 0.75, 0.2] }}
    >
      <FileIcon className="size-4 shrink-0 text-accent" />
      <span className="truncate">{name}</span>
    </motion.div>
  )
}

function Core({ stageIndex, pct }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className="relative mt-2 size-40"
      initial={reduce ? false : { opacity: 0, transform: 'scale(0.6)' }}
      animate={{ opacity: 1, transform: 'scale(1)' }}
      transition={{ type: 'spring', duration: 0.9, bounce: 0.35, delay: reduce ? 0 : 0.45 }}
    >
      {/* Soft halo (a pre-blurred static layer, so it's cheap) */}
      <div className="absolute -inset-6 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-accent)_45%,transparent),transparent)] motion-safe:animate-pulse" />
      {/* Turning ring of colour */}
      <div className="absolute inset-3 rounded-full bg-[conic-gradient(from_0deg,var(--color-accent),var(--color-sun),var(--color-secondary),var(--color-accent))] motion-safe:animate-[spin_5s_linear_infinite]" />
      <div className="absolute inset-[18px] rounded-full bg-surface" />
      {/* Inner light that pulses on every finished step */}
      <motion.div
        key={stageIndex}
        className="absolute inset-[30px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-accent)_55%,transparent),transparent)]"
        initial={reduce ? false : { transform: 'scale(1.35)', opacity: 1 }}
        animate={{ transform: 'scale(1)', opacity: 0.8 }}
        transition={{ type: 'spring', duration: 0.8, bounce: 0.4 }}
      />
      {/* Two specks orbiting at different speeds */}
      <div className="absolute inset-0 motion-safe:animate-[spin_3.2s_linear_infinite]">
        <span className="absolute top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-sun shadow-[0_0_10px_var(--color-sun)]" />
      </div>
      <div className="absolute inset-5 motion-safe:animate-[spin_4.6s_linear_infinite_reverse]">
        <span className="absolute bottom-0 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-secondary shadow-[0_0_10px_var(--color-secondary)]" />
      </div>
      <span className="num absolute inset-0 grid place-items-center text-2xl font-medium">{pct}%</span>
      <Ideas active={stageIndex >= 1 && stageIndex <= 3} />
    </motion.div>
  )
}

// Live mode reads a real PDF we know nothing about yet, so its chips stay neutral.
// Demo mode keeps the sample deck's own ideas (membrane transport).
const LIVE_IDEAS = ['Key ideas', 'Definitions', 'Examples', 'Key terms', 'Main points', 'Page references']

// While the "AI" reads, the ideas it finds drift out of the core and fade.
function Ideas({ active }) {
  const reduce = useReducedMotion()
  const [bubbles, setBubbles] = useState([])
  const count = useRef(0)

  useEffect(() => {
    if (!active || reduce) return
    const ideas = isLive() ? LIVE_IDEAS : generationKeywords
    const timer = setInterval(() => {
      const i = count.current++
      const angle = -Math.PI / 2 + (i % 2 ? 1 : -1) * (0.5 + Math.random() * 0.9)
      setBubbles((b) => [
        ...b.slice(-5),
        { id: i, text: ideas[i % ideas.length], dx: Math.cos(angle) * 150, dy: Math.sin(angle) * 95 },
      ])
    }, 520)
    return () => clearInterval(timer)
  }, [active, reduce])

  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2" aria-hidden="true">
      <AnimatePresence>
        {bubbles.map((b) => (
          <motion.span
            key={b.id}
            className="absolute rounded-full border border-border bg-surface px-2.5 py-1 text-xs whitespace-nowrap shadow-[var(--shadow-float)]"
            initial={{ opacity: 0, transform: 'translate(-50%, -50%) translate(0px, 0px) scale(0.5)' }}
            animate={{ opacity: [0, 1, 1, 0], transform: `translate(-50%, -50%) translate(${b.dx}px, ${b.dy}px) scale(1)` }}
            transition={{ duration: 2, ease: EASE_OUT, opacity: { duration: 2, times: [0, 0.15, 0.7, 1] } }}
            onAnimationComplete={() => setBubbles((all) => all.filter((x) => x.id !== b.id))}
          >
            {b.text}
          </motion.span>
        ))}
      </AnimatePresence>
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
