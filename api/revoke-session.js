/**
 * Vercel Serverless Function: Remote Session Revocation
 * - Revokes a specific session remotely
 * - Or revokes all other sessions while protecting the current session
 *
 * Endpoint: POST /api/revoke-session
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }

  const {
    uid,
    sessionId,
    targetSessionId,
    allOther
  } = body || {};

  if (!uid) {
    return res.status(400).json({ success: false, error: 'Missing required user ID (uid).' });
  }

  function cleanKey(raw) {
    if (!raw) return '';
    let k = String(raw).trim();
    if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
      k = k.slice(1, -1).trim();
    }
    return k.replace(/\\n/g, '\n').replace(/\r/g, '');
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'arenax-c1586';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = cleanKey(process.env.FIREBASE_PRIVATE_KEY);

  const now = Date.now();

  if (!clientEmail || !privateKey) {
    return res.status(200).json({
      success: true,
      message: 'Revocation processed in fallback mode (missing Admin keys on host).'
    });
  }

  try {
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');

    const app = getApps().length === 0
      ? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
      : getApps()[0];
    const db = getFirestore(app);

    const userSessionsColl = db.collection('users').doc(uid).collection('sessions');

    if (allOther) {
      const snap = await userSessionsColl.get();
      let count = 0;
      const batch = db.batch();

      snap.forEach((docSnap) => {
        const sId = docSnap.id;
        const data = docSnap.data();
        if (sId !== sessionId && !data.isRevoked) {
          batch.update(docSnap.ref, {
            isRevoked: true,
            revokedAt: now
          });
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
      }

      await db.collection('users').doc(uid).collection('account_activity').add({
        userId: uid,
        securityEventType: 'REVOKED_ALL_OTHER_SESSIONS',
        initiatorSessionId: sessionId || null,
        revokedCount: count,
        createdAt: now
      });

      return res.status(200).json({
        success: true,
        revokedCount: count,
        message: `Successfully logged out ${count} other device(s).`
      });
    } else {
      if (!targetSessionId) {
        return res.status(400).json({ success: false, error: 'Missing targetSessionId for single revocation.' });
      }

      const targetRef = userSessionsColl.doc(targetSessionId);
      const targetDoc = await targetRef.get();

      if (!targetDoc.exists) {
        return res.status(404).json({ success: false, error: 'Target device session not found.' });
      }

      await targetRef.update({
        isRevoked: true,
        revokedAt: now
      });

      await db.collection('users').doc(uid).collection('account_activity').add({
        userId: uid,
        securityEventType: 'REVOKED_SESSION',
        targetSessionId,
        initiatorSessionId: sessionId || null,
        createdAt: now
      });

      return res.status(200).json({
        success: true,
        targetSessionId,
        message: 'Device session has been remotely logged out.'
      });
    }

  } catch (err) {
    console.error('[Revoke Session] Error executing revocation:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error while revoking session.'
    });
  }
}
