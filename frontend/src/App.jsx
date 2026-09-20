import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import Header from './components/Header';
import Translator from './components/Translator';
import { fallbackLanguages, getLanguage, isRightToLeftLanguage } from './data/languages';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { requestLanguages, requestTranslation } from './services/translationService';

const LANGUAGE_CACHE_KEY = 'lingua-translate-language-catalog';

const recognitionLocales = {
  ar: 'ar-SA',
  de: 'de-DE',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  ja: 'ja-JP',
  ko: 'ko-KR',
  pt: 'pt-PT',
  ru: 'ru-RU',
  tr: 'tr-TR',
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
};

const getRecognitionLanguage = (languageCode) => (
  languageCode === 'auto'
    ? navigator.language || 'en-US'
    : recognitionLocales[languageCode] || languageCode
);

const recognitionErrorMessages = {
  'not-allowed': 'Microphone permission was not granted.',
  'service-not-allowed': 'Speech input is not available in this browser.',
  'no-speech': 'No speech was detected. Please try again.',
  'audio-capture': 'No microphone was found.',
  network: 'Speech recognition could not reach its service. Please try again.',
};

function App() {
  const [sourceText, setSourceText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('fr');
  const [translatedText, setTranslatedText] = useState('');
  const [serviceMessage, setServiceMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConvertingSource, setIsConvertingSource] = useState(false);
  const [copied, setCopied] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [languages, setLanguages] = useState(fallbackLanguages);
  const sourceTextRef = useRef('');
  const requestIdRef = useRef(0);
  const translationControllerRef = useRef(null);
  const conversionControllerRef = useRef(null);

  const resetOutput = useCallback(() => {
    setTranslatedText('');
    setServiceMessage('');
    setCopied(false);
    setDetectedLanguage('');
  }, []);

  const cancelPendingRequests = useCallback(() => {
    requestIdRef.current += 1;
    translationControllerRef.current?.abort();
    conversionControllerRef.current?.abort();
    translationControllerRef.current = null;
    conversionControllerRef.current = null;
    return requestIdRef.current;
  }, []);

  const updateSourceText = useCallback((value) => {
    sourceTextRef.current = value;
    setSourceText(value);
  }, []);

  const {
    cancel: cancelSpeech,
    isSupported: isSpeechSupported,
    speak,
    speechState,
  } = useSpeechSynthesis();

  const handleRecognitionResult = useCallback((recognizedText) => {
    const currentText = sourceTextRef.current.trim();
    const nextText = currentText ? `${currentText} ${recognizedText}` : recognizedText;
    cancelPendingRequests();
    setIsLoading(false);
    setIsConvertingSource(false);
    updateSourceText(nextText);
    resetOutput();
  }, [cancelPendingRequests, resetOutput, updateSourceText]);

  const handleRecognitionError = useCallback((errorCode) => {
    setServiceMessage(recognitionErrorMessages[errorCode] || 'Speech input could not be completed. Please try again.');
  }, []);

  const recognition = useSpeechRecognition({
    onResult: handleRecognitionResult,
    onError: handleRecognitionError,
  });

  useEffect(() => {
    let isActive = true;
    try {
      const cachedCatalog = JSON.parse(window.sessionStorage.getItem(LANGUAGE_CACHE_KEY));
      if (Array.isArray(cachedCatalog) && cachedCatalog.length) setLanguages(cachedCatalog);
    } catch {
      window.sessionStorage.removeItem(LANGUAGE_CACHE_KEY);
    }

    requestLanguages()
      .then((catalog) => {
        if (!isActive) return;
        setLanguages(catalog);
        try {
          window.sessionStorage.setItem(LANGUAGE_CACHE_KEY, JSON.stringify(catalog));
        } catch {
          // Session storage is optional; the in-memory catalog remains usable.
        }
      })
      .catch(() => {
        // A curated local fallback keeps the translator usable if metadata is unavailable.
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    cancelSpeech();
  }, [cancelSpeech, targetLanguage, translatedText]);

  const handleSourceTextChange = useCallback((value) => {
    cancelPendingRequests();
    setIsLoading(false);
    setIsConvertingSource(false);
    updateSourceText(value);
    resetOutput();
  }, [cancelPendingRequests, resetOutput, updateSourceText]);

  const refreshTargetTranslation = useCallback(async ({ text, source, requestId }) => {
    if (!text.trim() || requestId !== requestIdRef.current) return;
    if (source === targetLanguage) {
      setTranslatedText(text);
      setDetectedLanguage('');
      return;
    }

    const controller = new AbortController();
    translationControllerRef.current = controller;
    setIsLoading(true);
    try {
      const result = await requestTranslation({ text, source, target: targetLanguage, signal: controller.signal });
      if (requestId !== requestIdRef.current) return;
      setTranslatedText(result.translatedText);
      setDetectedLanguage(result.detectedLanguage || '');
      setServiceMessage('');
    } catch (error) {
      if (error.name === 'AbortError' || requestId !== requestIdRef.current) return;
      setServiceMessage(error.message || 'Translation service is unavailable.');
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [targetLanguage]);

  const handleSourceLanguageChange = useCallback(async (nextLanguage) => {
    if (nextLanguage === sourceLanguage || isConvertingSource) return;

    recognition.stop();
    cancelSpeech();
    const requestId = cancelPendingRequests();
    const originalText = sourceTextRef.current;

    if (!originalText.trim() || nextLanguage === 'auto') {
      setSourceLanguage(nextLanguage);
      setIsLoading(false);
      resetOutput();
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
      await refreshTargetTranslation({ text: result.translatedText, source: nextLanguage, requestId });
    } catch (error) {
      if (error.name === 'AbortError' || requestId !== requestIdRef.current) return;
      setServiceMessage(error.message || 'Unable to convert the source text. Your original text was kept.');
    } finally {
      if (requestId === requestIdRef.current) setIsConvertingSource(false);
    }
  }, [cancelPendingRequests, cancelSpeech, detectedLanguage, isConvertingSource, recognition, refreshTargetTranslation, resetOutput, sourceLanguage, updateSourceText]);

  const handleTargetLanguageChange = useCallback((nextLanguage) => {
    if (nextLanguage === targetLanguage) return;
    recognition.stop();
    cancelSpeech();
    cancelPendingRequests();
    setIsLoading(false);
    setTargetLanguage(nextLanguage);
    resetOutput();
  }, [cancelPendingRequests, cancelSpeech, recognition, resetOutput, targetLanguage]);

  const handleSwap = useCallback(() => {
    recognition.stop();
    cancelSpeech();
    cancelPendingRequests();
    const resolvedSourceLanguage = sourceLanguage === 'auto' ? detectedLanguage : sourceLanguage;
    if (!resolvedSourceLanguage) {
      setServiceMessage('Translate once to identify the source language before swapping.');
      return;
    }

    const previousInput = sourceTextRef.current;
    setSourceLanguage(targetLanguage);
    setTargetLanguage(resolvedSourceLanguage);
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

  const handleTranslate = useCallback(async () => {
    const text = sourceTextRef.current;
    if (!text.trim() || isConvertingSource) return;

    recognition.stop();
    cancelSpeech();
    const requestId = cancelPendingRequests();
    const controller = new AbortController();
    translationControllerRef.current = controller;
    setIsLoading(true);
    resetOutput();
    try {
      const result = await requestTranslation({ text, source: sourceLanguage, target: targetLanguage, signal: controller.signal });
      if (requestId !== requestIdRef.current) return;
      setTranslatedText(result.translatedText);
      setDetectedLanguage(result.detectedLanguage || '');
    } catch (error) {
      if (error.name === 'AbortError' || requestId !== requestIdRef.current) return;
      setServiceMessage(error.message || 'Translation service is unavailable.');
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [cancelPendingRequests, cancelSpeech, isConvertingSource, recognition, resetOutput, sourceLanguage, targetLanguage]);

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
    if (speechState !== 'idle') {
      cancelSpeech();
      return;
    }
    recognition.stop();
    speak(translatedText, targetLanguage);
  }, [cancelSpeech, isSpeechSupported, recognition, speak, speechState, targetLanguage, translatedText]);

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
          isConvertingSource={isConvertingSource}
          serviceMessage={serviceMessage}
          copied={copied}
          speechState={speechState}
          isSpeechSupported={isSpeechSupported}
          microphoneState={recognition.recognitionState}
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
          onMicrophone={handleMicrophone}
          onInputKeyDown={handleInputKeyDown}
        />
      </div>
    </div>
  );
}

export default App;
