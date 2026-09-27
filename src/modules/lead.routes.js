import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import adminMiddleware from '@/common/middleware/admin.middleware.js';
import { authenticateUser } from '@/common/middleware/auth.middleware.js';
import validate from '@/common/middleware/validate.middleware.js';
import leadController from '@/modules/lead.controller.js';
import { createLeadSchema } from '@/modules/lead.validator.js';

const router = express.Router();

router.post('/', validate(createLeadSchema), asyncHandler(leadController.createLead));

router.get('/admin', authenticateUser, adminMiddleware, asyncHandler(leadController.listAdminLeads));

export default router;
