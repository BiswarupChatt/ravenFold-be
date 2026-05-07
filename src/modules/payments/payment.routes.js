const express = require('express');

const paymentController = require('./payment.controller');
const asyncHandler = require('../../common/helpers/asyncHandler.helper');

const router = express.Router();

router.get('/', asyncHandler(paymentController.getStatus));
router.post('/webhook', asyncHandler(paymentController.handleWebhook));

module.exports = router;
