const express = require('express');
const { getLanguages } = require('../controllers/languageController');

const router = express.Router();

router.get('/languages', getLanguages);

module.exports = router;
