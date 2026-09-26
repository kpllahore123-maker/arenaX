import { setCorsHeaders } from './_common.js';
import statusHandler from './status.js';
import claimHandler from './claim.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.query?.action;
  if (action === 'claim' && req.method === 'POST') {
    return claimHandler(req, res);
  }
  if (action === 'status' || req.query?.uid) {
    return statusHandler(req, res);
  }

  return res.status(200).json({
    success: true,
    service: 'ArenaX Golden Wings Avatar Frame API',
    endpoints: {
      status: '/api/golden-wings/status?uid=<UID>',
      claim: '/api/golden-wings/claim',
      toggleEquip: '/api/golden-wings/toggle-equip',
      purchase: '/api/golden-wings/purchase'
    }
  });
}
