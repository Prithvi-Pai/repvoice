/**
 * Gym Noise Reduction & Hardware Audio Constraint Pre-Warmer
 * Pre-warms the browser/OS audio DSP pipeline with noiseSuppression,
 * echoCancellation, and autoGainControl constraints to filter gym background chatter,
 * fans, music, and plate clanking.
 */

export interface AudioEnhancementState {
  isSupported: boolean;
  isActive: boolean;
  noiseSuppressionActive: boolean;
  echoCancellationActive: boolean;
  autoGainControlActive: boolean;
  errorMessage?: string;
}

let activeMediaStream: MediaStream | null = null;

/**
 * Pre-warms hardware DSP noise reduction on the user's microphone.
 */
export async function prewarmGymNoiseReduction(): Promise<AudioEnhancementState> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return {
      isSupported: false,
      isActive: false,
      noiseSuppressionActive: false,
      echoCancellationActive: false,
      autoGainControlActive: false,
      errorMessage: 'Browser does not support mediaDevices.getUserMedia',
    };
  }

  // If already active, return current capabilities
  if (activeMediaStream && activeMediaStream.active) {
    const track = activeMediaStream.getAudioTracks()[0];
    const settings = track?.getSettings() || {};
    return {
      isSupported: true,
      isActive: true,
      noiseSuppressionActive: Boolean(settings.noiseSuppression),
      echoCancellationActive: Boolean(settings.echoCancellation),
      autoGainControlActive: Boolean(settings.autoGainControl),
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
        channelCount: 1, // Mono voice input reduces background stereo bleed
      },
    });

    const track = stream.getAudioTracks()[0];
    const settings = track?.getSettings() || {};

    // Immediately release stream tracks so hardware microphone is not locked exclusively.
    // Web Speech API (webkitSpeechRecognition) needs exclusive access to the microphone on Windows.
    stream.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        // ignore
      }
    });
    activeMediaStream = null;

    return {
      isSupported: true,
      isActive: true,
      noiseSuppressionActive: settings.noiseSuppression !== false,
      echoCancellationActive: settings.echoCancellation !== false,
      autoGainControlActive: settings.autoGainControl !== false,
    };
  } catch (err: any) {
    console.warn('Microphone hardware DSP pre-warm notice:', err?.message || err);
    return {
      isSupported: true,
      isActive: false,
      noiseSuppressionActive: false,
      echoCancellationActive: false,
      autoGainControlActive: false,
      errorMessage: err?.message,
    };
  }
}

/**
 * Releases the pre-warmed audio stream and frees hardware resources.
 */
export function releaseGymNoiseReduction(): void {
  if (activeMediaStream) {
    activeMediaStream.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        // ignore
      }
    });
    activeMediaStream = null;
  }
}
