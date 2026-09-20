import { FiAlertCircle, FiCheck, FiCopy, FiLoader, FiSquare, FiVolume2 } from 'react-icons/fi';
import LanguageSelector from './LanguageSelector';

function TranslationOutput({
  text, language, languages, direction, message, copied, detectedLanguageName, speechState, isSpeechSupported, isConvertingSource,
  onLanguageChange, onCopy, onSpeak,
}) {
  const hasTranslation = Boolean(text);
  const speechLabel = !isSpeechSupported
    ? 'Text-to-speech is not supported in this browser.'
    : speechState === 'loading' ? 'Preparing speech'
      : speechState === 'speaking' ? 'Stop speaking' : 'Listen to translation';

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
        {hasTranslation && text}
        {!hasTranslation && message && <div className="service-message"><FiAlertCircle />{message}</div>}
        {!hasTranslation && !message && <div className="output-placeholder">Your translation will appear here.</div>}
      </div>
      <div className="panel-footer">
        <span>{hasTranslation ? `${text.length.toLocaleString()} characters` : 'Translation output'}</span>
        {copied ? <span>Copied</span> : detectedLanguageName && <span>Detected: {detectedLanguageName}</span>}
      </div>
    </section>
  );
}

export default TranslationOutput;
