import { sendSuccess } from '@/common/helpers/response.helper.js';
import promotionService from '@/modules/promotion/services/promotion.service.js';

const listPublicActivePromotions = async (req, res) => {
  return sendSuccess(res, await promotionService.listPublicActivePromotions(), 'Active promotions fetched');
};

const listAdminPromotions = async (req, res) => {
  return sendSuccess(res, await promotionService.listAdminPromotions(req.query), 'Promotions fetched');
};

const getPromotionById = async (req, res) => {
  return sendSuccess(res, await promotionService.getPromotionById(req.params.promotionId), 'Promotion fetched');
};

const createPromotion = async (req, res) => {
  return sendSuccess(res, await promotionService.createPromotion(req.user, req.body), 'Promotion created', 201);
};

const updatePromotion = async (req, res) => {
  return sendSuccess(res, await promotionService.updatePromotion(req.params.promotionId, req.body), 'Promotion updated');
};

const deletePromotion = async (req, res) => {
  return sendSuccess(res, await promotionService.deletePromotion(req.params.promotionId), 'Promotion deleted');
};

const updatePromotionStatus = async (req, res) => {
  return sendSuccess(
    res,
    await promotionService.updatePromotionStatus(req.params.promotionId, req.body.isActive),
    'Promotion status updated',
  );
};

export {
  createPromotion,
  deletePromotion,
  getPromotionById,
  listAdminPromotions,
  listPublicActivePromotions,
  updatePromotion,
  updatePromotionStatus,
};

export default {
  createPromotion,
  deletePromotion,
  getPromotionById,
  listAdminPromotions,
  listPublicActivePromotions,
  updatePromotion,
  updatePromotionStatus,
};
