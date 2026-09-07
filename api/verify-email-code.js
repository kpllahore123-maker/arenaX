/**
 * Vercel Serverless Function: Validate 6-Digit Email Verification Code
 * Endpoint: POST /api/verify-email-code
 * Payload: { uid: string, code: string }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }
  const { uid, code } = body || {};

  if (!uid || !code) {
    return res.status(400).json({ success: false, error: 'Missing required fields: uid and code' });
  }

  try {
    let db = null;
    let auth = null;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
    const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
    const projectId = process.env.FIREBASE_PROJECT_ID || 'arenax-c1586';

    if (clientEmail && privateKey) {
      try {
        const { initializeApp, getApps, cert } = await import('firebase-admin/app');
        const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
        const { getAuth } = await import('firebase-admin/auth');
        const app = getApps().length === 0
          ? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
          : getApps()[0];
        db = getFirestore(app);
        auth = getAuth(app);
      } catch (err) {
        console.warn('[Verify Code] Admin init warning:', err.message);
      }
    }

    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Database service unavailable. Please check server configuration.'
      });
    }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }

    const data = userDoc.data() || {};
    const storedCode = data.emailVerificationCode;
    const expiry = data.emailVerificationExpiry || 0;
    const now = Date.now();

    // Check code match
    const cleanCode = String(code).trim();
    if (!storedCode || cleanCode !== String(storedCode).trim()) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_CODE',
        error: 'Invalid code, please try again'
      });
    }

    // Check expiry
    if (now > expiry) {
      return res.status(400).json({
        success: false,
        code: 'EXPIRED_CODE',
        error: 'Verification code has expired. Please request a new code.'
      });
    }

    // Success! Update Firestore profile
    await userRef.update({
      emailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpiry: null,
      verifiedAt: now
    });

    // Update Firebase Auth user state if Admin Auth is available
    if (auth) {
      try {
        await auth.updateUser(uid, { emailVerified: true });
      } catch (authErr) {
        console.warn('[Verify Code] Admin Auth updateUser error:', authErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Account verified successfully!'
    });
  } catch (err) {
    console.error('[Verify Code] Processing error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error validating code'
    });
  }
}
