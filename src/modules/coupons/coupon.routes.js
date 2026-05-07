const express = require('express');

const couponService = require('./coupon.service');
const { sendSuccess } = require('../../common/helpers/response.helper');

const router = express.Router();

router.get('/', (req, res) => {
  sendSuccess(res, couponService.getStatus(), 'Coupons module ready');
});

module.exports = router;
