import { sendSuccess } from '@/common/helpers/response.helper.js';
import boxTypeService from '@/modules/box-type/services/box-type.service.js';

const getStatus = async (req, res) => {
  return sendSuccess(res, boxTypeService.getStatusData(), 'Box types module ready');
};

const createBoxType = async (req, res) => {
  return sendSuccess(res, await boxTypeService.createBoxType(req.body), 'Box type created', 201);
};

const listBoxTypes = async (req, res) => {
  return sendSuccess(res, await boxTypeService.listBoxTypes(req.query), 'Box types fetched');
};

const listAdminBoxTypes = async (req, res) => {
  return sendSuccess(
    res,
    await boxTypeService.listBoxTypes(req.query, { includeInactive: true }),
    'Box types fetched',
  );
};

const getBoxType = async (req, res) => {
  return sendSuccess(res, await boxTypeService.getBoxType(req.params.boxTypeIdOrCode), 'Box type fetched');
};

const getAdminBoxType = async (req, res) => {
  return sendSuccess(
    res,
    await boxTypeService.getBoxType(req.params.boxTypeIdOrCode, { includeInactive: true }),
    'Box type fetched',
  );
};

const updateBoxType = async (req, res) => {
  return sendSuccess(
    res,
    await boxTypeService.updateBoxType(req.params.boxTypeId, req.body),
    'Box type updated',
  );
};

const deleteBoxType = async (req, res) => {
  return sendSuccess(
    res,
    await boxTypeService.deleteBoxType(req.params.boxTypeId),
    'Box type deleted',
  );
};

export {
  createBoxType,
  deleteBoxType,
  getAdminBoxType,
  getBoxType,
  getStatus,
  listAdminBoxTypes,
  listBoxTypes,
  updateBoxType,
};

export default {
  createBoxType,
  deleteBoxType,
  getAdminBoxType,
  getBoxType,
  getStatus,
  listAdminBoxTypes,
  listBoxTypes,
  updateBoxType,
};
