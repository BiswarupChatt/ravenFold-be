import crypto from 'node:crypto';

import ApiError from '@/common/errors/api.error.js';
import {
  cloudinaryApiKey,
  cloudinaryApiSecret,
  cloudinaryCloudName,
  cloudinaryReviewUploadFolder,
  cloudinaryUploadFolder,
} from '@/config/env.config.js';

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

export { createProductImageUploadSignature, createReviewImageUploadSignature };

export default {
  createProductImageUploadSignature,
  createReviewImageUploadSignature,
};
