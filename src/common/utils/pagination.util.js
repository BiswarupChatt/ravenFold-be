import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '@/common/constants/app.constant.js';

const getPagination = (query = {}) => {
  const page = Math.max(Number(query.page) || DEFAULT_PAGE, 1);
  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
};

export { getPagination };

export default {
  getPagination,
};
