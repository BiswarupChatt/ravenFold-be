import { sendSuccess } from '@/common/helpers/response.helper.js';
import contactService from '@/modules/contact/services/contact.service.js';

const createContactInquiry = async (req, res) => {
  await contactService.createContactInquiry(req.body);

  return sendSuccess(res, null, 'Message sent. We will get back to you soon.');
};

export { createContactInquiry };

export default {
  createContactInquiry,
};
