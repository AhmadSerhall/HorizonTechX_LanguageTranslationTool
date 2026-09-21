import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { requestLanguages, requestTranslation } from './services/translationService';

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
  fireEvent.change(screen.getByPlaceholderText(/enter text to translate/i), { target: { value: 'Hello' } });
  fireEvent.click(screen.getByRole('button', { name: /source language: english/i }));
  fireEvent.click(screen.getByRole('button', { name: /^French/ }));

  await waitFor(() => expect(screen.getByPlaceholderText(/enter text to translate/i)).toHaveValue('Bonjour'));
  expect(screen.getByRole('button', { name: /source language: french/i })).toBeInTheDocument();
  expect(requestTranslation).toHaveBeenCalledWith(expect.objectContaining({ text: 'Hello', source: 'en', target: 'fr' }));
});

test('keeps original text and source selection when conversion fails', async () => {
  requestTranslation.mockRejectedValue(new Error('Translation service is temporarily unavailable.'));
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /source language: detect language/i }));
  fireEvent.click(screen.getByRole('button', { name: /^English/ }));
  fireEvent.change(screen.getByPlaceholderText(/enter text to translate/i), { target: { value: 'Hello' } });
  fireEvent.click(screen.getByRole('button', { name: /source language: english/i }));
  fireEvent.click(screen.getByRole('button', { name: /^French/ }));

  expect(await screen.findByText(/translation service is temporarily unavailable/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/enter text to translate/i)).toHaveValue('Hello');
  expect(screen.getByRole('button', { name: /source language: english/i })).toBeInTheDocument();
});

test('uses automatic detection while converting an undetected source', async () => {
  requestTranslation.mockResolvedValue({ translatedText: 'Bonjour', detectedLanguage: 'en' });
  render(<App />);
  fireEvent.change(screen.getByPlaceholderText(/enter text to translate/i), { target: { value: 'Hello' } });
  fireEvent.click(screen.getByRole('button', { name: /source language: detect language/i }));
  fireEvent.click(screen.getByRole('button', { name: /^French/ }));

  await waitFor(() => expect(screen.getByPlaceholderText(/enter text to translate/i)).toHaveValue('Bonjour'));
  expect(requestTranslation).toHaveBeenCalledWith(expect.objectContaining({ source: 'auto', target: 'fr' }));
});

test('supports copying, source/output swapping, and the speech lifecycle', async () => {
  requestTranslation.mockResolvedValue({ translatedText: 'Bonjour', detectedLanguage: 'en' });
  render(<App />);
  const input = screen.getByPlaceholderText(/enter text to translate/i);
  fireEvent.change(input, { target: { value: 'Hello' } });
  fireEvent.click(screen.getByRole('button', { name: /^translate$/i }));
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

  fireEvent.click(screen.getByRole('button', { name: /swap source and target/i }));
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
  const input = screen.getByPlaceholderText(/enter text to translate/i);
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

test('debounces rapid typing into a single automatic translation request', async () => {
  jest.useFakeTimers();
  requestTranslation.mockResolvedValue({ translatedText: 'Bonjour', detectedLanguage: 'en' });
  render(<App />);
  const input = screen.getByPlaceholderText(/enter text to translate/i);

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
  const input = screen.getByPlaceholderText(/enter text to translate/i);
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
  const input = screen.getByPlaceholderText(/enter text to translate/i);
  fireEvent.paste(input, { clipboardData: { getData: () => 'Pasted text' } });
  fireEvent.change(input, { target: { value: 'Pasted text' } });
  act(() => jest.advanceTimersByTime(699));
  expect(requestTranslation).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(1));
  expect(requestTranslation).toHaveBeenCalledWith(expect.objectContaining({ text: 'Pasted text' }));
});

test('manual translation bypasses a pending debounce and target changes refresh immediately', async () => {
  jest.useFakeTimers();
  requestTranslation.mockResolvedValue({ translatedText: 'Bonjour', detectedLanguage: 'en' });
  render(<App />);
  const input = screen.getByPlaceholderText(/enter text to translate/i);
  fireEvent.change(input, { target: { value: 'Hello' } });
  fireEvent.click(screen.getByRole('button', { name: /^translate$/i }));
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
  expect(screen.getByPlaceholderText(/enter text to translate/i)).toHaveValue('Hello');
});

test('shows a size-aware skeleton and replaces it with the completed translation', async () => {
  jest.useFakeTimers();
  let resolveTranslation;
  requestTranslation.mockImplementation(() => new Promise((resolve) => { resolveTranslation = resolve; }));
  render(<App />);
  const input = screen.getByPlaceholderText(/enter text to translate/i);
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
  const input = screen.getByPlaceholderText(/enter text to translate/i);
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
  const input = screen.getByPlaceholderText(/enter text to translate/i);
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
  fireEvent.click(screen.getByRole('button', { name: /^Afrikaans/ }));
  expect(screen.getByText('Your translation will appear here.')).toBeInTheDocument();
});
