import { sendSuccess } from '@/common/helpers/response.helper.js';
import productVariantService from '@/modules/product/services/product-variant.service.js';

const createProductVariant = async (req, res) => {
  return sendSuccess(
    res,
    await productVariantService.createProductVariant(req.params.productId, req.body),
    'Product variant created',
    201,
  );
};

const listProductVariants = async (req, res) => {
  return sendSuccess(
    res,
    await productVariantService.listProductVariants(req.params.productId, req.query),
    'Product variants fetched',
  );
};

const listAdminProductVariants = async (req, res) => {
  return sendSuccess(
    res,
    await productVariantService.listProductVariants(req.params.productId, req.query, { includeInactive: true }),
    'Product variants fetched',
  );
};

const getProductVariant = async (req, res) => {
  return sendSuccess(
    res,
    await productVariantService.getProductVariant(req.params.productId, req.params.variantId),
    'Product variant fetched',
  );
};

const getAdminProductVariant = async (req, res) => {
  return sendSuccess(
    res,
    await productVariantService.getProductVariant(req.params.productId, req.params.variantId, {
      includeInactive: true,
    }),
    'Product variant fetched',
  );
};

const updateProductVariant = async (req, res) => {
  return sendSuccess(
    res,
    await productVariantService.updateProductVariant(req.params.productId, req.params.variantId, req.body),
    'Product variant updated',
  );
};

const deleteProductVariant = async (req, res) => {
  return sendSuccess(
    res,
    await productVariantService.deleteProductVariant(req.params.productId, req.params.variantId),
    'Product variant deleted',
  );
};

export {
  createProductVariant,
  deleteProductVariant,
  getAdminProductVariant,
  getProductVariant,
  listAdminProductVariants,
  listProductVariants,
  updateProductVariant,
};

export default {
  createProductVariant,
  deleteProductVariant,
  getAdminProductVariant,
  getProductVariant,
  listAdminProductVariants,
  listProductVariants,
  updateProductVariant,
};
