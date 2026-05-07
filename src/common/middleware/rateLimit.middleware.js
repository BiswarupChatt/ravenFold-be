function rateLimitMiddleware(req, res, next) {
  return next();
}

module.exports = rateLimitMiddleware;
