import {
  setCorsHeaders,
  getFirebaseAdmin,
  getVerifiedUid
} from './_common.js';

/**
 * Vercel Serverless Function: Toggle Equip / Unequip Golden Wings Frame
 * Endpoint: POST /api/golden-wings/toggle-equip
 */
export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
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

    let verifiedUid = null;
    if (auth) {
      verifiedUid = await getVerifiedUid(req, auth);
    }

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) {}
    }
    const clientUid = body && body.uid ? String(body.uid).trim() : null;

    if (!verifiedUid) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Authentication session required.'
      });
    }

    if (clientUid && clientUid !== verifiedUid) {
      return res.status(403).json({
        success: false,
        error: 'Security verification failed: User ID mismatch.'
      });
    }

    const userRef = db.collection('users').doc(verifiedUid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found.'
      });
    }

    const userData = userDoc.data() || {};
    const gw = userData.goldenWingsFrame;
    const now = Date.now();

    if (!gw || !gw.activatedAt) {
      return res.status(403).json({
        success: false,
        error: 'You must claim the Golden Wings Free Trial first.'
      });
    }

    const isPermanent = !!gw.permanentUnlocked;
    const endsAtMs = gw.freeTrialEndsAt ? new Date(gw.freeTrialEndsAt).getTime() : 0;
    const isExpired = !isPermanent && (now >= endsAtMs || gw.status === 'expired');

    if (isExpired) {
      return res.status(403).json({
        success: false,
        error: 'Your 3-day free trial has expired. Unlock permanently to equip.'
      });
    }

    const shouldEquip = body && body.equipped !== undefined ? !!body.equipped : !gw.equipped;

    await userRef.update({
      'goldenWingsFrame.equipped': shouldEquip,
      frameEquipped: shouldEquip,
      updatedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      equipped: shouldEquip,
      message: shouldEquip ? 'Golden Wings Avatar Frame equipped!' : 'Avatar frame unequipped.'
    });
  } catch (err) {
    console.error('[Golden Wings Toggle Equip Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to toggle frame equipment.'
    });
  }
}
