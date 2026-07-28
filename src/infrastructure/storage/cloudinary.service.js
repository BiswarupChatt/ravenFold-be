import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';

import ApiError from '@/common/errors/api.error.js';
import {
  cloudinaryApiKey,
  cloudinaryApiSecret,
  cloudinaryCategoryUploadFolder,
  cloudinaryCloudName,
  cloudinaryGstUploadFolder,
  cloudinaryReviewUploadFolder,
  cloudinaryUploadFolder,
} from '@/config/env.config.js';

cloudinary.config({
  api_key: cloudinaryApiKey,
  api_secret: cloudinaryApiSecret,
  cloud_name: cloudinaryCloudName,
  secure: true,
});

const allowedImageMimeTypes = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const uploadFolders = {
  category: cloudinaryCategoryUploadFolder,
  gst: cloudinaryGstUploadFolder,
  product: cloudinaryUploadFolder,
  review: cloudinaryReviewUploadFolder,
  variant: cloudinaryUploadFolder,
};

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const assertCloudinaryConfigured = () => {
  const missingKeys = [
    !cloudinaryCloudName ? 'CLOUDINARY_CLOUD_NAME' : null,
    !cloudinaryApiKey ? 'CLOUDINARY_API_KEY' : null,
    !cloudinaryApiSecret ? 'CLOUDINARY_API_SECRET' : null,
  ].filter(Boolean);

  if (missingKeys.length > 0) {
    throw new ApiError(
      503,
      `Cloudinary is not configured for product image uploads. Missing: ${missingKeys.join(', ')}`,
    );
  }
};

const assertImageFile = (file) => {
  if (!file) {
    throw new ApiError(400, 'Image file is required');
  }

  if (file.mimetype && !allowedImageMimeTypes.has(file.mimetype)) {
    throw new ApiError(400, 'Only JPG, PNG, WEBP, AVIF, and GIF images are supported');
  }
};

const signCloudinaryParams = (params) => {
  const serializedParams = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(`${serializedParams}${cloudinaryApiSecret}`)
    .digest('hex');
};

const createUploadSignature = (folderValue = '') => {
  assertCloudinaryConfigured();

  const params = {
    timestamp: Math.round(Date.now() / 1000),
  };

  const folder = normalizeText(folderValue);

  if (folder) {
    params.folder = folder;
  }

  return {
    cloudName: cloudinaryCloudName,
    apiKey: cloudinaryApiKey,
    params,
    signature: signCloudinaryParams(params),
  };
};

const createProductImageUploadSignature = () => createUploadSignature(cloudinaryUploadFolder);
const createReviewImageUploadSignature = () => createUploadSignature(cloudinaryReviewUploadFolder);

const getUploadFolder = (folderKey = 'product') => {
  const normalizedFolderKey = normalizeText(folderKey).toLowerCase();

  return uploadFolders[normalizedFolderKey] || uploadFolders.product;
};

const formatUploadResult = (result = {}) => ({
  publicId: result.public_id || '',
  url: result.secure_url || result.url || '',
});

const uploadBuffer = (buffer, options = {}) => new Promise((resolve, reject) => {
  const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
    if (error) {
      reject(error);
      return;
    }

    resolve(result);
  });

  uploadStream.end(buffer);
});

const uploadImage = async (source, options = {}) => {
  assertCloudinaryConfigured();

  const folder = normalizeText(options.folder) || getUploadFolder(options.folderKey);
  const uploadOptions = {
    folder,
    overwrite: false,
    resource_type: 'image',
    transformation: options.transformation || [
      { quality: 'auto', fetch_format: 'auto' },
    ],
  };

  let result;

  if (Buffer.isBuffer(source)) {
    result = await uploadBuffer(source, uploadOptions);
  } else if (source?.buffer) {
    assertImageFile(source);
    result = await uploadBuffer(source.buffer, uploadOptions);
  } else if (typeof source === 'string' && source.trim()) {
    result = await cloudinary.uploader.upload(source, uploadOptions);
  } else {
    throw new ApiError(400, 'A valid image source is required');
  }

  return formatUploadResult(result);
};

const uploadMultipleImages = async (sources = [], options = {}) => {
  const sourceList = Array.from(sources || []);

  if (sourceList.length === 0) {
    return [];
  }

  const uploadedAssets = [];

  try {
    for (const source of sourceList) {
      uploadedAssets.push(await uploadImage(source, options));
    }

    return uploadedAssets;
  } catch (error) {
    await Promise.allSettled(uploadedAssets.map((asset) => deleteImage(asset.publicId)));
    throw error;
  }
};

const deleteImage = async (publicId) => {
  const normalizedPublicId = normalizeText(publicId);

  if (!normalizedPublicId) {
    return { deleted: false };
  }

  assertCloudinaryConfigured();
  await cloudinary.uploader.destroy(normalizedPublicId, { resource_type: 'image' });

  return { deleted: true, publicId: normalizedPublicId };
};

const deleteImages = async (publicIds = []) => {
  const uniquePublicIds = Array.from(new Set(publicIds.map(normalizeText).filter(Boolean)));

  await Promise.allSettled(uniquePublicIds.map(deleteImage));

  return uniquePublicIds;
};

const replaceImage = async (source, currentAsset = {}, options = {}) => {
  const uploadedAsset = await uploadImage(source, options);

  return {
    asset: uploadedAsset,
    oldPublicId: normalizeText(currentAsset.publicId || currentAsset.public_id),
  };
};

const extractPublicId = (url = '') => {
  const normalizedUrl = normalizeText(url);

  if (!normalizedUrl || !normalizedUrl.includes('/upload/')) {
    return '';
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    const [, afterUpload = ''] = parsedUrl.pathname.split('/upload/');
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');

    return withoutVersion.replace(/\.[a-z0-9]+$/i, '');
  } catch {
    return '';
  }
};

export {
  allowedImageMimeTypes,
  createProductImageUploadSignature,
  createReviewImageUploadSignature,
  deleteImage,
  deleteImages,
  extractPublicId,
  getUploadFolder,
  replaceImage,
  uploadImage,
  uploadMultipleImages,
};

export default {
  allowedImageMimeTypes,
  createProductImageUploadSignature,
  createReviewImageUploadSignature,
  deleteImage,
  deleteImages,
  extractPublicId,
  getUploadFolder,
  replaceImage,
  uploadImage,
  uploadMultipleImages,
};
