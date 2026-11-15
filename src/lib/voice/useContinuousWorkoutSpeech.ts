'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type ContinuousSpeechStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'reconnecting'
  | 'error'
  | 'unsupported';

interface UseContinuousWorkoutSpeechProps {
  onFinalUtterance: (finalText: string) => void;
  onInterimUtterance?: (interimText: string) => void;
  lang?: string;
}

interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export function useContinuousWorkoutSpeech({
  onFinalUtterance,
  onInterimUtterance,
  lang = 'en-US',
}: UseContinuousWorkoutSpeechProps) {
  const [status, setStatus] = useState<ContinuousSpeechStatus>('idle');
  const [isListeningDesired, setIsListeningDesired] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [lastFinalTranscript, setLastFinalTranscript] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const isListeningDesiredRef = useRef<boolean>(false);
  const isStartingOrActiveRef = useRef<boolean>(false);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveErrorsRef = useRef<number>(0);
  const processedUtterancesRef = useRef<Set<string>>(new Set());
  const lastInterimTranscriptRef = useRef<string>('');

  // Callbacks in refs to prevent unnecessary re-binds or cancellations
  const onFinalUtteranceRef = useRef(onFinalUtterance);
  const onInterimUtteranceRef = useRef(onInterimUtterance);

  useEffect(() => {
    onFinalUtteranceRef.current = onFinalUtterance;
  }, [onFinalUtterance]);

  useEffect(() => {
    onInterimUtteranceRef.current = onInterimUtterance;
  }, [onInterimUtterance]);

  // Clean stop helper
  const cleanStopRecognition = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    isStartingOrActiveRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }
  }, []);

  // Controlled restart function
  const attemptRestart = useCallback(() => {
    if (!isListeningDesiredRef.current) return;
    if (isStartingOrActiveRef.current) return;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
    }

    // Delay restart slightly to let audio resources release cleanly
    restartTimerRef.current = setTimeout(() => {
      if (!isListeningDesiredRef.current) return;
      if (!recognitionRef.current) return;

      try {
        setStatus('reconnecting');
        isStartingOrActiveRef.current = true;
        recognitionRef.current.start();
      } catch (err: any) {
        isStartingOrActiveRef.current = false;
        // If already started, mark as listening
        if (err?.name === 'InvalidStateError') {
          setStatus('listening');
        } else {
          console.warn('Speech restart exception:', err);
          consecutiveErrorsRef.current += 1;
          if (consecutiveErrorsRef.current > 5) {
            setStatus('error');
            setErrorMessage('Unable to maintain continuous microphone connection.');
          } else {
            // Retry with exponential backoff
            restartTimerRef.current = setTimeout(attemptRestart, 600);
          }
        }
      }
    }, 250);
  }, []);

  // Initialize SpeechRecognition once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus('unsupported');
      setErrorMessage('Browser Speech API not supported. Please use Chrome, Safari, or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isStartingOrActiveRef.current = true;
      consecutiveErrorsRef.current = 0;
      setStatus('listening');
      setErrorMessage(null);
    };

    recognition.onresult = (event: any) => {
      let interim = '';

      // Process only from resultIndex forward to avoid duplicate re-processing
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const transcriptText = result[0]?.transcript?.trim() || '';

        if (!transcriptText) continue;

        if (result.isFinal) {
          // Deduplication key based on utterance text and approximate timestamp
          const dedupeKey = `${transcriptText.toLowerCase()}_${Math.floor(Date.now() / 2500)}`;

          if (!processedUtterancesRef.current.has(dedupeKey)) {
            processedUtterancesRef.current.add(dedupeKey);
            // Limit memory of processed keys
            if (processedUtterancesRef.current.size > 100) {
              const firstItem = processedUtterancesRef.current.values().next().value;
              if (firstItem) processedUtterancesRef.current.delete(firstItem);
            }

            lastInterimTranscriptRef.current = '';
            setLastFinalTranscript(transcriptText);
            setInterimTranscript('');
            setStatus('processing');

            // Dispatch finalized utterance
            try {
              onFinalUtteranceRef.current(transcriptText);
            } catch (dispatchErr) {
              console.error('Error dispatching final utterance:', dispatchErr);
            }

            // Return to listening status
            setTimeout(() => {
              if (isListeningDesiredRef.current) {
                setStatus('listening');
              }
            }, 300);
          }
        } else {
          interim += transcriptText + ' ';
        }
      }

      const trimmedInterim = interim.trim();
      lastInterimTranscriptRef.current = trimmedInterim;
      setInterimTranscript(trimmedInterim);
      if (trimmedInterim && onInterimUtteranceRef.current) {
        onInterimUtteranceRef.current(trimmedInterim);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error event:', event.error);
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        isListeningDesiredRef.current = false;
        setIsListeningDesired(false);
        isStartingOrActiveRef.current = false;
        setStatus('error');
        setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser URL bar.');
      } else if (event.error === 'no-speech') {
        // Natural silence in the gym: do not stop continuous listening
      } else if (event.error === 'aborted') {
        isStartingOrActiveRef.current = false;
      } else if (event.error === 'audio-capture') {
        isStartingOrActiveRef.current = false;
        consecutiveErrorsRef.current += 1;
        if (consecutiveErrorsRef.current > 4) {
          setStatus('error');
          setErrorMessage('Microphone capture error. Please ensure no other application is using your microphone.');
        } else {
          // Retry after a short backoff
          restartTimerRef.current = setTimeout(attemptRestart, 500);
        }
      } else {
        consecutiveErrorsRef.current += 1;
        if (consecutiveErrorsRef.current > 4) {
          setStatus('error');
          setErrorMessage(`Microphone error: ${event.error}`);
        }
      }
    };

    recognition.onend = () => {
      isStartingOrActiveRef.current = false;

      // If there was an unfinalized interim transcript that has command content, dispatch it before restart
      const pendingInterim = lastInterimTranscriptRef.current.trim();
      if (pendingInterim) {
        lastInterimTranscriptRef.current = '';
        const dedupeKey = `${pendingInterim.toLowerCase()}_${Math.floor(Date.now() / 2500)}`;
        if (!processedUtterancesRef.current.has(dedupeKey)) {
          processedUtterancesRef.current.add(dedupeKey);
          setLastFinalTranscript(pendingInterim);
          setInterimTranscript('');
          try {
            onFinalUtteranceRef.current(pendingInterim);
          } catch (dispatchErr) {
            console.error('Error dispatching pending utterance on speech end:', dispatchErr);
          }
        }
      }

      // If user still wants listening active, auto-restart seamlessly
      if (isListeningDesiredRef.current) {
        attemptRestart();
      } else {
        setStatus('idle');
        setInterimTranscript('');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      cleanStopRecognition();
      recognitionRef.current = null;
    };
  }, [lang, attemptRestart, cleanStopRecognition]);

  // Public control: Start continuous listening
  const startContinuousListening = useCallback(() => {
    if (!recognitionRef.current) {
      const win = typeof window !== 'undefined' ? (window as unknown as IWindow) : null;
      if (!win?.SpeechRecognition && !win?.webkitSpeechRecognition) {
        setStatus('unsupported');
      }
      return;
    }

    isListeningDesiredRef.current = true;
    setIsListeningDesired(true);
    setErrorMessage(null);
    consecutiveErrorsRef.current = 0;
    setInterimTranscript('');

    if (!isStartingOrActiveRef.current) {
      try {
        isStartingOrActiveRef.current = true;
        setStatus('listening');
        recognitionRef.current.start();
      } catch (e: any) {
        isStartingOrActiveRef.current = false;
        if (e?.name === 'InvalidStateError') {
          setStatus('listening');
        } else {
          console.warn('Recognition start exception:', e);
          attemptRestart();
        }
      }
    }
  }, [attemptRestart]);

  // Public control: Stop continuous listening
  const stopContinuousListening = useCallback(() => {
    isListeningDesiredRef.current = false;
    setIsListeningDesired(false);
    cleanStopRecognition();
    setStatus('idle');
    setInterimTranscript('');
  }, [cleanStopRecognition]);

  return {
    status,
    isListeningActive: isListeningDesired && status !== 'error' && status !== 'unsupported',
    isListeningDesired,
    interimTranscript,
    lastFinalTranscript,
    errorMessage,
    startContinuousListening,
    stopContinuousListening,
  };
}
