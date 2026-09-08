/**
 * Vercel Serverless Function: Validate Token & Complete 2FA Login Verification
 * Endpoint:
 *   - GET /api/complete-login-verification?token=XYZ
 *   - POST /api/complete-login-verification { token: "XYZ" }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let db = null;
    let auth = null;
    let initError = null;

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

    if (!clientEmail || !privateKey) {
      return res.status(500).json({
        success: false,
        valid: false,
        error: 'Backend authentication service unavailable. Firebase environment variables are missing.'
      });
    }

    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const { getAuth } = await import('firebase-admin/auth');

    try {
      const credential = cert({ projectId, clientEmail, privateKey });
      const app = getApps().length === 0
        ? initializeApp({ credential })
        : getApps()[0];
      db = getFirestore(app);
      auth = getAuth(app);
    } catch (err) {
      initError = err.message;
      console.warn('[2FA Verification] Admin init warning:', err.message);
    }

    if (!db || !auth) {
      return res.status(500).json({
        success: false,
        valid: false,
        error: 'Backend authentication service unavailable: ' + (initError || 'Check server configuration.')
      });
    }

    // Handle token from query or body
    let token = req.query?.token;
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {}
      }
      token = body?.token || token;
    }

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'Missing or invalid login verification token.'
      });
    }

    const tokenRef = db.collection('login_verifications').doc(token.trim());
    const tokenDoc = await tokenRef.get();

    if (!tokenDoc.exists) {
      return res.status(404).json({
        success: false,
        valid: false,
        error: 'This login verification link is invalid or has expired.'
      });
    }

    const verifyData = tokenDoc.data() || {};
    const now = Date.now();

    if (verifyData.used) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'This login verification link has already been used. Please try logging in again.'
      });
    }

    const expiryTime = typeof verifyData.expiry === 'number' 
      ? verifyData.expiry 
      : (verifyData.expiry?.toMillis ? verifyData.expiry.toMillis() : 0);

    if (now > (expiryTime || 0)) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'This login verification link has expired (valid for 10 minutes). Please try logging in again.'
      });
    }

    // Mark token as consumed and verified
    await tokenRef.update({
      used: true,
      verifiedAt: now
    });

    const maskedEmail = verifyData.email 
      ? verifyData.email.replace(/(.{2})(.*)(?=@)/, '$1***') 
      : 'your email';

    return res.status(200).json({
      success: true,
      valid: true,
      message: 'Login successfully confirmed!',
      uid: verifyData.uid || null,
      email: maskedEmail
    });

  } catch (error) {
    console.error('[2FA Verification] Execution error:', error);
    return res.status(500).json({
      success: false,
      valid: false,
      error: error.message || 'Internal server error occurred while verifying login.'
    });
  }
}
