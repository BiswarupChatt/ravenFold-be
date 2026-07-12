import {
  assertNoUnknownKeys,
  assertRequiredKeys,
  assertStringLikeField,
  createSchema,
  expectObject,
  pickAllowedKeys,
} from '@/common/utils/request-schema.util.js';

const registerFields = ['email', 'password', 'name', 'phone', 'role'];
const loginFields = ['email', 'password'];
const googleFields = ['accessToken', 'token', 'idToken', 'credential'];
const facebookFields = ['accessToken', 'token'];

const registerSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, registerFields);
  assertRequiredKeys(payload, ['email', 'password']);
  registerFields.forEach((field) => assertStringLikeField(payload, field));

  return pickAllowedKeys(payload, registerFields);
});

const loginSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, loginFields);
  assertRequiredKeys(payload, ['email', 'password']);
  loginFields.forEach((field) => assertStringLikeField(payload, field));

  return pickAllowedKeys(payload, loginFields);
});

const googleAuthSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, googleFields);
  googleFields.forEach((field) => assertStringLikeField(payload, field));

  return pickAllowedKeys(payload, googleFields);
});

const facebookAuthSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, facebookFields);
  facebookFields.forEach((field) => assertStringLikeField(payload, field));

  return pickAllowedKeys(payload, facebookFields);
});

export {
  facebookAuthSchema,
  googleAuthSchema,
  loginSchema,
  registerSchema,
};
