import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { apiPrefix, nodeEnv } from '@/config/env.config.js';
import routes from '@/routes/index.js';
import notFound from '@/common/middleware/notFound.middleware.js';
import errorHandler from '@/common/errors/error.handler.js';
import httpLogger from '@/common/logger/morgan.logger.js';

const app = express();

app.use(helmet());
app.use(cors());
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
