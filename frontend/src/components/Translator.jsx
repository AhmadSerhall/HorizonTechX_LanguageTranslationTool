import { FiLoader, FiRepeat, FiSend } from 'react-icons/fi';
import TextInputPanel from './TextInputPanel';
import TranslationOutput from './TranslationOutput';

function Translator({
  sourceText,
  sourceLanguage,
  targetLanguage,
  languages,
  translatedText,
  sourceDirection,
  targetDirection,
  isLoading,
  isManualTranslation,
  isConvertingSource,
  serviceMessage,
  copied,
  speechState,
  isSpeechSupported,
  microphoneState,
  isSpeechRecognitionSupported,
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
  onMicrophone,
}) {
  return (
    <main>
      <div className="translator-card">
        <div className="translator-panels">
          <TextInputPanel
            text={sourceText}
            language={sourceLanguage}
            languages={languages}
            direction={sourceDirection}
            isConverting={isConvertingSource}
            microphoneState={microphoneState}
            isSpeechRecognitionSupported={isSpeechRecognitionSupported}
            onTextChange={onSourceTextChange}
            onLanguageChange={onSourceLanguageChange}
            onClear={onClear}
            onKeyDown={onInputKeyDown}
            onMicrophone={onMicrophone}
          />
          <TranslationOutput
            text={translatedText}
            sourceText={sourceText}
            language={targetLanguage}
            languages={languages}
            direction={targetDirection}
            isLoading={isLoading}
            message={serviceMessage}
            copied={copied}
            speechState={speechState}
            isSpeechSupported={isSpeechSupported}
            isConvertingSource={isConvertingSource}
            detectedLanguageName={detectedLanguageName}
            onLanguageChange={onTargetLanguageChange}
            onCopy={onCopy}
            onSpeak={onSpeak}
          />
        </div>
        <div className="translator-actions">
          <button className="swap-button" type="button" aria-label="Swap source and target languages" title="Swap languages" onClick={onSwap} disabled={isConvertingSource}>
            <FiRepeat />
          </button>
          <button className="translate-button" type="button" onClick={onTranslate} disabled={!sourceText.trim() || isLoading || isConvertingSource}>
            {isLoading && isManualTranslation ? <FiLoader className="loading-icon" /> : <FiSend />}
            {isLoading && isManualTranslation ? 'Translating...' : 'Translate'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default Translator;
