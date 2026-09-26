import {
  setCorsHeaders,
  getFirebaseAdmin,
  getVerifiedUid,
  GOLDEN_WINGS_PURCHASE_PRICE
} from './_common.js';

/**
 * Vercel Serverless Function: Permanent Unlock Golden Wings Frame (150 AX Coins)
 * Endpoint: POST /api/golden-wings/purchase
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

    const userRef = db.collection('users').doc(verifiedUid);

    const purchaseResult = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User profile does not exist.');
      }

      const userData = userDoc.data() || {};
      const currentBalance = Number(userData.balance ?? 0);
      const gw = userData.goldenWingsFrame || {};

      if (gw.permanentUnlocked) {
        throw new Error('You already own Golden Wings frame permanently.');
      }

      if (currentBalance < GOLDEN_WINGS_PURCHASE_PRICE) {
        throw new Error(`Insufficient AX Coins. Required: ${GOLDEN_WINGS_PURCHASE_PRICE} AX, Current: ${currentBalance} AX.`);
      }

      const newBalance = currentBalance - GOLDEN_WINGS_PURCHASE_PRICE;
      const nowIso = new Date().toISOString();

      transaction.update(userRef, {
        balance: newBalance,
        'goldenWingsFrame.permanentUnlocked': true,
        'goldenWingsFrame.status': 'permanent',
        'goldenWingsFrame.equipped': true,
        'goldenWingsFrame.purchasedAt': nowIso,
        hasFrame: true,
        frameEquipped: true,
        updatedAt: nowIso
      });

      // Audit purchase transaction
      const txnRef = userRef.collection('transactions').doc();
      transaction.set(txnRef, {
        type: 'purchase_avatar_frame',
        item: 'golden_wings_permanent',
        amount: -GOLDEN_WINGS_PURCHASE_PRICE,
        balanceAfter: newBalance,
        createdAt: nowIso
      });

      return {
        newBalance,
        permanentUnlocked: true
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Golden Wings Frame unlocked permanently!',
      ...purchaseResult
    });
  } catch (err) {
    console.error('[Golden Wings Purchase Error]:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to complete Golden Wings purchase.'
    });
  }
}
