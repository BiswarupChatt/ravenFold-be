import assert from 'node:assert/strict';
import test from 'node:test';

import { updateGstConfigurationSchema } from '@/modules/gst/validators/gst.validator.js';

test('updateGstConfigurationSchema accepts Cloudinary upload metadata on businessLogoAsset', () => {
  const result = updateGstConfigurationSchema.validate({
    businessLogoAsset: {
      bytes: 12345,
      format: 'png',
      height: 400,
      publicId: 'ravenfold/gst/logo',
      url: 'https://res.cloudinary.com/demo/image/upload/logo.png',
      width: 600,
    },
  });

  assert.equal(result.error, null);
});
