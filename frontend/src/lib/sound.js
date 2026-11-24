// Sound effects: short, quiet audio files in /sounds (public/sounds, ~60 KB in total), played with
// Web Audio so they start instantly. On by default; the toggle in the quiz bar and in Settings
// turns them off (remembered as a device preference).
//
// - Browsers block audio until the person first clicks or presses a key. Until then every sound is
//   skipped silently (no errors); the first gesture unlocks audio and preloads the files.
// - The same sound never overlaps itself: playing it again restarts it.
// - Volume stays low (the files are normalised quiet, and everything goes through MASTER).

const FILES = ['select', 'correct', 'wrong', 'submit', 'xp', 'levelup', 'streak', 'ready']
const MASTER = 0.7

// Older names used around the app → a file (and a playback rate, for a little variation).
const ALIASES = {
  tap: ['select', 1],
  flip: ['select', 1.1],
  results: ['xp', 1],
  combo: ['streak', 1.12],
}

let ctx = null
let master = null
let enabled = true
let unlocked = false
const buffers = new Map()
const loading = new Map()
const playing = new Map()

export const setSoundEnabled = (on) => {
  enabled = on
}

function load(file) {
  if (buffers.has(file)) return Promise.resolve(buffers.get(file))
  if (!loading.has(file)) {
    loading.set(
      file,
      fetch(`/sounds/${file}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
        .then((bytes) => new Promise((resolve, reject) => ctx.decodeAudioData(bytes, resolve, reject)))
        .then((buffer) => {
          buffers.set(file, buffer)
          return buffer
        })
        .catch(() => {
          loading.delete(file) // try again next time
          return null
        }),
    )
  }
  return loading.get(file)
}

// Called on the first click or key press (the browser's autoplay rule allows audio from then on).
function unlock() {
  if (unlocked) return
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return
  try {
    ctx = new AudioContextClass()
    master = ctx.createGain()
    master.gain.value = MASTER
    master.connect(ctx.destination)
    ctx.resume?.().catch(() => {})
    unlocked = true
    FILES.forEach(load)
  } catch {
    // Audio unsupported: stay silent.
  }
}

if (typeof window !== 'undefined') {
  const once = () => {
    unlock()
    if (unlocked) {
      window.removeEventListener('pointerdown', once, true)
      window.removeEventListener('keydown', once, true)
    }
  }
  window.addEventListener('pointerdown', once, true)
  window.addEventListener('keydown', once, true)
}

// play('correct', { combo }) etc. `force` plays even when sound is off (the Settings preview).
// `delay` (seconds) schedules it slightly later, e.g. a pop just after the results reveal.
export function play(name, { combo = 0, force = false, delay = 0 } = {}) {
  if ((!enabled && !force) || !unlocked || !ctx) return
  const [file, baseRate] = ALIASES[name] ?? [name, 1]
  if (!FILES.includes(file)) return
  // Each answer in a combo rings a little higher.
  const rate = baseRate * (name === 'correct' ? 1 + Math.min(combo, 8) * 0.025 : 1)
  const start = (buffer) => {
    if (!buffer || ctx.state === 'closed') return
    try {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const previous = playing.get(file)
      if (previous) {
        try {
          previous.stop()
        } catch {
          // already finished
        }
      }
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.playbackRate.value = rate
      source.connect(master)
      source.onended = () => {
        if (playing.get(file) === source) playing.delete(file)
      }
      playing.set(file, source)
      source.start(ctx.currentTime + delay)
    } catch {
      // Audio blocked: stay silent.
    }
  }
  const ready = buffers.get(file)
  if (ready) start(ready)
  else load(file).then(start)
}
