const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../app');
const { clearLanguageCatalogCache } = require('../services/languageCatalogService');

test('GET /api/health returns an ok status', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('GET /api/languages normalizes Azure translation languages and caches the catalog', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      translation: {
        fr: { name: 'French', nativeName: 'Français', dir: 'ltr' },
        ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
      },
    }),
  });
  clearLanguageCatalogCache();

  try {
    const response = await request(app).get('/api/languages');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, [
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
      { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
    ]);
  } finally {
    global.fetch = originalFetch;
    clearLanguageCatalogCache();
  }
});

test('POST /api/translate rejects empty text', async () => {
  const response = await request(app).post('/api/translate').send({ text: '   ', source: 'en', target: 'fr' });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Text is required.');
});

test('POST /api/translate rejects a missing target', async () => {
  const response = await request(app).post('/api/translate').send({ text: 'Hello', source: 'en' });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Target language is required.');
});

test('POST /api/translate rejects invalid language codes without calling Azure', async () => {
  const response = await request(app).post('/api/translate').send({ text: 'Hello', source: 'invalid', target: 'fr' });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Unsupported source language.');
});
