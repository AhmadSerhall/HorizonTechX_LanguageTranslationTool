import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import Header from './components/Header';
import Translator from './components/Translator';
import { AUTO_TRANSLATE_DEBOUNCE_MS, LARGE_TEXT_AUTO_TRANSLATE_DEBOUNCE_MS } from './constants';
import { fallbackLanguages, getLanguage, isRightToLeftLanguage } from './data/languages';
import { getUiTranslation, validateUiTranslationCoverage } from './data/uiTranslations';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { requestLanguages, requestTranslation } from './services/translationService';

const LANGUAGE_CACHE_KEY = 'lingua-translate-language-catalog';
const LARGE_TEXT_THRESHOLD = 1800;

const recognitionLocales = {
  ar: 'ar-SA', de: 'de-DE', en: 'en-US', es: 'es-ES', fr: 'fr-FR', it: 'it-IT',
  ja: 'ja-JP', ko: 'ko-KR', pt: 'pt-PT', ru: 'ru-RU', tr: 'tr-TR',
  'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW',
};

const recognitionErrorMessages = {
  'not-allowed': 'Microphone permission was not granted.',
  'service-not-allowed': 'Speech input is not available in this browser.',
  'no-speech': 'No speech was detected. Please try again.',
  'audio-capture': 'No microphone was found.',
  network: 'Speech recognition could not reach its service. Please try again.',
};

const getRecognitionLanguage = (languageCode) => (
  languageCode === 'auto' ? navigator.language || 'en-US' : recognitionLocales[languageCode] || languageCode
);

const getTranslationKey = (text, source, target) => `${source}\u0000${target}\u0000${text}`;
const getDebounceDelay = (text) => (text.length >= LARGE_TEXT_THRESHOLD
  ? LARGE_TEXT_AUTO_TRANSLATE_DEBOUNCE_MS
  : AUTO_TRANSLATE_DEBOUNCE_MS);

function App() {
  const [sourceText, setSourceText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('fr');
  const [translatedText, setTranslatedText] = useState('');
  const [serviceMessage, setServiceMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isManualTranslation, setIsManualTranslation] = useState(false);
  const [isConvertingSource, setIsConvertingSource] = useState(false);
  const [isMicrophoneProcessing, setIsMicrophoneProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [languages, setLanguages] = useState(fallbackLanguages);
  const sourceTextRef = useRef('');
  const requestIdRef = useRef(0);
  const translationControllerRef = useRef(null);
  const conversionControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const latestRequestedKeyRef = useRef('');
  const latestSuccessfulKeyRef = useRef('');

  const resetOutput = useCallback(() => {
    setTranslatedText('');
    setServiceMessage('');
    setCopied(false);
    setDetectedLanguage('');
  }, []);

  const updateSourceText = useCallback((value) => {
    sourceTextRef.current = value;
    setSourceText(value);
  }, []);

  const clearAutoTranslateTimer = useCallback(() => {
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  }, []);

  const cancelActiveTranslation = useCallback(() => {
    requestIdRef.current += 1;
    translationControllerRef.current?.abort();
    translationControllerRef.current = null;
    latestRequestedKeyRef.current = '';
    return requestIdRef.current;
  }, []);

  const cancelPendingRequests = useCallback(() => {
    clearAutoTranslateTimer();
    const requestId = cancelActiveTranslation();
    conversionControllerRef.current?.abort();
    conversionControllerRef.current = null;
    return requestId;
  }, [cancelActiveTranslation, clearAutoTranslateTimer]);

  const {
    activeSpeaker,
    cancel: cancelSpeech,
    isSupported: isSpeechSupported,
    speak,
    speechState,
  } = useSpeechSynthesis();
  const sourceSpeechState = activeSpeaker === 'source' ? speechState : 'idle';
  const translationSpeechState = activeSpeaker === 'translation' ? speechState : 'idle';
  const sourceSpeechLanguage = sourceLanguage === 'auto'
    ? detectedLanguage || navigator.language || 'en-US'
    : sourceLanguage;

  const startTranslation = useCallback(async ({ text, source, target, force = false, manual = false }) => {
    if (!text.trim()) return false;
    const translationKey = getTranslationKey(text, source, target);
    if (!force && (latestRequestedKeyRef.current === translationKey || latestSuccessfulKeyRef.current === translationKey)) {
      return false;
    }

    const requestId = cancelActiveTranslation();
    latestRequestedKeyRef.current = translationKey;
    setIsManualTranslation(manual);
    setServiceMessage('');
    setTranslatedText('');
    setDetectedLanguage('');
    setCopied(false);

    if (source === target) {
      latestSuccessfulKeyRef.current = translationKey;
      latestRequestedKeyRef.current = '';
      setTranslatedText(text);
      setIsLoading(false);
      setIsManualTranslation(false);
      return true;
    }

    const controller = new AbortController();
    translationControllerRef.current = controller;
    setIsLoading(true);
    try {
      const result = await requestTranslation({ text, source, target, signal: controller.signal });
      if (requestId !== requestIdRef.current) return false;
      latestSuccessfulKeyRef.current = translationKey;
      latestRequestedKeyRef.current = '';
      setTranslatedText(result.translatedText);
      setDetectedLanguage(result.detectedLanguage || '');
      return true;
    } catch (error) {
      if (error.name === 'AbortError' || requestId !== requestIdRef.current) return false;
      latestRequestedKeyRef.current = '';
      setServiceMessage(error.message || 'Translation service is unavailable.');
      return false;
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsManualTranslation(false);
      }
    }
  }, [cancelActiveTranslation]);

  const scheduleAutoTranslation = useCallback(({ text, source, target }) => {
    clearAutoTranslateTimer();
    if (!text.trim()) return;
    const translationKey = getTranslationKey(text, source, target);
    if (latestRequestedKeyRef.current === translationKey || latestSuccessfulKeyRef.current === translationKey) return;

    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      startTranslation({ text, source, target });
    }, getDebounceDelay(text));
  }, [clearAutoTranslateTimer, startTranslation]);

  const handleRecognitionResult = useCallback(async (recognizedText) => {
    const currentText = sourceTextRef.current.trim();
    const nextText = currentText ? `${currentText} ${recognizedText}` : recognizedText;
    cancelPendingRequests();
    setIsLoading(false);
    setIsManualTranslation(false);
    setIsConvertingSource(false);
    updateSourceText(nextText);
    latestSuccessfulKeyRef.current = '';
    resetOutput();
    setIsMicrophoneProcessing(true);
    try {
      await startTranslation({ text: nextText, source: sourceLanguage, target: targetLanguage, force: true });
    } finally {
      setIsMicrophoneProcessing(false);
    }
  }, [cancelPendingRequests, resetOutput, sourceLanguage, startTranslation, targetLanguage, updateSourceText]);

  const handleRecognitionError = useCallback((errorCode) => {
    setIsMicrophoneProcessing(false);
    setServiceMessage(recognitionErrorMessages[errorCode] || 'Speech input could not be completed. Please try again.');
  }, []);

  const recognition = useSpeechRecognition({ onResult: handleRecognitionResult, onError: handleRecognitionError });

  useEffect(() => {
    let isActive = true;
    try {
      const cachedCatalog = JSON.parse(window.sessionStorage.getItem(LANGUAGE_CACHE_KEY));
      if (Array.isArray(cachedCatalog) && cachedCatalog.length) setLanguages(cachedCatalog);
    } catch {
      window.sessionStorage.removeItem(LANGUAGE_CACHE_KEY);
    }

    requestLanguages().then((catalog) => {
      if (!isActive) return;
      const missingTranslations = validateUiTranslationCoverage(catalog);
      if (process.env.NODE_ENV !== 'production' && missingTranslations.length) {
        console.warn(`Missing local UI translations for: ${missingTranslations.join(', ')}`);
      }
      setLanguages(catalog);
      try { window.sessionStorage.setItem(LANGUAGE_CACHE_KEY, JSON.stringify(catalog)); } catch { /* Optional cache. */ }
    }).catch(() => {
      // A curated local fallback keeps the translator usable if metadata is unavailable.
    });

    return () => { isActive = false; };
  }, []);

  useEffect(() => () => clearAutoTranslateTimer(), [clearAutoTranslateTimer]);

  useEffect(() => {
    cancelSpeech();
  }, [cancelSpeech, targetLanguage, translatedText]);

  useEffect(() => {
    cancelSpeech();
  }, [cancelSpeech, sourceLanguage, sourceText]);

  const handleSourceTextChange = useCallback((value) => {
    cancelSpeech();
    cancelPendingRequests();
    setIsLoading(false);
    setIsManualTranslation(false);
    setIsConvertingSource(false);
    setIsMicrophoneProcessing(false);
    updateSourceText(value);
    latestSuccessfulKeyRef.current = '';
    resetOutput();
    scheduleAutoTranslation({ text: value, source: sourceLanguage, target: targetLanguage });
  }, [cancelPendingRequests, cancelSpeech, resetOutput, scheduleAutoTranslation, sourceLanguage, targetLanguage, updateSourceText]);

  const handleSourceLanguageChange = useCallback(async (nextLanguage) => {
    if (nextLanguage === sourceLanguage || isConvertingSource) return;

    recognition.stop();
    cancelSpeech();
    const requestId = cancelPendingRequests();
    const originalText = sourceTextRef.current;
    latestSuccessfulKeyRef.current = '';

    if (!originalText.trim()) {
      setSourceLanguage(nextLanguage);
      setIsLoading(false);
      resetOutput();
      return;
    }

    if (nextLanguage === 'auto') {
      setSourceLanguage(nextLanguage);
      resetOutput();
      startTranslation({ text: originalText, source: nextLanguage, target: targetLanguage });
      return;
    }

    setServiceMessage('');
    setIsConvertingSource(true);
    const controller = new AbortController();
    conversionControllerRef.current = controller;
    const conversionSource = sourceLanguage === 'auto' ? detectedLanguage || 'auto' : sourceLanguage;

    try {
      const result = await requestTranslation({
        text: originalText,
        source: conversionSource,
        target: nextLanguage,
        signal: controller.signal,
      });
      if (requestId !== requestIdRef.current || sourceTextRef.current !== originalText) return;

      updateSourceText(result.translatedText);
      setSourceLanguage(nextLanguage);
      setDetectedLanguage('');
      setTranslatedText('');
      setCopied(false);
      setIsConvertingSource(false);
      startTranslation({ text: result.translatedText, source: nextLanguage, target: targetLanguage });
    } catch (error) {
      if (error.name === 'AbortError' || requestId !== requestIdRef.current) return;
      setServiceMessage(error.message || 'Unable to convert the source text. Your original text was kept.');
    } finally {
      if (requestId === requestIdRef.current) setIsConvertingSource(false);
    }
  }, [cancelPendingRequests, cancelSpeech, detectedLanguage, isConvertingSource, recognition, resetOutput, sourceLanguage, startTranslation, targetLanguage, updateSourceText]);

  const handleTargetLanguageChange = useCallback((nextLanguage) => {
    if (nextLanguage === targetLanguage) return;
    recognition.stop();
    cancelSpeech();
    cancelPendingRequests();
    latestSuccessfulKeyRef.current = '';
    setIsManualTranslation(false);
    setTargetLanguage(nextLanguage);
    resetOutput();
    if (sourceTextRef.current.trim()) {
      startTranslation({ text: sourceTextRef.current, source: sourceLanguage, target: nextLanguage });
    }
  }, [cancelPendingRequests, cancelSpeech, recognition, resetOutput, sourceLanguage, startTranslation, targetLanguage]);

  const handleSwap = useCallback(() => {
    recognition.stop();
    cancelSpeech();
    cancelPendingRequests();
    setIsLoading(false);
    setIsManualTranslation(false);
    const resolvedSourceLanguage = sourceLanguage === 'auto' ? detectedLanguage : sourceLanguage;
    if (!resolvedSourceLanguage) {
      setServiceMessage('Translate once to identify the source language before swapping.');
      return;
    }

    const previousInput = sourceTextRef.current;
    setSourceLanguage(targetLanguage);
    setTargetLanguage(resolvedSourceLanguage);
    latestSuccessfulKeyRef.current = '';
    if (translatedText) {
      updateSourceText(translatedText);
      setTranslatedText(previousInput);
    } else {
      resetOutput();
    }
    setServiceMessage('');
    setCopied(false);
    setDetectedLanguage('');
  }, [cancelPendingRequests, cancelSpeech, detectedLanguage, recognition, resetOutput, sourceLanguage, targetLanguage, translatedText, updateSourceText]);

  const handleTranslate = useCallback(() => {
    const text = sourceTextRef.current;
    if (!text.trim() || isConvertingSource) return;
    clearAutoTranslateTimer();
    recognition.stop();
    cancelSpeech();
    startTranslation({ text, source: sourceLanguage, target: targetLanguage, force: true, manual: true });
  }, [cancelSpeech, clearAutoTranslateTimer, isConvertingSource, recognition, sourceLanguage, startTranslation, targetLanguage]);

  const handleCopy = useCallback(async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setServiceMessage('Unable to copy the translation. Please copy it manually.');
    }
  }, [translatedText]);

  const handleSpeak = useCallback(() => {
    if (!translatedText || !isSpeechSupported) return;
    if (translationSpeechState !== 'idle') {
      cancelSpeech();
      return;
    }
    recognition.stop();
    speak(translatedText, targetLanguage, 'translation');
  }, [cancelSpeech, isSpeechSupported, recognition, speak, targetLanguage, translatedText, translationSpeechState]);

  const handleSourceSpeak = useCallback(() => {
    if (!sourceText.trim() || !isSpeechSupported) return;
    if (sourceSpeechState !== 'idle') {
      cancelSpeech();
      return;
    }
    recognition.stop();
    speak(sourceText, sourceSpeechLanguage, 'source');
  }, [cancelSpeech, isSpeechSupported, recognition, sourceSpeechLanguage, sourceSpeechState, sourceText, speak]);

  const handleMicrophone = useCallback(() => {
    if (!recognition.isSupported) {
      setServiceMessage('Speech input is not supported in this browser.');
      return;
    }
    if (recognition.recognitionState !== 'idle') {
      recognition.stop();
      return;
    }
    cancelSpeech();
    setServiceMessage('');
    recognition.start(getRecognitionLanguage(sourceLanguage));
  }, [cancelSpeech, recognition, sourceLanguage]);

  const handleInputKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      handleTranslate();
    }
  }, [handleTranslate]);

  return (
    <div className="app-shell">
      <div className="app-content">
        <Header />
        <Translator
          sourceText={sourceText}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          translatedText={translatedText}
          languages={languages}
          sourceDirection={sourceLanguage === 'auto' ? 'auto' : isRightToLeftLanguage(sourceLanguage, languages) ? 'rtl' : 'ltr'}
          targetDirection={isRightToLeftLanguage(targetLanguage, languages) ? 'rtl' : 'ltr'}
          isLoading={isLoading}
          isManualTranslation={isManualTranslation}
          isConvertingSource={isConvertingSource}
          serviceMessage={serviceMessage}
          copied={copied}
          isSpeechSupported={isSpeechSupported}
          sourceSpeechState={sourceSpeechState}
          sourcePlaceholder={getUiTranslation(sourceLanguage === 'auto' ? 'en' : sourceLanguage).inputPlaceholder}
          translationSpeechState={translationSpeechState}
          microphoneState={isMicrophoneProcessing ? 'processing' : recognition.recognitionState}
          isSpeechRecognitionSupported={recognition.isSupported}
          detectedLanguageName={getLanguage(detectedLanguage, languages)?.name}
          onSourceTextChange={handleSourceTextChange}
          onSourceLanguageChange={handleSourceLanguageChange}
          onTargetLanguageChange={handleTargetLanguageChange}
          onClear={() => handleSourceTextChange('')}
          onSwap={handleSwap}
          onTranslate={handleTranslate}
          onCopy={handleCopy}
          onSpeak={handleSpeak}
          onSourceSpeak={handleSourceSpeak}
          onMicrophone={handleMicrophone}
          onInputKeyDown={handleInputKeyDown}
        />
      </div>
    </div>
  );
}

export default App;
