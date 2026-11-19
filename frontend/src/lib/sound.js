// Tiny synthesised sound effects (Web Audio): no audio files to download.
// Off by default; the toggle lives in the quiz bar and in Settings.

let ctx = null
let enabled = false

export const setSoundEnabled = (on) => {
  enabled = on
}

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq, start, duration, { type = 'sine', gain = 0.1 } = {}) {
  const c = audio()
  const t = c.currentTime + start
  const osc = c.createOscillator()
  const amp = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  amp.gain.setValueAtTime(0.0001, t)
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.012)
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(amp).connect(c.destination)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

const semitone = (base, steps) => base * 2 ** (steps / 12)

// play('correct', { combo }) etc. `force` plays even when sound is off (the Settings preview).
export function play(name, { combo = 0, force = false } = {}) {
  if (!enabled && !force) return
  try {
    switch (name) {
      case 'correct': {
        // Each answer in a combo rings a little higher.
        const base = semitone(660, Math.min(combo, 10))
        tone(base, 0, 0.16)
        tone(base * 1.5, 0.06, 0.28, { gain: 0.08 })
        break
      }
      case 'wrong':
        tone(220, 0, 0.18, { type: 'triangle', gain: 0.09 })
        tone(165, 0.07, 0.26, { type: 'triangle', gain: 0.07 })
        break
      case 'combo':
        ;[0, 4, 7, 12].forEach((s, i) => tone(semitone(523, s), i * 0.055, 0.24, { gain: 0.08 }))
        break
      case 'flip':
        tone(1400, 0, 0.04, { type: 'triangle', gain: 0.04 })
        break
      case 'tap':
        tone(900, 0, 0.035, { gain: 0.03 })
        break
      case 'results':
        ;[0, 7, 12, 16].forEach((s, i) => tone(semitone(440, s), i * 0.09, 0.5, { gain: 0.07 }))
        break
      case 'levelup':
        ;[0, 4, 7, 12, 16, 19].forEach((s, i) => tone(semitone(392, s), i * 0.07, 0.7, { gain: 0.08 }))
        break
      default:
    }
  } catch {
    // Audio blocked or unsupported: stay silent.
  }
}
