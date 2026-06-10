import ApiError from '@/common/errors/api.error.js';
import {
  hasOwn,
  normalizeOptionalNumber,
  normalizeText,
} from '@/common/utils/service.util.js';
import { createSlug } from '@/common/utils/slug.util.js';

const SHIPPING_CUSTOM_BOX_TYPE = 'custom';

const dimensionMultipliersToCm = {
  cm: 1,
  in: 2.54,
};

const weightMultipliersToKg = {
  g: 0.001,
  kg: 1,
  lb: 0.45359237,
  oz: 0.0283495231,
};

const roundMeasurement = (value) => Number(Number(value).toFixed(2));

const hasCompleteDimensions = (packageDetails = {}) => (
  packageDetails.length !== null &&
  packageDetails.length !== undefined &&
  packageDetails.breadth !== null &&
  packageDetails.breadth !== undefined &&
  packageDetails.height !== null &&
  packageDetails.height !== undefined
);

const convertMeasurement = (value, unit, multipliers) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numberValue = Number(value);
  const multiplier = multipliers[normalizeText(unit).toLowerCase()];

  if (!Number.isFinite(numberValue) || !multiplier) {
    return null;
  }

  return roundMeasurement(numberValue * multiplier);
};

const normalizeBoxTypeCodeValue = (value, { allowEmpty = false } = {}) => {
  const code = createSlug(value).replace(/-/g, '_');

  if (!code && allowEmpty) {
    return '';
  }

  return code || SHIPPING_CUSTOM_BOX_TYPE;
};

const getPackageFromBoxType = (boxType = null) => {
  if (!boxType || boxType.code === SHIPPING_CUSTOM_BOX_TYPE) {
    return null;
  }

  return {
    boxType: boxType.code,
    boxTypeName: boxType.name || '',
    breadth: boxType.breadth,
    height: boxType.height,
    length: boxType.length,
    weight: boxType.weight,
  };
};

const getShipmentPackageFromProductShipping = (shipping = {}) => {
  if (!shipping || shipping.requiresShipping === false) {
    return null;
  }

  const dimensionUnit = shipping.dimensions?.unit || 'cm';
  const weightUnit = shipping.weight?.unit || 'kg';
  const productPackage = {
    boxType: SHIPPING_CUSTOM_BOX_TYPE,
    boxTypeName: '',
    breadth: convertMeasurement(shipping.dimensions?.width, dimensionUnit, dimensionMultipliersToCm),
    height: convertMeasurement(shipping.dimensions?.height, dimensionUnit, dimensionMultipliersToCm),
    length: convertMeasurement(shipping.dimensions?.length, dimensionUnit, dimensionMultipliersToCm),
    weight: convertMeasurement(shipping.weight?.value, weightUnit, weightMultipliersToKg),
  };

  return hasCompleteDimensions(productPackage) ? productPackage : null;
};

const getSingleItemShipmentPackage = (items = []) => {
  if (items.length !== 1 || Number(items[0]?.quantity || 0) !== 1) {
    return null;
  }

  const item = items[0];
  const productDocument = item.productId && typeof item.productId === 'object' ? item.productId : null;
  const sources = [
    productDocument?.shipping,
  ];

  for (const source of sources) {
    const productPackage = getShipmentPackageFromProductShipping(source);

    if (productPackage) {
      return productPackage;
    }
  }

  return null;
};

const mergePackageValues = (basePackage, manualPackage, payload = {}) => ({
  boxType: manualPackage.boxType || basePackage?.boxType || SHIPPING_CUSTOM_BOX_TYPE,
  boxTypeName: basePackage?.boxTypeName || '',
  breadth: hasOwn(payload, 'breadth') ? manualPackage.breadth : basePackage?.breadth ?? null,
  height: hasOwn(payload, 'height') ? manualPackage.height : basePackage?.height ?? null,
  length: hasOwn(payload, 'length') ? manualPackage.length : basePackage?.length ?? null,
  weight: hasOwn(payload, 'weight') ? manualPackage.weight : basePackage?.weight ?? null,
});

const normalizePackageBoxType = (value, field = 'boxType', { allowEmpty = false } = {}) => {
  const boxType = normalizeBoxTypeCodeValue(value, { allowEmpty });

  if (!boxType) {
    return '';
  }

  if (boxType === SHIPPING_CUSTOM_BOX_TYPE && normalizeText(value).toLowerCase() !== SHIPPING_CUSTOM_BOX_TYPE) {
    throw new ApiError(400, `${field} cannot be empty`);
  }

  return boxType;
};

const normalizeShipmentPackageInput = (payload = {}) => ({
  boxType: normalizePackageBoxType(payload.boxType, 'boxType', { allowEmpty: true }),
  boxTypeName: normalizeText(payload.boxTypeName),
  breadth: normalizeOptionalNumber(payload.breadth, 'breadth'),
  height: normalizeOptionalNumber(payload.height, 'height'),
  length: normalizeOptionalNumber(payload.length, 'length'),
  weight: normalizeOptionalNumber(payload.weight, 'weight'),
});

const resolveShipmentPackage = ({ boxType = null, items = [], payload = {} } = {}) => {
  const manualPackage = normalizeShipmentPackageInput(payload);
  const boxPackage = getPackageFromBoxType(boxType);
  const productPackage = manualPackage.boxType ? null : getSingleItemShipmentPackage(items);
  const resolvedPackage = mergePackageValues(boxPackage || productPackage, manualPackage, payload);

  if (!hasCompleteDimensions(resolvedPackage)) {
    throw new ApiError(
      400,
      'Add product shipping dimensions, select a box type, or enter package dimensions before creating shipment',
    );
  }

  return resolvedPackage;
};

export {
  getPackageFromBoxType,
  SHIPPING_CUSTOM_BOX_TYPE,
  normalizePackageBoxType,
  normalizeBoxTypeCodeValue,
  normalizeShipmentPackageInput,
  resolveShipmentPackage,
};

export default {
  getPackageFromBoxType,
  SHIPPING_CUSTOM_BOX_TYPE,
  normalizePackageBoxType,
  normalizeBoxTypeCodeValue,
  normalizeShipmentPackageInput,
  resolveShipmentPackage,
};
