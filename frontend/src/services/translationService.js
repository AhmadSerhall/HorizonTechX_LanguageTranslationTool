export const requestTranslation = async ({ text, source, target, signal }) => {
  let response;
  try {
    response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source, target }),
      signal,
    });
  } catch {
    throw new Error('Unable to reach the translation service. Please try again.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Translation service is temporarily unavailable.');
  }

  return payload;
};

export const requestLanguages = async () => {
  const response = await fetch('/api/languages');
  const payload = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(payload) || !payload.length) {
    throw new Error('Unable to load supported languages.');
  }

  return payload;
};
