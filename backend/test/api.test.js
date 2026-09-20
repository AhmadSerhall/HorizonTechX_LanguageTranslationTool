const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../app');

test('GET /api/health returns an ok status', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
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
