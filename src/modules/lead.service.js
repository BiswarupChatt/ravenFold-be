import ApiError from '@/common/errors/api.error.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import {
  assertDatabaseReady,
  escapeRegex,
  normalizeObjectId,
  normalizeOptionalObjectId,
  normalizeText,
} from '@/common/utils/service.util.js';
import Lead, { LEAD_SOURCE } from '@/modules/lead.model.js';

const formatLead = (lead = {}) => ({
  id: lead.id || lead._id?.toString?.() || '',
  campaignId: lead.campaignId?._id?.toString?.() || lead.campaignId?.toString?.() || null,
  campaignTitle: lead.campaignId?.title || '',
  email: lead.email || '',
  source: lead.source || '',
  pageUrl: lead.pageUrl || '',
  isSubscribed: Boolean(lead.isSubscribed),
  subscribedAt: lead.subscribedAt || null,
  createdAt: lead.createdAt || null,
  updatedAt: lead.updatedAt || null,
});

const createLead = async (payload = {}) => {
  assertDatabaseReady();
  const email = normalizeText(payload.email).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'email must be valid');
  }

  const campaignId = normalizeOptionalObjectId(payload.campaignId, 'campaign id');
  const source = normalizeText(payload.source).toLowerCase() || LEAD_SOURCE.POPUP;

  const lead = await Lead.findOneAndUpdate(
    { campaignId, email, source },
    {
      $set: {
        campaignId,
        email,
        isSubscribed: true,
        metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
        pageUrl: normalizeText(payload.pageUrl),
        source,
      },
      $setOnInsert: { subscribedAt: new Date() },
    },
    { new: true, setDefaultsOnInsert: true, upsert: true },
  ).lean().exec();

  return formatLead(lead);
};

const listAdminLeads = async (query = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const filter = {};

  if (query.search) filter.email = { $regex: escapeRegex(normalizeText(query.search)), $options: 'i' };
  if (query.campaignId) filter.campaignId = normalizeObjectId(query.campaignId, 'campaign id');
  if (query.source) filter.source = normalizeText(query.source).toLowerCase();

  const [items, total] = await Promise.all([
    Lead.find(filter).populate('campaignId', 'title').sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    Lead.countDocuments(filter).exec(),
  ]);

  return {
    items: items.map(formatLead),
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

export { createLead, formatLead, listAdminLeads };

export default { createLead, formatLead, listAdminLeads };
