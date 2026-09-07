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

    const fallbackEmail = 'firebase-adminsdk-fbsvc@arenax-c1586.iam.gserviceaccount.com';
    const fallbackKey = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDEqnhWmyFfBQV8\nQ0DM7hw/T2QUq4eSsQGok4vWCBHNpZy5vcvCYpVMwtVNjFahwreH7UkMR8hu7GdK\nPMrF9rmhfvyflPoJ9mMN2YC6tUegVwT2wC2qKanvP8v2e86L01OOYoTxZlu3C1O0\nrxyodJc8i7l3LXW7MhKR3f9m0WVchCfYxl6/KybIxDf0knaR+DDJGtbgRxoV+qXo\nXzXMkz0cRl2Lzv2gkS5Yog+UOzgS8Qn7S+eOYxyIr1AwRXuNs27MfAPVhwJNEaKP\nMWqEiL5UB3Wmsyb1+1MPx8XxZr35VWh+xBdyxc754VymcvNOxN5JwGB2MCktZlrq\ny+15UtAPAgMBAAECggEAA+ObHZtTvZ1LznlF/sd2p4naYM5DkBMQBVVlnoXqVDbC\nMqoeLWnlqe7waOgtjmVbW8TFfQiuXgMux7kMCX4njZoFROKdTzUgIFX8xbRwBiuy\nXW7PeF36jlCkp+sq2nkDXf10w5FSnvwKW7hayLoFg5z/veuYOGt1Eo1hT5c0ee/a\nKQFg60AtlXEr4Z1qCeFyYJlr/HevHJ0jT2rAcqwa0We/tVeeWkn6oXKoHH+S7oFX\nXdmWFbGL+JPUL8VJqni/quo7sN4PWyzyXd4mA7/+58zc8tw8Ncrd7paEd6EUJN8B\nzbJVLSO7L1o1VQ1V9wbUxuDPV/Zw6IsrqEeyyVGEAQKBgQD9k2PcLFdFfl0zprl3\nz4WKXMGSqiCNcqERvGZs/ozhNx/xeAdKn9/VvomYA8p4pAurc+m+mBnH9ksrsu6+\nbAHkGEZvYleUYqzW+haTEzOuuB/ZAfbNsb7XGAbnJqwf6U+Y99K8Lu9X77Fh3sG4\n9MN8rf9LQNvK28nFNh4VZ67O4QKBgQDGi8wBqLwC8ieLp6pyQcJmzydffh3w7Mg2\nCZbV9KG4CpGos4SZV4pyygnv1HQFV+2w3IdPB73wmMBvoWStYG0rKlozcUJZINo4\nEEMpPZO/DoSy0lQ8a+y8eHRqOEAxbjcPY1w+7L6yeuZc5sUs2Q7aKN91c2WUP2xY\n+YwNmLEs7wKBgQC7BIx+4xkOgO8eXBWn3p7/9/8wO1c821Ed8pScSHUA2ZYukjbW\ne+krDJcQTaNzrJGKxzeawTUqfGTeet6IBMK0Ro8UMTSklM4i01n46Q2SC+w5MbCj\n7jbxDqBwtN33vyxchlKfRgJyGa76nr7DuYnAF9gU2WYBTG6Yi5xObyTHIQKBgGg5\njJ82V3PocG/0VRpjgMx9ZDrRtp/5fGQ5hm/MWnSFP89iZXIlrSzy+GJokXsYnFLi\ngTkwZDn/xc0T2QjWfJhTRESK6PxmrYcOqmLky0FZOrmwhb2uHfkV9m6oFrKcG9U9\nIHh7yONidrk//zO6wfwtxpgeOq2m2ZafcTDV/fQLAoGAYqjdET23LQYScwgVh0PB\nBL6eWOB0BNYp0ffWksCs7Cikw2muLurOdIKLLh3/lyMNUgFOhISCjpsgK7HqR9GB\npnzYVIFu/MiOcbci5JhVh0K5QgEl0urgGq8Rxi+Oxg0U2N4xaw2gwV5M4kVK/vSU\n1qfvkRsg2KdDUOudldguIbE=\n-----END PRIVATE KEY-----\n';

    function cleanKey(raw) {
      if (!raw) return '';
      let k = String(raw).trim();
      if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
        k = k.slice(1, -1).trim();
      }
      return k.replace(/\\n/g, '\n').replace(/\r/g, '');
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || 'arenax-c1586';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || fallbackEmail;
    let privateKey = cleanKey(process.env.FIREBASE_PRIVATE_KEY) || cleanKey(fallbackKey);

    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const { getAuth } = await import('firebase-admin/auth');

    let credential = null;
    try {
      credential = cert({ projectId, clientEmail, privateKey });
    } catch (certErr) {
      console.warn('[Complete Reset] Primary key parse failed, trying fallback:', certErr.message);
      try {
        credential = cert({ projectId: 'arenax-c1586', clientEmail: fallbackEmail, privateKey: cleanKey(fallbackKey) });
      } catch (fbErr) {
        initError = fbErr.message;
      }
    }

    if (credential) {
      try {
        const app = getApps().length === 0
          ? initializeApp({ credential })
          : getApps()[0];
        db = getFirestore(app);
        auth = getAuth(app);
      } catch (err) {
        initError = err.message;
        console.warn('[Complete Reset] Admin init warning:', err.message);
      }
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
