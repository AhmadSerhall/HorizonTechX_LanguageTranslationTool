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
});

test('a browser without speech recognition keeps the microphone safely disabled', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /speech input is not supported/i })).toBeDisabled();
});
