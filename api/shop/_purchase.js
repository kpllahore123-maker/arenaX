import {
  setCorsHeaders,
  getFirebaseAdmin,
  getVerifiedUid,
  ARENAX_SHOP_CATALOG
} from './_common.js';

/**
 * Vercel Serverless Function: Authoritative ArenaX Shop Purchase Endpoint
 * Endpoint: POST /api/shop/purchase
 */
export default async function handler(req, res) {
  // 1. Strict CORS for production and preflight
  setCorsHeaders(req, res);

  // Return HTTP 200 OK for preflight OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Enforce HTTP POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Method not allowed. Use POST.'
    });
  }

  try {
    // 2. Initialize Firebase Admin SDK
    const { db, auth, error: dbError } = await getFirebaseAdmin();
    if (dbError || !db) {
      return res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: dbError || 'Backend database service unavailable.'
      });
    }

    // 3. Parse request body safely
    let body = req.body;
    if (Buffer.isBuffer(body)) {
      try { body = JSON.parse(body.toString('utf-8')); } catch (_) {}
    } else if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) {}
    }
    const clientUid = body && body.uid ? String(body.uid).trim() : null;
    const requestedItemId = body && body.itemId ? String(body.itemId).trim() : null;

    // 4. Authenticate & verify ArenaX user session
    let verifiedUid = null;
    if (auth) {
      verifiedUid = await getVerifiedUid(req, auth);
      if (!verifiedUid) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Unauthorized. Authentication session required.'
        });
      }
    }

    if (verifiedUid && clientUid && clientUid !== verifiedUid) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Security verification failed: User ID mismatch.'
      });
    }

    const effectiveUid = verifiedUid || clientUid;
    if (!effectiveUid) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Unauthorized. Authentication session required.'
      });
    }

    // 5. Look up item from authoritative server-side catalog (Never trust client price)
    const item = ARENAX_SHOP_CATALOG[requestedItemId || ''];
    if (!item) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ITEM',
        message: 'Invalid shop item requested.'
      });
    }

    const userRef = db.collection('users').doc(effectiveUid);

    // 6. Execute atomic Firestore transaction to prevent double purchases or coin duplication
    const purchaseResult = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('USER_NOT_FOUND');
      }

      const userData = userDoc.data() || {};
      const currentBalance = Number(userData.balance ?? 0);

      // Check whether user already owns the item
      const ownedItems = userData.ownedShopItems || {};
      const isGwOwned = item.id === 'golden-wings' && (
        userData.goldenWingsFrame?.permanentUnlocked ||
        userData.goldenWingsFrame?.status === 'permanent' ||
        !!ownedItems['golden-wings']
      );
      const isEagleOwned = item.id === 'eagle' && (
        userData.eagleFrame?.permanentUnlocked ||
        userData.eagleFrame?.status === 'permanent' ||
        !!ownedItems['eagle']
      );
      const isPheonixOwned = item.id === 'pheonix' && (
        userData.pheonixFrame?.permanentUnlocked ||
        userData.pheonixFrame?.status === 'permanent' ||
        !!ownedItems['pheonix']
      );
      const isAlreadyClaimed = Boolean(ownedItems[item.id] || isGwOwned || isEagleOwned || isPheonixOwned);

      if (isAlreadyClaimed) {
        throw new Error('ALREADY_OWNED');
      }

      // Authoritative balance check against server catalog price
      if (currentBalance < item.price) {
        throw new Error('INSUFFICIENT_COINS');
      }

      const newBalance = currentBalance - item.price;
      const nowIso = new Date().toISOString();
      const nowMs = Date.now();

      const updatedOwnedItems = {
        ...ownedItems,
        [item.id]: {
          id: item.id,
          name: item.name,
          price: item.price,
          purchasedAt: nowIso
        }
      };

      const updatePayload = {
        balance: newBalance,
        ownedShopItems: updatedOwnedItems,
        updatedAt: nowIso
      };

      if (item.id === 'golden-wings') {
        const currentGw = userData.goldenWingsFrame || {};
        updatePayload.goldenWingsFrame = {
          ...currentGw,
          permanentUnlocked: true,
          status: 'permanent',
          equipped: true,
          purchasedAt: nowIso
        };
        updatePayload.hasFrame = true;
        updatePayload.frameEquipped = true;
        updatePayload.equippedFrameId = 'golden-wings';
        if (userData.eagleFrame) updatePayload['eagleFrame.equipped'] = false;
        if (userData.pheonixFrame) updatePayload['pheonixFrame.equipped'] = false;
      } else if (item.id === 'eagle') {
        updatePayload.eagleFrame = {
          id: 'eagle',
          name: 'Eagle',
          asset: 'frame3.webm',
          permanentUnlocked: true,
          status: 'permanent',
          equipped: true,
          purchasedAt: nowIso
        };
        updatePayload.hasFrame = true;
        updatePayload.frameEquipped = true;
        updatePayload.equippedFrameId = 'eagle';
        if (userData.goldenWingsFrame) updatePayload['goldenWingsFrame.equipped'] = false;
        if (userData.pheonixFrame) updatePayload['pheonixFrame.equipped'] = false;
      } else if (item.id === 'pheonix') {
        updatePayload.pheonixFrame = {
          id: 'pheonix',
          name: 'Pheonix',
          asset: 'frame4.webm',
          permanentUnlocked: true,
          status: 'permanent',
          equipped: true,
          purchasedAt: nowIso
        };
        updatePayload.hasFrame = true;
        updatePayload.frameEquipped = true;
        updatePayload.equippedFrameId = 'pheonix';
        if (userData.goldenWingsFrame) updatePayload['goldenWingsFrame.equipped'] = false;
        if (userData.eagleFrame) updatePayload['eagleFrame.equipped'] = false;
      }

      // Apply atomic user profile update
      transaction.update(userRef, updatePayload);

      // Audit purchase transaction in root transactions collection
      const txnRef = db.collection('transactions').doc();
      transaction.set(txnRef, {
        userId: effectiveUid,
        type: 'shop_purchase',
        itemId: item.id,
        itemName: item.name,
        amount: -item.price,
        balanceAfter: newBalance,
        createdAt: nowIso,
        timestamp: nowMs
      });

      // Also record inside user subcollection for user history views
      const userTxnRef = userRef.collection('transactions').doc();
      transaction.set(userTxnRef, {
        type: 'purchase_shop_item',
        itemId: item.id,
        itemName: item.name,
        amount: -item.price,
        balanceAfter: newBalance,
        createdAt: nowIso
      });

      return {
        newBalance,
        itemId: item.id,
        itemName: item.name,
        ownedShopItems: updatedOwnedItems,
        goldenWingsFrame: updatePayload.goldenWingsFrame,
        eagleFrame: updatePayload.eagleFrame
      };
    });

    return res.status(200).json({
      success: true,
      message: `${purchaseResult.itemName} purchased successfully!`,
      ...purchaseResult
    });

  } catch (err) {
    console.error('[Shop Purchase Error]:', err);
    const errMessage = err?.message || '';

    if (errMessage === 'INSUFFICIENT_COINS' || errMessage.includes('INSUFFICIENT_COINS')) {
      return res.status(400).json({
        success: false,
        error: 'INSUFFICIENT_COINS',
        message: 'Insufficient AX Coins'
      });
    }

    if (errMessage === 'ALREADY_OWNED' || errMessage.includes('ALREADY_OWNED')) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_OWNED',
        message: 'Already Claimed'
      });
    }

    if (errMessage === 'USER_NOT_FOUND' || errMessage.includes('USER_NOT_FOUND')) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User profile not found.'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: err.message || 'Failed to complete purchase transaction.'
    });
  }
}
