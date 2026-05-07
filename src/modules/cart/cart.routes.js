const express = require('express');

const cartService = require('./cart.service');
const { sendSuccess } = require('../../common/helpers/response.helper');

const router = express.Router();

router.get('/', (req, res) => {
  sendSuccess(res, cartService.getStatus(), 'Cart module ready');
});

module.exports = router;
