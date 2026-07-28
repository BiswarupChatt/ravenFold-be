import ROLES from '@/common/constants/roles.constant.js';
import ApiError from '@/common/errors/api.error.js';
import { sendSuccess } from '@/common/helpers/response.helper.js';
import cloudinaryService from '@/infrastructure/storage/cloudinary.service.js';

const adminOnlyFolderKeys = new Set(['category', 'gst', 'product', 'variant']);
const allowedFolderKeys = new Set(['category', 'gst', 'product', 'review', 'variant']);

const getFolderKey = (req) => String(req.body?.folderKey || req.query?.folderKey || 'product').trim().toLowerCase();

const assertFolderAccess = (req, folderKey) => {
  if (!allowedFolderKeys.has(folderKey)) {
    throw new ApiError(400, 'Unsupported image upload folder');
  }

  if (!adminOnlyFolderKeys.has(folderKey)) {
    return;
  }

  const roles = Array.isArray(req.user?.roles) ? req.user.roles : [req.user?.role].filter(Boolean);
  const isAdmin = roles.includes(ROLES.ADMIN) || roles.includes(ROLES.SUPER_ADMIN);

  if (!isAdmin) {
    throw new ApiError(403, 'You do not have permission to upload this image');
  }
};

const uploadSingleImage = async (req, res) => {
  const folderKey = getFolderKey(req);

  assertFolderAccess(req, folderKey);

  if (!req.file) {
    throw new ApiError(400, 'Image file is required');
  }

  return sendSuccess(
    res,
    await cloudinaryService.uploadImage(req.file, { folderKey }),
    'Image uploaded',
    201,
  );
};

const uploadMultipleImages = async (req, res) => {
  const folderKey = getFolderKey(req);

  assertFolderAccess(req, folderKey);

  if (!Array.isArray(req.files) || req.files.length === 0) {
    throw new ApiError(400, 'At least one image file is required');
  }

  return sendSuccess(
    res,
    await cloudinaryService.uploadMultipleImages(req.files, { folderKey }),
    'Images uploaded',
    201,
  );
};

export { uploadMultipleImages, uploadSingleImage };

export default {
  uploadMultipleImages,
  uploadSingleImage,
};
