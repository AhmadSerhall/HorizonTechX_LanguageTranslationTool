import { FiLoader, FiMic, FiMicOff, FiTrash2 } from 'react-icons/fi';
import { MAX_TEXT_LENGTH } from '../constants';
import LanguageSelector from './LanguageSelector';

function TextInputPanel({
  text, language, languages, direction, isConverting, microphoneState, isSpeechRecognitionSupported,
  onTextChange, onLanguageChange, onClear, onKeyDown, onMicrophone,
}) {
  const microphoneIsListening = microphoneState === 'listening';
  const microphoneIsProcessing = microphoneState === 'processing';
  const microphoneLabel = !isSpeechRecognitionSupported
    ? 'Speech input is not supported in this browser.'
    : microphoneIsListening ? 'Stop voice input' : microphoneIsProcessing ? 'Processing voice input' : 'Start voice input';
  return (
    <section className="translation-panel" aria-label="Source text">
      <div className="panel-topline">
        <LanguageSelector
          id="source-language"
          label="Source language"
          value={language}
          onChange={onLanguageChange}
          selectorType="source"
          languages={languages}
          disabled={isConverting || microphoneState !== 'idle'}
          isLoading={isConverting}
        />
        <div>
          <button
            className={`icon-button ${microphoneIsListening ? 'is-listening' : ''}`}
            type="button"
            aria-label={microphoneLabel}
            title={microphoneLabel}
            onClick={onMicrophone}
            disabled={!isSpeechRecognitionSupported || microphoneIsProcessing || isConverting}
          >
            {microphoneIsProcessing ? <FiLoader className="loading-icon" /> : microphoneIsListening ? <FiMicOff /> : <FiMic />}
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
        <span className="input-hint">{isConverting ? 'Converting source text…' : 'Ctrl + Enter to translate'}</span>
      </div>
    </section>
  );
}

export default TextInputPanel;
