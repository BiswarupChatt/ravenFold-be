const express = require('express');

const productController = require('./product.controller');
const asyncHandler = require('../../common/helpers/asyncHandler.helper');

const router = express.Router();

router.get('/', asyncHandler(productController.getStatus));

module.exports = router;
