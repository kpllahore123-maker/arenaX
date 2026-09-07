import crypto from 'crypto';
import { sendMailInternal } from './send-email.js';

/**
 * Vercel Serverless Function: Request Password Reset Link
 * Endpoint: POST /api/request-password-reset
 * Payload: { email: string, origin?: string }
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
  const { email, origin } = body || {};

  if (!email) {
    return res.status(400).json({ success: false, error: 'Missing required field: email' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    let db = null;
    let auth = null;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@arenax-c1586.iam.gserviceaccount.com';
    const rawKey = process.env.FIREBASE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDEqnhWmyFfBQV8\nQ0DM7hw/T2QUq4eSsQGok4vWCBHNpZy5vcvCYpVMwtVNjFahwreH7UkMR8hu7GdK\nPMrF9rmhfvyflPoJ9mMN2YC6tUegVwT2wC2qKanvP8v2e86L01OOYoTxZlu3C1O0\nrxyodJc8i7l3LXW7MhKR3f9m0WVchCfYxl6/KybIxDf0knaR+DDJGtbgRxoV+qXo\nXzXMkz0cRl2Lzv2gkS5Yog+UOzgS8Qn7S+eOYxyIr1AwRXuNs27MfAPVhwJNEaKP\nMWqEiL5UB3Wmsyb1+1MPx8XxZr35VWh+xBdyxc754VymcvNOxN5JwGB2MCktZlrq\ny+15UtAPAgMBAAECggEAA+ObHZtTvZ1LznlF/sd2p4naYM5DkBMQBVVlnoXqVDbC\nMqoeLWnlqe7waOgtjmVbW8TFfQiuXgMux7kMCX4njZoFROKdTzUgIFX8xbRwBiuy\nXW7PeF36jlCkp+sq2nkDXf10w5FSnvwKW7hayLoFg5z/veuYOGt1Eo1hT5c0ee/a\nKQFg60AtlXEr4Z1qCeFyYJlr/HevHJ0jT2rAcqwa0We/tVeeWkn6oXKoHH+S7oFX\nXdmWFbGL+JPUL8VJqni/quo7sN4PWyzyXd4mA7/+58zc8tw8Ncrd7paEd6EUJN8B\nzbJVLSO7L1o1VQ1V9wbUxuDPV/Zw6IsrqEeyyVGEAQKBgQD9k2PcLFdFfl0zprl3\nz4WKXMGSqiCNcqERvGZs/ozhNx/xeAdKn9/VvomYA8p4pAurc+m+mBnH9ksrsu6+\nbAHkGEZvYleUYqzW+haTEzOuuB/ZAfbNsb7XGAbnJqwf6U+Y99K8Lu9X77Fh3sG4\n9MN8rf9LQNvK28nFNh4VZ67O4QKBgQDGi8wBqLwC8ieLp6pyQcJmzydffh3w7Mg2\nCZbV9KG4CpGos4SZV4pyygnv1HQFV+2w3IdPB73wmMBvoWStYG0rKlozcUJZINo4\nEEMpPZO/DoSy0lQ8a+y8eHRqOEAxbjcPY1w+7L6yeuZc5sUs2Q7aKN91c2WUP2xY\n+YwNmLEs7wKBgQC7BIx+4xkOgO8eXBWn3p7/9/8wO1c821Ed8pScSHUA2ZYukjbW\ne+krDJcQTaNzrJGKxzeawTUqfGTeet6IBMK0Ro8UMTSklM4i01n46Q2SC+w5MbCj\n7jbxDqBwtN33vyxchlKfRgJyGa76nr7DuYnAF9gU2WYBTG6Yi5xObyTHIQKBgGg5\njJ82V3PocG/0VRpjgMx9ZDrRtp/5fGQ5hm/MWnSFP89iZXIlrSzy+GJokXsYnFLi\ngTkwZDn/xc0T2QjWfJhTRESK6PxmrYcOqmLky0FZOrmwhb2uHfkV9m6oFrKcG9U9\nIHh7yONidrk//zO6wfwtxpgeOq2m2ZafcTDV/fQLAoGAYqjdET23LQYScwgVh0PB\nBL6eWOB0BNYp0ffWksCs7Cikw2muLurOdIKLLh3/lyMNUgFOhISCjpsgK7HqR9GB\npnzYVIFu/MiOcbci5JhVh0K5QgEl0urgGq8Rxi+Oxg0U2N4xaw2gwV5M4kVK/vSU\n1qfvkRsg2KdDUOudldguIbE=\n-----END PRIVATE KEY-----\n';
    const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
    const projectId = process.env.FIREBASE_PROJECT_ID || 'arenax-c1586';

    if (clientEmail && privateKey) {
      try {
        const { initializeApp, getApps, cert } = await import('firebase-admin/app');
        const { getFirestore } = await import('firebase-admin/firestore');
        const { getAuth } = await import('firebase-admin/auth');
        const app = getApps().length === 0
          ? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
          : getApps()[0];
        db = getFirestore(app);
        auth = getAuth(app);
      } catch (err) {
        console.warn('[Password Reset] Admin init error:', err.message);
      }
    }

    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Database service unavailable. Please check server configuration.'
      });
    }

    // Rate Limiting: max 3 requests per 10 minutes per email
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;

    const recentResetsSnapshot = await db.collection('password_resets')
      .where('email', '==', cleanEmail)
      .get();

    const recentCount = recentResetsSnapshot.docs.filter(
      d => (d.data().createdAt || 0) >= tenMinutesAgo
    ).length;

    if (recentCount >= 3) {
      return res.status(429).json({
        success: false,
        error: 'Too many password reset requests for this email. Please wait 10 minutes before requesting again.'
      });
    }

    // Verify user exists in Firebase Auth
    let userRecord = null;
    if (auth) {
      try {
        userRecord = await auth.getUserByEmail(cleanEmail);
      } catch (authErr) {
        if (authErr.code === 'auth/user-not-found') {
          return res.status(404).json({
            success: false,
            error: 'No registered account found with this email address.'
          });
        }
      }
    }

    // 2. Generate secure cryptographically random reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = now + 30 * 60 * 1000; // 30 minutes from now

    // 3. Store in Firestore under password_resets/{token}
    await db.collection('password_resets').doc(token).set({
      email: cleanEmail,
      expiry,
      used: false,
      createdAt: now
    });

    // 4. Construct reset link URL
    // Default to https://arenax.cyou/reset-password?token=... or request origin
    let baseOrigin = 'https://arenax.cyou';
    if (origin && typeof origin === 'string' && (origin.startsWith('http://') || origin.startsWith('https://'))) {
      baseOrigin = origin.replace(/\/+$/, '');
    }
    const resetUrl = `${baseOrigin}/reset-password?token=${token}`;

    const displayName = userRecord?.displayName || cleanEmail.split('@')[0];

    // 5. Build branded dark (#0a0c12) + gold (#f0c040) HTML email template
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your ArenaX Password</title>
</head>
<body style="margin:0;padding:0;background-color:#05070a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#05070a;padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#0a0c12;border:1px solid #1f2538;border-radius:18px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
          <!-- Header Banner -->
          <tr>
            <td align="center" style="padding:32px 24px 20px 24px;background:linear-gradient(180deg,#121624 0%,#0a0c12 100%);border-bottom:1px solid #1a2030;">
              <div style="display:inline-block;padding:8px 16px;border-radius:30px;background-color:#161c2b;border:1px solid #28334d;margin-bottom:12px;">
                <span style="color:#f0c040;font-weight:900;font-size:16px;letter-spacing:2px;text-transform:uppercase;">ARENAX ESPORTS</span>
              </div>
              <h1 style="margin:8px 0 0 0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:0.5px;">Password Reset Request</h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px 28px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                Hello <strong style="color:#ffffff;">${displayName}</strong>,
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#94a3b8;">
                We received a request to reset the password for your ArenaX Esports account. Click the button below to choose a new password:
              </p>

              <!-- Prominent Gold Reset Password Button -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#f0c040 0%,#d4a017 100%);color:#000000;font-size:15px;font-weight:900;letter-spacing:1px;text-decoration:none;border-radius:50px;box-shadow:0 6px 20px rgba(240,192,64,0.35);text-transform:uppercase;">
                  Reset Password
                </a>
              </div>

              <div style="background-color:#0d111a;border-left:3px solid #f0c040;padding:14px 16px;border-radius:6px;margin:24px 0;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#cbd5e1;">
                  ⏳ <strong>This link expires in 30 minutes.</strong>
                </p>
                <p style="margin:8px 0 0 0;font-size:12px;line-height:1.4;color:#64748b;">
                  If you didn't request this, you can safely ignore this email — your password will remain unchanged.
                </p>
              </div>

              <p style="margin:24px 0 6px 0;font-size:11px;color:#64748b;">
                Having trouble clicking the button? Copy and paste this link into your browser:
              </p>
              <p style="margin:0;font-size:11px;word-break:break-all;color:#94a3b8;">
                <a href="${resetUrl}" style="color:#f0c040;text-decoration:underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px;background-color:#07080d;border-top:1px solid #141824;">
              <p style="margin:0;font-size:11px;color:#475569;letter-spacing:1px;text-transform:uppercase;">
                &copy; 2026 ArenaX Esports &bull; <a href="https://arenax.cyou" style="color:#f0c040;text-decoration:none;">arenax.cyou</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // 6. Send email via Brevo SMTP
    await sendMailInternal({
      to: cleanEmail,
      recipientName: displayName,
      subject: 'Reset Your ArenaX Password',
      htmlBody
    });

    // Never return the token in the API response!
    return res.status(200).json({
      success: true,
      message: 'Password reset link sent! Please check your email inbox and spam folder.'
    });
  } catch (err) {
    console.error('[Request Password Reset] Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to process password reset request.'
    });
  }
}
