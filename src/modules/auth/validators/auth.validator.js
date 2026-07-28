import {
  assertNoUnknownKeys,
  assertRequiredKeys,
  assertStringLikeField,
  createSchema,
  expectObject,
  pickAllowedKeys,
} from '@/common/utils/request-schema.util.js';

const registerFields = ['email', 'password', 'firstName', 'lastName', 'name', 'phone', 'role'];
const loginFields = ['email', 'password'];
const changePasswordFields = ['currentPassword', 'newPassword'];
const requestPasswordResetFields = ['email'];
const resetPasswordFields = ['token', 'newPassword'];
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

const changePasswordSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, changePasswordFields);
  assertRequiredKeys(payload, changePasswordFields);
  changePasswordFields.forEach((field) => assertStringLikeField(payload, field));

  return pickAllowedKeys(payload, changePasswordFields);
});

const requestPasswordResetSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, requestPasswordResetFields);
  assertRequiredKeys(payload, requestPasswordResetFields);
  requestPasswordResetFields.forEach((field) => assertStringLikeField(payload, field));

  return pickAllowedKeys(payload, requestPasswordResetFields);
});

const resetPasswordSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, resetPasswordFields);
  assertRequiredKeys(payload, resetPasswordFields);
  resetPasswordFields.forEach((field) => assertStringLikeField(payload, field));

  return pickAllowedKeys(payload, resetPasswordFields);
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
  changePasswordSchema,
  facebookAuthSchema,
  googleAuthSchema,
  loginSchema,
  requestPasswordResetSchema,
  registerSchema,
  resetPasswordSchema,
};
