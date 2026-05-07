const express = require('express');

const shippingService = require('./shipping.service');
const { sendSuccess } = require('../../common/helpers/response.helper');

const router = express.Router();

router.get('/', (req, res) => {
  sendSuccess(res, shippingService.getStatus(), 'Shipping module ready');
});

module.exports = router;
