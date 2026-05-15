import { sendSuccess } from '@/common/helpers/response.helper.js';
import categoryService from '@/modules/category/services/category.service.js';

const getStatus = async (req, res) => {
  return sendSuccess(res, categoryService.getStatusData(), 'Categories module ready');
};

const createCategory = async (req, res) => {
  return sendSuccess(res, await categoryService.createCategory(req.body), 'Category created', 201);
};

const listCategories = async (req, res) => {
  return sendSuccess(res, await categoryService.listCategories(req.query), 'Categories fetched');
};

const listAdminCategories = async (req, res) => {
  return sendSuccess(
    res,
    await categoryService.listCategories(req.query, { includeInactive: true }),
    'Categories fetched',
  );
};

const listCategoryTree = async (req, res) => {
  return sendSuccess(res, await categoryService.listCategoryTree(req.query), 'Category tree fetched');
};

const listAdminCategoryTree = async (req, res) => {
  return sendSuccess(
    res,
    await categoryService.listCategoryTree(req.query, { includeInactive: true }),
    'Category tree fetched',
  );
};

const getCategory = async (req, res) => {
  return sendSuccess(res, await categoryService.getCategory(req.params.categoryIdOrSlug), 'Category fetched');
};

const getAdminCategory = async (req, res) => {
  return sendSuccess(
    res,
    await categoryService.getCategory(req.params.categoryIdOrSlug, { includeInactive: true }),
    'Category fetched',
  );
};

const updateCategory = async (req, res) => {
  return sendSuccess(
    res,
    await categoryService.updateCategory(req.params.categoryId, req.body),
    'Category updated',
  );
};

const deleteCategory = async (req, res) => {
  return sendSuccess(
    res,
    await categoryService.deleteCategory(req.params.categoryId),
    'Category deleted',
  );
};

export {
  createCategory,
  deleteCategory,
  getAdminCategory,
  getCategory,
  getStatus,
  listAdminCategories,
  listAdminCategoryTree,
  listCategories,
  listCategoryTree,
  updateCategory,
};

export default {
  createCategory,
  deleteCategory,
  getAdminCategory,
  getCategory,
  getStatus,
  listAdminCategories,
  listAdminCategoryTree,
  listCategories,
  listCategoryTree,
  updateCategory,
};
