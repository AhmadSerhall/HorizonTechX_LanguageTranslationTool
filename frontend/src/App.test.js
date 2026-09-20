import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { requestTranslation } from './services/translationService';

jest.mock('./services/translationService', () => ({ requestTranslation: jest.fn() }));

beforeEach(() => {
  requestTranslation.mockReset();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
  });
});

test('renders the translator interface', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /linguatranslate/i })).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/enter text to translate/i)).toBeInTheDocument();
});

test('source and target language pickers use the correct search experience', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /source language: detect language/i }));
  const sourceSearch = screen.getByPlaceholderText('Translate from');
  expect(screen.getByRole('button', { name: 'Detect language' })).toBeInTheDocument();
  fireEvent.change(sourceSearch, { target: { value: 'fr' } });
  expect(screen.getByRole('button', { name: /^French/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^French/ }));

  expect(screen.getByRole('button', { name: /source language: french/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /target language: french/i }));
  expect(screen.getByPlaceholderText('Translate to')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Detect language' })).not.toBeInTheDocument();
});

test('supports character limits, swapping, and copying a real service response', async () => {
  requestTranslation.mockResolvedValue({
    translatedText: 'Bonjour',
    sourceLanguage: 'en',
    targetLanguage: 'fr',
    detectedLanguage: 'en',
  });
  render(<App />);
  const input = screen.getByPlaceholderText(/enter text to translate/i);
  fireEvent.change(input, { target: { value: 'Hello' } });
  expect(screen.getByText('5 / 5,000')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^translate$/i }));
  expect(await screen.findByText('Bonjour')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /copy translated text/i }));
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Bonjour');
  expect(await screen.findByText('Copied')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /swap source and target/i }));
  expect(input).toHaveValue('Bonjour');
  expect(screen.getByText('Hello')).toBeInTheDocument();
});

test('shows loading and safe error feedback when translation fails', async () => {
  requestTranslation.mockRejectedValue(new Error('Translation service is temporarily unavailable.'));
  render(<App />);
  fireEvent.change(screen.getByPlaceholderText(/enter text to translate/i), { target: { value: 'Hello' } });
  fireEvent.click(screen.getByRole('button', { name: /^translate$/i }));

  expect(await screen.findByText(/translation service is temporarily unavailable/i)).toBeInTheDocument();
});
