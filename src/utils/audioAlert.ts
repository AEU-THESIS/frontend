/**
 * Zero-dependency Web Audio API notification alert sounds.
 * Avoids missing external audio asset files and provides instant playback.
 */

let audioCtx: AudioContext | null = null

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null

  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return null
    audioCtx = new AudioContextClass()
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }

  return audioCtx
}

// Auto-unlock audio context on user interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
    window.removeEventListener('click', unlockAudio)
    window.removeEventListener('touchstart', unlockAudio)
    window.removeEventListener('keydown', unlockAudio)
  }

  window.addEventListener('click', unlockAudio, { passive: true })
  window.addEventListener('touchstart', unlockAudio, { passive: true })
  window.addEventListener('keydown', unlockAudio, { passive: true })
}

/**
 * Plays a distinctive triple-chime alert for incoming customer pre-orders
 * so kitchen and cashier staff can hear it loudly and clearly.
 */
export function playPreOrderSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    const playTone = (
      frequency: number,
      startTime: number,
      duration: number,
      volume: number = 0.25
    ) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(frequency, startTime)

      // Envelope: fast attack, smooth decay
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + duration)
    }

    // Melodic ascending chime: E5 (659.25Hz) -> G#5 (830.61Hz) -> B5 (987.77Hz) -> E6 (1318.51Hz)
    playTone(659.25, now, 0.35, 0.3)
    playTone(830.61, now + 0.12, 0.35, 0.32)
    playTone(987.77, now + 0.24, 0.45, 0.35)
    playTone(1318.51, now + 0.36, 0.65, 0.38)
  } catch (err) {
    console.warn('⚠️ [AudioAlert] Failed to play pre-order alert chime:', err)
  }
}

/**
 * Plays a general subtle notification chime for inventory or promotion alerts.
 */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    const playTone = (frequency: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(frequency, startTime)

      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + duration)
    }

    // Double chime: G5 -> C6
    playTone(783.99, now, 0.25)
    playTone(1046.5, now + 0.12, 0.4)
  } catch (err) {
    console.warn('⚠️ [AudioAlert] Failed to play notification chime:', err)
  }
}
