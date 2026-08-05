import express from 'express';

import asyncHandler from '@/common/helpers/asyncHandler.helper.js';
import validate from '@/common/middleware/validate.middleware.js';
import policyPageController from '@/modules/policy/controllers/policy-page.controller.js';
import {
  createPolicyPageSchema,
  publishPolicyPageSchema,
  updatePolicyPageSchema,
} from '@/modules/policy/validators/policy-page.validator.js';

const router = express.Router();

router
  .route('/')
  .get(asyncHandler(policyPageController.listAdminPolicies))
  .post(validate(createPolicyPageSchema), asyncHandler(policyPageController.createPolicy));

router.get('/:policyIdOrSlug/preview', asyncHandler(policyPageController.previewPolicy));
router.get('/:policyId/versions', asyncHandler(policyPageController.listPolicyVersions));
router.post('/:policyId/versions/:versionId/restore', asyncHandler(policyPageController.restorePolicyVersion));
router.post(
  '/:policyId/publish',
  validate(publishPolicyPageSchema),
  asyncHandler(policyPageController.publishPolicy),
);
router.post('/:policyId/unpublish', asyncHandler(policyPageController.unpublishPolicy));

router
  .route('/:policyIdOrSlug')
  .get(asyncHandler(policyPageController.getAdminPolicy));

router
  .route('/:policyId')
  .patch(validate(updatePolicyPageSchema), asyncHandler(policyPageController.updatePolicy))
  .delete(asyncHandler(policyPageController.deletePolicy));

export default router;
