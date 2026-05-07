const express = require('express');

const authController = require('./auth.controller');
const asyncHandler = require('../../common/helpers/asyncHandler.helper');

const router = express.Router();

router.get('/', asyncHandler(authController.getStatus));
router.post('/login', asyncHandler(authController.login));
router.post('/verify-otp', asyncHandler(authController.verifyOtp));

module.exports = router;
