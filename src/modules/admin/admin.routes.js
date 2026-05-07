const express = require('express');

const adminService = require('./admin.service');
const dashboardService = require('./dashboard.service');
const { sendSuccess } = require('../../common/helpers/response.helper');

const router = express.Router();

router.get('/', (req, res) => {
  sendSuccess(res, adminService.getStatus(), 'Admin module ready');
});

router.get('/dashboard', (req, res) => {
  sendSuccess(res, dashboardService.getDashboard(), 'Admin dashboard ready');
});

module.exports = router;
