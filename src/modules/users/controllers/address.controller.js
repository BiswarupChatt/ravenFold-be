import { sendSuccess } from '@/common/helpers/response.helper.js';
import addressService from '@/modules/users/services/address.service.js';

const createAddress = async (req, res) => {
  return sendSuccess(res, await addressService.createAddress(req.user, req.body), 'Address created', 201);
};

const listAddresses = async (req, res) => {
  return sendSuccess(res, await addressService.listAddresses(req.user, req.query), 'Addresses fetched');
};

const getAddress = async (req, res) => {
  return sendSuccess(res, await addressService.getAddress(req.user, req.params.addressId), 'Address fetched');
};

const updateAddress = async (req, res) => {
  return sendSuccess(
    res,
    await addressService.updateAddress(req.user, req.params.addressId, req.body),
    'Address updated',
  );
};

const deleteAddress = async (req, res) => {
  return sendSuccess(res, await addressService.deleteAddress(req.user, req.params.addressId), 'Address deleted');
};

export { createAddress, deleteAddress, getAddress, listAddresses, updateAddress };

export default {
  createAddress,
  deleteAddress,
  getAddress,
  listAddresses,
  updateAddress,
};
