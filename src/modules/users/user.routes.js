const express = require('express');

const userController = require('./user.controller');
const asyncHandler = require('../../common/helpers/asyncHandler.helper');

const router = express.Router();

router.get('/', asyncHandler(userController.getStatus));

module.exports = router;
