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

    const result = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User profile not found.');
      }

      const userData = userDoc.data() || {};
      const balance = Number(userData.balance || 0);

      if (balance < GOLDEN_WINGS_PURCHASE_PRICE) {
        throw new Error(`Insufficient balance. You need ${GOLDEN_WINGS_PURCHASE_PRICE} AX Coins (Current: ${balance} AX).`);
      }

      const currentGw = userData.goldenWingsFrame || {};
      if (currentGw.permanentUnlocked) {
        throw new Error('You already permanently own the Golden Wings Avatar Frame.');
      }

      const now = Date.now();
      const updatedGw = {
        ...currentGw,
        permanentUnlocked: true,
        status: 'permanent',
        equipped: true,
        purchasedAt: new Date(now).toISOString()
      };

      const newBalance = balance - GOLDEN_WINGS_PURCHASE_PRICE;

      transaction.update(userRef, {
        balance: newBalance,
        goldenWingsFrame: updatedGw,
        hasFrame: true,
        frameEquipped: true,
        updatedAt: new Date(now).toISOString()
      });

      // Record transaction history
      const txnRef = db.collection('transactions').doc();
      transaction.set(txnRef, {
        userId: verifiedUid,
        type: 'item_purchase',
        item: 'Golden Wings Avatar Frame',
        amount: -GOLDEN_WINGS_PURCHASE_PRICE,
        balanceAfter: newBalance,
        createdAt: new Date().toISOString()
      });

      return {
        goldenWingsFrame: updatedGw,
        newBalance
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Golden Wings Avatar Frame permanently unlocked!',
      ...result
    });
  } catch (err) {
    console.error('[Golden Wings Purchase Error]:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to purchase Golden Wings frame.'
    });
  }
}
