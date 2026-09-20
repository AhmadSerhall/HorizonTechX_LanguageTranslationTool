import { useCallback, useEffect, useRef, useState } from 'react';

const getLanguagePrefix = (languageCode) => languageCode.split('-')[0].toLocaleLowerCase();

export function useSpeechSynthesis() {
  const [speechState, setSpeechState] = useState('idle');
  const [voices, setVoices] = useState([]);
  const utteranceRef = useRef(null);
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const cancel = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeechState('idle');
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported) return undefined;

    const updateVoices = () => setVoices(window.speechSynthesis.getVoices());
    updateVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', updateVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', updateVoices);
      window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  const speak = useCallback((text, languageCode) => {
    if (!isSupported || !text) return false;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const languagePrefix = getLanguagePrefix(languageCode);
    const availableVoices = Array.isArray(voices) ? voices : [];
    const exactVoice = availableVoices.find((voice) => voice.lang.toLocaleLowerCase() === languageCode.toLocaleLowerCase());
    const languageVoice = availableVoices.find((voice) => voice.lang.toLocaleLowerCase().startsWith(languagePrefix));
    utterance.lang = exactVoice?.lang || languageVoice?.lang || languageCode;
    if (exactVoice || languageVoice) utterance.voice = exactVoice || languageVoice;

    utteranceRef.current = utterance;
    setSpeechState('loading');
    utterance.onstart = () => {
      if (utteranceRef.current === utterance) setSpeechState('speaking');
    };
    utterance.onend = utterance.onerror = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setSpeechState('idle');
      }
    };
    window.speechSynthesis.speak(utterance);
    return true;
  }, [isSupported, voices]);

  return { cancel, isSupported, speak, speechState };
}
