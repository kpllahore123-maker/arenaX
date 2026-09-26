/**
 * Vercel Serverless Function: Validate Token & Complete Password Reset
 * Endpoint:
 *   - GET /api/complete-password-reset?token=XYZ (validates token only)
 *   - POST /api/complete-password-reset (sets new password and consumes token)
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
      console.warn('[Complete Reset] Admin init warning:', err.message);
    }

    if (!db || !auth) {
      return res.status(500).json({
        success: false,
        error: 'Backend authentication service unavailable: ' + (initError || 'Check server configuration.')
      });
    }

    // Handle token query or body
    let token = req.query?.token;
    let newPassword = null;

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {}
      }
      token = body?.token || token;
      newPassword = body?.newPassword;
    }

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'Missing or invalid reset token.'
      });
    }

    const tokenRef = db.collection('password_resets').doc(token.trim());
    const tokenDoc = await tokenRef.get();

    if (!tokenDoc.exists) {
      return res.status(404).json({
        success: false,
        valid: false,
        error: 'This password reset link is invalid or has expired.'
      });
    }

    const resetData = tokenDoc.data() || {};
    const now = Date.now();

    if (resetData.used) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'This password reset link has already been used. Please request a new one.'
      });
    }

    if (now > (resetData.expiry || 0)) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'This password reset link has expired (valid for 30 minutes). Please request a new link.'
      });
    }

    // If GET request, token is valid - return confirmation
    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        valid: true,
        email: resetData.email ? resetData.email.replace(/(.{2})(.*)(?=@)/, '$1***') : null
      });
    }

    // For POST request: Set new password
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters in length.'
      });
    }

    // Fetch user by email
    const user = await auth.getUserByEmail(resetData.email);
    if (!user || !user.uid) {
      return res.status(404).json({
        success: false,
        error: 'User account associated with this reset link no longer exists.'
      });
    }

    // Update password via Firebase Admin Auth SDK
    await auth.updateUser(user.uid, {
      password: newPassword
    });

    // Mark token as used to prevent reuse
    await tokenRef.update({
      used: true,
      usedAt: now
    });

    console.log(`[Password Reset] Password updated successfully for user ${user.uid} (${resetData.email})`);

    return res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully! You can now log in with your new password.'
    });
  } catch (err) {
    console.error('[Complete Password Reset] Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'An unexpected error occurred while resetting your password.'
    });
  }
}
