const INVOICE_TYPES = Object.freeze({
  B2B: 'b2b',
  B2C: 'b2c',
});

const SUPPLY_TYPES = Object.freeze({
  INTER_STATE: 'inter_state',
  INTRA_STATE: 'intra_state',
});

const INVOICE_STATUS = Object.freeze({
  CANCELLED: 'cancelled',
  ERROR: 'error',
  GENERATED: 'generated',
  PENDING: 'pending',
});

const PRICE_TAX_MODES = Object.freeze({
  EXCLUSIVE: 'exclusive',
  INCLUSIVE: 'inclusive',
});

const SHIPPING_GST_TREATMENTS = Object.freeze({
  EXEMPT: 'exempt',
  TAXABLE: 'taxable',
});

const CREDIT_NOTE_STATUS = Object.freeze({
  DRAFT: 'draft',
  ISSUED: 'issued',
});

const GST_STATE_CODES = Object.freeze([
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '26', '27', '29', '30', '31', '32',
  '33', '34', '35', '36', '37', '38', '97',
]);

const GST_STATE_OPTIONS = Object.freeze([
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
]);

export {
  CREDIT_NOTE_STATUS,
  GST_STATE_CODES,
  GST_STATE_OPTIONS,
  INVOICE_STATUS,
  INVOICE_TYPES,
  PRICE_TAX_MODES,
  SHIPPING_GST_TREATMENTS,
  SUPPLY_TYPES,
};

export default {
  CREDIT_NOTE_STATUS,
  GST_STATE_CODES,
  GST_STATE_OPTIONS,
  INVOICE_STATUS,
  INVOICE_TYPES,
  PRICE_TAX_MODES,
  SHIPPING_GST_TREATMENTS,
  SUPPLY_TYPES,
};
