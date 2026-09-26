import applyModerationHandler from './_apply-moderation-action.js';
import createAdminTokenHandler from './_create-admin-token.js';

/**
 * Vercel Serverless Function: Admin API Dispatcher
 * Endpoints handled:
 *   - POST /api/admin/apply-moderation-action
 *   - POST /api/admin/create-admin-token
 */
export default async function handler(req, res) {
  const urlPath = (req.url || '').split('?')[0].replace(/\/+$/, '');
  const lastSegment = urlPath.split('/').pop();
  const action = (req.query && req.query.action) || lastSegment;

  if (action === 'apply-moderation-action') {
    return applyModerationHandler(req, res);
  }
  if (action === 'create-admin-token') {
    return createAdminTokenHandler(req, res);
  }

  // Preflight check
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  return res.status(404).json({
    success: false,
    error: 'Admin endpoint not found'
  });
}
