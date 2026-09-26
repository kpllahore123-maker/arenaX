// Vercel Serverless Function: Admin Moderation Action Dispatcher
// Endpoint: /api/admin/apply-moderation-action

export default async function handler(req, res) {
  // 1. CORS headers
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const {
      targetUid,
      actionType,
      durationDays,
      reason,
      sendOfficialMsg,
      customMessage,
      messageTitle,
      adminUid,
      adminName,
      adminEmail
    } = req.body || {};

    if (!targetUid || !actionType) {
      return res.status(400).json({ error: 'Missing targetUid or actionType.' });
    }

    // If Firebase Admin credentials exist in serverless environment:
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
    const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
    const projectId = process.env.FIREBASE_PROJECT_ID || 'arenax-c1586';

    if (clientEmail && privateKey) {
      try {
        const { initializeApp, getApps, cert } = await import('firebase-admin/app');
        const { getFirestore, FieldValue } = await import('firebase-admin/firestore');

        const app = getApps().length === 0
          ? initializeApp({
              credential: cert({ projectId, clientEmail, privateKey })
            })
          : getApps()[0];

        const db = getFirestore(app);
        const userRef = db.collection('users').doc(targetUid);
        const userSnap = await userRef.get();

        if (userSnap.exists) {
          const userData = userSnap.data() || {};
          const prevAccountStatus = userData.accountStatus || (userData.banned ? 'banned' : userData.restricted ? 'restricted' : 'active');

          const userUpdates = {
            lastModeratedBy: adminName || 'ArenaX Administrator',
            lastModerationAt: FieldValue.serverTimestamp(),
            lastModerationAction: actionType,
            lastModerationReason: reason || ''
          };

          let newStatus = 'active';
          let endsAt = null;
          const durDays = Number(durationDays) || 0;
          if (durDays > 0) {
            endsAt = new Date(Date.now() + durDays * 24 * 60 * 60 * 1000);
          }

          if (actionType === 'warning') {
            newStatus = 'warned';
            userUpdates.accountStatus = 'warned';
            userUpdates.warningCount = (userData.warningCount || 0) + 1;
            userUpdates.lastWarning = reason;
            userUpdates.lastWarningAt = FieldValue.serverTimestamp();
          } else if (actionType === 'restriction') {
            newStatus = 'restricted';
            userUpdates.accountStatus = 'restricted';
            userUpdates.restricted = true;
            userUpdates.isRestricted = true;
            userUpdates.restrictedUntil = endsAt ? endsAt.toISOString() : null;
            userUpdates.restrictionReason = reason;
            userUpdates.restrictedAt = FieldValue.serverTimestamp();
            userUpdates.restrictedBy = adminName || 'ArenaX Administrator';
            userUpdates.banned = false;
            userUpdates.isBanned = false;
          } else if (actionType === 'temporary_block') {
            newStatus = 'temporarily_blocked';
            userUpdates.accountStatus = 'temporarily_blocked';
            userUpdates.banned = true;
            userUpdates.isBanned = true;
            userUpdates.banType = 'temporary';
            userUpdates.banUntil = endsAt ? endsAt.toISOString() : null;
            userUpdates.blockedUntil = endsAt ? endsAt.toISOString() : null;
            userUpdates.banReason = reason;
            userUpdates.bannedAt = FieldValue.serverTimestamp();
            userUpdates.bannedBy = adminName || 'ArenaX Administrator';
          } else if (actionType === 'permanent_block') {
            newStatus = 'permanently_blocked';
            userUpdates.accountStatus = 'permanently_blocked';
            userUpdates.banned = true;
            userUpdates.isBanned = true;
            userUpdates.banType = 'full';
            userUpdates.banUntil = null;
            userUpdates.blockedUntil = null;
            userUpdates.banReason = reason;
            userUpdates.banRule = reason;
            userUpdates.bannedAt = FieldValue.serverTimestamp();
            userUpdates.bannedBy = adminName || 'ArenaX Administrator';
          } else if (actionType === 'unblock') {
            newStatus = 'active';
            userUpdates.accountStatus = 'active';
            userUpdates.banned = false;
            userUpdates.isBanned = false;
            userUpdates.banType = 'none';
            userUpdates.restricted = false;
            userUpdates.isRestricted = false;
            userUpdates.blockedUntil = null;
            userUpdates.restrictedUntil = null;
            userUpdates.banUntil = null;
            userUpdates.banReason = '';
            userUpdates.restrictionReason = '';
            userUpdates.unblockedAt = FieldValue.serverTimestamp();
            userUpdates.unblockedBy = adminName || 'ArenaX Administrator';
            userUpdates.restoredAt = FieldValue.serverTimestamp();
          }

          await userRef.update(userUpdates);

          // Save moderation history
          await db.collection('moderation_history').add({
            targetUid,
            targetName: userData.name || 'Player',
            targetHandle: userData.handle || 'player',
            actionType,
            reason: reason || '',
            adminUid: adminUid || 'admin',
            adminName: adminName || 'ArenaX Administrator',
            dateTime: new Date().toISOString(),
            duration: durDays > 0 ? `${durDays} Days` : (actionType === 'permanent_block' ? 'Permanent' : 'Indefinite'),
            startsAt: new Date().toISOString(),
            endsAt: endsAt ? endsAt.toISOString() : null,
            previousStatus: prevAccountStatus,
            currentStatus: newStatus,
            officialDmSent: Boolean(sendOfficialMsg),
            officialMessage: sendOfficialMsg ? customMessage : null,
            timestamp: FieldValue.serverTimestamp()
          });

          return res.json({
            success: true,
            serverMode: 'firebase-admin',
            message: `Action '${actionType}' successfully applied to user ${targetUid}.`
          });
        }
      } catch (adminErr) {
        console.warn('Firebase Admin execution failed in serverless handler:', adminErr);
      }
    }

    // If serverless Firebase Admin is not configured or failed, inform client to use direct Firestore
    return res.json({
      success: false,
      fallbackToDirectFirestore: true,
      message: 'Serverless Firebase Admin credentials not set. Falling back to direct authenticated Firestore.'
    });
  } catch (error) {
    console.error('Moderation handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
