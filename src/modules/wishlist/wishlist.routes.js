const express = require('express');

const wishlistService = require('./wishlist.service');
const { sendSuccess } = require('../../common/helpers/response.helper');

const router = express.Router();

router.get('/', (req, res) => {
  sendSuccess(res, wishlistService.getStatus(), 'Wishlist module ready');
});

module.exports = router;
