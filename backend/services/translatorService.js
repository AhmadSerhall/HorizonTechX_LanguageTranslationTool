const { randomUUID } = require('crypto');

const MAX_TEXT_LENGTH = 5000;

class TranslationServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const getTranslatorConfig = () => {
  const key = process.env.AZURE_TRANSLATOR_KEY;
  const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT;
  const region = process.env.AZURE_TRANSLATOR_REGION;
  if (!key || !endpoint) throw new TranslationServiceError('Translation service is not configured.', 503);
  return { key, endpoint: endpoint.replace(/\/+$/, ''), region };
};

const toSafeProviderError = (status) => {
  if (status === 401 || status === 403) return new TranslationServiceError('Translation service authentication failed.', 503);
  if (status === 429) return new TranslationServiceError('Translation service is busy. Please try again shortly.', 429);
  return new TranslationServiceError('Translation service is temporarily unavailable.', 503);
};

const translate = async ({ text, source, target }) => {
  const { key, endpoint, region } = getTranslatorConfig();
  const url = new URL(`${endpoint}/translate`);
  url.searchParams.set('api-version', '3.0');
  url.searchParams.set('to', target);
  if (source !== 'auto') url.searchParams.set('from', source);

  const headers = {
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': key,
    'X-ClientTraceId': randomUUID(),
  };
  if (region) headers['Ocp-Apim-Subscription-Region'] = region;

  let providerResponse;
  try {
    providerResponse = await fetch(url, { method: 'POST', headers, body: JSON.stringify([{ Text: text }]) });
  } catch (error) {
    console.error('Azure Translator network error:', error.message);
    throw new TranslationServiceError('Translation service is temporarily unavailable.', 503);
  }

  if (!providerResponse.ok) {
    console.warn(`Azure Translator responded with status ${providerResponse.status}.`);
    throw toSafeProviderError(providerResponse.status);
  }

  const [result] = await providerResponse.json();
  const translation = result?.translations?.[0];
  if (!translation?.text) {
    console.error('Azure Translator returned an unexpected response shape.');
    throw new TranslationServiceError('Translation service is temporarily unavailable.', 503);
  }

  const detectedLanguage = result.detectedLanguage?.language;
  return {
    translatedText: translation.text,
    sourceLanguage: source === 'auto' ? detectedLanguage : source,
    targetLanguage: translation.to || target,
    ...(detectedLanguage ? { detectedLanguage } : {}),
  };
};

module.exports = { MAX_TEXT_LENGTH, TranslationServiceError, translate };
