import {
  setCorsHeaders
} from './common.js';
import statusHandler from './status.js';
import claimHandler from './claim.js';
import toggleEquipHandler from './toggle-equip.js';
import purchaseHandler from './purchase.js';

/**
 * Vercel Serverless Function: Golden Wings API Dispatcher / Base Endpoint
 * Endpoint: /api/golden-wings
 */
export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = (req.query && req.query.action) || '';

  if (action === 'claim') {
    return claimHandler(req, res);
  }
  if (action === 'toggle-equip') {
    return toggleEquipHandler(req, res);
  }
  if (action === 'purchase') {
    return purchaseHandler(req, res);
  }
  if (action === 'status' || (req.query && req.query.uid)) {
    return statusHandler(req, res);
  }

  return res.status(200).json({
    success: true,
    service: 'ArenaX Golden Wings Avatar Frame API',
    endpoints: {
      status: 'GET /api/golden-wings/status?uid=<UID>',
      claim: 'POST /api/golden-wings/claim',
      toggleEquip: 'POST /api/golden-wings/toggle-equip',
      purchase: 'POST /api/golden-wings/purchase'
    }
  });
}
