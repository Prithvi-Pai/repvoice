'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Activity,
  ShieldAlert,
  Headphones,
  Sliders,
  History,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  Trash2,
  ExternalLink,
} from 'lucide-react';

export type NoiseLevelCategory = 'Low' | 'Moderate' | 'High' | 'Very High';
export type ClarityRating = 'Excellent' | 'Good' | 'Fair' | 'Poor';
export type SettingRecommendation = 'Off' | 'Low' | 'Medium' | 'High' | 'Adaptive';

export interface AudioMeasurementRecord {
  id: string;
  timestamp: string;
  avgDb: number;
  maxDb: number;
  clarityResult: ClarityRating | null;
  snrDb: number | null;
  recommendedAnc: SettingRecommendation;
  recommendedMic: SettingRecommendation;
}

const STORAGE_KEY = 'repvoice_audio_history';

export function GymAudioIntelligence() {
  // State: Live Noise Monitoring
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [currentDb, setCurrentDb] = useState<number>(0);
  const [avgDb, setAvgDb] = useState<number>(0);
  const [maxDb, setMaxDb] = useState<number>(0);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State: Device Compatibility
  const [micDeviceLabel, setMicDeviceLabel] = useState<string>('Standard Microphone');
  const [dspSupported, setDspSupported] = useState<boolean>(true);

  // State: Voice Clarity Test
  const [isTestingVoice, setIsTestingVoice] = useState<boolean>(false);
  const [testPhase, setTestPhase] = useState<'idle' | 'calibrating' | 'speaking' | 'completed'>('idle');
  const [countdown, setCountdown] = useState<number>(0);
  const [clarityResult, setClarityResult] = useState<ClarityRating | null>(null);
  const [claritySnr, setClaritySnr] = useState<number | null>(null);
  const [claritySuggestions, setClaritySuggestions] = useState<string[]>([]);

  // State: Audio History
  const [history, setHistory] = useState<AudioMeasurementRecord[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Rolling DB history for graph canvas
  const dbHistoryRef = useRef<number[]>([]);
  const graphCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Voice test tracking refs
  const testPhaseRef = useRef<'idle' | 'calibrating' | 'speaking' | 'completed'>('idle');
  const baselineNoiseSamplesRef = useRef<number[]>([]);
  const voiceSamplesRef = useRef<number[]>([]);
  const testTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // ignore
    }

    // Check device support
    if (typeof window !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
      setPermissionState('unsupported');
    }
  }, []);

  // Save history to localStorage
  const saveHistoryRecord = useCallback((record: AudioMeasurementRecord) => {
    setHistory((prev) => {
      const updated = [record, ...prev].slice(0, 20);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  };

  // Classify Noise Level
  const getNoiseClassification = (db: number): {
    category: NoiseLevelCategory;
    desc: string;
    pillClass: string;
  } => {
    if (db < 50) {
      return {
        category: 'Low',
        desc: 'Quiet gym / private space. Optimal voice clarity.',
        pillClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
      };
    } else if (db < 70) {
      return {
        category: 'Moderate',
        desc: 'Normal gym ambient chatter & gentle cardio.',
        pillClass: 'bg-zinc-800 text-white border-zinc-600',
      };
    } else if (db < 85) {
      return {
        category: 'High',
        desc: 'Busy gym floor, music & weights dropping.',
        pillClass: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
      };
    } else {
      return {
        category: 'Very High',
        desc: 'Loud acoustics, heavy barbell clanking or loudspeakers.',
        pillClass: 'bg-rose-950/70 text-rose-300 border-rose-800/80',
      };
    }
  };

  // Intelligent ANC & Mic Recommendations
  const getRecommendations = (db: number): {
    listeningAnc: SettingRecommendation;
    listeningRationale: string;
    micSuppression: SettingRecommendation;
    micRationale: string;
  } => {
    if (db < 50) {
      return {
        listeningAnc: 'Low',
        listeningRationale: 'Ambient background is minimal. Low or Off ANC saves battery while keeping spatial awareness.',
        micSuppression: 'Low',
        micRationale: 'Natural voice resonance without speech gating or clipping.',
      };
    } else if (db < 70) {
      return {
        listeningAnc: 'Medium',
        listeningRationale: 'Smoothly attenuates HVAC and distant treadmills without isolating safety cues.',
        micSuppression: 'Medium',
        micRationale: 'Filters background ambient noise while keeping voice commands crisp and clear.',
      };
    } else if (db < 85) {
      return {
        listeningAnc: 'High',
        listeningRationale: 'Shields ears from loud gym music and plate clattering so timer beeps are easily heard.',
        micSuppression: 'High',
        micRationale: 'Applies aggressive directional filtering to suppress weights dropping near the microphone.',
      };
    } else {
      return {
        listeningAnc: 'Adaptive',
        listeningRationale: 'Maximum acoustic protection required. Adaptive ANC adjusts dynamically to high-impact noise spikes.',
        micSuppression: 'Adaptive',
        micRationale: 'Uses dynamic speech gating and beamforming to isolate your voice from loud gym music.',
      };
    }
  };

  // Stop All Audio Processing
  const stopAudioCapture = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (testTimerRef.current) {
      clearInterval(testTimerRef.current);
      testTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsMonitoring(false);
    setIsTestingVoice(false);
    setTestPhase('idle');
    testPhaseRef.current = 'idle';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioCapture();
    };
  }, [stopAudioCapture]);

  // Draw Rolling DB Chart
  const drawNoiseGraph = useCallback(() => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const history = dbHistoryRef.current;
    if (history.length < 2) return;

    // Draw horizontal threshold reference lines (50 dB, 70 dB, 85 dB)
    const drawLine = (dbVal: number, color: string, label: string) => {
      const y = height - ((dbVal - 30) / (110 - 30)) * height;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#71717a';
      ctx.font = '9px monospace';
      ctx.fillText(label, 4, y - 2);
    };

    drawLine(50, 'rgba(113, 113, 122, 0.3)', '50 dB');
    drawLine(70, 'rgba(161, 161, 170, 0.35)', '70 dB');
    drawLine(85, 'rgba(244, 63, 94, 0.4)', '85 dB');

    // Draw historical curve
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';

    const step = width / (Math.max(history.length - 1, 1));
    for (let i = 0; i < history.length; i++) {
      const val = history[i];
      const normalized = (val - 30) / (110 - 30);
      const clamped = Math.max(0, Math.min(1, normalized));
      const x = i * step;
      const y = height - clamped * height;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Fill under curve
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }, []);

  // Draw Voice Waveform Canvas
  const drawWaveform = useCallback((timeData: Uint8Array) => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();

    const sliceWidth = width / timeData.length;
    let x = 0;

    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, []);

  // Main Audio Processing Loop
  const startAudioProcessingLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const timeBuffer = new Uint8Array(analyser.fftSize);
    let sampleCounter = 0;
    let runningDbTotal = 0;
    let localMaxDb = 0;

    const processFrame = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteTimeDomainData(timeBuffer);

      // Compute RMS
      let sumSquares = 0;
      for (let i = 0; i < timeBuffer.length; i++) {
        const normalized = (timeBuffer[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / timeBuffer.length);

      // Convert RMS to estimated Decibels (dB SPL calibrated estimation)
      // Clamped cleanly between 30 dB (ambient silence) and 105 dB (extreme noise)
      const estimatedDb = Math.round(
        Math.max(30, Math.min(105, 20 * Math.log10(rms + 1e-5) + 100))
      );

      setCurrentDb(estimatedDb);
      sampleCounter++;
      runningDbTotal += estimatedDb;
      if (estimatedDb > localMaxDb) {
        localMaxDb = estimatedDb;
        setMaxDb(localMaxDb);
      }
      setAvgDb(Math.round(runningDbTotal / sampleCounter));

      // Append to rolling history every ~100ms (every 6 frames)
      if (sampleCounter % 6 === 0) {
        dbHistoryRef.current.push(estimatedDb);
        if (dbHistoryRef.current.length > 50) {
          dbHistoryRef.current.shift();
        }
        drawNoiseGraph();
      }

      // Voice test data collection
      const currentPhase = testPhaseRef.current;
      if (currentPhase === 'calibrating') {
        baselineNoiseSamplesRef.current.push(estimatedDb);
      } else if (currentPhase === 'speaking') {
        voiceSamplesRef.current.push(estimatedDb);
        drawWaveform(timeBuffer);
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [drawNoiseGraph, drawWaveform]);

  // Start Live Monitoring
  const startMonitoring = async () => {
    setErrorMessage(null);
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setPermissionState('unsupported');
        setErrorMessage('Your browser does not support audio capture via MediaDevices.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      mediaStreamRef.current = stream;
      setPermissionState('granted');

      // Check device label
      const track = stream.getAudioTracks()[0];
      if (track) {
        setMicDeviceLabel(track.label || 'Default Audio Input');
        const settings = track.getSettings();
        setDspSupported(settings.noiseSuppression !== false);
      }

      // Initialize AudioContext
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      dbHistoryRef.current = [];
      setIsMonitoring(true);
      startAudioProcessingLoop();
    } catch (err: any) {
      console.error('Audio capture error:', err);
      setPermissionState('denied');
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Microphone permission was denied. Please allow microphone access in your browser settings to measure gym noise.'
          : `Failed to initialize audio input: ${err.message || err}`
      );
      stopAudioCapture();
    }
  };

  // Start Voice Clarity Test
  const startVoiceTest = async () => {
    if (!isMonitoring) {
      await startMonitoring();
    }

    setIsTestingVoice(true);
    setTestPhase('calibrating');
    testPhaseRef.current = 'calibrating';
    setCountdown(2);
    baselineNoiseSamplesRef.current = [];
    voiceSamplesRef.current = [];
    setClarityResult(null);
    setClaritySnr(null);
    setClaritySuggestions([]);

    let remainingCalib = 2;
    testTimerRef.current = setInterval(() => {
      remainingCalib--;
      setCountdown(remainingCalib);

      if (remainingCalib <= 0) {
        if (testTimerRef.current) clearInterval(testTimerRef.current);

        // Switch to Speaking Phase
        setTestPhase('speaking');
        testPhaseRef.current = 'speaking';
        setCountdown(4);

        let remainingSpeaking = 4;
        testTimerRef.current = setInterval(() => {
          remainingSpeaking--;
          setCountdown(remainingSpeaking);

          if (remainingSpeaking <= 0) {
            if (testTimerRef.current) clearInterval(testTimerRef.current);
            finishVoiceTest();
          }
        }, 1000);
      }
    }, 1000);
  };

  // Evaluate Voice Clarity & SNR
  const finishVoiceTest = () => {
    setTestPhase('completed');
    testPhaseRef.current = 'completed';
    setIsTestingVoice(false);

    const baselineList = baselineNoiseSamplesRef.current;
    const voiceList = voiceSamplesRef.current;

    const baseFloor = baselineList.length > 0
      ? baselineList.reduce((a, b) => a + b, 0) / baselineList.length
      : 50;

    // Peak 90th percentile of voice samples
    let peakVoice = baseFloor;
    if (voiceList.length > 0) {
      const sorted = [...voiceList].sort((a, b) => a - b);
      peakVoice = sorted[Math.floor(sorted.length * 0.9)];
    }

    const estimatedSnr = Math.max(0, Math.round(peakVoice - baseFloor));
    setClaritySnr(estimatedSnr);

    let rating: ClarityRating = 'Good';
    const suggestions: string[] = [];

    if (estimatedSnr >= 18) {
      rating = 'Excellent';
    } else if (estimatedSnr >= 12) {
      rating = 'Good';
    } else if (estimatedSnr >= 6) {
      rating = 'Fair';
      suggestions.push('Move your phone or wearable microphone within 30–45 cm of your mouth.');
      suggestions.push('Face away from high-powered gym speakers or heavy deadlift platforms.');
      suggestions.push('Project your voice with punchy, deliberate cadence.');
    } else {
      rating = 'Poor';
      suggestions.push('Background noise is actively drowning out your voice.');
      suggestions.push('Use Bluetooth earbuds or a headset with a dedicated beamforming microphone.');
      suggestions.push('Move away from loud cardiovascular machinery or barbell drop zones.');
      suggestions.push('Hold the device directly in front of you while speaking commands.');
    }

    setClarityResult(rating);
    setClaritySuggestions(suggestions);

    // Save to history
    const recs = getRecommendations(avgDb || currentDb);
    const newRecord: AudioMeasurementRecord = {
      id: `rec_${Date.now()}`,
      timestamp: new Date().toISOString(),
      avgDb: avgDb || currentDb,
      maxDb: maxDb || currentDb,
      clarityResult: rating,
      snrDb: estimatedSnr,
      recommendedAnc: recs.listeningAnc,
      recommendedMic: recs.micSuppression,
    };
    saveHistoryRecord(newRecord);
  };

  const noiseClass = getNoiseClassification(currentDb);
  const recommendations = getRecommendations(isMonitoring ? (avgDb || currentDb) : 58);

  // SVG Gauge calculations (normalized 30 to 105 dB)
  const normalizedGauge = isMonitoring
    ? Math.max(0, Math.min(1, (currentDb - 30) / (105 - 30)))
    : 0;
  const strokeDashoffset = 283 - 283 * normalizedGauge;

  return (
    <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-5 space-y-5 shadow-xl font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-750 flex items-center justify-center text-white">
            <Volume2 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                GYM AUDIO INTELLIGENCE
              </span>
              {isMonitoring && (
                <span className="flex items-center gap-1 text-[9px] font-black text-white px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            <h3 className="text-sm font-extrabold text-white">
              Acoustic Noise & Voice Clarity
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-bold flex items-center gap-1 transition"
              title="View History"
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">History ({history.length})</span>
            </button>
          )}

          <button
            onClick={isMonitoring ? stopAudioCapture : startMonitoring}
            className={`px-3.5 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition shadow-sm ${
              isMonitoring
                ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                : 'bg-white hover:bg-zinc-200 text-black'
            }`}
          >
            {isMonitoring ? (
              <>
                <MicOff className="h-3.5 w-3.5" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5" />
                <span>Start Monitoring</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Permission Denial / Error Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-750 text-xs text-zinc-300 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-white">{errorMessage}</p>
            <p className="text-[11px] text-zinc-400 mt-1">
              RepVoice analyzes decibels locally in memory to recommend gym audio settings. Audio is never recorded or uploaded.
            </p>
          </div>
        </div>
      )}

      {/* Section A: Live Noise Level Circular Meter & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Animated Circular Gauge */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-900/60 border border-zinc-850">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle track */}
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="7"
                className="text-zinc-850"
                fill="transparent"
              />
              {/* Active level stroke */}
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="7"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`transition-all duration-150 ${
                  currentDb > 85 ? 'text-rose-400' : currentDb > 70 ? 'text-amber-300' : 'text-white'
                }`}
                fill="transparent"
              />
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-white font-mono tracking-tight">
                {isMonitoring ? currentDb : '--'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                dB (est.)
              </span>
              <span
                className={`mt-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                  isMonitoring ? noiseClass.pillClass : 'bg-zinc-850 text-zinc-500 border-zinc-800'
                }`}
              >
                {isMonitoring ? noiseClass.category : 'Standby'}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 text-center mt-2 px-2">
            {isMonitoring ? noiseClass.desc : 'Click "Start Monitoring" to measure ambient gym noise.'}
          </p>
        </div>

        {/* Rolling Canvas Graph & Min/Max Cards */}
        <div className="sm:col-span-7 flex flex-col gap-3">
          {/* Rolling Graph Canvas */}
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-850 p-3">
            <div className="flex items-center justify-between mb-1 text-[11px] font-bold text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-white" />
                Live Ambient History
              </span>
              <span className="font-mono text-[10px] text-zinc-400">
                {isMonitoring ? 'Continuous 100ms rolling' : 'Paused'}
              </span>
            </div>
            <canvas
              ref={graphCanvasRef}
              width={340}
              height={85}
              className="w-full h-20 rounded-xl bg-zinc-950 border border-zinc-800"
            />
          </div>

          {/* Average & Max Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-850">
              <span className="text-[10px] font-bold uppercase text-zinc-400 block">Average Noise</span>
              <span className="text-lg font-black text-white font-mono">
                {isMonitoring ? `${avgDb} dB` : '--'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-850">
              <span className="text-[10px] font-bold uppercase text-zinc-400 block">Peak Noise</span>
              <span className="text-lg font-black text-white font-mono">
                {isMonitoring ? `${maxDb} dB` : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Calibration Disclaimer */}
      <div className="text-[10px] text-zinc-500 bg-zinc-900/40 border border-zinc-850/80 rounded-xl p-2.5 flex items-start gap-2">
        <Info className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" />
        <span>
          Acoustic estimations are derived from microphone sensitivity and software gain. They provide environmental guidance and do not replace calibrated Class 1 sound level meters.
        </span>
      </div>

      {/* Section B: Voice Clarity Test */}
      <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
              VOICE CLARITY BENCHMARK
            </span>
            <h4 className="text-xs font-bold text-white">
              Signal-to-Noise Ratio (SNR) Test
            </h4>
          </div>

          <button
            onClick={startVoiceTest}
            disabled={isTestingVoice}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{isTestingVoice ? 'Testing...' : 'Start Voice Test'}</span>
          </button>
        </div>

        {/* Test in Progress UI */}
        {isTestingVoice && (
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-750 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                {testPhase === 'calibrating'
                  ? 'Measuring Gym Noise Floor...'
                  : 'Speak Your Test Phrase Now:'}
              </span>
              <span className="font-mono text-zinc-300 font-bold">{countdown}s</span>
            </div>

            {testPhase === 'speaking' ? (
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-center">
                  <span className="text-xs text-white font-mono font-bold">
                    &ldquo;Bench press, 60 kilograms, 10 reps&rdquo;
                  </span>
                </div>
                <canvas
                  ref={waveformCanvasRef}
                  width={340}
                  height={45}
                  className="w-full h-11 rounded-lg bg-zinc-900 border border-zinc-800"
                />
              </div>
            ) : (
              <p className="text-[11px] text-zinc-400">
                Please remain silent for 2 seconds so we can capture your gym ambient noise baseline.
              </p>
            )}
          </div>
        )}

        {/* Test Result Display */}
        {clarityResult && !isTestingVoice && (
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-white" />
                <span className="text-xs font-bold text-white">Voice Clarity:</span>
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                    clarityResult === 'Excellent' || clarityResult === 'Good'
                      ? 'bg-zinc-800 text-white border-zinc-600'
                      : 'bg-amber-950/70 text-amber-300 border-amber-800'
                  }`}
                >
                  {clarityResult}
                </span>
              </div>
              {claritySnr !== null && (
                <span className="text-[11px] text-zinc-400 font-mono">
                  SNR: +{claritySnr} dB
                </span>
              )}
            </div>

            {claritySuggestions.length > 0 && (
              <div className="pt-2 border-t border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Recommendations to improve recognition:
                </span>
                <ul className="space-y-1">
                  {claritySuggestions.map((sug, idx) => (
                    <li key={idx} className="text-[11px] text-zinc-300 flex items-start gap-1.5">
                      <span className="text-zinc-500 font-bold">&bull;</span>
                      <span>{sug}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section C: Intelligent Noise Cancellation Recommendations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
            INTELLIGENT AUDIO SETTINGS RECOMMENDATIONS
          </span>
          <span className="text-[10px] text-zinc-400">Acoustic Guidance</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card 1: Listening-Side ANC */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                  <Headphones className="h-3.5 w-3.5 text-white" />
                  Headphone ANC (Listening)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-white font-extrabold text-[10px]">
                  {recommendations.listeningAnc}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {recommendations.listeningRationale}
              </p>
            </div>
            <span className="text-[9px] text-zinc-500 font-mono">Target: Audio & Voice Feedback</span>
          </div>

          {/* Card 2: Microphone-Side Noise Suppression */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-white" />
                  Microphone Suppression (Input)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-white font-extrabold text-[10px]">
                  {recommendations.micSuppression}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {recommendations.micRationale}
              </p>
            </div>
            <span className="text-[9px] text-zinc-500 font-mono">Target: Speech Command Ingestion</span>
          </div>
        </div>

        {/* Hardware Limitation Notice */}
        <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-850 text-[10px] text-zinc-400 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" />
          <span>
            Operating system policies prevent web browsers from changing Bluetooth headphone hardware ANC directly. Please set your headphone companion app (Sony, Bose, Apple Settings, Galaxy Wearable) or device sound settings to these recommended levels.
          </span>
        </div>
      </div>

      {/* Section D: Device Compatibility Bar */}
      <div className="pt-2 border-t border-zinc-850 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span className="truncate max-w-[200px] font-mono text-[10px] text-zinc-300">
            {micDeviceLabel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-zinc-400">
            Hardware DSP: {dspSupported ? 'Active' : 'Bypassed'}
          </span>
          <span className="text-[10px] font-mono text-zinc-400">
            Privacy: Local Only
          </span>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-white" />
                <h3 className="text-sm font-extrabold text-white">Acoustic History</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearHistory}
                  className="p-1.5 text-zinc-500 hover:text-rose-400 text-xs transition"
                  title="Clear History"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                    {item.clarityResult && (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-white font-extrabold">
                        {item.clarityResult} ({item.snrDb !== null ? `+${item.snrDb} dB` : ''})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 font-bold">
                      Avg: <span className="font-mono text-white">{item.avgDb} dB</span> &bull; Max:{' '}
                      <span className="font-mono text-white">{item.maxDb} dB</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      ANC: {item.recommendedAnc} / Mic: {item.recommendedMic}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
