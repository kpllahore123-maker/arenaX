import {
  setCorsHeaders,
  getFirebaseAdmin,
  getVerifiedUid,
  GOLDEN_WINGS_TRIAL_MS
} from './_common.js';

/**
 * Vercel Serverless Function: Golden Wings Avatar Frame Status Check
 * Endpoint: GET /api/golden-wings/status?uid=<UID>
 */
export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.'
    });
  }

  try {
    const { db, auth, error: dbError } = await getFirebaseAdmin();
    if (dbError || !db) {
      return res.status(500).json({
        success: false,
        error: dbError || 'Backend database service unavailable.'
      });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) {}
    }

    // UID can come from query param, body, or decoded token
    let uid = (req.query && req.query.uid) || (body && body.uid);
    if (!uid && auth) {
      uid = await getVerifiedUid(req, auth);
    }

    if (!uid || typeof uid !== 'string' || !uid.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Missing required user ID parameter (uid).'
      });
    }

    const cleanUid = uid.trim();
    const userRef = db.collection('users').doc(cleanUid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        eligible: false,
        claimed: false,
        error: 'User profile not found.'
      });
    }

    const userData = userDoc.data() || {};
    const now = Date.now();
    const gw = userData.goldenWingsFrame || null;

    // 1. Not yet activated / claimed
    if (!gw || !gw.activatedAt) {
      return res.status(200).json({
        success: true,
        eligible: true,
        claimed: false,
        status: 'not_activated',
        hasFrame: false,
        equipped: false,
        activatedAt: null,
        freeTrialEndsAt: null,
        remainingMs: GOLDEN_WINGS_TRIAL_MS,
        serverTime: now,
        isExpired: false,
        permanentUnlocked: false
      });
    }

    // 2. Activated trial or permanent unlock
    const activatedAtMs = new Date(gw.activatedAt).getTime();
    const endsAtMs = gw.freeTrialEndsAt
      ? new Date(gw.freeTrialEndsAt).getTime()
      : activatedAtMs + GOLDEN_WINGS_TRIAL_MS;
    const isPermanent = !!gw.permanentUnlocked;
    const isExpired = !isPermanent && (now >= endsAtMs || gw.status === 'expired');
    const effectiveRemainingMs = isExpired ? 0 : Math.max(0, endsAtMs - now);

    // Auto-sync expired state in Firestore if expired
    if (isExpired && (gw.status !== 'expired' || gw.equipped)) {
      try {
        await userRef.update({
          'goldenWingsFrame.status': 'expired',
          'goldenWingsFrame.equipped': false,
          frameEquipped: false,
          updatedAt: new Date().toISOString()
        });
        gw.status = 'expired';
        gw.equipped = false;
      } catch (syncErr) {
        console.warn('[Golden Wings Status Expiry Sync]:', syncErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      eligible: false,
      claimed: true,
      status: isPermanent ? 'permanent' : (isExpired ? 'expired' : 'active'),
      hasFrame: isPermanent || !isExpired,
      equipped: !!gw.equipped && (isPermanent || !isExpired),
      activatedAt: gw.activatedAt,
      freeTrialEndsAt: gw.freeTrialEndsAt,
      remainingMs: effectiveRemainingMs,
      serverTime: now,
      isExpired,
      permanentUnlocked: isPermanent
    });
  } catch (err) {
    console.error('[Golden Wings Status Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch Golden Wings status.'
    });
  }
}
