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
        error: 'Database service unavailable. Firebase environment variables are missing.'
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
      console.warn('[Password Reset] Admin init error:', err.message);
    }

    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Database service unavailable: ' + (initError || 'Check server configuration.')
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
