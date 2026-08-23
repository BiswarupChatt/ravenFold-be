import { sendContactInquiryEmail } from '@/infrastructure/email/email.service.js';

const createContactInquiry = async (payload) => {
  await sendContactInquiryEmail(payload);

  return { sent: true };
};

export { createContactInquiry };

export default {
  createContactInquiry,
};
