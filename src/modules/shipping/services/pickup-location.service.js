import ApiError from '@/common/errors/api.error.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import {
  assertDatabaseReady,
  assertValidObjectId,
  escapeRegex,
  hasOwn,
  isValidObjectId,
  normalizeBoolean,
  normalizeText,
} from '@/common/utils/service.util.js';
import { createSlug } from '@/common/utils/slug.util.js';
import PickupLocation from '@/modules/shipping/models/pickup-location.model.js';
import Shipment from '@/modules/shipping/models/shipment.model.js';

const editablePickupLocationFields = [
  'addressLine1',
  'addressLine2',
  'city',
  'code',
  'country',
  'isActive',
  'name',
  'phone',
  'pickupLocation',
  'pincode',
  'state',
];

const formatPickupLocation = (location = {}) => ({
  addressLine1: location.addressLine1 || '',
  addressLine2: location.addressLine2 || '',
  city: location.city || '',
  code: location.code || '',
  country: location.country || '',
  createdAt: location.createdAt,
  id: location.id || location._id?.toString(),
  isActive: location.isActive !== false,
  name: location.name || '',
  phone: location.phone || '',
  pickupLocation: location.pickupLocation || '',
  pincode: location.pincode || '',
  state: location.state || '',
  updatedAt: location.updatedAt,
});

const normalizePickupLocationCode = (value = '') => {
  const code = createSlug(value).replace(/-/g, '_');

  if (!code) {
    throw new ApiError(400, 'code cannot be empty');
  }

  return code;
};

const buildPickupLocationPayload = (payload = {}, { requireName = false } = {}) => {
  const locationPayload = {};

  for (const field of editablePickupLocationFields) {
    if (!hasOwn(payload, field)) {
      continue;
    }

    if (field === 'code') {
      locationPayload.code = normalizePickupLocationCode(payload.code);
      continue;
    }

    if (field === 'isActive') {
      locationPayload.isActive = normalizeBoolean(payload.isActive, 'isActive');
      continue;
    }

    locationPayload[field] = normalizeText(payload[field]);
  }

  if (requireName && !locationPayload.name) {
    throw new ApiError(400, 'name is required');
  }

  if (hasOwn(locationPayload, 'name') && !locationPayload.name) {
    throw new ApiError(400, 'name cannot be empty');
  }

  if (!locationPayload.code && locationPayload.name) {
    locationPayload.code = normalizePickupLocationCode(locationPayload.name);
  }

  if (!locationPayload.pickupLocation && locationPayload.name) {
    locationPayload.pickupLocation = locationPayload.name;
  }

  if (hasOwn(locationPayload, 'pickupLocation') && !locationPayload.pickupLocation) {
    throw new ApiError(400, 'pickupLocation cannot be empty');
  }

  if (hasOwn(locationPayload, 'country') && !locationPayload.country) {
    locationPayload.country = 'India';
  }

  return locationPayload;
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
      { addressLine1: searchRegex },
      { city: searchRegex },
      { code: searchRegex },
      { name: searchRegex },
      { pickupLocation: searchRegex },
    ];
  }

  return filter;
};

const assertPickupLocationCodeIsAvailable = async (code, excludedLocationId = null) => {
  const query = { code };

  if (excludedLocationId) {
    query._id = { $ne: excludedLocationId };
  }

  const existingLocation = await PickupLocation.exists(query).exec();

  if (existingLocation) {
    throw new ApiError(409, 'Pickup location code already exists');
  }
};

const getPickupLocationDocument = async (pickupLocationId) => {
  assertDatabaseReady();
  assertValidObjectId(pickupLocationId, 'pickup location id');

  const location = await PickupLocation.findById(pickupLocationId).exec();

  if (!location) {
    throw new ApiError(404, 'Pickup location not found');
  }

  return location;
};

const createPickupLocation = async (payload = {}) => {
  assertDatabaseReady();
  const locationPayload = buildPickupLocationPayload(payload, {
    requireName: true,
  });

  await assertPickupLocationCodeIsAvailable(locationPayload.code);

  try {
    const location = await PickupLocation.create(locationPayload);

    return formatPickupLocation(location);
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Pickup location code already exists');
    }

    throw error;
  }
};

const listPickupLocations = async (query = {}, options = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const filter = buildListFilter(query, options);
  const [locations, total] = await Promise.all([
    PickupLocation.find(filter).sort({ name: 1, createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    PickupLocation.countDocuments(filter).exec(),
  ]);

  return {
    items: locations.map(formatPickupLocation),
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

const getPickupLocation = async (pickupLocationIdOrCode, options = {}) => {
  assertDatabaseReady();
  const identifier = normalizeText(pickupLocationIdOrCode);

  if (!identifier) {
    throw new ApiError(400, 'Pickup location id or code is required');
  }

  const filter = isValidObjectId(identifier)
    ? { _id: identifier }
    : { code: normalizePickupLocationCode(identifier) };

  if (!options.includeInactive) {
    filter.isActive = true;
  }

  const location = await PickupLocation.findOne(filter).lean().exec();

  if (!location) {
    throw new ApiError(404, 'Pickup location not found');
  }

  return formatPickupLocation(location);
};

const getActivePickupLocation = async (pickupLocationIdOrCode) => {
  return getPickupLocation(pickupLocationIdOrCode);
};

const updatePickupLocation = async (pickupLocationId, payload = {}) => {
  const location = await getPickupLocationDocument(pickupLocationId);
  const locationPayload = buildPickupLocationPayload(payload);

  if (Object.keys(locationPayload).length === 0) {
    throw new ApiError(400, 'No pickup location fields provided to update');
  }

  if (hasOwn(locationPayload, 'code')) {
    await assertPickupLocationCodeIsAvailable(locationPayload.code, location._id);
  }

  Object.assign(location, locationPayload);

  try {
    await location.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'Pickup location code already exists');
    }

    throw error;
  }

  return formatPickupLocation(location);
};

const deletePickupLocation = async (pickupLocationId) => {
  const location = await getPickupLocationDocument(pickupLocationId);
  const shipmentUse = await Shipment.exists({ pickupLocationId: location._id }).exec();

  if (shipmentUse) {
    throw new ApiError(409, 'Deactivate this pickup location instead. It is already used by shipments.');
  }

  const deletedLocation = formatPickupLocation(location);

  await location.deleteOne();

  return deletedLocation;
};

export {
  createPickupLocation,
  deletePickupLocation,
  formatPickupLocation,
  getActivePickupLocation,
  getPickupLocation,
  listPickupLocations,
  normalizePickupLocationCode,
  updatePickupLocation,
};

export default {
  createPickupLocation,
  deletePickupLocation,
  formatPickupLocation,
  getActivePickupLocation,
  getPickupLocation,
  listPickupLocations,
  normalizePickupLocationCode,
  updatePickupLocation,
};
