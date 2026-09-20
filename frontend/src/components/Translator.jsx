import { FiLoader, FiRepeat, FiSend } from 'react-icons/fi';
import TextInputPanel from './TextInputPanel';
import TranslationOutput from './TranslationOutput';

function Translator({
  sourceText,
  sourceLanguage,
  targetLanguage,
  translatedText,
  sourceDirection,
  targetDirection,
  isLoading,
  serviceMessage,
  copied,
  detectedLanguageName,
  onSourceTextChange,
  onSourceLanguageChange,
  onTargetLanguageChange,
  onClear,
  onSwap,
  onTranslate,
  onCopy,
  onSpeak,
  onInputKeyDown,
}) {
  return (
    <main>
      <div className="translator-card">
        <div className="translator-panels">
          <TextInputPanel
            text={sourceText}
            language={sourceLanguage}
            direction={sourceDirection}
            onTextChange={onSourceTextChange}
            onLanguageChange={onSourceLanguageChange}
            onClear={onClear}
            onKeyDown={onInputKeyDown}
          />
          <TranslationOutput
            text={translatedText}
            language={targetLanguage}
            direction={targetDirection}
            message={serviceMessage}
            copied={copied}
            detectedLanguageName={detectedLanguageName}
            onLanguageChange={onTargetLanguageChange}
            onCopy={onCopy}
            onSpeak={onSpeak}
          />
        </div>
        <div className="translator-actions">
          <button className="swap-button" type="button" aria-label="Swap source and target languages" title="Swap languages" onClick={onSwap}>
            <FiRepeat />
          </button>
          <button className="translate-button" type="button" onClick={onTranslate} disabled={!sourceText.trim() || isLoading}>
            {isLoading ? <FiLoader className="loading-icon" /> : <FiSend />}
            {isLoading ? 'Translating...' : 'Translate'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default Translator;
