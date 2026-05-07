const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { apiPrefix, nodeEnv } = require('./config/env.config');
const routes = require('./routes');
const notFound = require('./common/middleware/notFound.middleware');
const errorHandler = require('./common/errors/error.handler');
const httpLogger = require('./common/logger/morgan.logger');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
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

module.exports = app;
