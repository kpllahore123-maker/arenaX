import requestResetHandler from './_request-password-reset.js';
import completeResetHandler from './_complete-password-reset.js';

/**
 * Vercel Serverless Function: Password Reset Dispatcher
 * Endpoints handled:
 *   - POST /api/request-password-reset
 *   - GET  /api/complete-password-reset?token=XYZ
 *   - POST /api/complete-password-reset
 */
export default async function handler(req, res) {
  const urlPath = (req.url || '').split('?')[0].replace(/\/+$/, '');
  const lastSegment = urlPath.split('/').pop();
  const action = (req.query && req.query.action) || lastSegment;

  if (action === 'request' || action === 'request-password-reset') {
    return requestResetHandler(req, res);
  }
  if (action === 'complete' || action === 'complete-password-reset') {
    return completeResetHandler(req, res);
  }

  // Preflight check
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Query/Payload heuristic
  if (req.query?.token) {
    return completeResetHandler(req, res);
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) {}
  }
  if (body?.token || body?.newPassword) {
    return completeResetHandler(req, res);
  }
  if (body?.email) {
    return requestResetHandler(req, res);
  }

  return res.status(400).json({
    success: false,
    error: 'Unknown password reset action.'
  });
}
