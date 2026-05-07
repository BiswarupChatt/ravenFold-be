const express = require('express');

const reviewService = require('./review.service');
const { sendSuccess } = require('../../common/helpers/response.helper');

const router = express.Router();

router.get('/', (req, res) => {
  sendSuccess(res, reviewService.getStatus(), 'Reviews module ready');
});

module.exports = router;
