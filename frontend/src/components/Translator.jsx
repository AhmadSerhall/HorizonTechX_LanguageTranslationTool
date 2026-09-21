import { FiRepeat } from 'react-icons/fi';
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
  isConvertingSource,
  serviceMessage,
  copied,
  isSpeechSupported,
  sourceSpeechAvailability,
  sourceSpeechState,
  sourcePlaceholder,
  translationSpeechAvailability,
  translationSpeechState,
  microphoneState,
  isSpeechRecognitionSupported,
  detectedLanguageName,
  onSourceTextChange,
  onSourceLanguageChange,
  onSourceSpeak,
  onTargetLanguageChange,
  onClear,
  onSwap,
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
            placeholder={sourcePlaceholder}
            isConverting={isConvertingSource}
            microphoneState={microphoneState}
            isSpeechRecognitionSupported={isSpeechRecognitionSupported}
            sourceSpeechState={sourceSpeechState}
            isSpeechSupported={isSpeechSupported}
            speechAvailability={sourceSpeechAvailability}
            onTextChange={onSourceTextChange}
            onLanguageChange={onSourceLanguageChange}
            onClear={onClear}
            onKeyDown={onInputKeyDown}
            onMicrophone={onMicrophone}
            onSpeak={onSourceSpeak}
          />
          <button className="swap-button" type="button" aria-label="Swap languages" title="Swap languages" onClick={onSwap} disabled={isConvertingSource}>
            <FiRepeat />
          </button>
          <TranslationOutput
            text={translatedText}
            sourceText={sourceText}
            language={targetLanguage}
            languages={languages}
            direction={targetDirection}
            isLoading={isLoading}
            message={serviceMessage}
            copied={copied}
            speechState={translationSpeechState}
            isSpeechSupported={isSpeechSupported}
            speechAvailability={translationSpeechAvailability}
            isConvertingSource={isConvertingSource}
            detectedLanguageName={detectedLanguageName}
            onLanguageChange={onTargetLanguageChange}
            onCopy={onCopy}
            onSpeak={onSpeak}
          />
        </div>
      </div>
    </main>
  );
}

export default Translator;
