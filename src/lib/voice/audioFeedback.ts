/**
 * RepVoice Audio Feedback & Speech Synthesis Engine (Screen 6: /settings & Screen 2: active_workout)
 * Delivers spoken set confirmations (TTS), low-latency acoustic chimes,
 * and adaptive microphone sensitivity settings for gym noise suppression.
 */

/**
 * Reads back logged weight & reps aloud using Web Speech API synthesis.
 * e.g. "Incline Dumbbell Press, 70 pounds for 8 reps recorded."
 */
export function speakVoiceConfirmation(text: string, enabled: boolean = true): void {
  if (!enabled || typeof window === 'undefined') return;

  try {
    const synth = window.speechSynthesis;
    if (!synth) return;

    // Cancel any previous pending utterance to ensure real-time responsiveness
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    synth.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis feedback unavailable:', err);
  }
}

/**
 * Low-latency acoustic chime using Web Audio API oscillator.
 * Zero asset loading latency, works offline in harsh gym environments.
 */
export function playAcousticChime(enabled: boolean = true): void {
  if (!enabled || typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Harmonic chime chord (A5 880Hz gliding to C#6 1108Hz)
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1108, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.32);
  } catch {
    // ignore
  }
}

/**
 * DSP sensitivity constraints mapping for microphone capture in noisy gym environments.
 */
export function getNoiseFilterConstraints(sensitivity: 'quiet' | 'standard' | 'aggressive' = 'aggressive'): MediaTrackConstraints {
  return {
    echoCancellation: true,
    noiseSuppression: sensitivity !== 'quiet',
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 48000,
  };
}
