const userService = require('./user.service');
const { sendSuccess } = require('../../common/helpers/response.helper');

async function getStatus(req, res) {
  return sendSuccess(res, userService.getStatus(), 'Users module ready');
}

module.exports = {
  getStatus,
};
