import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import policyPageController from '@/modules/policy/controllers/policy-page.controller.js';

const router = express.Router();

router.get('/', asyncHandler(policyPageController.listPublishedPolicies));
router.get('/:slug', asyncHandler(policyPageController.getPublishedPolicyBySlug));

export default router;
