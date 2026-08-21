import { sendSuccess } from '@/common/helpers/response.helper.js';
import gstConfigurationService from '@/modules/gst/services/gst-configuration.service.js';
import gstInvoiceService from '@/modules/gst/services/gst-invoice.service.js';
import {
  getStateCodeFromState,
  normalizeGstin,
  normalizeStateCode,
  normalizeStateName,
  validateGstinWithState,
} from '@/modules/gst/services/gst-validation.service.js';

const sendInvoicePdf = (res, file) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${file.invoiceNumber}.pdf"`);

  return res.send(file.buffer);
};

const getGstConfiguration = async (req, res) => sendSuccess(
  res,
  await gstConfigurationService.getGstConfiguration(),
  'GST configuration fetched',
);

const updateGstConfiguration = async (req, res) => sendSuccess(
  res,
  await gstConfigurationService.updateGstConfiguration(req.user, req.body),
  'GST configuration updated',
);

const validateCheckoutGstDetails = async (req, res) => {
  const state = normalizeStateName(req.body.state, 'state', { required: true });
  const stateCode = getStateCodeFromState(state, 'state', { required: true });
  const result = validateGstinWithState({
    gstin: req.body.gstin,
    stateCode,
  });

  return sendSuccess(res, {
    gstin: normalizeGstin(result.gstin),
    state,
    stateCode: normalizeStateCode(result.stateCode),
    valid: true,
  }, 'GST details are valid');
};

const getCustomerInvoice = async (req, res) => sendSuccess(
  res,
  await gstInvoiceService.getInvoiceByOrderForCustomer(req.user, req.params.orderId),
  'Invoice fetched',
);

const downloadCustomerInvoice = async (req, res) => sendInvoicePdf(
  res,
  await gstInvoiceService.downloadCustomerInvoice(req.user, req.params.orderId),
);

const listAdminInvoices = async (req, res) => sendSuccess(
  res,
  await gstInvoiceService.listAdminInvoices(req.query),
  'Invoices fetched',
);

const getAdminInvoice = async (req, res) => sendSuccess(
  res,
  await gstInvoiceService.getAdminInvoice(req.params.invoiceId),
  'Invoice fetched',
);

const downloadAdminInvoice = async (req, res) => sendInvoicePdf(
  res,
  await gstInvoiceService.downloadAdminInvoice(req.params.invoiceId),
);

const sendAdminInvoiceEmail = async (req, res) => sendSuccess(
  res,
  await gstInvoiceService.sendAdminInvoiceEmail(req.params.invoiceId, req.user),
  'Invoice email sent',
);

const exportGstReport = async (req, res) => {
  const csv = await gstInvoiceService.exportGstReportCsv(req.query);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="gst-report.csv"');

  return res.send(csv);
};

const createCreditNote = async (req, res) => sendSuccess(
  res,
  await gstInvoiceService.createCreditNote(req.user, req.body),
  'Credit note issued',
  201,
);

export {
  createCreditNote,
  downloadAdminInvoice,
  downloadCustomerInvoice,
  exportGstReport,
  getAdminInvoice,
  getCustomerInvoice,
  getGstConfiguration,
  listAdminInvoices,
  sendAdminInvoiceEmail,
  updateGstConfiguration,
  validateCheckoutGstDetails,
};

export default {
  createCreditNote,
  downloadAdminInvoice,
  downloadCustomerInvoice,
  exportGstReport,
  getAdminInvoice,
  getCustomerInvoice,
  getGstConfiguration,
  listAdminInvoices,
  sendAdminInvoiceEmail,
  updateGstConfiguration,
  validateCheckoutGstDetails,
};
