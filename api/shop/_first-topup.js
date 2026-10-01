import {
  setCorsHeaders,
  getFirebaseAdmin,
  getVerifiedUid
} from './_common.js';

export const DEFAULT_FIRST_TOPUP_CONFIG = {
  active: true,
  targetAudience: 'all', // 'all' | 'specific'
  targetUid: '',
  targetUserName: '',
  targetUserHandle: '',
  minTopup: 100,
  bonusReward: 150,
  rewardFrame: 'Pheonix',
  frameAsset: 'public/frame4.webm',
  hasExpiration: false,
  startDate: null,
  endDate: null,
  updatedAt: new Date().toISOString()
};

/**
 * Checks if the offer is active and within scheduled timing
 */
export function isOfferActiveAndValid(config) {
  if (!config || config.active === false) return false;
  if (config.hasExpiration) {
    const now = Date.now();
    if (config.startDate && now < new Date(config.startDate).getTime()) {
      return false;
    }
    if (config.endDate && now > new Date(config.endDate).getTime()) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if a specific UID is targeted by the offer
 */
export function isUserTargeted(config, uid) {
  if (!config || !isOfferActiveAndValid(config)) return false;
  if (config.targetAudience === 'specific') {
    return Boolean(uid && config.targetUid && String(uid).trim().toLowerCase() === String(config.targetUid).trim().toLowerCase());
  }
  return true;
}

/**
 * Status check endpoint for clients
 */
export async function firstTopupStatusHandler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { db, auth } = await getFirebaseAdmin();
    if (!db) {
      return res.status(500).json({ success: false, error: 'DATABASE_ERROR' });
    }

    // 1. Fetch current config from app_config/first_topup
    const configRef = db.collection('app_config').doc('first_topup');
    const configSnap = await configRef.get();
    let config = configSnap.exists ? configSnap.data() : { ...DEFAULT_FIRST_TOPUP_CONFIG };

    const isActive = isOfferActiveAndValid(config);

    // 2. Determine UID if authenticated
    let uid = null;
    if (auth) {
      uid = await getVerifiedUid(req, auth);
    }
    if (!uid && req.query && req.query.uid) {
      uid = String(req.query.uid).trim();
    }
    if (!uid && req.body && req.body.uid) {
      uid = String(req.body.uid).trim();
    }

    const targeted = uid ? isUserTargeted(config, uid) : (config.targetAudience === 'all' && isActive);

    let hasClaimed = false;
    let hasApprovedTopup = false;
    let qualifyingTopupAmount = 0;
    let eligibleToClaim = false;

    if (uid && db) {
      // Check user document
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const udata = userDoc.data() || {};
        hasClaimed = Boolean(
          udata.firstTopupClaimed ||
          udata.firstTopupReward?.claimed ||
          (udata.ownedShopItems && udata.ownedShopItems['first-topup'])
        );
      }

      // Check first_topup_claims collection
      if (!hasClaimed) {
        const claimDoc = await db.collection('first_topup_claims').doc(uid).get();
        if (claimDoc.exists) {
          hasClaimed = true;
        }
      }

      // Check approved deposit requests
      if (!hasClaimed) {
        const depSnap = await db.collection('deposit_requests')
          .where('userId', '==', uid)
          .where('status', '==', 'approved')
          .get();

        const minAX = Number(config.minTopup || 100);
        for (const doc of depSnap.docs) {
          const d = doc.data() || {};
          if (d.type === 'withdrawal') continue;
          const ax = Number(d.amountAX || 0);
          if (ax >= minAX) {
            hasApprovedTopup = true;
            if (ax > qualifyingTopupAmount) qualifyingTopupAmount = ax;
          }
        }
      }

      eligibleToClaim = isActive && targeted && !hasClaimed && hasApprovedTopup;
    }

    return res.status(200).json({
      success: true,
      offer: {
        active: config.active !== false,
        isCurrentlyValid: isActive,
        targetAudience: config.targetAudience || 'all',
        targetUid: config.targetUid || '',
        targetUserName: config.targetUserName || '',
        targetUserHandle: config.targetUserHandle || '',
        minTopup: config.minTopup || 100,
        bonusReward: config.bonusReward || 150,
        rewardFrame: config.rewardFrame || 'Pheonix',
        frameAsset: config.frameAsset || 'public/frame4.webm',
        hasExpiration: Boolean(config.hasExpiration),
        startDate: config.startDate || null,
        endDate: config.endDate || null
      },
      userStatus: {
        authenticated: Boolean(uid),
        uid: uid || null,
        isTargeted: targeted,
        hasClaimed: hasClaimed,
        hasApprovedTopup: hasApprovedTopup,
        qualifyingTopupAmount: qualifyingTopupAmount,
        eligibleToClaim: eligibleToClaim
      }
    });
  } catch (err) {
    console.error('[First Topup Status Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Status check failed' });
  }
}

/**
 * Atomic Server-Authoritative First Topup Claim Endpoint
 */
export async function firstTopupClaimHandler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const { db, auth } = await getFirebaseAdmin();
    if (!db || !auth) {
      return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: 'Backend database service unavailable.' });
    }

    // 1. Authenticate & verify ArenaX user session strictly with Bearer token
    const verifiedUid = await getVerifiedUid(req, auth);
    if (!verifiedUid) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Unauthorized. Valid login session required to claim rewards.'
      });
    }

    // 2. Fetch authoritative configuration from app_config/first_topup
    const configRef = db.collection('app_config').doc('first_topup');
    const configSnap = await configRef.get();
    const config = configSnap.exists ? configSnap.data() : { ...DEFAULT_FIRST_TOPUP_CONFIG };

    if (!isOfferActiveAndValid(config)) {
      return res.status(400).json({
        success: false,
        error: 'OFFER_INACTIVE',
        message: 'The First Topup offer is currently inactive or has expired.'
      });
    }

    if (!isUserTargeted(config, verifiedUid)) {
      return res.status(403).json({
        success: false,
        error: 'NOT_TARGETED',
        message: 'You are not eligible for this specific First Topup offer.'
      });
    }

    const minTopupRequired = Number(config.minTopup || 100);
    const bonusCoins = Number(config.bonusReward || 150);
    const rewardFrameId = 'pheonix';
    const rewardFrameName = config.rewardFrame || 'Pheonix';
    const frameAsset = config.frameAsset || 'public/frame4.webm';

    // 3. Verify user has a qualifying approved top-up in deposit_requests
    const depSnap = await db.collection('deposit_requests')
      .where('userId', '==', verifiedUid)
      .where('status', '==', 'approved')
      .get();

    let qualifyingDeposit = null;
    for (const doc of depSnap.docs) {
      const d = doc.data() || {};
      if (d.type === 'withdrawal') continue;
      const ax = Number(d.amountAX || 0);
      if (ax >= minTopupRequired) {
        qualifyingDeposit = { id: doc.id, ...d };
        break;
      }
    }

    if (!qualifyingDeposit) {
      return res.status(400).json({
        success: false,
        error: 'NOT_QUALIFIED',
        message: `No approved top-up of ${minTopupRequired} AX Coins or more was found on your account. Please complete and have your top-up approved first.`
      });
    }

    const userRef = db.collection('users').doc(verifiedUid);
    const claimRef = db.collection('first_topup_claims').doc(verifiedUid);

    // 4. Execute atomic Firestore transaction
    const claimResult = await db.runTransaction(async (transaction) => {
      const [userDoc, claimDoc] = await Promise.all([
        transaction.get(userRef),
        transaction.get(claimRef)
      ]);

      if (!userDoc.exists) {
        throw new Error('USER_NOT_FOUND');
      }

      if (claimDoc.exists) {
        throw new Error('ALREADY_CLAIMED');
      }

      const userData = userDoc.data() || {};
      if (userData.firstTopupClaimed || userData.firstTopupReward?.claimed) {
        throw new Error('ALREADY_CLAIMED');
      }

      const currentBalance = Number(userData.balance || 0);
      const newBalance = currentBalance + bonusCoins;
      const nowIso = new Date().toISOString();

      const existingOwned = userData.ownedShopItems || {};
      const updatedOwnedItems = {
        ...existingOwned,
        [rewardFrameId]: {
          id: rewardFrameId,
          name: rewardFrameName,
          price: 0,
          source: 'first_topup_reward',
          claimedAt: nowIso
        }
      };

      const updatePayload = {
        balance: newBalance,
        firstTopupClaimed: true,
        firstTopupClaimedAt: nowIso,
        firstTopupReward: {
          claimed: true,
          coins: bonusCoins,
          frame: rewardFrameName,
          qualifyingDepositId: qualifyingDeposit.id,
          claimedAt: nowIso
        },
        hasFrame: true,
        frameEquipped: true,
        equippedFrameId: rewardFrameId,
        pheonixFrame: {
          id: rewardFrameId,
          name: rewardFrameName,
          asset: frameAsset,
          permanentUnlocked: true,
          status: 'permanent',
          equipped: true,
          purchasedAt: nowIso,
          claimedAt: nowIso,
          source: 'first_topup_reward'
        },
        ownedShopItems: updatedOwnedItems,
        updatedAt: nowIso
      };

      if (userData.goldenWingsFrame) updatePayload['goldenWingsFrame.equipped'] = false;
      if (userData.eagleFrame) updatePayload['eagleFrame.equipped'] = false;

      // 1. Record claim in first_topup_claims
      transaction.set(claimRef, {
        userId: verifiedUid,
        userName: userData.name || '',
        userHandle: userData.handle || '',
        userAvatar: userData.av || userData.avatar || '',
        bonusCoins: bonusCoins,
        rewardFrame: rewardFrameName,
        qualifyingDepositId: qualifyingDeposit.id,
        qualifyingAmountAX: qualifyingDeposit.amountAX || 0,
        claimedAt: nowIso
      });

      // 2. Update user profile atomically
      transaction.update(userRef, updatePayload);

      return {
        newBalance,
        bonusCoins,
        rewardFrameName,
        frameAsset,
        claimedAt: nowIso,
        pheonixFrame: updatePayload.pheonixFrame,
        ownedShopItems: updatedOwnedItems
      };
    });

    // 5. Post-transaction audit logging & in-app notification
    try {
      await db.collection('reward_transactions').add({
        userId: verifiedUid,
        type: 'first_topup_reward',
        rewardCoins: bonusCoins,
        rewardFrame: rewardFrameName,
        timestamp: new Date().toISOString()
      });

      await db.collection('admin_audit_logs').add({
        action: 'first_topup_claim',
        userId: verifiedUid,
        coinsGranted: bonusCoins,
        frameGranted: rewardFrameName,
        qualifyingDepositId: qualifyingDeposit.id,
        timestamp: new Date().toISOString()
      });

      await db.collection('notifications').add({
        userId: verifiedUid,
        title: '🎁 First Topup Reward Claimed!',
        body: `Congratulations! ${bonusCoins} AX Coins and the permanent Phoenix Avatar Frame have been added to your profile!`,
        createdAt: new Date(),
        read: false
      });
    } catch (e) {
      console.warn('[First Topup Audit Log Warning]:', e.message);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully claimed ${bonusCoins} AX Coins and the ${rewardFrameName} Avatar Frame!`,
      newBalance: claimResult.newBalance,
      bonusCoins: claimResult.bonusCoins,
      rewardFrame: claimResult.rewardFrameName,
      pheonixFrame: claimResult.pheonixFrame,
      ownedShopItems: claimResult.ownedShopItems
    });
  } catch (err) {
    console.error('[First Topup Claim Error]:', err);
    if (err.message === 'ALREADY_CLAIMED') {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_CLAIMED',
        message: 'You have already claimed your First Topup Benefits reward.'
      });
    }
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User profile not found.'
      });
    }
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: err.message || 'Failed to claim First Topup reward.'
    });
  }
}

/**
 * Admin Configuration Endpoint
 */
export async function firstTopupConfigHandler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { db, auth } = await getFirebaseAdmin();
    if (!db) {
      return res.status(500).json({ success: false, error: 'DATABASE_ERROR' });
    }

    if (req.method === 'GET') {
      const configRef = db.collection('app_config').doc('first_topup');
      const snap = await configRef.get();
      const config = snap.exists ? snap.data() : { ...DEFAULT_FIRST_TOPUP_CONFIG };
      return res.status(200).json({ success: true, config });
    }

    if (req.method === 'POST') {
      let callerUid = null;
      let callerEmail = null;
      if (auth) {
        const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const decoded = await auth.verifyIdToken(authHeader.split(' ')[1]);
            callerUid = decoded.uid;
            callerEmail = decoded.email;
          } catch (_) {}
        }
      }

      const body = req.body || {};
      const validPins = ["arenax2026", "arena2026", "arenaxmaster", "arenaxadmin", "admin123", "axpass2026", "master2026"];
      const isPasscodeValid = body.passcode && validPins.includes(String(body.passcode).trim().toLowerCase());
      const isOwner = callerEmail && ['kpllahore123@gmail.com', 'admin@arenax.com', 'admin@arenax.gg'].includes(callerEmail.toLowerCase());

      if (!isPasscodeValid && !isOwner && !callerUid) {
        return res.status(403).json({ success: false, error: 'UNAUTHORIZED_ADMIN', message: 'Authorized admin session required.' });
      }

      const updateData = {
        active: body.active !== undefined ? Boolean(body.active) : true,
        targetAudience: body.targetAudience === 'specific' ? 'specific' : 'all',
        targetUid: body.targetUid ? String(body.targetUid).trim() : '',
        targetUserName: body.targetUserName ? String(body.targetUserName).trim() : '',
        targetUserHandle: body.targetUserHandle ? String(body.targetUserHandle).trim() : '',
        minTopup: Number(body.minTopup || 100),
        bonusReward: Number(body.bonusReward || 150),
        rewardFrame: body.rewardFrame ? String(body.rewardFrame).trim() : 'Pheonix',
        frameAsset: 'public/frame4.webm',
        hasExpiration: Boolean(body.hasExpiration),
        startDate: body.startDate ? String(body.startDate) : null,
        endDate: body.endDate ? String(body.endDate) : null,
        updatedAt: new Date().toISOString(),
        updatedBy: callerUid || 'admin_console'
      };

      if (updateData.targetAudience === 'specific') {
        if (!updateData.targetUid) {
          return res.status(400).json({ success: false, error: 'TARGET_USER_REQUIRED', message: 'Please specify a target user ID.' });
        }
        const targetDoc = await db.collection('users').doc(updateData.targetUid).get();
        if (!targetDoc.exists) {
          return res.status(404).json({ success: false, error: 'TARGET_USER_NOT_FOUND', message: 'Target user does not exist in ArenaX.' });
        }
        const targetData = targetDoc.data() || {};
        updateData.targetUserName = targetData.name || updateData.targetUserName;
        updateData.targetUserHandle = targetData.handle || updateData.targetUserHandle;
      }

      await db.collection('app_config').doc('first_topup').set(updateData, { merge: true });

      try {
        await db.collection('admin_audit_logs').add({
          action: 'update_first_topup_offer',
          adminUid: callerUid || 'master_admin',
          adminEmail: callerEmail || 'admin@arenax.com',
          details: updateData,
          timestamp: new Date().toISOString()
        });
      } catch (_) {}

      return res.status(200).json({ success: true, message: 'First Topup configuration updated successfully.', config: updateData });
    }

    return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });
  } catch (err) {
    console.error('[First Topup Config Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Config operation failed.' });
  }
}
