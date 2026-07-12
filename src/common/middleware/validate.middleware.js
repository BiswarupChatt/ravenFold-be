import ApiError from '@/common/errors/api.error.js';

const setValidatedValue = (req, property, value) => {
  if (property === 'query') {
    Object.defineProperty(req, property, {
      configurable: true,
      enumerable: true,
      value,
      writable: true,
    });
    return;
  }

  req[property] = value;
};

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    if (!schema) {
      return next();
    }

    if (schema.validate instanceof Function) {
      const { error, value } = schema.validate(req[property], { abortEarly: false });

      if (error) {
        const details = error.details ? error.details.map((item) => item.message) : [error.message];
        const message = details.length === 1 ? details[0] : 'Validation failed';

        return next(new ApiError(400, message, details));
      }

      setValidatedValue(req, property, value);
      return next();
    }

    return next(new ApiError(500, 'Invalid validation schema'));
  };
};

export default validate;
