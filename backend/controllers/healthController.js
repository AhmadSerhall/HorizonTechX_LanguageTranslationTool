const getHealth = (request, response) => {
  response.status(200).json({ status: 'ok' });
};

module.exports = { getHealth };
