import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import {
  apiPrefix,
  corsAllowedOrigins,
  nodeEnv,
  trustProxy,
} from '@/config/env.config.js';
import routes from '@/routes/index.js';
import notFound from '@/common/middleware/notFound.middleware.js';
import errorHandler from '@/common/errors/error.handler.js';
import httpLogger from '@/common/logger/morgan.logger.js';

const app = express();
const localDevelopmentOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const resolveTrustProxy = (value = '') => {
  const normalizedValue = String(value || '').trim().toLowerCase();

  if (!normalizedValue || normalizedValue === 'false') {
    return null;
  }

  if (normalizedValue === 'true') {
    return true;
  }

  const numericValue = Number(normalizedValue);

  return Number.isNaN(numericValue) ? value : numericValue;
};

const resolvedTrustProxy = resolveTrustProxy(trustProxy);

if (resolvedTrustProxy !== null) {
  app.set('trust proxy', resolvedTrustProxy);
}

const isCorsOriginAllowed = (origin) => {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = origin.replace(/\/$/, '');

  return corsAllowedOrigins.includes(normalizedOrigin)
    || (nodeEnv !== 'production' && localDevelopmentOriginPattern.test(normalizedOrigin));
};

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (isCorsOriginAllowed(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json({
  verify: (req, res, buffer) => {
    req.rawBody = buffer.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: true }));

if (nodeEnv !== 'test') {
  app.use(httpLogger);
}

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'RavenFold API is running',
  });
});

app.use(apiPrefix, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
