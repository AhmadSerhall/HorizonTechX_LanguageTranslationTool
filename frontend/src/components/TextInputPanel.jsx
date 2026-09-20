import { FiMic, FiTrash2 } from 'react-icons/fi';
import { MAX_TEXT_LENGTH } from '../constants';
import LanguageSelector from './LanguageSelector';

function TextInputPanel({ text, language, direction, onTextChange, onLanguageChange, onClear, onKeyDown }) {
  return (
    <section className="translation-panel" aria-label="Source text">
      <div className="panel-topline">
        <LanguageSelector
          id="source-language"
          label="Source language"
          value={language}
          onChange={onLanguageChange}
          selectorType="source"
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
        onKeyDown={onKeyDown}
        maxLength={MAX_TEXT_LENGTH}
        placeholder="Enter text to translate..."
      />
      <div className="panel-footer">
        <span>{text.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}</span>
        <span className="input-hint">Ctrl + Enter to translate</span>
      </div>
    </section>
  );
}

export default TextInputPanel;
