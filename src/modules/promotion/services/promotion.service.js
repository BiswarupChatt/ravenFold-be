import ApiError from '@/common/errors/api.error.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import {
  assertDatabaseReady,
  getDocumentId,
  normalizeObjectId,
  normalizeText,
} from '@/common/utils/service.util.js';
import PromotionUsage from '@/modules/promotion/models/promotion-usage.model.js';
import Promotion from '@/modules/promotion/models/promotion.model.js';
import { PROMOTION_TYPE, promotionApplicableOnValues, promotionTypes } from '@/modules/promotion/constants/promotion.constants.js';

const buildActivePromotionQuery = (now = new Date()) => ({
  isActive: true,
  $and: [
    {
      $or: [
        { startDate: null },
        { startDate: { $exists: false } },
        { startDate: { $lte: now } },
      ],
    },
    {
      $or: [
        { endDate: null },
        { endDate: { $exists: false } },
        { endDate: { $gte: now } },
      ],
    },
  ],
});

const normalizeCouponCode = (couponCode = '') => normalizeText(couponCode).toUpperCase();

const normalizeUserId = (actor = null) => {
  try {
    if (!actor?.id) {
      throw new Error('Missing actor id');
    }

    return normalizeObjectId(actor.id, 'authenticated user');
  } catch {
    throw new ApiError(401, 'Authentication required');
  }
};

const formatPromotion = (promotion = {}, { publicView = false } = {}) => ({
  id: promotion.id || promotion._id?.toString?.() || '',
  title: promotion.title || '',
  description: promotion.description || '',
  type: promotion.type || '',
  applicableOn: promotion.applicableOn || '',
  productIds: Array.isArray(promotion.productIds) ? promotion.productIds.map(getDocumentId).filter(Boolean) : [],
  categoryIds: Array.isArray(promotion.categoryIds) ? promotion.categoryIds.map(getDocumentId).filter(Boolean) : [],
  couponCode: publicView ? '' : (promotion.couponCode || ''),
  discountValue: promotion.discountValue ?? null,
  discountMethod: promotion.discountMethod || '',
  maxDiscountAmount: promotion.maxDiscountAmount ?? null,
  minOrderAmount: promotion.minOrderAmount ?? null,
  buyQuantity: promotion.buyQuantity ?? null,
  getQuantity: promotion.getQuantity ?? null,
  usageLimit: promotion.usageLimit ?? null,
  perUserLimit: promotion.perUserLimit ?? null,
  usedCount: publicView ? undefined : Number(promotion.usedCount || 0),
  priority: Number(promotion.priority || 0),
  isStackable: Boolean(promotion.isStackable),
  isAutomatic: Boolean(promotion.isAutomatic),
  isActive: Boolean(promotion.isActive),
  startDate: promotion.startDate || null,
  endDate: promotion.endDate || null,
  createdBy: publicView ? null : getDocumentId(promotion.createdBy),
  createdAt: promotion.createdAt || null,
  updatedAt: promotion.updatedAt || null,
});

const buildAdminPromotionFilter = (query = {}) => {
  const filter = {};

  if (query.type && promotionTypes.includes(query.type)) {
    filter.type = query.type;
  }

  if (query.applicableOn && promotionApplicableOnValues.includes(query.applicableOn)) {
    filter.applicableOn = query.applicableOn;
  }

  if (query.couponCode) {
    filter.couponCode = normalizeCouponCode(query.couponCode);
  }

  if (query.createdBy) {
    filter.createdBy = normalizeObjectId(query.createdBy, 'createdBy');
  }

  if (typeof query.isActive === 'boolean') {
    filter.isActive = query.isActive;
  }

  return filter;
};

const listActivePromotions = async ({ now = new Date() } = {}) => {
  assertDatabaseReady();

  return Promotion.find(buildActivePromotionQuery(now))
    .sort({ priority: -1, isAutomatic: -1, createdAt: 1 })
    .lean()
    .exec();
};

const listPublicActivePromotions = async ({ now = new Date() } = {}) => {
  const promotions = await listActivePromotions({ now });

  return promotions
    .filter((promotion) => promotion.isAutomatic || promotion.type !== PROMOTION_TYPE.COUPON)
    .map((promotion) => formatPromotion(promotion, { publicView: true }));
};

const listAdminPromotions = async (query = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const filter = buildAdminPromotionFilter(query);
  const [promotions, total] = await Promise.all([
    Promotion.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    Promotion.countDocuments(filter).exec(),
  ]);

  return {
    items: promotions.map((promotion) => formatPromotion(promotion)),
    pagination: {
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
      limit,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getPromotionById = async (promotionId) => {
  assertDatabaseReady();
  const normalizedPromotionId = normalizeObjectId(promotionId, 'promotion id');
  const promotion = await Promotion.findById(normalizedPromotionId).lean().exec();

  if (!promotion) {
    throw new ApiError(404, 'Promotion not found');
  }

  return formatPromotion(promotion);
};

const createPromotion = async (actor, payload = {}) => {
  assertDatabaseReady();
  const actorId = normalizeUserId(actor);
  const promotion = await Promotion.create({
    ...payload,
    createdBy: actorId,
  });

  return formatPromotion(promotion.toObject());
};

const updatePromotion = async (promotionId, payload = {}) => {
  assertDatabaseReady();
  const normalizedPromotionId = normalizeObjectId(promotionId, 'promotion id');
  const promotion = await Promotion.findById(normalizedPromotionId).exec();

  if (!promotion) {
    throw new ApiError(404, 'Promotion not found');
  }

  Object.assign(promotion, payload);
  await promotion.save();

  return formatPromotion(promotion.toObject());
};

const deletePromotion = async (promotionId) => {
  assertDatabaseReady();
  const normalizedPromotionId = normalizeObjectId(promotionId, 'promotion id');
  const promotion = await Promotion.findById(normalizedPromotionId).exec();

  if (!promotion) {
    throw new ApiError(404, 'Promotion not found');
  }

  await promotion.deleteOne();

  return {
    deleted: true,
    id: normalizedPromotionId,
  };
};

const updatePromotionStatus = async (promotionId, isActive) => {
  assertDatabaseReady();
  const normalizedPromotionId = normalizeObjectId(promotionId, 'promotion id');
  const promotion = await Promotion.findById(normalizedPromotionId).exec();

  if (!promotion) {
    throw new ApiError(404, 'Promotion not found');
  }

  promotion.isActive = Boolean(isActive);
  await promotion.save();

  return formatPromotion(promotion.toObject());
};

const getPromotionUsageSummary = async ({ promotionIds = [], userId = null } = {}) => {
  assertDatabaseReady();

  if (!promotionIds.length) {
    return {
      totalByPromotionId: new Map(),
      userByPromotionId: new Map(),
    };
  }

  const [totalUsage, userUsage] = await Promise.all([
    PromotionUsage.aggregate([
      {
        $match: {
          promotionId: { $in: promotionIds },
        },
      },
      {
        $group: {
          _id: '$promotionId',
          count: { $sum: 1 },
        },
      },
    ]).exec(),
    userId
      ? PromotionUsage.aggregate([
        {
          $match: {
            promotionId: { $in: promotionIds },
            userId,
          },
        },
        {
          $group: {
            _id: '$promotionId',
            count: { $sum: 1 },
          },
        },
      ]).exec()
      : Promise.resolve([]),
  ]);

  return {
    totalByPromotionId: new Map(totalUsage.map((entry) => [entry._id.toString(), Number(entry.count || 0)])),
    userByPromotionId: new Map(userUsage.map((entry) => [entry._id.toString(), Number(entry.count || 0)])),
  };
};

const recordPromotionUsageForOrder = async (order = {}) => {
  assertDatabaseReady();
  const appliedPromotions = Array.isArray(order.appliedPromotions) ? order.appliedPromotions : [];

  if (!appliedPromotions.length) {
    return {
      createdUsageCount: 0,
      createdUsageIds: [],
    };
  }

  let createdUsageCount = 0;
  const createdUsageIds = [];

  for (const appliedPromotion of appliedPromotions) {
    const promotionId = normalizeObjectId(appliedPromotion.promotionId, 'applied promotion id');
    const updateResult = await PromotionUsage.updateOne(
      {
        orderId: order._id,
        promotionId,
      },
      {
        $setOnInsert: {
          couponCode: normalizeCouponCode(appliedPromotion.couponCode),
          discountAmount: Number(appliedPromotion.discountAmount || 0),
          orderId: order._id,
          promotionId,
          shippingDiscountAmount: Number(appliedPromotion.shippingDiscountAmount || 0),
          usedAt: order.paidAt || new Date(),
          userId: order.userId,
        },
      },
      {
        upsert: true,
      },
    ).exec();

    if (Number(updateResult.upsertedCount || 0) > 0) {
      createdUsageCount += 1;
      createdUsageIds.push(promotionId);
    }
  }

  if (createdUsageIds.length > 0) {
    await Promotion.updateMany(
      {
        _id: { $in: createdUsageIds },
      },
      {
        $inc: {
          usedCount: 1,
        },
      },
    ).exec();
  }

  return {
    createdUsageCount,
    createdUsageIds,
  };
};

export {
  buildActivePromotionQuery,
  buildAdminPromotionFilter,
  createPromotion,
  deletePromotion,
  formatPromotion,
  getPromotionById,
  getPromotionUsageSummary,
  listAdminPromotions,
  listActivePromotions,
  listPublicActivePromotions,
  normalizeCouponCode,
  recordPromotionUsageForOrder,
  updatePromotion,
  updatePromotionStatus,
};

export default {
  buildActivePromotionQuery,
  buildAdminPromotionFilter,
  createPromotion,
  deletePromotion,
  formatPromotion,
  getPromotionById,
  getPromotionUsageSummary,
  listAdminPromotions,
  listActivePromotions,
  listPublicActivePromotions,
  normalizeCouponCode,
  recordPromotionUsageForOrder,
  updatePromotion,
  updatePromotionStatus,
};
