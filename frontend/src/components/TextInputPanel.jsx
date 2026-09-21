import { FiLoader, FiMic, FiMicOff, FiSquare, FiTrash2, FiVolume2 } from 'react-icons/fi';
import { MAX_TEXT_LENGTH } from '../constants';
import LanguageSelector from './LanguageSelector';

function TextInputPanel({
  text, language, languages, direction, placeholder, isConverting, microphoneState, isSpeechRecognitionSupported,
  sourceSpeechState, isSpeechSupported, speechAvailability, onTextChange, onLanguageChange, onClear, onKeyDown, onMicrophone, onSpeak,
}) {
  const microphoneIsListening = microphoneState === 'listening';
  const microphoneIsProcessing = microphoneState === 'processing';
  const microphoneLabel = !isSpeechRecognitionSupported
    ? 'Speech input is not supported in this browser.'
    : microphoneIsListening ? 'Stop voice input' : microphoneIsProcessing ? 'Processing voice input' : 'Start voice input';
  const sourceSpeechLabel = !isSpeechSupported
    ? 'Text-to-speech is not supported in this browser.'
    : speechAvailability === 'unavailable' ? 'Speech is not available for this language.'
      : speechAvailability === 'pending' ? 'Speech voices are still loading.'
    : sourceSpeechState === 'loading' ? 'Preparing source speech'
      : sourceSpeechState === 'speaking' ? 'Stop source speech' : 'Listen to source text';
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
          <button className="icon-button" type="button" aria-label={sourceSpeechLabel} title={sourceSpeechLabel} onClick={onSpeak} disabled={!text || !isSpeechSupported || speechAvailability === 'unavailable'}>
            {sourceSpeechState === 'loading' ? <FiLoader className="loading-icon" /> : sourceSpeechState === 'speaking' ? <FiSquare /> : <FiVolume2 />}
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
        placeholder={placeholder}
      />
      <div className="panel-footer">
        <span>{text.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}</span>
        <span className="input-hint">{isConverting ? 'Converting source text…' : 'Ctrl + Enter to translate'}</span>
      </div>
    </section>
  );
}

export default TextInputPanel;
