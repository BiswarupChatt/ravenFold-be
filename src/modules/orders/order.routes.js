const express = require('express');

const orderController = require('./order.controller');
const asyncHandler = require('../../common/helpers/asyncHandler.helper');

const router = express.Router();

router.get('/', asyncHandler(orderController.getStatus));

module.exports = router;
