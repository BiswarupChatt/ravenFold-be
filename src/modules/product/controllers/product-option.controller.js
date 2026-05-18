import { sendSuccess } from '@/common/helpers/response.helper.js';
import productOptionService from '@/modules/product/services/product-option.service.js';

const createProductOption = async (req, res) => {
  return sendSuccess(
    res,
    await productOptionService.createProductOption(req.params.productId, req.body),
    'Product option created',
    201,
  );
};

const listProductOptions = async (req, res) => {
  return sendSuccess(
    res,
    await productOptionService.listProductOptions(req.params.productId),
    'Product options fetched',
  );
};

const getProductOption = async (req, res) => {
  return sendSuccess(
    res,
    await productOptionService.getProductOption(req.params.productId, req.params.optionId),
    'Product option fetched',
  );
};

const updateProductOption = async (req, res) => {
  return sendSuccess(
    res,
    await productOptionService.updateProductOption(req.params.productId, req.params.optionId, req.body),
    'Product option updated',
  );
};

const deleteProductOption = async (req, res) => {
  return sendSuccess(
    res,
    await productOptionService.deleteProductOption(req.params.productId, req.params.optionId),
    'Product option deleted',
  );
};

const createProductOptionValue = async (req, res) => {
  return sendSuccess(
    res,
    await productOptionService.createProductOptionValue(req.params.productId, req.params.optionId, req.body),
    'Product option value created',
    201,
  );
};

const listProductOptionValues = async (req, res) => {
  return sendSuccess(
    res,
    await productOptionService.listProductOptionValues(req.params.productId, req.params.optionId),
    'Product option values fetched',
  );
};

const getProductOptionValue = async (req, res) => {
  return sendSuccess(
    res,
    await productOptionService.getProductOptionValue(
      req.params.productId,
      req.params.optionId,
      req.params.valueId,
    ),
    'Product option value fetched',
  );
};

const updateProductOptionValue = async (req, res) => {
  return sendSuccess(
    res,
    await productOptionService.updateProductOptionValue(
      req.params.productId,
      req.params.optionId,
      req.params.valueId,
      req.body,
    ),
    'Product option value updated',
  );
};

const deleteProductOptionValue = async (req, res) => {
  return sendSuccess(
    res,
    await productOptionService.deleteProductOptionValue(
      req.params.productId,
      req.params.optionId,
      req.params.valueId,
    ),
    'Product option value deleted',
  );
};

export {
  createProductOption,
  createProductOptionValue,
  deleteProductOption,
  deleteProductOptionValue,
  getProductOption,
  getProductOptionValue,
  listProductOptionValues,
  listProductOptions,
  updateProductOption,
  updateProductOptionValue,
};

export default {
  createProductOption,
  createProductOptionValue,
  deleteProductOption,
  deleteProductOptionValue,
  getProductOption,
  getProductOptionValue,
  listProductOptionValues,
  listProductOptions,
  updateProductOption,
  updateProductOptionValue,
};
