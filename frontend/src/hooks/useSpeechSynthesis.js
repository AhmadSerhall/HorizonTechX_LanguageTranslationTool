import { useCallback, useEffect, useRef, useState } from 'react';

const speechLocales = {
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
  'sr-Cyrl': 'sr-RS',
  'sr-Latn': 'sr-Latn-RS',
};

const normalizeLocale = (languageCode = '') => languageCode.replace(/_/g, '-').toLocaleLowerCase();
const getLanguagePrefix = (languageCode) => normalizeLocale(languageCode).split('-')[0];

const selectVoice = (voices, languageCode) => {
  const requestedLocale = normalizeLocale(speechLocales[languageCode] || languageCode);
  const languagePrefix = getLanguagePrefix(requestedLocale);
  const availableVoices = Array.isArray(voices) ? voices : [];
  return availableVoices.find((voice) => normalizeLocale(voice.lang) === requestedLocale)
    || availableVoices.find((voice) => normalizeLocale(voice.lang).startsWith(`${languagePrefix}-`))
    || availableVoices.find((voice) => getLanguagePrefix(voice.lang) === languagePrefix);
};

export function useSpeechSynthesis() {
  const [speechState, setSpeechState] = useState('idle');
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [voices, setVoices] = useState([]);
  const [voicesReady, setVoicesReady] = useState(false);
  const utteranceRef = useRef(null);
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const cancel = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setActiveSpeaker(null);
    setSpeechState('idle');
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported) return undefined;
    const updateVoices = (fromVoicesChangedEvent = false) => {
      const availableVoices = window.speechSynthesis.getVoices() || [];
      setVoices(availableVoices);
      if (availableVoices.length || fromVoicesChangedEvent) setVoicesReady(true);
    };
    updateVoices();
    const handleVoicesChanged = () => updateVoices(true);
    window.speechSynthesis.addEventListener?.('voiceschanged', handleVoicesChanged);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', handleVoicesChanged);
      window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  const getVoiceAvailability = useCallback((languageCode) => {
    if (!isSupported) return 'unsupported';
    if (selectVoice(voices, languageCode)) return 'available';
    return voicesReady ? 'unavailable' : 'pending';
  }, [isSupported, voices, voicesReady]);

  const speak = useCallback((text, languageCode, speaker = 'translation') => {
    if (!isSupported || !text.trim()) return false;

    const voice = selectVoice(voices, languageCode);
    if (!voice) return false;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice.lang;
    utterance.voice = voice;

    utteranceRef.current = utterance;
    setActiveSpeaker(speaker);
    setSpeechState('loading');
    utterance.onstart = () => {
      if (utteranceRef.current === utterance) setSpeechState('speaking');
    };
    utterance.onend = utterance.onerror = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setActiveSpeaker(null);
        setSpeechState('idle');
      }
    };
    window.speechSynthesis.speak(utterance);
    return true;
  }, [isSupported, voices]);

  return { activeSpeaker, cancel, getVoiceAvailability, isSupported, speak, speechState };
}
