const express = require('express');
const cors = require('cors');
const healthRouter = require('./routes/healthRoutes');
const translateRouter = require('./routes/translateRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '20kb' }));
app.use('/api', healthRouter);
app.use('/api', translateRouter);

app.use((error, request, response, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return response.status(400).json({ error: 'Invalid request body.' });
  }

  console.error('Unexpected backend error:', error.message);
  return response.status(500).json({ error: 'Translation service is temporarily unavailable.' });
});

module.exports = app;
