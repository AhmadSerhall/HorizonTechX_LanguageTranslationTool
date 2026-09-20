import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('renders the translator interface', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /linguatranslate/i })).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/enter text to translate/i)).toBeInTheDocument();
});

test('supports text entry, clearing, and swapping languages', () => {
  render(<App />);
  const input = screen.getByPlaceholderText(/enter text to translate/i);
  const translateButton = screen.getByRole('button', { name: /^translate$/i });
  const [sourceSelector, targetSelector] = screen.getAllByRole('combobox');

  expect(translateButton).toBeDisabled();
  fireEvent.change(input, { target: { value: 'Hello' } });
  expect(screen.getByText('5 characters')).toBeInTheDocument();
  expect(translateButton).toBeEnabled();

  fireEvent.click(screen.getByRole('button', { name: /swap source and target/i }));
  expect(sourceSelector).toHaveValue('fr');
  expect(targetSelector).toHaveValue('en');

  fireEvent.click(screen.getByRole('button', { name: /clear source text/i }));
  expect(input).toHaveValue('');
  expect(translateButton).toBeDisabled();
});

test('clearly explains that translation is not connected yet', async () => {
  render(<App />);
  fireEvent.change(screen.getByPlaceholderText(/enter text to translate/i), { target: { value: 'Hello' } });
  fireEvent.click(screen.getByRole('button', { name: /^translate$/i }));

  expect(await screen.findByText(/translation service is not connected yet/i)).toBeInTheDocument();
});
