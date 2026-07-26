import ApiError from '@/common/errors/api.error.js';
import { normalizeText } from '@/common/utils/service.util.js';
import { GST_STATE_CODES, GST_STATE_OPTIONS } from '@/modules/gst/gst.constants.js';

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const HSN_PATTERN = /^\d{4}(\d{2})?(\d{2})?$/;

const normalizeStateCode = (value, field = 'stateCode', { required = false } = {}) => {
  const stateCode = normalizeText(value).padStart(2, '0');

  if (!stateCode && !required) {
    return '';
  }

  if (!GST_STATE_CODES.includes(stateCode)) {
    throw new ApiError(400, `${field} must be a valid GST state code`);
  }

  return stateCode;
};

const normalizeStateName = (value, field = 'state', { required = false } = {}) => {
  const state = normalizeText(value);

  if (!state && !required) {
    return '';
  }

  const matchedState = GST_STATE_OPTIONS.find((option) => option.name.toLowerCase() === state.toLowerCase());

  if (!matchedState) {
    throw new ApiError(400, `${field} must be a valid Indian GST state`);
  }

  return matchedState.name;
};

const getStateCodeFromState = (value, field = 'state', { required = false } = {}) => {
  const state = normalizeText(value);

  if (!state && !required) {
    return '';
  }

  const matchedState = GST_STATE_OPTIONS.find((option) => option.name.toLowerCase() === state.toLowerCase());

  if (!matchedState) {
    throw new ApiError(400, `${field} must be a valid Indian GST state`);
  }

  return matchedState.code;
};

const normalizeGstin = (value, field = 'gstin', { required = false } = {}) => {
  const gstin = normalizeText(value).toUpperCase();

  if (!gstin && !required) {
    return '';
  }

  if (!GSTIN_PATTERN.test(gstin)) {
    throw new ApiError(400, `${field} must be a valid GSTIN`);
  }

  return gstin;
};

const normalizeHsnCode = (value, field = 'hsnCode', { required = false } = {}) => {
  const hsnCode = normalizeText(value);

  if (!hsnCode && !required) {
    return '';
  }

  if (!HSN_PATTERN.test(hsnCode)) {
    throw new ApiError(400, `${field} must be a 4, 6, or 8 digit HSN code`);
  }

  return hsnCode;
};

const normalizeRate = (value, field, { required = false } = {}) => {
  if ((value === null || value === undefined || value === '') && !required) {
    return 0;
  }

  const rate = Number(value);

  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new ApiError(400, `${field} must be a valid non-negative tax rate`);
  }

  return Number(rate.toFixed(3));
};

const validateRateBreakup = ({ cgstRate = 0, gstRate = 0, igstRate = 0, sgstRate = 0 } = {}) => {
  const totalIntraStateRate = Number((Number(cgstRate || 0) + Number(sgstRate || 0)).toFixed(3));
  const totalGstRate = Number(Number(gstRate || 0).toFixed(3));
  const totalIgstRate = Number(Number(igstRate || 0).toFixed(3));

  if (totalGstRate > 0 && totalIntraStateRate !== totalGstRate) {
    throw new ApiError(400, 'CGST and SGST together must match the GST rate');
  }

  if (totalGstRate > 0 && totalIgstRate !== totalGstRate) {
    throw new ApiError(400, 'IGST must match the GST rate');
  }
};

const validateGstinWithState = ({ gstin = '', stateCode = '' } = {}) => {
  const normalizedGstin = normalizeGstin(gstin);
  const normalizedStateCode = normalizeStateCode(stateCode);

  if (normalizedGstin && normalizedStateCode && normalizedGstin.slice(0, 2) !== normalizedStateCode) {
    throw new ApiError(400, 'GSTIN state code must match the billing state code');
  }

  return {
    gstin: normalizedGstin,
    stateCode: normalizedStateCode,
  };
};

export {
  GSTIN_PATTERN,
  HSN_PATTERN,
  getStateCodeFromState,
  normalizeGstin,
  normalizeHsnCode,
  normalizeRate,
  normalizeStateCode,
  normalizeStateName,
  validateGstinWithState,
  validateRateBreakup,
};

export default {
  GSTIN_PATTERN,
  HSN_PATTERN,
  getStateCodeFromState,
  normalizeGstin,
  normalizeHsnCode,
  normalizeRate,
  normalizeStateCode,
  normalizeStateName,
  validateGstinWithState,
  validateRateBreakup,
};
