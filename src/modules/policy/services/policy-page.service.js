import ApiError from '@/common/errors/api.error.js';
import {
  extractPlainTextFromHtml,
  isHtmlContentEmpty,
  sanitizePolicyHtml,
} from '@/common/utils/html-sanitizer.util.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import {
  assertDatabaseReady,
  escapeRegex,
  hasOwn,
  isValidObjectId,
  normalizeObjectId,
  normalizeText,
} from '@/common/utils/service.util.js';
import { createSlug } from '@/common/utils/slug.util.js';
import PolicyPage, {
  POLICY_PAGE_STATUS,
  policyPageStatuses,
  protectedPolicySlugs,
} from '@/modules/policy/models/policy-page.model.js';
import PolicyPageVersion from '@/modules/policy/models/policy-page-version.model.js';

const editablePolicyPageFields = [
  'title',
  'slug',
  'contentHtml',
  'status',
  'effectiveDate',
  'seo',
  'showInFooter',
  'footerLabel',
  'footerSortOrder',
];

const actorSelect = 'firstName lastName name email role';
const actorPopulate = [
  { path: 'createdBy', select: actorSelect },
  { path: 'updatedBy', select: actorSelect },
  { path: 'publishedBy', select: actorSelect },
];

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

const normalizeDate = (value, field) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${field} must be a valid date`);
  }

  return date;
};

const normalizeStatus = (value) => {
  const status = normalizeText(value).toLowerCase() || POLICY_PAGE_STATUS.DRAFT;

  if (!policyPageStatuses.includes(status)) {
    throw new ApiError(400, 'status is not supported');
  }

  return status;
};

const normalizePolicySlug = (value, fallbackTitle = '') => {
  const slug = createSlug(value || fallbackTitle);

  if (!slug) {
    throw new ApiError(400, 'slug cannot be empty');
  }

  return slug;
};

const normalizeSeo = (value = {}) => ({
  title: normalizeText(value?.title).slice(0, 70),
  description: normalizeText(value?.description).slice(0, 180),
});

const formatActor = (actor = null) => {
  if (!actor) {
    return null;
  }

  if (typeof actor !== 'object') {
    return {
      id: actor.toString(),
      email: '',
      name: '',
    };
  }

  const id = actor.id || actor._id?.toString?.() || '';
  const name = normalizeText([actor.firstName, actor.lastName].filter(Boolean).join(' '))
    || normalizeText(actor.name)
    || normalizeText(actor.email);

  return {
    id,
    email: actor.email || '',
    name,
  };
};

const isProtectedPolicy = (policy = {}) => protectedPolicySlugs.includes(policy.slug);

const formatPolicyPage = (policy = {}) => ({
  id: policy.id || policy._id?.toString?.() || '',
  title: policy.title || '',
  slug: policy.slug || '',
  contentHtml: policy.contentHtml || '',
  contentText: policy.contentText || '',
  status: policy.status || POLICY_PAGE_STATUS.DRAFT,
  effectiveDate: policy.effectiveDate || null,
  seo: {
    title: policy.seo?.title || '',
    description: policy.seo?.description || '',
  },
  version: Number(policy.version || 1),
  isSystemPolicy: Boolean(policy.isSystemPolicy || isProtectedPolicy(policy)),
  showInFooter: Boolean(policy.showInFooter),
  footerLabel: policy.footerLabel || '',
  footerSortOrder: Number(policy.footerSortOrder || 0),
  createdBy: formatActor(policy.createdBy),
  updatedBy: formatActor(policy.updatedBy),
  publishedBy: formatActor(policy.publishedBy),
  publishedAt: policy.publishedAt || null,
  createdAt: policy.createdAt || null,
  updatedAt: policy.updatedAt || null,
});

const formatPublicPolicyPage = (policy = {}) => {
  const formattedPolicy = formatPolicyPage(policy);

  return {
    id: formattedPolicy.id,
    title: formattedPolicy.title,
    slug: formattedPolicy.slug,
    contentHtml: formattedPolicy.contentHtml,
    effectiveDate: formattedPolicy.effectiveDate,
    seo: formattedPolicy.seo,
    version: formattedPolicy.version,
    publishedAt: formattedPolicy.publishedAt,
    updatedAt: formattedPolicy.updatedAt,
  };
};

const formatPublicPolicySummary = (policy = {}) => ({
  id: policy.id || policy._id?.toString?.() || '',
  title: policy.title || '',
  slug: policy.slug || '',
  footerLabel: policy.footerLabel || '',
  footerSortOrder: Number(policy.footerSortOrder || 0),
  effectiveDate: policy.effectiveDate || null,
  updatedAt: policy.updatedAt || null,
});

const formatPolicyPageVersion = (version = {}) => ({
  id: version.id || version._id?.toString?.() || '',
  policyId: version.policyId?.toString?.() || version.policyId || '',
  version: Number(version.version || 1),
  title: version.title || '',
  slug: version.slug || '',
  contentHtml: version.contentHtml || '',
  contentText: version.contentText || '',
  status: version.status || POLICY_PAGE_STATUS.DRAFT,
  effectiveDate: version.effectiveDate || null,
  seo: {
    title: version.seo?.title || '',
    description: version.seo?.description || '',
  },
  showInFooter: Boolean(version.showInFooter),
  footerLabel: version.footerLabel || '',
  footerSortOrder: Number(version.footerSortOrder || 0),
  updatedBy: formatActor(version.updatedBy),
  publishedBy: formatActor(version.publishedBy),
  publishedAt: version.publishedAt || null,
  createdAt: version.createdAt || null,
  updatedAt: version.updatedAt || null,
});

const buildPolicyPayload = (payload = {}, { currentPolicy = null, requireTitle = false } = {}) => {
  const policyPayload = {};

  for (const field of editablePolicyPageFields) {
    if (!hasOwn(payload, field)) {
      continue;
    }

    if (field === 'title') {
      policyPayload.title = normalizeText(payload.title);
      continue;
    }

    if (field === 'slug') {
      policyPayload.slug = normalizePolicySlug(payload.slug);
      continue;
    }

    if (field === 'contentHtml') {
      const contentHtml = sanitizePolicyHtml(payload.contentHtml);

      policyPayload.contentHtml = contentHtml;
      policyPayload.contentText = extractPlainTextFromHtml(contentHtml);
      continue;
    }

    if (field === 'status') {
      policyPayload.status = normalizeStatus(payload.status);
      continue;
    }

    if (field === 'effectiveDate') {
      policyPayload.effectiveDate = normalizeDate(payload.effectiveDate, 'effectiveDate');
      continue;
    }

    if (field === 'seo') {
      policyPayload.seo = {
        ...(currentPolicy?.seo || {}),
        ...normalizeSeo(payload.seo),
      };
      continue;
    }

    if (field === 'showInFooter') {
      policyPayload.showInFooter = payload.showInFooter === true || String(payload.showInFooter).trim().toLowerCase() === 'true';
      continue;
    }

    if (field === 'footerLabel') {
      policyPayload.footerLabel = normalizeText(payload.footerLabel).slice(0, 60);
      continue;
    }

    if (field === 'footerSortOrder') {
      const sortOrder = Number(payload.footerSortOrder || 0);

      if (!Number.isFinite(sortOrder)) {
        throw new ApiError(400, 'footerSortOrder must be a number');
      }

      policyPayload.footerSortOrder = sortOrder;
    }
  }

  if (requireTitle && !policyPayload.title) {
    throw new ApiError(400, 'title is required');
  }

  if (hasOwn(policyPayload, 'title') && !policyPayload.title) {
    throw new ApiError(400, 'title cannot be empty');
  }

  if (!policyPayload.slug && policyPayload.title) {
    policyPayload.slug = normalizePolicySlug('', policyPayload.title);
  }

  if (hasOwn(policyPayload, 'contentHtml') && isHtmlContentEmpty(policyPayload.contentHtml)) {
    if (policyPayload.status === POLICY_PAGE_STATUS.PUBLISHED) {
      throw new ApiError(400, 'content cannot be empty when publishing a policy');
    }
  }

  if (policyPayload.status === POLICY_PAGE_STATUS.PUBLISHED) {
    const contentHtml = hasOwn(policyPayload, 'contentHtml') ? policyPayload.contentHtml : currentPolicy?.contentHtml;

    if (isHtmlContentEmpty(contentHtml)) {
      throw new ApiError(400, 'content cannot be empty when publishing a policy');
    }
  }

  if (policyPayload.slug) {
    policyPayload.isSystemPolicy = protectedPolicySlugs.includes(policyPayload.slug);
  }

  return policyPayload;
};

const createVersionSnapshot = async (policy, actorId = null) => {
  await PolicyPageVersion.create({
    policyId: policy._id,
    version: policy.version,
    title: policy.title,
    slug: policy.slug,
    contentHtml: policy.contentHtml,
    contentText: policy.contentText,
    status: policy.status,
    effectiveDate: policy.effectiveDate,
    seo: policy.seo,
    showInFooter: Boolean(policy.showInFooter),
    footerLabel: policy.footerLabel || '',
    footerSortOrder: Number(policy.footerSortOrder || 0),
    updatedBy: actorId || policy.updatedBy || null,
    publishedBy: policy.publishedBy || null,
    publishedAt: policy.publishedAt || null,
  });
};

const assertPolicySlugIsAvailable = async (slug, excludedPolicyId = null) => {
  const query = { slug };

  if (excludedPolicyId) {
    query._id = { $ne: excludedPolicyId };
  }

  const existingPolicy = await PolicyPage.exists(query).exec();

  if (existingPolicy) {
    throw new ApiError(409, 'Policy slug already exists');
  }
};

const buildAdminPolicyFilter = (query = {}) => {
  const filter = {};
  const status = normalizeText(query.status).toLowerCase();

  if (status && status !== 'all') {
    if (!policyPageStatuses.includes(status)) {
      throw new ApiError(400, 'status is not supported');
    }

    filter.status = status;
  }

  const search = normalizeText(query.search);

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), 'i');

    filter.$or = [
      { title: searchRegex },
      { slug: searchRegex },
      { contentText: searchRegex },
      { 'seo.title': searchRegex },
      { 'seo.description': searchRegex },
    ];
  }

  return filter;
};

const getPolicyDocument = async (policyIdOrSlug) => {
  assertDatabaseReady();
  const identifier = normalizeText(policyIdOrSlug);

  if (!identifier) {
    throw new ApiError(400, 'Policy id or slug is required');
  }

  const filter = isValidObjectId(identifier)
    ? { _id: identifier }
    : { slug: normalizePolicySlug(identifier) };

  const policy = await PolicyPage.findOne(filter).exec();

  if (!policy) {
    throw new ApiError(404, 'Policy not found');
  }

  return policy;
};

const listAdminPolicies = async (query = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const filter = buildAdminPolicyFilter(query);
  const [policies, total] = await Promise.all([
    PolicyPage.find(filter)
      .sort({ isSystemPolicy: -1, title: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(actorPopulate)
      .lean()
      .exec(),
    PolicyPage.countDocuments(filter).exec(),
  ]);

  return {
    items: policies.map(formatPolicyPage),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

const getAdminPolicy = async (policyIdOrSlug) => {
  const policy = await PolicyPage.findById((await getPolicyDocument(policyIdOrSlug))._id)
    .populate(actorPopulate)
    .lean()
    .exec();

  return formatPolicyPage(policy);
};

const getPublishedPolicyBySlug = async (slug) => {
  assertDatabaseReady();
  const policy = await PolicyPage.findOne({
    slug: normalizePolicySlug(slug),
    status: POLICY_PAGE_STATUS.PUBLISHED,
  })
    .lean()
    .exec();

  if (!policy) {
    throw new ApiError(404, 'Published policy not found');
  }

  return formatPublicPolicyPage(policy);
};

const listPublishedPolicies = async () => {
  assertDatabaseReady();
  const policies = await PolicyPage.find({
    status: POLICY_PAGE_STATUS.PUBLISHED,
    showInFooter: true,
  })
    .select('title slug footerLabel footerSortOrder effectiveDate updatedAt')
    .sort({ footerSortOrder: 1, title: 1 })
    .lean()
    .exec();

  return policies.map(formatPublicPolicySummary);
};

const createPolicy = async (actor, payload = {}) => {
  assertDatabaseReady();
  const actorId = normalizeUserId(actor);
  const policyPayload = buildPolicyPayload(payload, { requireTitle: true });

  await assertPolicySlugIsAvailable(policyPayload.slug);

  if (policyPayload.status === POLICY_PAGE_STATUS.PUBLISHED && isHtmlContentEmpty(policyPayload.contentHtml)) {
    throw new ApiError(400, 'content cannot be empty when publishing a policy');
  }

  try {
    const policy = await PolicyPage.create({
      ...policyPayload,
      createdBy: actorId,
      updatedBy: actorId,
      ...(policyPayload.status === POLICY_PAGE_STATUS.PUBLISHED
        ? {
          publishedBy: actorId,
          publishedAt: new Date(),
        }
        : {}),
    });

    return formatPolicyPage(policy.toObject());
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Policy slug already exists');
    }

    throw error;
  }
};

const updatePolicy = async (actor, policyId, payload = {}) => {
  const actorId = normalizeUserId(actor);
  const policy = await getPolicyDocument(policyId);
  const policyPayload = buildPolicyPayload(payload, { currentPolicy: policy });
  const currentPolicyIsSystem = Boolean(policy.isSystemPolicy || isProtectedPolicy(policy));

  if (Object.keys(policyPayload).length === 0) {
    throw new ApiError(400, 'No policy fields provided to update');
  }

  if (currentPolicyIsSystem && hasOwn(policyPayload, 'slug') && policyPayload.slug !== policy.slug) {
    throw new ApiError(409, 'System policy slugs cannot be changed');
  }

  if (hasOwn(policyPayload, 'slug')) {
    await assertPolicySlugIsAvailable(policyPayload.slug, policy._id);
  }

  await createVersionSnapshot(policy, actorId);
  Object.assign(policy, policyPayload, {
    updatedBy: actorId,
    version: policy.version + 1,
  });

  if (policy.status !== POLICY_PAGE_STATUS.PUBLISHED) {
    policy.publishedBy = null;
    policy.publishedAt = null;
  }

  try {
    await policy.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Policy slug already exists');
    }

    throw error;
  }

  return formatPolicyPage(policy.toObject());
};

const publishPolicy = async (actor, policyId, payload = {}) => {
  const actorId = normalizeUserId(actor);
  const policy = await getPolicyDocument(policyId);
  const effectiveDate = hasOwn(payload, 'effectiveDate')
    ? normalizeDate(payload.effectiveDate, 'effectiveDate')
    : policy.effectiveDate;

  if (isHtmlContentEmpty(policy.contentHtml)) {
    throw new ApiError(400, 'content cannot be empty when publishing a policy');
  }

  await createVersionSnapshot(policy, actorId);
  policy.status = POLICY_PAGE_STATUS.PUBLISHED;
  policy.effectiveDate = effectiveDate;
  policy.updatedBy = actorId;
  policy.publishedBy = actorId;
  policy.publishedAt = new Date();
  policy.version += 1;

  await policy.save();

  return formatPolicyPage(policy.toObject());
};

const unpublishPolicy = async (actor, policyId) => {
  const actorId = normalizeUserId(actor);
  const policy = await getPolicyDocument(policyId);

  await createVersionSnapshot(policy, actorId);
  policy.status = POLICY_PAGE_STATUS.DRAFT;
  policy.updatedBy = actorId;
  policy.publishedBy = null;
  policy.publishedAt = null;
  policy.version += 1;

  await policy.save();

  return formatPolicyPage(policy.toObject());
};

const deletePolicy = async (policyId) => {
  const policy = await getPolicyDocument(policyId);

  if (policy.isSystemPolicy || isProtectedPolicy(policy)) {
    throw new ApiError(409, 'System policies cannot be deleted. Unpublish them instead.');
  }

  const deletedPolicy = formatPolicyPage(policy.toObject());

  await policy.deleteOne();

  return deletedPolicy;
};

const previewPolicy = async (policyIdOrSlug) => getAdminPolicy(policyIdOrSlug);

const listPolicyVersions = async (policyId) => {
  const policy = await getPolicyDocument(policyId);
  const versions = await PolicyPageVersion.find({ policyId: policy._id })
    .sort({ version: -1 })
    .populate([
      { path: 'updatedBy', select: actorSelect },
      { path: 'publishedBy', select: actorSelect },
    ])
    .lean()
    .exec();

  return versions.map(formatPolicyPageVersion);
};

const restorePolicyVersion = async (actor, policyId, versionId) => {
  const actorId = normalizeUserId(actor);
  const policy = await getPolicyDocument(policyId);
  const currentPolicyIsSystem = Boolean(policy.isSystemPolicy || isProtectedPolicy(policy));
  const version = await PolicyPageVersion.findOne({
    _id: normalizeObjectId(versionId, 'policy version id'),
    policyId: policy._id,
  }).exec();

  if (!version) {
    throw new ApiError(404, 'Policy version not found');
  }

  if (currentPolicyIsSystem && version.slug !== policy.slug) {
    throw new ApiError(409, 'System policy slugs cannot be changed');
  }

  await assertPolicySlugIsAvailable(version.slug, policy._id);
  await createVersionSnapshot(policy, actorId);

  policy.title = version.title;
  policy.slug = version.slug;
  policy.contentHtml = sanitizePolicyHtml(version.contentHtml);
  policy.contentText = extractPlainTextFromHtml(policy.contentHtml);
  policy.status = version.status;
  policy.effectiveDate = version.effectiveDate;
  policy.seo = normalizeSeo(version.seo);
  policy.showInFooter = Boolean(version.showInFooter);
  policy.footerLabel = version.footerLabel || '';
  policy.footerSortOrder = Number(version.footerSortOrder || 0);
  policy.isSystemPolicy = protectedPolicySlugs.includes(policy.slug);
  policy.updatedBy = actorId;
  policy.publishedBy = version.publishedBy || null;
  policy.publishedAt = version.publishedAt || null;
  policy.version += 1;

  await policy.save();

  return formatPolicyPage(policy.toObject());
};

export {
  createPolicy,
  deletePolicy,
  formatPolicyPage,
  formatPolicyPageVersion,
  formatPublicPolicyPage,
  getAdminPolicy,
  getPublishedPolicyBySlug,
  listAdminPolicies,
  listPublishedPolicies,
  listPolicyVersions,
  previewPolicy,
  publishPolicy,
  restorePolicyVersion,
  unpublishPolicy,
  updatePolicy,
};

export default {
  createPolicy,
  deletePolicy,
  formatPolicyPage,
  formatPolicyPageVersion,
  formatPublicPolicyPage,
  getAdminPolicy,
  getPublishedPolicyBySlug,
  listAdminPolicies,
  listPublishedPolicies,
  listPolicyVersions,
  previewPolicy,
  publishPolicy,
  restorePolicyVersion,
  unpublishPolicy,
  updatePolicy,
};
