import {
  emailFromAddress,
  emailProvider,
  zeptoMailApiUrl,
  zeptoMailSendToken,
} from '@/config/env.config.js';
import { sendTransactionalEmail } from '@/infrastructure/email/email.service.js';

const recipientEmail = String(process.argv[2] || process.env.TEST_EMAIL_TO || '').trim();

if (!recipientEmail) {
  console.error('Usage: npm run email:test -- recipient@example.com');
  process.exit(1);
}

const maskEmail = (email = '') => email.replace(/^(.{2}).*(@.*)$/, '$1***$2');

console.log('Sending test email', {
  from: emailFromAddress,
  hasZeptoMailToken: Boolean(zeptoMailSendToken),
  provider: emailProvider,
  recipient: maskEmail(recipientEmail),
  zeptoMailApiUrl,
});

try {
  const result = await sendTransactionalEmail({
    clientReference: `manual-test:${Date.now()}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h1 style="font-size:20px">Raven Fold test email</h1>
        <p>This is a manual transactional email test from the Raven Fold backend.</p>
        <p>If you received this, ZeptoMail API delivery is configured correctly.</p>
      </div>
    `,
    recipientEmail,
    recipientName: 'Test recipient',
    subject: 'Raven Fold test email',
    text: 'This is a manual transactional email test from the Raven Fold backend.',
  });

  console.log('Test email result', {
    provider: result.provider,
    status: result.status,
  });
} catch (error) {
  console.error('Test email failed', {
    message: error?.message || String(error),
    statusCode: error?.statusCode || null,
  });
  console.error('Check that ZEPTO_MAIL_API_URL matches your ZeptoMail data center, the Send Mail Token belongs to the selected Agent, and EMAIL_FROM_ADDRESS is a verified sender for that Agent.');
  process.exit(1);
}
