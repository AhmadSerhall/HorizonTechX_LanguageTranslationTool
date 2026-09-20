import { FiAlertCircle, FiCheck, FiCopy, FiVolume2 } from 'react-icons/fi';
import LanguageSelector from './LanguageSelector';

function TranslationOutput({ text, language, direction, message, copied, onLanguageChange, onCopy, onSpeak }) {
  const hasTranslation = Boolean(text);

  return (
    <section className="translation-panel output-panel" aria-label="Translated text">
      <div className="panel-topline">
        <LanguageSelector
          id="target-language"
          label="Target language"
          value={language}
          onChange={onLanguageChange}
        />
        <div>
          <button className="icon-button" type="button" aria-label="Copy translated text" title="Copy translation" onClick={onCopy} disabled={!hasTranslation}>
            {copied ? <FiCheck /> : <FiCopy />}
          </button>
          <button className="icon-button" type="button" aria-label="Listen to translated text" title="Listen to translation" onClick={onSpeak} disabled={!hasTranslation}>
            <FiVolume2 />
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
        {copied && <span>Copied to clipboard</span>}
      </div>
    </section>
  );
}

export default TranslationOutput;
