const { getLanguages: getCatalogLanguages } = require('../services/languageCatalogService');

const getLanguages = async (request, response) => {
  const languages = await getCatalogLanguages();
  return response.status(200).json(languages);
};

module.exports = { getLanguages };
