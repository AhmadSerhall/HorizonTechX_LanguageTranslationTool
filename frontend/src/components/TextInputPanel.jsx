import { FiMic, FiTrash2 } from 'react-icons/fi';
import LanguageSelector from './LanguageSelector';

function TextInputPanel({ text, language, direction, onTextChange, onLanguageChange, onClear }) {
  return (
    <section className="translation-panel" aria-label="Source text">
      <div className="panel-topline">
        <LanguageSelector
          id="source-language"
          label="Source language"
          value={language}
          onChange={onLanguageChange}
        />
        <div>
          <button className="icon-button" type="button" aria-label="Speech input coming soon" title="Speech input coming soon" disabled>
            <FiMic />
          </button>
          <button className="icon-button" type="button" aria-label="Clear source text" title="Clear text" onClick={onClear} disabled={!text}>
            <FiTrash2 />
          </button>
        </div>
      </div>
      <label className="sr-only" htmlFor="source-text">Text to translate</label>
      <textarea
        id="source-text"
        className="text-input"
        dir={direction}
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder="Enter text to translate..."
      />
      <div className="panel-footer">
        <span>{text.length.toLocaleString()} characters</span>
        <span className="input-hint">Ready when you are</span>
      </div>
    </section>
  );
}

export default TextInputPanel;
