import { sendSuccess } from '@/common/helpers/response.helper.js';
import leadService from '@/modules/lead.service.js';

const createLead = async (req, res) => sendSuccess(
  res,
  await leadService.createLead(req.body),
  'Lead captured',
  201,
);

const listAdminLeads = async (req, res) => sendSuccess(
  res,
  await leadService.listAdminLeads(req.query),
  'Leads fetched',
);

export { createLead, listAdminLeads };

export default { createLead, listAdminLeads };
