import {
  assertArrayField,
  assertAtLeastOneKey,
  assertBooleanField,
  assertImageAssetField,
  assertNoUnknownKeys,
  assertNumberLikeField,
  assertObjectField,
  assertRequiredKeys,
  assertStringLikeField,
  createSchema,
  expectObject,
  pickAllowedKeys,
} from '@/common/utils/request-schema.util.js';

const addressFields = ['addressLine1', 'addressLine2', 'city', 'country', 'pincode', 'state', 'stateCode'];
const signatoryFields = ['designation', 'imageUrl', 'name'];
const bankFields = ['accountName', 'accountNumber', 'bankName', 'branchName', 'ifsc'];
const configFields = [
  'authorisedSignatory',
  'bankDetails',
  'brandName',
  'businessLegalName',
  'businessLogoAsset',
  'contactNumber',
  'defaultGstRate',
  'email',
  'gstin',
  'invoiceNotes',
  'invoiceNumberFormat',
  'invoicePrefix',
  'invoiceTerms',
  'nextInvoiceNumber',
  'pan',
  'registeredAddress',
  'shippingGstRate',
  'shippingGstTreatment',
  'tradeName',
  'useFinancialYearNumbering',
];
const checkoutGstFields = [
  'billingAddress',
  'billingSameAsShipping',
  'businessName',
  'city',
  'contactNumber',
  'email',
  'gstin',
  'pincode',
  'state',
  'stateCode',
  'tradeName',
];
const creditNoteFields = ['invoiceId', 'reason', 'refundReference', 'items'];

const assertAddressPayload = (payload, field) => {
  if (!Object.prototype.hasOwnProperty.call(payload, field)) {
    return;
  }

  assertObjectField(payload, field);
  assertNoUnknownKeys(payload[field], addressFields, `body.${field}`);

  addressFields.forEach((addressField) => assertStringLikeField(payload[field], addressField, `body.${field}`));
};

const updateGstConfigurationSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, configFields);
  assertAtLeastOneKey(payload, configFields);

  [
    'businessLegalName',
    'brandName',
    'tradeName',
    'gstin',
    'pan',
    'contactNumber',
    'email',
    'invoicePrefix',
    'invoiceNumberFormat',
    'invoiceTerms',
    'invoiceNotes',
    'shippingGstTreatment',
  ].forEach((field) => assertStringLikeField(payload, field));
  ['defaultGstRate', 'nextInvoiceNumber', 'shippingGstRate'].forEach((field) => assertNumberLikeField(payload, field));
  assertBooleanField(payload, 'useFinancialYearNumbering');
  assertImageAssetField(payload, 'businessLogoAsset');
  assertAddressPayload(payload, 'registeredAddress');

  if (Object.prototype.hasOwnProperty.call(payload, 'authorisedSignatory')) {
    assertObjectField(payload, 'authorisedSignatory');
    assertNoUnknownKeys(payload.authorisedSignatory, signatoryFields, 'body.authorisedSignatory');
    signatoryFields.forEach((field) => assertStringLikeField(payload.authorisedSignatory, field, 'body.authorisedSignatory'));
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'bankDetails')) {
    assertObjectField(payload, 'bankDetails');
    assertNoUnknownKeys(payload.bankDetails, bankFields, 'body.bankDetails');
    bankFields.forEach((field) => assertStringLikeField(payload.bankDetails, field, 'body.bankDetails'));
  }

  return pickAllowedKeys(payload, configFields);
});

const validateCheckoutGstDetailsSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, checkoutGstFields);
  assertRequiredKeys(payload, ['gstin', 'businessName', 'state']);
  [
    'businessName',
    'city',
    'contactNumber',
    'email',
    'gstin',
    'pincode',
    'state',
    'stateCode',
    'tradeName',
  ].forEach((field) => assertStringLikeField(payload, field));
  assertObjectField(payload, 'billingAddress');
  assertBooleanField(payload, 'billingSameAsShipping');

  return pickAllowedKeys(payload, checkoutGstFields);
});

const createCreditNoteSchema = createSchema((value) => {
  const payload = expectObject(value);

  assertNoUnknownKeys(payload, creditNoteFields);
  assertRequiredKeys(payload, ['invoiceId', 'reason']);
  ['invoiceId', 'reason', 'refundReference'].forEach((field) => assertStringLikeField(payload, field));
  assertArrayField(payload, 'items');

  return pickAllowedKeys(payload, creditNoteFields);
});

export {
  createCreditNoteSchema,
  updateGstConfigurationSchema,
  validateCheckoutGstDetailsSchema,
};

export default {
  createCreditNoteSchema,
  updateGstConfigurationSchema,
  validateCheckoutGstDetailsSchema,
};
