const rateLimitMiddleware = (req, res, next) => {
  return next();
};

export default rateLimitMiddleware;
