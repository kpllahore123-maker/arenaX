import {
  setCorsHeaders,
  getFirebaseAdmin,
  getVerifiedUid
} from './_common.js';

/**
 * Vercel Serverless Function: Authoritative ArenaX Shop Equip Endpoint
 * Endpoint: POST /api/shop/equip
 * 
 * Verifies authenticated user and verifies ownership from Firestore database
 * before allowing user to equip any avatar frame.
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
    const requestedFrameId = body && (body.frameId || body.itemId) ? String(body.frameId || body.itemId).trim().toLowerCase() : 'none';

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
        message: 'Missing user identification credentials.'
      });
    }

    // 5. Read user document directly from Firestore
    const userRef = db.collection('users').doc(effectiveUid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User profile not found in database.'
      });
    }

    const userData = userSnap.data() || {};
    const ownedItems = userData.ownedShopItems || {};

    // 6. Authoritative ownership verification
    const isDefault = requestedFrameId === 'none' || requestedFrameId === 'default';
    const isGoldenWings = requestedFrameId === 'golden-wings';
    const isEagle = requestedFrameId === 'eagle';
    const isPheonix = requestedFrameId === 'pheonix';

    if (!isDefault) {
      let isOwned = false;

      if (isGoldenWings) {
        isOwned = Boolean(
          userData.goldenWingsFrame?.permanentUnlocked ||
          userData.goldenWingsFrame?.status === 'permanent' ||
          ownedItems['golden-wings']
        );
      } else if (isEagle) {
        isOwned = Boolean(
          userData.eagleFrame?.permanentUnlocked ||
          userData.eagleFrame?.status === 'permanent' ||
          ownedItems['eagle'] ||
          ownedItems['item-frame-eagle']
        );
      } else if (isPheonix) {
        isOwned = Boolean(
          userData.pheonixFrame?.permanentUnlocked ||
          userData.pheonixFrame?.status === 'permanent' ||
          ownedItems['pheonix'] ||
          ownedItems['item-frame-pheonix']
        );
      } else {
        // Any custom or future frame item
        isOwned = Boolean(ownedItems[requestedFrameId]);
      }

      if (!isOwned) {
        return res.status(403).json({
          success: false,
          error: 'FRAME_NOT_OWNED',
          message: 'You do not own this avatar frame. Purchase it from the Shop first.'
        });
      }
    }

    // 7. Atomically persist the equipped frame
    const nowIso = new Date().toISOString();
    const updatePayload = {
      updatedAt: nowIso
    };

    if (isDefault) {
      updatePayload.equippedFrameId = 'none';
      updatePayload.hasFrame = false;
      updatePayload.frameEquipped = false;
      if (userData.goldenWingsFrame) {
        updatePayload['goldenWingsFrame.equipped'] = false;
      }
      if (userData.eagleFrame) {
        updatePayload['eagleFrame.equipped'] = false;
      }
      if (userData.pheonixFrame) {
        updatePayload['pheonixFrame.equipped'] = false;
      }
    } else if (isGoldenWings) {
      updatePayload.equippedFrameId = 'golden-wings';
      updatePayload.hasFrame = true;
      updatePayload.frameEquipped = true;
      updatePayload['goldenWingsFrame.equipped'] = true;
      if (userData.eagleFrame) {
        updatePayload['eagleFrame.equipped'] = false;
      }
      if (userData.pheonixFrame) {
        updatePayload['pheonixFrame.equipped'] = false;
      }
    } else if (isEagle) {
      updatePayload.equippedFrameId = 'eagle';
      updatePayload.hasFrame = true;
      updatePayload.frameEquipped = true;
      updatePayload['eagleFrame.equipped'] = true;
      if (userData.goldenWingsFrame) {
        updatePayload['goldenWingsFrame.equipped'] = false;
      }
      if (userData.pheonixFrame) {
        updatePayload['pheonixFrame.equipped'] = false;
      }
    } else if (isPheonix) {
      updatePayload.equippedFrameId = 'pheonix';
      updatePayload.hasFrame = true;
      updatePayload.frameEquipped = true;
      updatePayload['pheonixFrame.equipped'] = true;
      if (userData.goldenWingsFrame) {
        updatePayload['goldenWingsFrame.equipped'] = false;
      }
      if (userData.eagleFrame) {
        updatePayload['eagleFrame.equipped'] = false;
      }
    } else {
      updatePayload.equippedFrameId = requestedFrameId;
      updatePayload.hasFrame = true;
      updatePayload.frameEquipped = true;
      if (userData.goldenWingsFrame) updatePayload['goldenWingsFrame.equipped'] = false;
      if (userData.eagleFrame) updatePayload['eagleFrame.equipped'] = false;
      if (userData.pheonixFrame) updatePayload['pheonixFrame.equipped'] = false;
    }

    await userRef.update(updatePayload);

    return res.status(200).json({
      success: true,
      equippedFrameId: isDefault ? 'none' : requestedFrameId,
      message: 'Avatar frame successfully equipped.'
    });

  } catch (err) {
    console.error('[Shop Equip Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: err.message || 'Failed to equip avatar frame.'
    });
  }
}
