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

export {
  CREDIT_NOTE_STATUS,
  GST_STATE_CODES,
  INVOICE_STATUS,
  INVOICE_TYPES,
  PRICE_TAX_MODES,
  SHIPPING_GST_TREATMENTS,
  SUPPLY_TYPES,
};

export default {
  CREDIT_NOTE_STATUS,
  GST_STATE_CODES,
  INVOICE_STATUS,
  INVOICE_TYPES,
  PRICE_TAX_MODES,
  SHIPPING_GST_TREATMENTS,
  SUPPLY_TYPES,
};
