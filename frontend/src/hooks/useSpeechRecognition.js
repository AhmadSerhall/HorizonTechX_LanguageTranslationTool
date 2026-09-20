import { useCallback, useEffect, useRef, useState } from 'react';

const getRecognitionConstructor = () => window.SpeechRecognition || window.webkitSpeechRecognition;

export function useSpeechRecognition({ onResult, onError }) {
  const [recognitionState, setRecognitionState] = useState('idle');
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const isSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    setRecognitionState('processing');
    recognitionRef.current.stop();
  }, []);

  const start = useCallback((language) => {
    if (!isSupported || recognitionRef.current) return false;

    const Recognition = getRecognitionConstructor();
    const recognition = new Recognition();
    transcriptRef.current = '';
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => setRecognitionState('listening');
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) transcriptRef.current += `${event.results[index][0].transcript} `;
      }
    };
    recognition.onerror = (event) => {
      if (event.error !== 'aborted') onError?.(event.error);
    };
    recognition.onend = () => {
      const transcript = transcriptRef.current.trim();
      recognitionRef.current = null;
      setRecognitionState('idle');
      if (transcript) onResult?.(transcript);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      return true;
    } catch {
      recognitionRef.current = null;
      setRecognitionState('idle');
      onError?.('start-failed');
      return false;
    }
  }, [isSupported, onError, onResult]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
  }, []);

  return { isSupported, recognitionState, start, stop };
}
