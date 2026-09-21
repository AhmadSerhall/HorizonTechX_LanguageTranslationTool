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
    const updateVoices = () => setVoices(window.speechSynthesis.getVoices() || []);
    updateVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', updateVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', updateVoices);
      window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  const speak = useCallback((text, languageCode, speaker = 'translation') => {
    if (!isSupported || !text.trim()) return false;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = selectVoice(voices, languageCode);
    utterance.lang = voice?.lang || speechLocales[languageCode] || languageCode || navigator.language || 'en-US';
    if (voice) utterance.voice = voice;

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

  return { activeSpeaker, cancel, isSupported, speak, speechState };
}
