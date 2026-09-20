import { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Translator from './components/Translator';
import { isRightToLeftLanguage } from './data/languages';
import { requestTranslation } from './services/translationService';

function App() {
  const [sourceText, setSourceText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('fr');
  const [translatedText, setTranslatedText] = useState('');
  const [serviceMessage, setServiceMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const resetOutput = () => {
    setTranslatedText('');
    setServiceMessage('');
    setCopied(false);
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
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    resetOutput();
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;

    setIsLoading(true);
    resetOutput();
    try {
      const result = await requestTranslation({ text: sourceText, sourceLanguage, targetLanguage });
      setTranslatedText(result.translatedText);
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
    window.speechSynthesis.speak(utterance);
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
          sourceDirection={isRightToLeftLanguage(sourceLanguage) ? 'rtl' : 'ltr'}
          targetDirection={isRightToLeftLanguage(targetLanguage) ? 'rtl' : 'ltr'}
          isLoading={isLoading}
          serviceMessage={serviceMessage}
          copied={copied}
          onSourceTextChange={handleSourceTextChange}
          onSourceLanguageChange={handleLanguageChange(setSourceLanguage)}
          onTargetLanguageChange={handleLanguageChange(setTargetLanguage)}
          onClear={() => handleSourceTextChange('')}
          onSwap={handleSwap}
          onTranslate={handleTranslate}
          onCopy={handleCopy}
          onSpeak={handleSpeak}
        />
      </div>
    </div>
  );
}

export default App;
