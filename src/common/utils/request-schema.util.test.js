import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertNoUnknownKeys,
  assertRequiredKeys,
  createSchema,
  expectObject,
  pickAllowedKeys,
} from '@/common/utils/request-schema.util.js';

test('request schema utility validates and sanitizes payloads', () => {
  const schema = createSchema((value) => {
    const payload = expectObject(value);

    assertNoUnknownKeys(payload, ['email', 'password']);
    assertRequiredKeys(payload, ['email']);

    return pickAllowedKeys(payload, ['email', 'password']);
  });

  const validResult = schema.validate({
    email: 'admin@example.com',
    password: 'secret',
    ignored: true,
  });

  assert.ok(validResult.error);
  assert.equal(validResult.error.details[0].message, 'body contains unsupported field(s): ignored');

  const sanitizedResult = schema.validate({
    email: 'admin@example.com',
    password: 'secret',
  });

  assert.equal(sanitizedResult.error, null);
  assert.deepEqual(sanitizedResult.value, {
    email: 'admin@example.com',
    password: 'secret',
  });
});
