import { setCorsHeaders, ARENAX_SHOP_CATALOG } from './_common.js';
import purchaseHandler from './_purchase.js';
import equipHandler from './_equip.js';

/**
 * Vercel Serverless Function: ArenaX Shop API Dispatcher
 * Endpoints handled:
 *   - POST /api/shop/purchase
 *   - POST /api/shop/equip
 *   - GET  /api/shop
 */
export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const urlPath = (req.url || '').split('?')[0].replace(/\/+$/, '');
  const lastSegment = urlPath.split('/').pop();
  const action = (req.query && req.query.action) || lastSegment;

  if (action === 'purchase' || urlPath.endsWith('/purchase')) {
    return purchaseHandler(req, res);
  }

  if (action === 'equip' || urlPath.endsWith('/equip')) {
    return equipHandler(req, res);
  }

  // Fallback info / catalog endpoint for GET /api/shop
  return res.status(200).json({
    success: true,
    service: 'ArenaX Shop API',
    catalog: ARENAX_SHOP_CATALOG,
    endpoints: {
      purchase: 'POST /api/shop/purchase',
      equip: 'POST /api/shop/equip'
    }
  });
}
