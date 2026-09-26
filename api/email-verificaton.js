import sendHandler from './_send-verification-code.js';
import verifyHandler from './_verify-email-code.js';

/**
 * Vercel Serverless Function: Email Verification Dispatcher
 * Endpoints handled:
 *   - POST /api/send-verification-code
 *   - POST /api/verify-email-code
 */
export default async function handler(req, res) {
  const urlPath = (req.url || '').split('?')[0].replace(/\/+$/, '');
  const lastSegment = urlPath.split('/').pop();
  const action = (req.query && req.query.action) || lastSegment;

  if (action === 'send' || action === 'send-verification-code') {
    return sendHandler(req, res);
  }
  if (action === 'verify' || action === 'verify-email-code') {
    return verifyHandler(req, res);
  }

  // Preflight check
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Payload-based heuristic fallback
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) {}
  }
  if (body && body.code) {
    return verifyHandler(req, res);
  }
  if (body && body.email) {
    return sendHandler(req, res);
  }

  return res.status(400).json({
    success: false,
    error: 'Unknown email verification action.'
  });
}
