'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export type SpeechStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'permission_denied'
  | 'unsupported'
  | 'error';

interface UseSpeechRecognitionProps {
  onResult?: (transcript: string) => void;
  onInterimResult?: (transcript: string) => void;
  lang?: string;
}

export function useSpeechRecognition({
  onResult,
  onInterimResult,
  lang = 'en-US',
}: UseSpeechRecognitionProps = {}) {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  const onInterimResultRef = useRef(onInterimResult);
  const isListeningRef = useRef(false);
  const fullTranscriptRef = useRef('');

  // Keep callback refs updated without re-triggering effects
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onInterimResultRef.current = onInterimResult;
  }, [onInterimResult]);

  // Initialize SpeechRecognition once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus('unsupported');
      setErrorMessage('Speech recognition is not supported in this browser. Please use Chrome, Safari, or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Stay active across brief pauses
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListeningRef.current = true;
      setStatus('listening');
      setErrorMessage(null);
    };

    recognition.onresult = (event: any) => {
      let finalString = '';
      let interimString = '';

      for (let i = 0; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalString += item[0].transcript + ' ';
        } else {
          interimString += item[0].transcript;
        }
      }

      finalString = finalString.trim();
      fullTranscriptRef.current = finalString || interimString;

      setTranscript(finalString);
      setInterimTranscript(interimString);

      const combinedText = (finalString + ' ' + interimString).trim();
      if (combinedText) {
        if (onInterimResultRef.current) {
          onInterimResultRef.current(combinedText);
        }
        if (finalString && onResultRef.current) {
          onResultRef.current(finalString);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition event error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setStatus('permission_denied');
        setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser URL bar.');
        isListeningRef.current = false;
      } else if (event.error === 'no-speech') {
        // Just keep listening or wait for user input
      } else {
        setStatus('error');
        setErrorMessage(`Speech recognition error: ${event.error}`);
        isListeningRef.current = false;
      }
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setStatus('idle');
      // If we gathered text before ending, ensure it was submitted
      if (fullTranscriptRef.current && onResultRef.current) {
        onResultRef.current(fullTranscriptRef.current);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [lang]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      const win = typeof window !== 'undefined' ? (window as unknown as IWindow) : null;
      if (!win?.SpeechRecognition && !win?.webkitSpeechRecognition) {
        setStatus('unsupported');
      }
      return;
    }

    try {
      setTranscript('');
      setInterimTranscript('');
      fullTranscriptRef.current = '';
      setErrorMessage(null);
      recognitionRef.current.start();
    } catch (e: any) {
      // If recognition is already active, ignore exception
      console.log('Recognition already active or starting:', e?.message);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    isListeningRef.current = false;
    setStatus('idle');

    if (fullTranscriptRef.current && onResultRef.current) {
      onResultRef.current(fullTranscriptRef.current);
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    fullTranscriptRef.current = '';
    setErrorMessage(null);
    setStatus('idle');
  }, []);

  return {
    status,
    transcript,
    interimTranscript,
    errorMessage,
    isListening: status === 'listening',
    isSupported: status !== 'unsupported',
    startListening,
    stopListening,
    reset,
  };
}
