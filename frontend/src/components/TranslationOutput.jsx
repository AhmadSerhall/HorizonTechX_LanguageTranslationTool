import { FiAlertCircle, FiCheck, FiCopy, FiLoader, FiSquare, FiVolume2 } from 'react-icons/fi';
import { getOutputPlaceholder } from '../data/uiTranslations';
import LanguageSelector from './LanguageSelector';
import TranslationSkeleton from './TranslationSkeleton';

function TranslationOutput({
  text, sourceText, language, languages, direction, isLoading, message, copied, detectedLanguageName, speechState, isSpeechSupported, isConvertingSource,
  onLanguageChange, onCopy, onSpeak,
}) {
  const hasTranslation = Boolean(text);
  const speechLabel = !isSpeechSupported
    ? 'Text-to-speech is not supported in this browser.'
    : speechState === 'loading' ? 'Preparing speech'
      : speechState === 'speaking' ? 'Stop speaking' : 'Listen to translation';
  const localizedPlaceholder = getOutputPlaceholder(language);

  return (
    <section className="translation-panel output-panel" aria-label="Translated text">
      <div className="panel-topline">
        <LanguageSelector
          id="target-language"
          label="Target language"
          value={language}
          onChange={onLanguageChange}
          selectorType="target"
          languages={languages}
          disabled={isConvertingSource}
        />
        <div>
          <button className="icon-button" type="button" aria-label="Copy translated text" title="Copy translation" onClick={onCopy} disabled={!hasTranslation}>
            {copied ? <FiCheck /> : <FiCopy />}
          </button>
          <button className="icon-button" type="button" aria-label={speechLabel} title={speechLabel} onClick={onSpeak} disabled={!hasTranslation || !isSpeechSupported}>
            {speechState === 'loading' ? <FiLoader className="loading-icon" /> : speechState === 'speaking' ? <FiSquare /> : <FiVolume2 />}
          </button>
        </div>
      </div>
      <div className="output-content" dir={direction} aria-live="polite">
        {isLoading && <TranslationSkeleton sourceText={sourceText} direction={direction} />}
        {!isLoading && hasTranslation && <div className="translation-result">{text}</div>}
        {!isLoading && !hasTranslation && message && <div className="service-message"><FiAlertCircle />{message}</div>}
        {!isLoading && !hasTranslation && !message && <div className="output-placeholder">{localizedPlaceholder}</div>}
      </div>
      <div className="panel-footer">
        <span>{hasTranslation ? `${text.length.toLocaleString()} characters` : isLoading ? 'Translating…' : 'Translation output'}</span>
        {copied ? <span>Copied</span> : detectedLanguageName && <span>Detected: {detectedLanguageName}</span>}
      </div>
    </section>
  );
}

export default TranslationOutput;
