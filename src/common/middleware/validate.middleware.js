import ApiError from '@/common/errors/api.error.js';

function validate(schema, property = 'body') {
  return (req, res, next) => {
    if (!schema) {
      return next();
    }

    if (typeof schema.validate === 'function') {
      const { error, value } = schema.validate(req[property], { abortEarly: false });

      if (error) {
        const details = error.details ? error.details.map((item) => item.message) : error.message;
        return next(new ApiError(400, 'Validation failed', details));
      }

      req[property] = value;
      return next();
    }

    return next(new ApiError(500, 'Invalid validation schema'));
  };
}

export default validate;
