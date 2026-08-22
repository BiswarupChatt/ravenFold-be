import test from 'node:test';
import assert from 'node:assert/strict';

import { verifyTotp } from '@/modules/auth/services/admin-mfa.service.js';

const RFC_6238_BASE32_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

test('verifyTotp accepts a valid authenticator code', () => {
  const originalDateNow = Date.now;

  Date.now = () => 59000;

  try {
    assert.equal(verifyTotp({
      code: '287082',
      secret: RFC_6238_BASE32_SECRET,
    }), true);
  } finally {
    Date.now = originalDateNow;
  }
});

test('verifyTotp rejects invalid authenticator codes', () => {
  const originalDateNow = Date.now;

  Date.now = () => 59000;

  try {
    assert.equal(verifyTotp({
      code: '000000',
      secret: RFC_6238_BASE32_SECRET,
    }), false);
  } finally {
    Date.now = originalDateNow;
  }
});
