const express = require('express');

const inventoryService = require('./inventory.service');
const { sendSuccess } = require('../../common/helpers/response.helper');

const router = express.Router();

router.get('/', (req, res) => {
  sendSuccess(res, inventoryService.getStatus(), 'Inventory module ready');
});

module.exports = router;
