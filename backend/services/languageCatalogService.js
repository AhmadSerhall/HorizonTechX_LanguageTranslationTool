const DEFAULT_TRANSLATOR_ENDPOINT = 'https://api.cognitive.microsofttranslator.com';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

const fallbackLanguages = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)', nativeName: '简体中文', dir: 'ltr' },
];

let cachedLanguages = null;
let cacheExpiresAt = 0;

const normalizeLanguages = (payload) => Object.entries(payload?.translation || {})
  .map(([code, language]) => ({
    code,
    name: language.name,
    nativeName: language.nativeName || language.name,
    dir: language.dir === 'rtl' ? 'rtl' : 'ltr',
  }))
  .filter((language) => language.code && language.name)
  .sort((first, second) => first.name.localeCompare(second.name));

const getSupportedLanguageCodes = () => new Set((cachedLanguages || fallbackLanguages).map((language) => language.code));

const getLanguages = async () => {
  if (cachedLanguages && Date.now() < cacheExpiresAt) return cachedLanguages;

  const endpoint = (process.env.AZURE_TRANSLATOR_ENDPOINT || DEFAULT_TRANSLATOR_ENDPOINT).replace(/\/+$/, '');
  const url = new URL(`${endpoint}/languages`);
  url.searchParams.set('api-version', '3.0');
  url.searchParams.set('scope', 'translation');

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Azure language catalog returned ${response.status}.`);

    const languages = normalizeLanguages(await response.json());
    if (!languages.length) throw new Error('Azure language catalog was empty.');

    cachedLanguages = languages;
    cacheExpiresAt = Date.now() + CACHE_DURATION_MS;
    return cachedLanguages;
  } catch (error) {
    console.warn('Unable to refresh Azure language catalog:', error.message);
    return fallbackLanguages;
  }
};

const clearLanguageCatalogCache = () => {
  cachedLanguages = null;
  cacheExpiresAt = 0;
};

module.exports = {
  clearLanguageCatalogCache,
  fallbackLanguages,
  getLanguages,
  getSupportedLanguageCodes,
  normalizeLanguages,
};
