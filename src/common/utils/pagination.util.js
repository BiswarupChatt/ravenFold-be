const { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } = require('../constants/app.constant');

function getPagination(query = {}) {
  const page = Math.max(Number(query.page) || DEFAULT_PAGE, 1);
  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
}

module.exports = {
  getPagination,
};
