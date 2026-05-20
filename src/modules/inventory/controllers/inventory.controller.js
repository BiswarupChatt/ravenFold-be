import { sendSuccess } from '@/common/helpers/response.helper.js';
import inventoryService from '@/modules/inventory/services/inventory.service.js';

const getStatus = async (req, res) => {
  return sendSuccess(res, inventoryService.getStatusData(), 'Inventory module ready');
};

const createInventoryStock = async (req, res) => {
  return sendSuccess(res, await inventoryService.createInventoryStock(req.body, req.user), 'Inventory stock created', 201);
};

const listAdminInventoryStocks = async (req, res) => {
  return sendSuccess(res, await inventoryService.listInventoryStocks(req.query), 'Inventory stocks fetched');
};

const getAdminInventoryStock = async (req, res) => {
  return sendSuccess(
    res,
    await inventoryService.getInventoryStock(req.params.inventoryStockId),
    'Inventory stock fetched',
  );
};

const getAdminInventoryStockForTarget = async (req, res) => {
  return sendSuccess(res, await inventoryService.getInventoryStockForTarget(req.query), 'Inventory stock fetched');
};

const updateInventoryStock = async (req, res) => {
  return sendSuccess(
    res,
    await inventoryService.updateInventoryStock(req.params.inventoryStockId, req.body, req.user),
    'Inventory stock updated',
  );
};

const deleteInventoryStock = async (req, res) => {
  return sendSuccess(
    res,
    await inventoryService.deleteInventoryStock(req.params.inventoryStockId),
    'Inventory stock deleted',
  );
};

const adjustInventoryStock = async (req, res) => {
  return sendSuccess(res, await inventoryService.adjustInventoryStock(req.body, req.user), 'Inventory stock adjusted');
};

const reserveInventoryStock = async (req, res) => {
  return sendSuccess(res, await inventoryService.reserveInventoryStock(req.body, req.user), 'Inventory stock reserved');
};

const releaseInventoryReservation = async (req, res) => {
  return sendSuccess(
    res,
    await inventoryService.releaseInventoryReservation(req.body, req.user),
    'Inventory reservation released',
  );
};

const commitInventorySale = async (req, res) => {
  return sendSuccess(res, await inventoryService.commitInventorySale(req.body, req.user), 'Inventory sale committed');
};

export {
  adjustInventoryStock,
  commitInventorySale,
  createInventoryStock,
  deleteInventoryStock,
  getAdminInventoryStock,
  getAdminInventoryStockForTarget,
  getStatus,
  listAdminInventoryStocks,
  releaseInventoryReservation,
  reserveInventoryStock,
  updateInventoryStock,
};

export default {
  adjustInventoryStock,
  commitInventorySale,
  createInventoryStock,
  deleteInventoryStock,
  getAdminInventoryStock,
  getAdminInventoryStockForTarget,
  getStatus,
  listAdminInventoryStocks,
  releaseInventoryReservation,
  reserveInventoryStock,
  updateInventoryStock,
};
