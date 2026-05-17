import { sendSuccess } from '@/common/helpers/response.helper.js';
import cloudinaryService from '@/infrastructure/storage/cloudinary.service.js';
import productService from '@/modules/product/services/product.service.js';

const getStatus = async (req, res) => {
  return sendSuccess(res, productService.getStatusData(), 'Products module ready');
};

const createProduct = async (req, res) => {
  return sendSuccess(res, await productService.createProduct(req.body), 'Product created', 201);
};

const createProductImageUploadSignature = async (req, res) => {
  return sendSuccess(
    res,
    cloudinaryService.createProductImageUploadSignature(),
    'Cloudinary upload signature created',
    201,
  );
};

const listProducts = async (req, res) => {
  return sendSuccess(res, await productService.listProducts(req.query), 'Products fetched');
};

const listAdminProducts = async (req, res) => {
  return sendSuccess(
    res,
    await productService.listProducts(req.query, { includeInactive: true }),
    'Products fetched',
  );
};

const getProduct = async (req, res) => {
  return sendSuccess(res, await productService.getProduct(req.params.productIdOrSlug), 'Product fetched');
};

const getAdminProduct = async (req, res) => {
  return sendSuccess(
    res,
    await productService.getProduct(req.params.productIdOrSlug, { includeInactive: true }),
    'Product fetched',
  );
};

const updateProduct = async (req, res) => {
  return sendSuccess(
    res,
    await productService.updateProduct(req.params.productId, req.body),
    'Product updated',
  );
};

const deleteProduct = async (req, res) => {
  return sendSuccess(
    res,
    await productService.deleteProduct(req.params.productId),
    'Product deleted',
  );
};

export {
  createProductImageUploadSignature,
  createProduct,
  deleteProduct,
  getAdminProduct,
  getProduct,
  getStatus,
  listAdminProducts,
  listProducts,
  updateProduct,
};

export default {
  createProductImageUploadSignature,
  createProduct,
  deleteProduct,
  getAdminProduct,
  getProduct,
  getStatus,
  listAdminProducts,
  listProducts,
  updateProduct,
};
