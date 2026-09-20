const { MAX_TEXT_LENGTH, SUPPORTED_LANGUAGE_CODES, translate } = require('../services/translatorService');

const validateTranslationRequest = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Invalid request body.';
  if (typeof body.text !== 'string' || !body.text.trim()) return 'Text is required.';
  if (body.text.length > MAX_TEXT_LENGTH) return `Text must not exceed ${MAX_TEXT_LENGTH} characters.`;
  if (typeof body.target !== 'string' || !body.target) return 'Target language is required.';
  if (!SUPPORTED_LANGUAGE_CODES.has(body.target) || body.target === 'auto') return 'Unsupported target language.';

  const source = body.source || 'auto';
  if (typeof source !== 'string' || (source !== 'auto' && !SUPPORTED_LANGUAGE_CODES.has(source))) {
    return 'Unsupported source language.';
  }

  return null;
};

const translateText = async (request, response) => {
  const validationError = validateTranslationRequest(request.body);
  if (validationError) return response.status(400).json({ error: validationError });

  const { text, target } = request.body;
  const source = request.body.source || 'auto';
  try {
    const translation = await translate({ text, source, target });
    return response.status(200).json(translation);
  } catch (error) {
    if (error.status) return response.status(error.status).json({ error: error.message });

    console.error('Translation request failed:', error.message);
    return response.status(503).json({ error: 'Translation service is temporarily unavailable.' });
  }
};

module.exports = { translateText, validateTranslationRequest };
