import mongoose from 'mongoose';

import ApiError from '@/common/errors/api.error.js';
import { getPagination } from '@/common/utils/pagination.util.js';
import Address, { addressTypes } from '@/modules/users/models/address.model.js';

const requiredAddressFields = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode', 'country'];
const editableAddressFields = [...requiredAddressFields, 'addressLine2', 'isDefault', 'addressType'];

const assertDatabaseReady = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, 'Database connection is not ready. Check MONGO_URI and start MongoDB.');
  }
};

const assertAuthenticatedUserId = (authUser) => {
  if (!authUser?.id) {
    throw new ApiError(401, 'Authentication required');
  }

  if (!mongoose.Types.ObjectId.isValid(authUser.id)) {
    throw new ApiError(401, 'Invalid authenticated user');
  }

  return authUser.id;
};

const assertValidAddressId = (addressId) => {
  if (!mongoose.Types.ObjectId.isValid(addressId)) {
    throw new ApiError(400, 'Invalid address id');
  }
};

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const assertBoolean = (value, field) => {
  if (typeof value !== 'boolean') {
    throw new ApiError(400, `${field} must be a boolean`);
  }
};

const assertAddressType = (addressType) => {
  if (!addressTypes.includes(addressType)) {
    throw new ApiError(400, 'Address type must be either home or work');
  }
};

const formatAddress = (address) => {
  return {
    id: address.id || address._id?.toString(),
    userId: address.userId?.toString(),
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 || '',
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country,
    isDefault: Boolean(address.isDefault),
    addressType: address.addressType,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
};

const buildAddressPayload = (payload = {}, { requireRequiredFields = false } = {}) => {
  const addressPayload = {};

  for (const field of editableAddressFields) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) {
      continue;
    }

    if (field === 'isDefault') {
      assertBoolean(payload[field], field);
      addressPayload[field] = payload[field];
      continue;
    }

    if (field === 'addressType') {
      const addressType = normalizeText(payload[field]);
      assertAddressType(addressType);
      addressPayload[field] = addressType;
      continue;
    }

    addressPayload[field] = normalizeText(payload[field]);
  }

  if (requireRequiredFields) {
    for (const field of requiredAddressFields) {
      if (!addressPayload[field]) {
        throw new ApiError(400, `${field} is required`);
      }
    }
  }

  for (const field of requiredAddressFields) {
    if (Object.prototype.hasOwnProperty.call(addressPayload, field) && !addressPayload[field]) {
      throw new ApiError(400, `${field} cannot be empty`);
    }
  }

  return addressPayload;
};

const unsetDefaultAddresses = async (userId, excludedAddressId = null) => {
  const query = {
    userId,
    isDefault: true,
  };

  if (excludedAddressId) {
    query._id = {
      $ne: excludedAddressId,
    };
  }

  await Address.updateMany(query, { $set: { isDefault: false } }).exec();
};

const setFallbackDefaultAddress = async (userId) => {
  const nextDefaultAddress = await Address.findOne({ userId }).sort({ updatedAt: -1 }).exec();

  if (!nextDefaultAddress) {
    return null;
  }

  nextDefaultAddress.isDefault = true;
  await nextDefaultAddress.save();

  return nextDefaultAddress;
};

const getAddressDocument = async (authUser, addressId) => {
  assertDatabaseReady();
  const userId = assertAuthenticatedUserId(authUser);
  assertValidAddressId(addressId);

  const address = await Address.findOne({
    _id: addressId,
    userId,
  }).exec();

  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  return address;
};

const createAddress = async (authUser, payload) => {
  assertDatabaseReady();
  const userId = assertAuthenticatedUserId(authUser);
  const addressPayload = buildAddressPayload(payload, { requireRequiredFields: true });
  const hasExistingAddress = await Address.exists({ userId }).exec();
  const shouldSetDefault = addressPayload.isDefault === true || !hasExistingAddress;

  if (shouldSetDefault) {
    await unsetDefaultAddresses(userId);
  }

  const address = await Address.create({
    ...addressPayload,
    userId,
    isDefault: shouldSetDefault,
  });

  return formatAddress(address);
};

const listAddresses = async (authUser, query = {}) => {
  assertDatabaseReady();
  const userId = assertAuthenticatedUserId(authUser);
  const { limit, page, skip } = getPagination(query);
  const filter = { userId };
  const [addresses, total] = await Promise.all([
    Address.find(filter).sort({ isDefault: -1, updatedAt: -1 }).skip(skip).limit(limit).exec(),
    Address.countDocuments(filter).exec(),
  ]);

  return {
    items: addresses.map(formatAddress),
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

const getAddress = async (authUser, addressId) => {
  return formatAddress(await getAddressDocument(authUser, addressId));
};

const updateAddress = async (authUser, addressId, payload) => {
  const address = await getAddressDocument(authUser, addressId);
  const addressPayload = buildAddressPayload(payload);

  if (addressPayload.isDefault === true) {
    await unsetDefaultAddresses(address.userId, address._id);
  }

  Object.assign(address, addressPayload);
  await address.save();

  return formatAddress(address);
};

const deleteAddress = async (authUser, addressId) => {
  const address = await getAddressDocument(authUser, addressId);
  const wasDefault = address.isDefault;
  const userId = address.userId;
  const deletedAddress = formatAddress(address);

  await address.deleteOne();

  if (wasDefault) {
    await setFallbackDefaultAddress(userId);
  }

  return deletedAddress;
};

export {
  createAddress,
  deleteAddress,
  formatAddress,
  getAddress,
  listAddresses,
  updateAddress,
};

export default {
  createAddress,
  deleteAddress,
  formatAddress,
  getAddress,
  listAddresses,
  updateAddress,
};
