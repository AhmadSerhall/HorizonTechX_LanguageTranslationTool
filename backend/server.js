const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const healthRouter = require('./routes/healthRoutes');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api', healthRouter);

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
