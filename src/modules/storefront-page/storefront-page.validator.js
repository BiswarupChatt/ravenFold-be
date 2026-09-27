import { createSchema, expectObject } from '@/common/utils/request-schema.util.js';

const updateStorefrontPageSchema = createSchema((value) => expectObject(value));

export { updateStorefrontPageSchema };
