import {
  setCorsHeaders,
  getFirebaseAdmin,
  getVerifiedUid
} from './common.js';

/**
 * Vercel Serverless Function: Toggle Equip / Unequip Golden Wings Frame
 * Endpoint: POST /api/golden-wings/toggle-equip
 */
export default async function handler(req, res) {
  // Apply CORS headers for all requests, including preflight
  setCorsHeaders(req, res);

  // Return HTTP 200 OK for preflight OPTIONS requests immediately
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
    if (Buffer.isBuffer(body)) {
      try { body = JSON.parse(body.toString('utf-8')); } catch (_) {}
    } else if (typeof body === 'string') {
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

    const equip = body && typeof body.equipped === 'boolean' ? body.equipped : null;
    const userRef = db.collection('users').doc(verifiedUid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }

    const userData = userDoc.data() || {};
    const gw = userData.goldenWingsFrame;

    if (!gw || !gw.activatedAt) {
      return res.status(403).json({
        success: false,
        error: 'You do not own Golden Wings avatar frame.'
      });
    }

    const now = Date.now();
    const isPermanent = !!gw.permanentUnlocked;
    const trialEnds = gw.freeTrialEndsAt ? new Date(gw.freeTrialEndsAt).getTime() : 0;
    const isExpired = !isPermanent && now >= trialEnds;

    if (isExpired) {
      return res.status(403).json({
        success: false,
        error: 'Your Golden Wings frame free trial has expired.'
      });
    }

    const newEquipState = equip !== null ? equip : !gw.equipped;

    await userRef.update({
      'goldenWingsFrame.equipped': newEquipState,
      frameEquipped: newEquipState,
      updatedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      equipped: newEquipState,
      message: newEquipState ? 'Golden Wings Avatar Frame equipped!' : 'Golden Wings Frame unequipped.'
    });
  } catch (err) {
    console.error('[Golden Wings Toggle Equip Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to update equip status.'
    });
  }
}
