import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';
import { requestLanguages, requestTranslation } from './services/translationService';
import { AZURE_TRANSLATION_LANGUAGE_CODES } from './data/azureTranslationLanguageCodes';
import { getUiTranslation, uiTranslations, validateUiTranslationCoverage } from './data/uiTranslations';

jest.mock('./services/translationService', () => ({
  requestLanguages: jest.fn(),
  requestTranslation: jest.fn(),
}));

let currentUtterance;
const speechSynthesisMock = {
  addEventListener: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn(() => []),
  removeEventListener: jest.fn(),
  speak: jest.fn((utterance) => { currentUtterance = utterance; }),
};

beforeEach(() => {
  currentUtterance = null;
  requestLanguages.mockReset();
  requestLanguages.mockRejectedValue(new Error('Catalog unavailable'));
  requestTranslation.mockReset();
  speechSynthesisMock.cancel.mockClear();
  speechSynthesisMock.getVoices.mockReset();
  speechSynthesisMock.getVoices.mockReturnValue([
    { lang: 'en-US', name: 'English voice' },
    { lang: 'fr-FR', name: 'French voice' },
  ]);
  speechSynthesisMock.speak.mockClear();
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: speechSynthesisMock });
  global.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) { this.text = text; };
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
  });
  window.sessionStorage.clear();
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
});

afterEach(() => {
  jest.useRealTimers();
});

test('renders the translator interface and retains its local catalog if language metadata fails', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /linguatranslate/i })).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/enter text to translate/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^translate$/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Swap languages' })).toBeInTheDocument();
  expect(requestLanguages).toHaveBeenCalledTimes(1);
});

test('language pickers have the correct placeholders, native-name search, and source-only detection', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /source language: detect language/i }));
  const sourceSearch = screen.getByPlaceholderText('Translate from');
  expect(screen.getByRole('button', { name: 'Detect language' })).toBeInTheDocument();
  fireEvent.change(sourceSearch, { target: { value: 'العربية' } });
  expect(screen.getByRole('button', { name: /^Arabic/ })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /close language selector/i }));
  fireEvent.click(screen.getByRole('button', { name: /target language: french/i }));
  expect(screen.getByPlaceholderText('Translate to')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Detect language' })).not.toBeInTheDocument();
});

test('converts existing source text before changing the source language', async () => {
  requestTranslation.mockResolvedValue({ translatedText: 'Bonjour', detectedLanguage: 'en' });
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /source language: detect language/i }));
  fireEvent.click(screen.getByRole('button', { name: /^English/ }));
  fireEvent.change(screen.getByLabelText('Text to translate'), { target: { value: 'Hello' } });
  fireEvent.click(screen.getByRole('button', { name: /source language: english/i }));
  fireEvent.click(screen.getByRole('button', { name: /^French/ }));

  await waitFor(() => expect(screen.getByLabelText('Text to translate')).toHaveValue('Bonjour'));
  expect(screen.getByRole('button', { name: /source language: french/i })).toBeInTheDocument();
  expect(requestTranslation).toHaveBeenCalledWith(expect.objectContaining({ text: 'Hello', source: 'en', target: 'fr' }));
});

test('keeps original text and source selection when conversion fails', async () => {
  requestTranslation.mockRejectedValue(new Error('Translation service is temporarily unavailable.'));
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /source language: detect language/i }));
  fireEvent.click(screen.getByRole('button', { name: /^English/ }));
  fireEvent.change(screen.getByLabelText('Text to translate'), { target: { value: 'Hello' } });
  fireEvent.click(screen.getByRole('button', { name: /source language: english/i }));
  fireEvent.click(screen.getByRole('button', { name: /^French/ }));

  expect(await screen.findByText(/translation service is temporarily unavailable/i)).toBeInTheDocument();
  expect(screen.getByLabelText('Text to translate')).toHaveValue('Hello');
  expect(screen.getByRole('button', { name: /source language: english/i })).toBeInTheDocument();
});

test('uses automatic detection while converting an undetected source', async () => {
  requestTranslation.mockResolvedValue({ translatedText: 'Bonjour', detectedLanguage: 'en' });
  render(<App />);
  fireEvent.change(screen.getByLabelText('Text to translate'), { target: { value: 'Hello' } });
  fireEvent.click(screen.getByRole('button', { name: /source language: detect language/i }));
  fireEvent.click(screen.getByRole('button', { name: /^French/ }));

  await waitFor(() => expect(screen.getByLabelText('Text to translate')).toHaveValue('Bonjour'));
  expect(requestTranslation).toHaveBeenCalledWith(expect.objectContaining({ source: 'auto', target: 'fr' }));
});

test('supports copying, source/output swapping, and the speech lifecycle', async () => {
  requestTranslation.mockResolvedValue({ translatedText: 'Bonjour', detectedLanguage: 'en' });
  render(<App />);
  const input = screen.getByLabelText('Text to translate');
  fireEvent.change(input, { target: { value: 'Hello' } });
  fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
  expect(await screen.findByText('Bonjour')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /copy translated text/i }));
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Bonjour');
  expect(await screen.findByText('Copied')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /listen to translation/i }));
  expect(screen.getByRole('button', { name: /preparing speech/i })).toBeInTheDocument();
  const utterance = speechSynthesisMock.speak.mock.calls.at(-1)?.[0] || currentUtterance;
  act(() => utterance.onstart());
  expect(screen.getByRole('button', { name: /stop speaking/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /stop speaking/i }));
  expect(speechSynthesisMock.cancel).toHaveBeenCalled();
  expect(screen.getByRole('button', { name: /listen to translation/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Swap languages' }));
  expect(input).toHaveValue('Bonjour');
  expect(screen.getByText('Hello')).toBeInTheDocument();
});

test('speech recognition appends final speech and can be stopped', async () => {
  class MockRecognition {
    static instance;
    start = jest.fn();
    stop = jest.fn();
    abort = jest.fn();
    constructor() { MockRecognition.instance = this; }
  }
  window.SpeechRecognition = MockRecognition;
  requestTranslation.mockResolvedValue({ translatedText: 'Bonjour', detectedLanguage: 'en' });
  render(<App />);
  const input = screen.getByLabelText('Text to translate');
  fireEvent.change(input, { target: { value: 'Hello' } });
  fireEvent.click(screen.getByRole('button', { name: /start voice input/i }));
  act(() => MockRecognition.instance.onstart());
  expect(screen.getByRole('button', { name: /stop voice input/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /stop voice input/i }));
  expect(MockRecognition.instance.stop).toHaveBeenCalled();
  act(() => {
    MockRecognition.instance.onresult({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: 'how are you' } }],
    });
    MockRecognition.instance.onend();
  });
  await waitFor(() => expect(input).toHaveValue('Hello how are you'));
  expect(await screen.findByText('Bonjour')).toBeInTheDocument();
  expect(requestTranslation).toHaveBeenCalledTimes(1);
  expect(requestTranslation).toHaveBeenCalledWith(expect.objectContaining({ text: 'Hello how are you', source: 'auto', target: 'fr' }));
});

test('a browser without speech recognition keeps the microphone safely disabled', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /speech input is not supported/i })).toBeDisabled();
});

test('local UI translations cover every Azure text language code and safely fall back', () => {
  expect(AZURE_TRANSLATION_LANGUAGE_CODES).toHaveLength(138);
  expect(validateUiTranslationCoverage(AZURE_TRANSLATION_LANGUAGE_CODES.map((code) => ({ code })))).toEqual([]);
  expect(Object.keys(uiTranslations)).toHaveLength(138);
  expect(getUiTranslation('ZH_hans').inputPlaceholder).toBe('输入要翻译的文本...');
  expect(getUiTranslation('not-a-language')).toEqual(uiTranslations.en);
});

test('localizes source placeholders for selected languages without translation requests', () => {
  render(<App />);
  const input = screen.getByLabelText('Text to translate');
  expect(input).toHaveAttribute('placeholder', 'Enter text to translate...');

  fireEvent.click(screen.getByRole('button', { name: /source language: detect language/i }));
  fireEvent.click(screen.getByRole('button', { name: /^French/ }));
  expect(input).toHaveAttribute('placeholder', 'Saisissez le texte à traduire...');

  fireEvent.click(screen.getByRole('button', { name: /source language: french/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Arabic/ }));
  expect(input).toHaveAttribute('placeholder', 'أدخل النص المراد ترجمته...');
  expect(input).toHaveAttribute('dir', 'rtl');

  fireEvent.click(screen.getByRole('button', { name: /source language: arabic/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Greek/ }));
  expect(input).toHaveAttribute('placeholder', 'Εισαγάγετε κείμενο για μετάφραση...');

  fireEvent.click(screen.getByRole('button', { name: /source language: greek/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Chinese \(Simplified\)/ }));
  expect(input).toHaveAttribute('placeholder', '输入要翻译的文本...');

  fireEvent.click(screen.getByRole('button', { name: /source language: chinese \(simplified\)/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Detect language' }));
  expect(input).toHaveAttribute('placeholder', 'Enter text to translate...');
  expect(requestTranslation).not.toHaveBeenCalled();
});

test('source text-to-speech has lifecycle controls and chooses the selected language voice', () => {
  speechSynthesisMock.getVoices.mockReturnValue([
    { lang: 'en-US', name: 'English voice' },
    { lang: 'fr-FR', name: 'French voice' },
  ]);
  render(<App />);
  const input = screen.getByLabelText('Text to translate');
  const sourceSpeaker = screen.getByRole('button', { name: /listen to source text/i });
  expect(sourceSpeaker).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: /source language: detect language/i }));
  fireEvent.click(screen.getByRole('button', { name: /^French/ }));
  fireEvent.change(input, { target: { value: 'Bonjour' } });
  fireEvent.click(screen.getByRole('button', { name: /listen to source text/i }));
  const utterance = speechSynthesisMock.speak.mock.calls.at(-1)?.[0];
  expect(utterance.lang).toBe('fr-FR');
  expect(utterance.voice).toEqual(expect.objectContaining({ lang: 'fr-FR' }));
  expect(screen.getByRole('button', { name: /preparing source speech/i })).toBeInTheDocument();

  act(() => utterance.onstart());
  expect(screen.getByRole('button', { name: /stop source speech/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /stop source speech/i }));
  expect(speechSynthesisMock.cancel).toHaveBeenCalled();
  expect(screen.getByRole('button', { name: /listen to source text/i })).toBeInTheDocument();
});

test('source and translation speakers share one browser speech channel', async () => {
  requestTranslation.mockResolvedValue({ translatedText: 'Bonjour', detectedLanguage: 'en' });
  render(<App />);
  const input = screen.getByLabelText('Text to translate');
  fireEvent.change(input, { target: { value: 'Hello' } });
  fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
  expect(await screen.findByText('Bonjour')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /listen to source text/i }));
  expect(screen.getByRole('button', { name: /preparing source speech/i })).toBeInTheDocument();
  const cancellationsBeforeTarget = speechSynthesisMock.cancel.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: /listen to translation/i }));
  expect(speechSynthesisMock.cancel.mock.calls.length).toBeGreaterThan(cancellationsBeforeTarget);
  expect(screen.getByRole('button', { name: /preparing speech/i })).toBeInTheDocument();
});

test('detected source language is used for source text-to-speech when available', async () => {
  speechSynthesisMock.getVoices.mockReturnValue([{ lang: 'fr-FR', name: 'French voice' }]);
  requestTranslation.mockResolvedValue({ translatedText: 'Hello', detectedLanguage: 'fr' });
  render(<App />);
  const input = screen.getByLabelText('Text to translate');
  fireEvent.change(input, { target: { value: 'bonjour' } });
  fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
  expect(await screen.findByText('Hello')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /listen to source text/i }));
  const utterance = speechSynthesisMock.speak.mock.calls.at(-1)?.[0];
  expect(utterance.lang).toBe('fr-FR');
});

test('Arabic source speech selects an Arabic voice and source edits cancel it', () => {
  speechSynthesisMock.getVoices.mockReturnValue([{ lang: 'ar-EG', name: 'Arabic voice' }]);
  render(<App />);
  const input = screen.getByLabelText('Text to translate');
  fireEvent.click(screen.getByRole('button', { name: /source language: detect language/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Arabic/ }));
  fireEvent.change(input, { target: { value: 'مرحبا كيف حالك' } });
  fireEvent.click(screen.getByRole('button', { name: /listen to source text/i }));
  const utterance = speechSynthesisMock.speak.mock.calls.at(-1)?.[0];
  expect(utterance.lang).toBe('ar-EG');
  const cancellationCount = speechSynthesisMock.cancel.mock.calls.length;
  fireEvent.change(input, { target: { value: 'مرحبا' } });
  expect(speechSynthesisMock.cancel.mock.calls.length).toBeGreaterThan(cancellationCount);
});

test('disables speakers with no compatible device voice without requesting a translation', () => {
  speechSynthesisMock.getVoices.mockReturnValue([{ lang: 'en-US', name: 'English voice' }]);
  render(<App />);
  const input = screen.getByLabelText('Text to translate');
  fireEvent.click(screen.getByRole('button', { name: /source language: detect language/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Arabic/ }));
  fireEvent.change(input, { target: { value: 'مرحبا' } });

  const sourceSpeaker = within(screen.getByRole('region', { name: 'Source text' }))
    .getByRole('button', { name: /speech is not available for this language/i });
  expect(sourceSpeaker).toBeDisabled();
  const targetSpeaker = within(screen.getByRole('region', { name: 'Translated text' }))
    .getByRole('button', { name: /speech is not available for this language/i });
  expect(targetSpeaker).toBeDisabled();
  fireEvent.click(sourceSpeaker);
  expect(speechSynthesisMock.speak).not.toHaveBeenCalled();
  expect(requestTranslation).not.toHaveBeenCalled();
});

test('debounces rapid typing into a single automatic translation request', async () => {
  jest.useFakeTimers();
  requestTranslation.mockResolvedValue({ translatedText: 'Bonjour', detectedLanguage: 'en' });
  render(<App />);
  const input = screen.getByLabelText('Text to translate');

  ['H', 'He', 'Hel', 'Hell', 'Hello'].forEach((value) => fireEvent.change(input, { target: { value } }));
  act(() => jest.advanceTimersByTime(699));
  expect(requestTranslation).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(1));
  expect(requestTranslation).toHaveBeenCalledTimes(1);
  expect(requestTranslation).toHaveBeenCalledWith(expect.objectContaining({ text: 'Hello', source: 'auto', target: 'fr' }));
});

test('does not schedule empty or whitespace-only automatic translations and clears a pending one', () => {
  jest.useFakeTimers();
  render(<App />);
  const input = screen.getByLabelText('Text to translate');
  fireEvent.change(input, { target: { value: '   ' } });
  act(() => jest.advanceTimersByTime(1000));
  expect(requestTranslation).not.toHaveBeenCalled();

  fireEvent.change(input, { target: { value: 'Hello' } });
  fireEvent.click(screen.getByRole('button', { name: /clear source text/i }));
  act(() => jest.advanceTimersByTime(1000));
  expect(requestTranslation).not.toHaveBeenCalled();
  expect(screen.getByText('Votre traduction apparaîtra ici.')).toBeInTheDocument();
});

test('pasted text uses the same debounced automatic translation path', async () => {
  jest.useFakeTimers();
  requestTranslation.mockResolvedValue({ translatedText: 'Texte collé', detectedLanguage: 'en' });
  render(<App />);
  const input = screen.getByLabelText('Text to translate');
  fireEvent.paste(input, { clipboardData: { getData: () => 'Pasted text' } });
  fireEvent.change(input, { target: { value: 'Pasted text' } });
  act(() => jest.advanceTimersByTime(699));
  expect(requestTranslation).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(1));
  expect(requestTranslation).toHaveBeenCalledWith(expect.objectContaining({ text: 'Pasted text' }));
});

test('Ctrl + Enter bypasses a pending debounce and target changes refresh immediately', async () => {
  jest.useFakeTimers();
  requestTranslation.mockResolvedValue({ translatedText: 'Bonjour', detectedLanguage: 'en' });
  render(<App />);
  const input = screen.getByLabelText('Text to translate');
  fireEvent.change(input, { target: { value: 'Hello' } });
  fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
  expect(await screen.findByText('Bonjour')).toBeInTheDocument();
  expect(requestTranslation).toHaveBeenCalledTimes(1);
  act(() => jest.advanceTimersByTime(1000));
  expect(requestTranslation).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole('button', { name: /target language: french/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Spanish/ }));
  await act(async () => {});
  expect(requestTranslation).toHaveBeenCalledTimes(2);
  expect(requestTranslation).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'Hello', source: 'auto', target: 'es' }));
});

test('only final speech recognition results trigger automatic translation', async () => {
  class MockRecognition {
    static instance;
    start = jest.fn();
    stop = jest.fn();
    abort = jest.fn();
    constructor() { MockRecognition.instance = this; }
  }
  window.SpeechRecognition = MockRecognition;
  requestTranslation.mockResolvedValue({ translatedText: 'Bonjour', detectedLanguage: 'en' });
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /start voice input/i }));
  act(() => {
    MockRecognition.instance.onstart();
    MockRecognition.instance.onresult({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: 'Hello' } }] });
    MockRecognition.instance.onend();
  });
  expect(requestTranslation).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: /start voice input/i }));
  act(() => {
    MockRecognition.instance.onstart();
    MockRecognition.instance.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'Hello' } }] });
    MockRecognition.instance.onend();
  });
  expect(screen.getByRole('button', { name: /processing voice input/i })).toBeInTheDocument();
  await waitFor(() => expect(requestTranslation).toHaveBeenCalledTimes(1));
  expect(await screen.findByText('Bonjour')).toBeInTheDocument();
  expect(screen.getByLabelText('Text to translate')).toHaveValue('Hello');
});

test('shows a size-aware skeleton and replaces it with the completed translation', async () => {
  jest.useFakeTimers();
  let resolveTranslation;
  requestTranslation.mockImplementation(() => new Promise((resolve) => { resolveTranslation = resolve; }));
  render(<App />);
  const input = screen.getByLabelText('Text to translate');
  fireEvent.change(input, { target: { value: 'A medium source sentence that is long enough to need more than one skeleton line.' } });
  act(() => jest.advanceTimersByTime(700));

  expect(screen.getByRole('status', { name: /translating/i })).toBeInTheDocument();
  expect(document.querySelectorAll('.translation-skeleton-line')).toHaveLength(2);
  await act(async () => resolveTranslation({ translatedText: 'Une traduction terminée.', detectedLanguage: 'en' }));
  expect(screen.queryByRole('status', { name: /translating/i })).not.toBeInTheDocument();
  expect(screen.getByText('Une traduction terminée.')).toBeInTheDocument();
});

test('removes the skeleton and leaves the source text intact when automatic translation fails', async () => {
  jest.useFakeTimers();
  requestTranslation.mockRejectedValue(new Error('Translation service is temporarily unavailable.'));
  render(<App />);
  const input = screen.getByLabelText('Text to translate');
  fireEvent.change(input, { target: { value: 'Hello' } });
  await act(async () => jest.advanceTimersByTime(700));
  expect(await screen.findByText(/translation service is temporarily unavailable/i)).toBeInTheDocument();
  expect(screen.queryByRole('status', { name: /translating/i })).not.toBeInTheDocument();
  expect(input).toHaveValue('Hello');
});

test('a stale automatic response cannot overwrite the latest text', async () => {
  jest.useFakeTimers();
  const resolvers = [];
  requestTranslation.mockImplementation(() => new Promise((resolve) => resolvers.push(resolve)));
  render(<App />);
  const input = screen.getByLabelText('Text to translate');
  fireEvent.change(input, { target: { value: 'Hello' } });
  act(() => jest.advanceTimersByTime(700));
  fireEvent.change(input, { target: { value: 'Hello world' } });
  act(() => jest.advanceTimersByTime(700));

  await act(async () => resolvers[1]({ translatedText: 'Bonjour le monde', detectedLanguage: 'en' }));
  await act(async () => resolvers[0]({ translatedText: 'Bonjour', detectedLanguage: 'en' }));
  expect(screen.getByText('Bonjour le monde')).toBeInTheDocument();
  expect(screen.queryByText('Bonjour')).not.toBeInTheDocument();
});

test('localizes the empty placeholder and preserves RTL direction without API calls', () => {
  render(<App />);
  expect(screen.getByText('Votre traduction apparaîtra ici.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /target language: french/i }));
  fireEvent.click(screen.getByRole('button', { name: /^English/ }));
  expect(screen.getByText('Your translation will appear here.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /target language: english/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Arabic/ }));
  const arabicPlaceholder = screen.getByText('ستظهر ترجمتك هنا.');
  expect(arabicPlaceholder).toBeInTheDocument();
  expect(arabicPlaceholder.closest('.output-content')).toHaveAttribute('dir', 'rtl');
  expect(requestTranslation).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: /target language: arabic/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Greek/ }));
  expect(screen.getByText('Η μετάφρασή σας θα εμφανιστεί εδώ.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /target language: greek/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Japanese/ }));
  expect(screen.getByText('翻訳結果がここに表示されます。')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /target language: japanese/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Afrikaans/ }));
  expect(screen.getByText('Jou vertaling sal hier verskyn.')).toBeInTheDocument();
});
