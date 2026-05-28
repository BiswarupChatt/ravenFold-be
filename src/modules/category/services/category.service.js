import ApiError from '@/common/errors/api.error.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import {
  assertDatabaseReady,
  assertValidObjectId,
  createObjectId,
  escapeRegex,
  hasOwn,
  isValidObjectId,
  normalizeBoolean,
  normalizeOptionalObjectId,
  normalizeText,
} from '@/common/utils/service.util.js';
import { createSlug } from '@/common/utils/slug.util.js';
import Category from '@/modules/category/models/category.model.js';

const editableCategoryFields = ['name', 'slug', 'parentCategoryId', 'image', 'isActive'];

const assertValidCategoryId = (categoryId) => {
  assertValidObjectId(categoryId, 'category id');
};

const normalizeOptionalParentCategoryId = (value) => {
  return normalizeOptionalObjectId(value, 'parent category id');
};

const formatCategory = (category) => {
  return {
    id: category.id || category._id?.toString(),
    name: category.name,
    slug: category.slug,
    parentCategoryId: category.parentCategoryId?.toString() || null,
    image: category.image || '',
    isActive: Boolean(category.isActive),
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
};

const getStatusData = () => {
  return {
    module: 'categories',
  };
};

const buildCategoryPayload = (payload = {}, { requireName = false } = {}) => {
  const categoryPayload = {};

  for (const field of editableCategoryFields) {
    if (!hasOwn(payload, field)) {
      continue;
    }

    if (field === 'parentCategoryId') {
      categoryPayload.parentCategoryId = normalizeOptionalParentCategoryId(payload.parentCategoryId);
      continue;
    }

    if (field === 'isActive') {
      categoryPayload.isActive = normalizeBoolean(payload.isActive, 'isActive');
      continue;
    }

    if (field === 'slug') {
      categoryPayload.slug = createSlug(payload.slug);
      continue;
    }

    categoryPayload[field] = normalizeText(payload[field]);
  }

  if (requireName && !categoryPayload.name) {
    throw new ApiError(400, 'name is required');
  }

  if (hasOwn(categoryPayload, 'name') && !categoryPayload.name) {
    throw new ApiError(400, 'name cannot be empty');
  }

  if (!categoryPayload.slug && categoryPayload.name) {
    categoryPayload.slug = createSlug(categoryPayload.name);
  }

  if (hasOwn(categoryPayload, 'slug') && !categoryPayload.slug) {
    throw new ApiError(400, 'slug cannot be empty');
  }

  return categoryPayload;
};

const buildListFilter = (query = {}, { includeInactive = false } = {}) => {
  const filter = {};

  if (includeInactive) {
    if (hasOwn(query, 'isActive')) {
      filter.isActive = normalizeBoolean(query.isActive, 'isActive');
    }
  } else {
    filter.isActive = true;
  }

  if (hasOwn(query, 'parentCategoryId')) {
    filter.parentCategoryId = normalizeOptionalParentCategoryId(query.parentCategoryId);
  } else if (
    hasOwn(query, 'rootOnly') &&
    normalizeBoolean(query.rootOnly, 'rootOnly')
  ) {
    filter.parentCategoryId = null;
  }

  const search = normalizeText(query.search);

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), 'i');

    filter.$or = [
      {
        name: searchRegex,
      },
      {
        slug: searchRegex,
      },
    ];
  }

  return filter;
};

const assertCategorySlugIsAvailable = async (slug, excludedCategoryId = null) => {
  const query = { slug };

  if (excludedCategoryId) {
    query._id = {
      $ne: excludedCategoryId,
    };
  }

  const existingCategory = await Category.exists(query).exec();

  if (existingCategory) {
    throw new ApiError(409, 'Category slug already exists');
  }
};

const assertNoCircularParent = async (categoryId, parentCategoryId) => {
  if (!parentCategoryId) {
    return;
  }

  let currentParentCategoryId = parentCategoryId;

  while (currentParentCategoryId) {
    if (currentParentCategoryId.toString() === categoryId.toString()) {
      throw new ApiError(400, 'A category cannot be nested under itself or its descendants');
    }

    const parentCategory = await Category.findById(currentParentCategoryId).select('parentCategoryId').lean().exec();

    if (!parentCategory) {
      throw new ApiError(400, 'Parent category not found');
    }

    currentParentCategoryId = parentCategory.parentCategoryId;
  }
};

const getCategoryDocument = async (categoryId) => {
  assertDatabaseReady();
  assertValidCategoryId(categoryId);

  const category = await Category.findById(categoryId).exec();

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  return category;
};

const createCategory = async (payload) => {
  assertDatabaseReady();
  const categoryPayload = buildCategoryPayload(payload, { requireName: true });

  await assertNoCircularParent(createObjectId(), categoryPayload.parentCategoryId);
  await assertCategorySlugIsAvailable(categoryPayload.slug);

  const category = await Category.create(categoryPayload);

  return formatCategory(category);
};

const listCategories = async (query = {}, options = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const filter = buildListFilter(query, options);
  const [categories, total] = await Promise.all([
    Category.find(filter).sort({ name: 1, createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    Category.countDocuments(filter).exec(),
  ]);

  return {
    items: categories.map(formatCategory),
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

const listCategoryTree = async (query = {}, options = {}) => {
  assertDatabaseReady();
  const filter = buildListFilter(query, options);

  delete filter.parentCategoryId;

  const categories = await Category.find(filter).sort({ name: 1, createdAt: -1 }).lean().exec();
  const categoryMap = new Map();
  const rootCategories = [];

  for (const category of categories) {
    categoryMap.set(category._id.toString(), {
      ...formatCategory(category),
      children: [],
    });
  }

  for (const category of categories) {
    const formattedCategory = categoryMap.get(category._id.toString());
    const parentCategoryId = category.parentCategoryId?.toString();

    if (parentCategoryId && categoryMap.has(parentCategoryId)) {
      categoryMap.get(parentCategoryId).children.push(formattedCategory);
      continue;
    }

    rootCategories.push(formattedCategory);
  }

  return rootCategories;
};

const getCategory = async (categoryIdOrSlug, options = {}) => {
  assertDatabaseReady();
  const identifier = normalizeText(categoryIdOrSlug);

  if (!identifier) {
    throw new ApiError(400, 'Category id or slug is required');
  }

  const filter = isValidObjectId(identifier)
    ? { _id: identifier }
    : { slug: createSlug(identifier) };

  if (!options.includeInactive) {
    filter.isActive = true;
  }

  const category = await Category.findOne(filter).lean().exec();

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  return formatCategory(category);
};

const updateCategory = async (categoryId, payload) => {
  const category = await getCategoryDocument(categoryId);
  const categoryPayload = buildCategoryPayload(payload);

  if (Object.keys(categoryPayload).length === 0) {
    throw new ApiError(400, 'No category fields provided to update');
  }

  if (Object.prototype.hasOwnProperty.call(categoryPayload, 'slug')) {
    await assertCategorySlugIsAvailable(categoryPayload.slug, category._id);
  }

  if (Object.prototype.hasOwnProperty.call(categoryPayload, 'parentCategoryId')) {
    await assertNoCircularParent(category._id, categoryPayload.parentCategoryId);
  }

  Object.assign(category, categoryPayload);

  try {
    await category.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Category slug already exists');
    }

    throw error;
  }

  return formatCategory(category);
};

const deleteCategory = async (categoryId) => {
  const category = await getCategoryDocument(categoryId);
  const childCategory = await Category.exists({ parentCategoryId: category._id }).exec();

  if (childCategory) {
    throw new ApiError(409, 'Cannot delete a category that has child categories');
  }

  const deletedCategory = formatCategory(category);

  await category.deleteOne();

  return deletedCategory;
};

export {
  createCategory,
  deleteCategory,
  formatCategory,
  getCategory,
  getStatusData,
  listCategories,
  listCategoryTree,
  updateCategory,
};

export default {
  createCategory,
  deleteCategory,
  formatCategory,
  getCategory,
  getStatusData,
  listCategories,
  listCategoryTree,
  updateCategory,
};
