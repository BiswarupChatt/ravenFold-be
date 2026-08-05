import { sendSuccess } from '@/common/helpers/response.helper.js';
import policyPageService from '@/modules/policy/services/policy-page.service.js';

const listAdminPolicies = async (req, res) => sendSuccess(
  res,
  await policyPageService.listAdminPolicies(req.query),
  'Policies fetched',
);

const getAdminPolicy = async (req, res) => sendSuccess(
  res,
  await policyPageService.getAdminPolicy(req.params.policyIdOrSlug),
  'Policy fetched',
);

const createPolicy = async (req, res) => sendSuccess(
  res,
  await policyPageService.createPolicy(req.user, req.body),
  'Policy created',
  201,
);

const updatePolicy = async (req, res) => sendSuccess(
  res,
  await policyPageService.updatePolicy(req.user, req.params.policyId, req.body),
  'Policy updated',
);

const publishPolicy = async (req, res) => sendSuccess(
  res,
  await policyPageService.publishPolicy(req.user, req.params.policyId, req.body),
  'Policy published',
);

const unpublishPolicy = async (req, res) => sendSuccess(
  res,
  await policyPageService.unpublishPolicy(req.user, req.params.policyId),
  'Policy unpublished',
);

const deletePolicy = async (req, res) => sendSuccess(
  res,
  await policyPageService.deletePolicy(req.params.policyId),
  'Policy deleted',
);

const getPublishedPolicyBySlug = async (req, res) => sendSuccess(
  res,
  await policyPageService.getPublishedPolicyBySlug(req.params.slug),
  'Published policy fetched',
);

const listPublishedPolicies = async (req, res) => sendSuccess(
  res,
  await policyPageService.listPublishedPolicies(),
  'Published policies fetched',
);

const previewPolicy = async (req, res) => sendSuccess(
  res,
  await policyPageService.previewPolicy(req.params.policyIdOrSlug),
  'Policy preview fetched',
);

const listPolicyVersions = async (req, res) => sendSuccess(
  res,
  await policyPageService.listPolicyVersions(req.params.policyId),
  'Policy versions fetched',
);

const restorePolicyVersion = async (req, res) => sendSuccess(
  res,
  await policyPageService.restorePolicyVersion(req.user, req.params.policyId, req.params.versionId),
  'Policy version restored',
);

export {
  createPolicy,
  deletePolicy,
  getAdminPolicy,
  getPublishedPolicyBySlug,
  listAdminPolicies,
  listPublishedPolicies,
  listPolicyVersions,
  previewPolicy,
  publishPolicy,
  restorePolicyVersion,
  unpublishPolicy,
  updatePolicy,
};

export default {
  createPolicy,
  deletePolicy,
  getAdminPolicy,
  getPublishedPolicyBySlug,
  listAdminPolicies,
  listPublishedPolicies,
  listPolicyVersions,
  previewPolicy,
  publishPolicy,
  restorePolicyVersion,
  unpublishPolicy,
  updatePolicy,
};
