import ApiError from '@/common/errors/api.error.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import {
  assertDatabaseReady,
  assertValidObjectId,
  escapeRegex,
  hasOwn,
  normalizeBoolean,
  normalizeOptionalNumber,
  normalizeText,
} from '@/common/utils/service.util.js';
import { createSlug } from '@/common/utils/slug.util.js';
import Shipment from '@/modules/shipping/models/shipment.model.js';
import BoxType from '@/modules/box-type/models/box-type.model.js';

const editableBoxTypeFields = ['name', 'code', 'length', 'breadth', 'height', 'weight', 'isActive'];

const formatBoxType = (boxType = {}) => ({
  breadth: boxType.breadth ?? null,
  code: boxType.code || '',
  createdAt: boxType.createdAt,
  height: boxType.height ?? null,
  id: boxType.id || boxType._id?.toString(),
  isActive: boxType.isActive !== false,
  length: boxType.length ?? null,
  name: boxType.name || '',
  updatedAt: boxType.updatedAt,
  weight: boxType.weight ?? null,
});

const getStatusData = () => ({
  module: 'box-types',
});

const normalizeBoxTypeCode = (value = '') => {
  const code = createSlug(value).replace(/-/g, '_');

  if (!code) {
    throw new ApiError(400, 'code cannot be empty');
  }

  return code;
};

const normalizeRequiredMeasurement = (value, field) => {
  const numberValue = normalizeOptionalNumber(value, field);

  if (numberValue === null) {
    throw new ApiError(400, `${field} is required`);
  }

  if (numberValue <= 0) {
    throw new ApiError(400, `${field} must be greater than 0`);
  }

  return Number(numberValue.toFixed(2));
};

const buildBoxTypePayload = (payload = {}, { requireName = false, requireMeasurements = false } = {}) => {
  const boxTypePayload = {};

  for (const field of editableBoxTypeFields) {
    if (!hasOwn(payload, field)) {
      continue;
    }

    if (field === 'code') {
      boxTypePayload.code = normalizeBoxTypeCode(payload.code);
      continue;
    }

    if (field === 'isActive') {
      boxTypePayload.isActive = normalizeBoolean(payload.isActive, 'isActive');
      continue;
    }

    if (['length', 'breadth', 'height', 'weight'].includes(field)) {
      boxTypePayload[field] = normalizeRequiredMeasurement(payload[field], field);
      continue;
    }

    boxTypePayload[field] = normalizeText(payload[field]);
  }

  if (requireName && !boxTypePayload.name) {
    throw new ApiError(400, 'name is required');
  }

  if (hasOwn(boxTypePayload, 'name') && !boxTypePayload.name) {
    throw new ApiError(400, 'name cannot be empty');
  }

  if (!boxTypePayload.code && boxTypePayload.name) {
    boxTypePayload.code = normalizeBoxTypeCode(boxTypePayload.name);
  }

  if (requireMeasurements) {
    for (const field of ['length', 'breadth', 'height', 'weight']) {
      if (!hasOwn(boxTypePayload, field)) {
        throw new ApiError(400, `${field} is required`);
      }
    }
  }

  return boxTypePayload;
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

  const search = normalizeText(query.search);

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), 'i');

    filter.$or = [
      { name: searchRegex },
      { code: searchRegex },
    ];
  }

  return filter;
};

const assertBoxTypeCodeIsAvailable = async (code, excludedBoxTypeId = null) => {
  const query = { code };

  if (excludedBoxTypeId) {
    query._id = { $ne: excludedBoxTypeId };
  }

  const existingBoxType = await BoxType.exists(query).exec();

  if (existingBoxType) {
    throw new ApiError(409, 'Box type code already exists');
  }
};

const getBoxTypeDocument = async (boxTypeId) => {
  assertDatabaseReady();
  assertValidObjectId(boxTypeId, 'box type id');

  const boxType = await BoxType.findById(boxTypeId).exec();

  if (!boxType) {
    throw new ApiError(404, 'Box type not found');
  }

  return boxType;
};

const createBoxType = async (payload = {}) => {
  assertDatabaseReady();
  const boxTypePayload = buildBoxTypePayload(payload, {
    requireMeasurements: true,
    requireName: true,
  });

  await assertBoxTypeCodeIsAvailable(boxTypePayload.code);

  try {
    const boxType = await BoxType.create(boxTypePayload);

    return formatBoxType(boxType);
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Box type code already exists');
    }

    throw error;
  }
};

const listBoxTypes = async (query = {}, options = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const filter = buildListFilter(query, options);
  const [boxTypes, total] = await Promise.all([
    BoxType.find(filter).sort({ name: 1, createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    BoxType.countDocuments(filter).exec(),
  ]);

  return {
    items: boxTypes.map(formatBoxType),
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

const getBoxType = async (boxTypeIdOrCode, options = {}) => {
  assertDatabaseReady();
  const identifier = normalizeText(boxTypeIdOrCode);

  if (!identifier) {
    throw new ApiError(400, 'Box type id or code is required');
  }

  const filter = /^[0-9a-fA-F]{24}$/.test(identifier)
    ? { _id: identifier }
    : { code: normalizeBoxTypeCode(identifier) };

  if (!options.includeInactive) {
    filter.isActive = true;
  }

  const boxType = await BoxType.findOne(filter).lean().exec();

  if (!boxType) {
    throw new ApiError(404, 'Box type not found');
  }

  return formatBoxType(boxType);
};

const getActiveBoxTypeByCode = async (code) => {
  return getBoxType(code);
};

const updateBoxType = async (boxTypeId, payload = {}) => {
  const boxType = await getBoxTypeDocument(boxTypeId);
  const boxTypePayload = buildBoxTypePayload(payload);

  if (Object.keys(boxTypePayload).length === 0) {
    throw new ApiError(400, 'No box type fields provided to update');
  }

  if (hasOwn(boxTypePayload, 'code')) {
    await assertBoxTypeCodeIsAvailable(boxTypePayload.code, boxType._id);
  }

  Object.assign(boxType, boxTypePayload);

  try {
    await boxType.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Box type code already exists');
    }

    throw error;
  }

  return formatBoxType(boxType);
};

const deleteBoxType = async (boxTypeId) => {
  const boxType = await getBoxTypeDocument(boxTypeId);
  const shipmentUse = await Shipment.exists({ 'package.boxType': boxType.code }).exec();

  if (shipmentUse) {
    throw new ApiError(409, 'Deactivate this box type instead. It is already used by shipments.');
  }

  const deletedBoxType = formatBoxType(boxType);

  await boxType.deleteOne();

  return deletedBoxType;
};

export {
  createBoxType,
  deleteBoxType,
  formatBoxType,
  getActiveBoxTypeByCode,
  getBoxType,
  getStatusData,
  listBoxTypes,
  normalizeBoxTypeCode,
  updateBoxType,
};

export default {
  createBoxType,
  deleteBoxType,
  formatBoxType,
  getActiveBoxTypeByCode,
  getBoxType,
  getStatusData,
  listBoxTypes,
  normalizeBoxTypeCode,
  updateBoxType,
};
