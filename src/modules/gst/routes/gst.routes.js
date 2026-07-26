import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import gstController from '@/modules/gst/controllers/gst.controller.js';
import {
  createCreditNoteSchema,
  updateGstConfigurationSchema,
  validateCheckoutGstDetailsSchema,
} from '@/modules/gst/validators/gst.validator.js';

const router = express.Router();

router.post(
  '/checkout/validate',
  authenticateUser,
  validate(validateCheckoutGstDetailsSchema),
  asyncHandler(gstController.validateCheckoutGstDetails),
);

router.get('/invoices/me/:orderId', authenticateUser, asyncHandler(gstController.getCustomerInvoice));
router.get('/invoices/me/:orderId/download', authenticateUser, asyncHandler(gstController.downloadCustomerInvoice));

router.get('/admin/config', authenticateUser, adminMiddleware, asyncHandler(gstController.getGstConfiguration));
router.patch(
  '/admin/config',
  authenticateUser,
  adminMiddleware,
  validate(updateGstConfigurationSchema),
  asyncHandler(gstController.updateGstConfiguration),
);
router.get('/admin/invoices', authenticateUser, adminMiddleware, asyncHandler(gstController.listAdminInvoices));
router.get('/admin/invoices/export', authenticateUser, adminMiddleware, asyncHandler(gstController.exportGstReport));
router.get('/admin/invoices/:invoiceId', authenticateUser, adminMiddleware, asyncHandler(gstController.getAdminInvoice));
router.get('/admin/invoices/:invoiceId/download', authenticateUser, adminMiddleware, asyncHandler(gstController.downloadAdminInvoice));
router.post(
  '/admin/credit-notes',
  authenticateUser,
  adminMiddleware,
  validate(createCreditNoteSchema),
  asyncHandler(gstController.createCreditNote),
);

export default router;
