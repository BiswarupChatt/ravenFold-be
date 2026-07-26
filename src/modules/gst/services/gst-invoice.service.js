import ApiError from '@/common/errors/api.error.js';
import {
  assertDatabaseReady,
  escapeRegex,
  getDocumentId,
  normalizeObjectId,
  normalizeText,
} from '@/common/utils/service.util.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/common/constants/order.constant.js';
import {
  CREDIT_NOTE_STATUS,
  INVOICE_STATUS,
  INVOICE_TYPES,
} from '@/modules/gst/gst.constants.js';
import CreditNote from '@/modules/gst/models/credit-note.model.js';
import GstActivityLog from '@/modules/gst/models/gst-activity-log.model.js';
import Invoice from '@/modules/gst/models/invoice.model.js';
import InvoiceCounter from '@/modules/gst/models/invoice-counter.model.js';
import { getFinancialYear } from '@/modules/gst/services/gst-calculation.service.js';
import gstConfigurationService from '@/modules/gst/services/gst-configuration.service.js';
import { generateInvoicePdfBuffer } from '@/modules/gst/services/invoice-pdf-simple-layout.service.js';
import OrderItem from '@/modules/order/models/order-item.model.js';
import Order from '@/modules/order/models/order.model.js';
import User from '@/modules/users/models/user.model.js';
import { getPagination } from '@/common/utils/pagination.util.js';

const getActorId = (actor = null) => actor?.id || null;

const formatAddress = (address = {}) => ({
  addressLine1: address.addressLine1 || '',
  addressLine2: address.addressLine2 || '',
  city: address.city || '',
  country: address.country || 'India',
  fullName: address.fullName || '',
  phone: address.phone || '',
  pincode: address.pincode || '',
  state: address.state || '',
  stateCode: address.stateCode || '',
});

const formatInvoice = (invoice = {}) => ({
  createdAt: invoice.createdAt,
  customerSnapshot: invoice.customerSnapshot || {},
  financialYear: invoice.financialYear || '',
  generationError: invoice.generationError || '',
  id: invoice.id || invoice._id?.toString(),
  invoiceDate: invoice.invoiceDate,
  invoiceNumber: invoice.invoiceNumber || '',
  invoiceType: invoice.invoiceType || INVOICE_TYPES.B2C,
  items: invoice.items || [],
  orderId: getDocumentId(invoice.orderId),
  orderNumber: invoice.orderNumber || '',
  paymentMethod: invoice.paymentMethod || '',
  paymentStatus: invoice.paymentStatus || '',
  pdfGeneratedAt: invoice.pdfGeneratedAt,
  placeOfSupply: invoice.placeOfSupply || '',
  placeOfSupplyStateCode: invoice.placeOfSupplyStateCode || '',
  sellerSnapshot: invoice.sellerSnapshot || {},
  shipping: invoice.shipping || {},
  status: invoice.status || INVOICE_STATUS.PENDING,
  supplyType: invoice.supplyType || '',
  totals: invoice.totals || {},
  updatedAt: invoice.updatedAt,
  userId: getDocumentId(invoice.userId),
});

const buildInvoiceNumber = ({ config, financialYear, sequence }) => {
  const prefix = normalizeText(config.invoicePrefix).toUpperCase() || 'RF';
  const sequenceText = String(sequence).padStart(6, '0');
  const format = normalizeText(config.invoiceNumberFormat) || '{PREFIX}/{FY}/{SEQ}';

  return format
    .replaceAll('{PREFIX}', prefix)
    .replaceAll('{FY}', financialYear)
    .replaceAll('{SEQ}', sequenceText)
    .toUpperCase();
};

const reserveInvoiceNumber = async (config, date = new Date()) => {
  const financialYear = config.useFinancialYearNumbering === false ? 'all' : getFinancialYear(date);
  const prefix = normalizeText(config.invoicePrefix).toUpperCase() || 'RF';
  const startingSequence = Math.max(Number(config.nextInvoiceNumber || 1) - 1, 0);

  try {
    await InvoiceCounter.create({
      financialYear,
      prefix,
      sequence: startingSequence,
    });
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }
  }

  const counter = await InvoiceCounter.findOneAndUpdate(
    {
      financialYear,
      prefix,
    },
    {
      $inc: { sequence: 1 },
      $setOnInsert: {
        financialYear,
        prefix,
      },
    },
    {
      new: true,
      setDefaultsOnInsert: true,
      upsert: true,
    },
  ).exec();

  return {
    financialYear,
    invoiceNumber: buildInvoiceNumber({
      config,
      financialYear,
      sequence: counter.sequence,
    }),
    sequence: counter.sequence,
  };
};

const buildSellerSnapshot = (config = {}) => ({
  authorisedSignatory: config.authorisedSignatory || {},
  bankDetails: config.bankDetails || {},
  brandName: config.brandName || 'Raven Fold',
  businessLegalName: config.businessLegalName || 'Aurax & Co',
  businessLogoUrl: config.businessLogoUrl || '',
  contactNumber: config.contactNumber || '',
  email: config.email || '',
  gstin: config.gstin || '',
  invoiceNotes: config.invoiceNotes || '',
  invoiceTerms: config.invoiceTerms || '',
  pan: config.pan || '',
  registeredAddress: formatAddress(config.registeredAddress || {}),
  tradeName: config.tradeName || '',
});

const buildCustomerSnapshot = (order, user = null) => ({
  billingAddress: formatAddress(order.billingAddress || {}),
  businessName: order.customerBusinessName || '',
  contactNumber: order.customerGstDetails?.contactNumber || order.billingAddress?.phone || '',
  customerName: user?.name || order.billingAddress?.fullName || '',
  email: order.customerGstDetails?.email || user?.email || '',
  gstin: order.customerGstin || '',
  shippingAddress: formatAddress(order.shippingAddress || {}),
  tradeName: order.customerGstDetails?.tradeName || '',
});

const buildInvoiceItems = (items = []) => items.map((item) => ({
  cessAmount: item.taxSummary?.cessAmount || 0,
  cessRate: item.gstSnapshot?.cessRate || 0,
  cgstAmount: item.taxSummary?.cgstAmount || 0,
  cgstRate: item.taxSummary?.cgstRate || 0,
  description: item.productSnapshot?.variantLabel
    ? `${item.productSnapshot.name} (${item.productSnapshot.variantLabel})`
    : item.productSnapshot?.name || 'Product',
  discountAmount: item.taxSummary?.discountAmount || 0,
  exempt: Boolean(item.gstSnapshot?.exempt),
  exemptionReason: item.gstSnapshot?.exemptionReason || '',
  gstRate: item.gstSnapshot?.gstRate || 0,
  hsnCode: item.gstSnapshot?.hsnCode || '',
  igstAmount: item.taxSummary?.igstAmount || 0,
  igstRate: item.taxSummary?.igstRate || 0,
  lineTotal: item.taxSummary?.lineTotal || item.lineTotal || 0,
  orderItemId: item._id,
  productId: item.productId,
  quantity: item.quantity,
  sgstAmount: item.taxSummary?.sgstAmount || 0,
  sgstRate: item.taxSummary?.sgstRate || 0,
  taxableValue: item.taxSummary?.taxableValue || 0,
  taxInclusive: item.gstSnapshot?.taxInclusive !== false,
  unitPrice: item.priceAtTime,
  variantId: item.variantId || null,
}));

const renderInvoicePdf = (invoice) => ({
  buffer: generateInvoicePdfBuffer(invoice.toObject ? invoice.toObject() : invoice),
  invoiceNumber: invoice.invoiceNumber,
});

const getInvoiceByOrderForCustomer = async (actor, orderId) => {
  assertDatabaseReady();
  const userId = getActorId(actor);
  const normalizedOrderId = normalizeObjectId(orderId, 'order id');
  const invoice = await Invoice.findOne({
    orderId: normalizedOrderId,
    userId,
  }).lean().exec();

  if (!invoice) {
    throw new ApiError(404, 'Invoice not found');
  }

  return formatInvoice(invoice);
};

const downloadCustomerInvoice = async (actor, orderId) => {
  assertDatabaseReady();
  const userId = getActorId(actor);
  const normalizedOrderId = normalizeObjectId(orderId, 'order id');
  const invoice = await Invoice.findOne({
    orderId: normalizedOrderId,
    userId,
  }).exec();

  if (!invoice) {
    throw new ApiError(404, 'Invoice not found');
  }

  return renderInvoicePdf(invoice);
};

const assertInvoiceEligibleOrder = (order) => {
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.paymentStatus !== PAYMENT_STATUS.PAID) {
    throw new ApiError(409, 'Invoice can be generated only for paid orders');
  }

  if ([ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED].includes(order.status)) {
    throw new ApiError(409, 'Invoice cannot be generated for cancelled or returned orders');
  }
};

const generateInvoiceForOrder = async (orderId, actor = null) => {
  assertDatabaseReady();
  const normalizedOrderId = normalizeObjectId(orderId, 'order id');
  const existingInvoice = await Invoice.findOne({ orderId: normalizedOrderId }).exec();

  if (existingInvoice) {
    return formatInvoice(existingInvoice);
  }

  const order = await Order.findById(normalizedOrderId).exec();

  assertInvoiceEligibleOrder(order);

  const [items, config, user] = await Promise.all([
    OrderItem.find({ orderId: normalizedOrderId }).sort({ createdAt: 1 }).lean().exec(),
    gstConfigurationService.getGstConfiguration(),
    User.findById(order.userId).select('name email phone').lean().exec(),
  ]);

  if (!items.length) {
    throw new ApiError(409, 'Cannot generate invoice for an order with no items');
  }

  const invoiceDate = new Date();
  const reserved = await reserveInvoiceNumber(config, invoiceDate);
  const invoicePayload = {
    customerSnapshot: buildCustomerSnapshot(order, user),
    financialYear: reserved.financialYear,
    generatedBy: getActorId(actor),
    invoiceDate,
    invoiceNumber: reserved.invoiceNumber,
    invoiceType: order.invoiceType || INVOICE_TYPES.B2C,
    items: buildInvoiceItems(items),
    orderDate: order.placedAt || order.createdAt,
    orderId: order._id,
    orderNumber: order.orderNumber,
    paymentMethod: order.paymentMethod || '',
    paymentStatus: order.paymentStatus || '',
    placeOfSupply: order.placeOfSupply || '',
    placeOfSupplyStateCode: order.placeOfSupplyStateCode || '',
    sellerSnapshot: {
      ...buildSellerSnapshot(config),
      ...(order.sellerGstSnapshot || {}),
      brandName: order.sellerGstSnapshot?.brandName || config.brandName || 'Raven Fold',
      businessLegalName: order.sellerGstSnapshot?.businessLegalName || config.businessLegalName || 'Aurax & Co',
    },
    shipping: order.shippingTaxSummary || {},
    status: INVOICE_STATUS.PENDING,
    supplyType: order.supplyType,
    totals: order.taxTotals || {},
    userId: order.userId,
  };

  let invoice = null;

  try {
    invoice = await Invoice.create(invoicePayload);
    invoice.status = INVOICE_STATUS.GENERATED;
    await invoice.save();

    order.invoiceNumber = invoice.invoiceNumber;
    order.invoiceDate = invoice.invoiceDate;
    order.invoiceFinancialYear = invoice.financialYear;
    order.invoicePdfPath = '';
    order.invoiceGenerationStatus = invoice.status;
    await order.save();

    await GstActivityLog.create({
      action: 'invoice.generated',
      actorId: getActorId(actor),
      entityId: invoice._id,
      entityType: 'Invoice',
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        orderId: getDocumentId(order._id),
      },
    });

    return formatInvoice(invoice);
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = await Invoice.findOne({ orderId: normalizedOrderId }).exec();

      if (duplicate) {
        return formatInvoice(duplicate);
      }
    }

    if (invoice) {
      invoice.status = INVOICE_STATUS.ERROR;
      invoice.generationError = error.message || 'Invoice generation failed';
      await invoice.save();
    }

    throw error;
  }
};

const regenerateInvoicePdf = async (actor, invoiceId) => {
  assertDatabaseReady();
  const normalizedInvoiceId = normalizeObjectId(invoiceId, 'invoice id');
  const invoice = await Invoice.findById(normalizedInvoiceId).exec();

  if (!invoice) {
    throw new ApiError(404, 'Invoice not found');
  }

  renderInvoicePdf(invoice);
  invoice.status = INVOICE_STATUS.GENERATED;
  invoice.generationError = '';
  await invoice.save();

  await GstActivityLog.create({
    action: 'invoice.pdf_regenerated',
    actorId: getActorId(actor),
    entityId: invoice._id,
    entityType: 'Invoice',
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
    },
  });

  return formatInvoice(invoice);
};

const buildInvoiceFilter = (query = {}) => {
  const filter = {};
  const invoiceType = normalizeText(query.invoiceType).toLowerCase();
  const supplyType = normalizeText(query.supplyType).toLowerCase();
  const financialYear = normalizeText(query.financialYear);
  const status = normalizeText(query.status).toLowerCase();
  const stateCode = normalizeText(query.stateCode);

  if (invoiceType && invoiceType !== 'all') {
    filter.invoiceType = invoiceType;
  }

  if (supplyType && supplyType !== 'all') {
    filter.supplyType = supplyType;
  }

  if (financialYear && financialYear !== 'all') {
    filter.financialYear = financialYear;
  }

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (stateCode && stateCode !== 'all') {
    filter.placeOfSupplyStateCode = stateCode;
  }

  if (query.fromDate || query.toDate) {
    filter.invoiceDate = {};

    if (query.fromDate) {
      filter.invoiceDate.$gte = new Date(query.fromDate);
    }

    if (query.toDate) {
      filter.invoiceDate.$lte = new Date(query.toDate);
    }
  }

  const search = normalizeText(query.search);

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');

    filter.$or = [
      { invoiceNumber: regex },
      { orderNumber: regex },
      { 'customerSnapshot.customerName': regex },
      { 'customerSnapshot.businessName': regex },
      { 'customerSnapshot.gstin': regex },
    ];
  }

  return filter;
};

const listAdminInvoices = async (query = {}) => {
  assertDatabaseReady();
  const { limit, page, skip } = getPagination(query);
  const filter = buildInvoiceFilter(query);
  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .sort({ invoiceDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    Invoice.countDocuments(filter).exec(),
  ]);

  return {
    items: invoices.map(formatInvoice),
    pagination: {
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
      limit,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getAdminInvoice = async (invoiceId) => {
  assertDatabaseReady();
  const invoice = await Invoice.findById(normalizeObjectId(invoiceId, 'invoice id')).lean().exec();

  if (!invoice) {
    throw new ApiError(404, 'Invoice not found');
  }

  return formatInvoice(invoice);
};

const downloadAdminInvoice = async (invoiceId) => {
  assertDatabaseReady();
  const invoice = await Invoice.findById(normalizeObjectId(invoiceId, 'invoice id')).exec();

  if (!invoice) {
    throw new ApiError(404, 'Invoice not found');
  }

  return renderInvoicePdf(invoice);
};

const getReportRows = async (query = {}) => {
  const invoices = await Invoice.find(buildInvoiceFilter(query)).sort({ invoiceDate: 1 }).lean().exec();
  const rows = [];

  invoices.forEach((invoice) => {
    invoice.items.forEach((item) => {
      rows.push({
        cess: item.cessAmount || 0,
        cgst: item.cgstAmount || 0,
        customerGstin: invoice.customerSnapshot?.gstin || '',
        customerName: invoice.customerSnapshot?.businessName || invoice.customerSnapshot?.customerName || '',
        financialYear: invoice.financialYear,
        gstRate: item.gstRate || 0,
        hsnCode: item.hsnCode || '',
        igst: item.igstAmount || 0,
        invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().slice(0, 10) : '',
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: invoice.invoiceType,
        orderNumber: invoice.orderNumber,
        placeOfSupplyStateCode: invoice.placeOfSupplyStateCode,
        quantity: item.quantity || 0,
        sgst: item.sgstAmount || 0,
        supplyType: invoice.supplyType,
        taxableValue: item.taxableValue || 0,
      });
    });
  });

  return rows;
};

const exportGstReportCsv = async (query = {}) => {
  assertDatabaseReady();
  const rows = await getReportRows(query);
  const headers = [
    'invoiceNumber',
    'invoiceDate',
    'orderNumber',
    'invoiceType',
    'customerGstin',
    'customerName',
    'supplyType',
    'placeOfSupplyStateCode',
    'financialYear',
    'hsnCode',
    'gstRate',
    'quantity',
    'taxableValue',
    'cgst',
    'sgst',
    'igst',
    'cess',
  ];
  const csvLines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(',')),
  ];

  return Buffer.from(csvLines.join('\n'));
};

const createCreditNote = async (actor, payload = {}) => {
  assertDatabaseReady();
  const invoice = await Invoice.findById(normalizeObjectId(payload.invoiceId, 'invoice id')).lean().exec();

  if (!invoice) {
    throw new ApiError(404, 'Invoice not found');
  }

  const creditNoteCount = await CreditNote.countDocuments({ invoiceId: invoice._id }).exec();
  const creditNoteNumber = `${invoice.invoiceNumber}/CN/${String(creditNoteCount + 1).padStart(3, '0')}`;
  const selectedOrderItemIds = new Set((payload.items || []).map((item) => normalizeText(item.orderItemId)).filter(Boolean));
  const sourceItems = selectedOrderItemIds.size
    ? invoice.items.filter((item) => selectedOrderItemIds.has(getDocumentId(item.orderItemId)))
    : invoice.items;
  const creditItems = sourceItems.map((item) => ({
    cessAmount: item.cessAmount || 0,
    cgstAmount: item.cgstAmount || 0,
    description: item.description || '',
    igstAmount: item.igstAmount || 0,
    invoiceItemOrderItemId: item.orderItemId,
    quantity: item.quantity || 0,
    sgstAmount: item.sgstAmount || 0,
    taxableValue: item.taxableValue || 0,
    totalAmount: item.lineTotal || 0,
  }));
  const totals = creditItems.reduce(
    (summary, item) => ({
      cess: summary.cess + item.cessAmount,
      cgst: summary.cgst + item.cgstAmount,
      igst: summary.igst + item.igstAmount,
      sgst: summary.sgst + item.sgstAmount,
      taxableValue: summary.taxableValue + item.taxableValue,
      total: summary.total + item.totalAmount,
    }),
    {
      cess: 0,
      cgst: 0,
      igst: 0,
      sgst: 0,
      taxableValue: 0,
      total: 0,
    },
  );
  const creditNote = await CreditNote.create({
    createdBy: getActorId(actor),
    creditNoteNumber,
    invoiceId: invoice._id,
    issuedAt: new Date(),
    items: creditItems,
    orderId: invoice.orderId,
    reason: normalizeText(payload.reason),
    refundReference: normalizeText(payload.refundReference),
    status: CREDIT_NOTE_STATUS.ISSUED,
    totals,
    userId: invoice.userId,
  });

  await GstActivityLog.create({
    action: 'credit_note.issued',
    actorId: getActorId(actor),
    entityId: creditNote._id,
    entityType: 'CreditNote',
    metadata: {
      creditNoteNumber,
      invoiceNumber: invoice.invoiceNumber,
    },
  });

  return creditNote.toObject();
};

export {
  createCreditNote,
  downloadAdminInvoice,
  downloadCustomerInvoice,
  exportGstReportCsv,
  formatInvoice,
  generateInvoiceForOrder,
  getAdminInvoice,
  getInvoiceByOrderForCustomer,
  listAdminInvoices,
  regenerateInvoicePdf,
};

export default {
  createCreditNote,
  downloadAdminInvoice,
  downloadCustomerInvoice,
  exportGstReportCsv,
  formatInvoice,
  generateInvoiceForOrder,
  getAdminInvoice,
  getInvoiceByOrderForCustomer,
  listAdminInvoices,
  regenerateInvoicePdf,
};
