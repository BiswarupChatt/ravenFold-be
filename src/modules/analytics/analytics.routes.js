const express = require('express');

const analyticsService = require('./analytics.service');
const { sendSuccess } = require('../../common/helpers/response.helper');

const router = express.Router();

router.get('/', (req, res) => {
  sendSuccess(res, analyticsService.getStatus(), 'Analytics module ready');
});

module.exports = router;
