export const requestTranslation = async ({ text, source, target }) => {
  let response;
  try {
    response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source, target }),
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
