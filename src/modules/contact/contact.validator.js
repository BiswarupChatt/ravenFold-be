import {
  assertNoUnknownKeys,
  assertRequiredKeys,
  createSchema,
  expectObject,
} from '@/common/utils/request-schema.util.js';
import { normalizeText } from '@/common/utils/service.util.js';

const contactFields = ['email', 'message', 'name', 'orderNumber', 'topic'];
const supportTopics = [
  'Order support',
  'Shipping and tracking',
  'Returns or exchange',
  'Product question',
  'GST invoice',
  'Other',
];

const normalizeEmail = (value) => {
  const email = normalizeText(value).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('email must be a valid email address');
  }

  return email;
};

const assertMaxLength = (value, field, maxLength) => {
  if (value.length > maxLength) {
    throw new Error(`${field} must be ${maxLength} characters or fewer`);
  }
};

const contactInquirySchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, contactFields);
  assertRequiredKeys(payload, ['email', 'message', 'name', 'topic']);

  const name = normalizeText(payload.name);
  const message = normalizeText(payload.message);
  const topic = normalizeText(payload.topic);
  const orderNumber = normalizeText(payload.orderNumber);

  if (!name) {
    throw new Error('name is required');
  }

  if (!message) {
    throw new Error('message is required');
  }

  if (!supportTopics.includes(topic)) {
    throw new Error(`topic must be one of: ${supportTopics.join(', ')}`);
  }

  assertMaxLength(name, 'name', 120);
  assertMaxLength(message, 'message', 2000);
  assertMaxLength(orderNumber, 'orderNumber', 80);

  return {
    email: normalizeEmail(payload.email),
    message,
    name,
    orderNumber,
    topic,
  };
});

export { contactInquirySchema, supportTopics };
