import test from 'node:test';
import assert from 'node:assert/strict';

import { verifyOtpPayload } from '@/modules/auth/auth.service.js';

test('verifyOtpPayload rejects when OTP flow is not enabled', async () => {
  await assert.rejects(
    () => verifyOtpPayload({ otp: '123456' }),
    (error) => {
      assert.equal(error.statusCode, 501);
      assert.match(error.message, /OTP verification is not enabled/i);
      return true;
    },
  );
});
