import {
  setCorsHeaders,
  getFirebaseAdmin,
  getVerifiedUid,
  GOLDEN_WINGS_TRIAL_MS
} from './common.js';

/**
 * Vercel Serverless Function: Claim Golden Wings Avatar Frame 3-Day Free Trial
 * Endpoint: POST /api/golden-wings/claim
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

    // 1. Verify User Session Authenticity (Do NOT trust client UID alone)
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

    // Strict validation: must have verified token
    if (!verifiedUid) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Valid authentication session token is required to claim this reward.'
      });
    }

    // If client provided a UID, ensure it strictly matches the verified session UID
    if (clientUid && clientUid !== verifiedUid) {
      return res.status(403).json({
        success: false,
        error: 'Security verification failed: User ID mismatch.'
      });
    }

    const userRef = db.collection('users').doc(verifiedUid);

    // 2-6. Transaction: Check eligibility, prevent duplicates, record claim & grant frame
    const result = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User profile does not exist.');
      }

      const userData = userDoc.data() || {};
      const gw = userData.goldenWingsFrame;

      // Anti-Tamper: Check if reward was already claimed
      if (gw && gw.activatedAt) {
        throw new Error('You have already claimed your 3-Day Free Trial for Golden Wings Frame.');
      }

      const now = Date.now();
      const endsAt = now + GOLDEN_WINGS_TRIAL_MS;
      const activatedAtIso = new Date(now).toISOString();
      const freeTrialEndsAtIso = new Date(endsAt).toISOString();

      const goldenWingsData = {
        activatedAt: activatedAtIso,
        freeTrialEndsAt: freeTrialEndsAtIso,
        equipped: true,
        status: 'active',
        trialDurationHours: 72,
        permanentUnlocked: false
      };

      // Atomic update in Firestore
      transaction.update(userRef, {
        goldenWingsFrame: goldenWingsData,
        hasFrame: true,
        frameEquipped: true,
        frameExpiresAt: freeTrialEndsAtIso,
        updatedAt: activatedAtIso
      });

      // Audit claim log in Firestore subcollection
      const claimLogRef = userRef.collection('claims').doc('golden_wings_trial');
      transaction.set(claimLogRef, {
        rewardType: 'golden_wings_3day_trial',
        claimedAt: activatedAtIso,
        expiresAt: freeTrialEndsAtIso,
        userId: verifiedUid,
        serverTime: now
      });

      return {
        goldenWingsData,
        serverTime: now,
        remainingMs: GOLDEN_WINGS_TRIAL_MS
      };
    });

    // 7. Return JSON response
    return res.status(200).json({
      success: true,
      eligible: false,
      claimed: true,
      message: 'Golden Wings Avatar Frame unlocked! 72-Hour Free Trial is now active.',
      ...result
    });
  } catch (err) {
    console.error('[Golden Wings Claim Error]:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to claim Golden Wings free trial.'
    });
  }
}
