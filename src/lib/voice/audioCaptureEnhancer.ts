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
 * Applies noiseSuppression, echoCancellation, autoGainControl and mono constraints
 * tuned to athlete's microphoneSensitivity setting ('quiet' | 'standard' | 'aggressive').
 */
export async function prewarmGymNoiseReduction(
  sensitivity: 'quiet' | 'standard' | 'aggressive' = 'aggressive'
): Promise<AudioEnhancementState> {
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
    const audioConstraints: MediaTrackConstraints = {
      noiseSuppression: sensitivity !== 'quiet',
      echoCancellation: true,
      autoGainControl: true,
      channelCount: sensitivity === 'aggressive' ? 1 : undefined,
    };

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
    });

    const track = stream.getAudioTracks()[0];
    const settings = track?.getSettings() || {};

    // Release stream tracks after pre-warming so the microphone device is not exclusively locked
    // on operating systems that require shared audio device endpoints for Web Speech API.
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
