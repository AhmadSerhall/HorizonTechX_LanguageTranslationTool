import { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Translator from './components/Translator';
import { getLanguage, isRightToLeftLanguage } from './data/languages';
import { requestTranslation } from './services/translationService';

function App() {
  const [sourceText, setSourceText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('fr');
  const [translatedText, setTranslatedText] = useState('');
  const [serviceMessage, setServiceMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('');

  const resetOutput = () => {
    setTranslatedText('');
    setServiceMessage('');
    setCopied(false);
    setDetectedLanguage('');
  };

  const handleSourceTextChange = (value) => {
    setSourceText(value);
    resetOutput();
  };

  const handleLanguageChange = (setLanguage) => (value) => {
    setLanguage(value);
    resetOutput();
  };

  const handleSwap = () => {
    const resolvedSourceLanguage = sourceLanguage === 'auto' ? detectedLanguage : sourceLanguage;
    if (!resolvedSourceLanguage) {
      setServiceMessage('Translate once to identify the source language before swapping.');
      return;
    }

    const previousInput = sourceText;
    setSourceLanguage(targetLanguage);
    setTargetLanguage(resolvedSourceLanguage);
    if (translatedText) {
      setSourceText(translatedText);
      setTranslatedText(previousInput);
    } else {
      resetOutput();
    }
    setServiceMessage('');
    setCopied(false);
    setDetectedLanguage('');
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;

    setIsLoading(true);
    resetOutput();
    try {
      const result = await requestTranslation({ text: sourceText, source: sourceLanguage, target: targetLanguage });
      setTranslatedText(result.translatedText);
      setDetectedLanguage(result.detectedLanguage || '');
    } catch (error) {
      setServiceMessage(error.message || 'Translation service is unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!translatedText) return;

    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setServiceMessage('Unable to copy the translation. Please copy it manually.');
    }
  };

  const handleSpeak = () => {
    if (!translatedText || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(translatedText);
    utterance.lang = targetLanguage;
    const languagePrefix = targetLanguage.split('-')[0].toLocaleLowerCase();
    const matchingVoice = window.speechSynthesis.getVoices().find((voice) => (
      voice.lang.toLocaleLowerCase().startsWith(languagePrefix)
    ));
    if (matchingVoice) utterance.voice = matchingVoice;
    window.speechSynthesis.speak(utterance);
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      handleTranslate();
    }
  };

  return (
    <div className="app-shell">
      <div className="app-content">
        <Header />
        <Translator
          sourceText={sourceText}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          translatedText={translatedText}
          sourceDirection={sourceLanguage === 'auto' ? 'auto' : isRightToLeftLanguage(sourceLanguage) ? 'rtl' : 'ltr'}
          targetDirection={isRightToLeftLanguage(targetLanguage) ? 'rtl' : 'ltr'}
          isLoading={isLoading}
          serviceMessage={serviceMessage}
          copied={copied}
          detectedLanguageName={getLanguage(detectedLanguage)?.name}
          onSourceTextChange={handleSourceTextChange}
          onSourceLanguageChange={handleLanguageChange(setSourceLanguage)}
          onTargetLanguageChange={handleLanguageChange(setTargetLanguage)}
          onClear={() => handleSourceTextChange('')}
          onSwap={handleSwap}
          onTranslate={handleTranslate}
          onCopy={handleCopy}
          onSpeak={handleSpeak}
          onInputKeyDown={handleInputKeyDown}
        />
      </div>
    </div>
  );
}

export default App;
