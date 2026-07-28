import multer from 'multer';

import ApiError from '@/common/errors/api.error.js';
import { allowedImageMimeTypes } from '@/infrastructure/storage/cloudinary.service.js';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_COUNT = 10;

const imageUpload = multer({
  fileFilter: (req, file, callback) => {
    if (!allowedImageMimeTypes.has(file.mimetype)) {
      callback(new ApiError(400, 'Only JPG, PNG, WEBP, AVIF, and GIF images are supported'));
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: MAX_IMAGE_COUNT,
  },
  storage: multer.memoryStorage(),
});

const handleMulterError = (error, req, res, next) => {
  if (!error) {
    return next();
  }

  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Image file must be 5MB or smaller'
      : 'Image upload failed';

    return next(new ApiError(400, message));
  }

  return next(error);
};

const singleImageUpload = [
  imageUpload.single('image'),
  handleMulterError,
];

const multipleImageUpload = [
  imageUpload.array('images', MAX_IMAGE_COUNT),
  handleMulterError,
];

export {
  MAX_IMAGE_COUNT,
  MAX_IMAGE_SIZE_BYTES,
  multipleImageUpload,
  singleImageUpload,
};

export default {
  MAX_IMAGE_COUNT,
  MAX_IMAGE_SIZE_BYTES,
  multipleImageUpload,
  singleImageUpload,
};
