import crypto from 'crypto';
import { sendMailInternal } from './send-email.js';

/**
 * Vercel Serverless Function: Send Custom 6-Digit Email Verification Code
 * Endpoint: POST /api/send-verification-code
 * Payload: { uid: string, email: string, username?: string }
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
  const { uid, email, username } = body || {};

  if (!uid || !email) {
    return res.status(400).json({ success: false, error: 'Missing required fields: uid and email' });
  }

  try {
    // 1. Initialize Firebase Admin if not already active
    let db = null;
    function cleanKey(raw) {
      if (!raw) return '';
      let k = String(raw).trim();
      if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
        k = k.slice(1, -1).trim();
      }
      return k.replace(/\\n/g, '\n').replace(/\r/g, '');
    }

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = cleanKey(process.env.FIREBASE_PRIVATE_KEY);
    const projectId = process.env.FIREBASE_PROJECT_ID || 'arenax-c1586';

    if (clientEmail && privateKey) {
      try {
        const { initializeApp, getApps, cert } = await import('firebase-admin/app');
        const { getFirestore } = await import('firebase-admin/firestore');
        const app = getApps().length === 0
          ? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
          : getApps()[0];
        db = getFirestore(app);
      } catch (err) {
        console.warn('[Verification] Admin Firestore init error, continuing:', err.message);
      }
    }

    const now = Date.now();
    const userRef = db ? db.collection('users').doc(uid) : null;

    // 2. Check Rate Limiting: max 3 resend requests per 10 minutes per user
    if (userRef) {
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const data = userDoc.data() || {};
        const resendWindowStart = data.verificationWindowStart || 0;
        const resendCount = data.verificationResendCount || 0;

        if (now - resendWindowStart < 10 * 60 * 1000) {
          if (resendCount >= 3) {
            const minutesLeft = Math.ceil((10 * 60 * 1000 - (now - resendWindowStart)) / 60000);
            return res.status(429).json({
              success: false,
              error: `Too many verification requests. Please wait ${minutesLeft} minute(s) before requesting another code.`
            });
          }
          await userRef.update({
            verificationResendCount: resendCount + 1
          });
        } else {
          // Reset rate limit window
          await userRef.update({
            verificationWindowStart: now,
            verificationResendCount: 1
          });
        }
      }
    }

    // 3. Generate secure 6-digit numeric verification code
    const code = Math.floor(100000 + crypto.randomInt(0, 900000)).toString();
    const expiry = now + 5 * 60 * 1000; // 5 minutes expiry

    // 4. Store code and expiry in Firestore under users/{uid}
    if (userRef) {
      await userRef.set({
        emailVerificationCode: code,
        emailVerificationExpiry: expiry,
        emailVerified: false,
        updatedAt: now
      }, { merge: true });
    }

    // 5. Branded Dark (#0a0c12) + Gold (#f0c040) HTML Email
    const recipientDisplayName = username || email.split('@')[0];
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your ArenaX Account</title>
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
              <h1 style="margin:8px 0 0 0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:0.5px;">Verify Your Account</h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px 28px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                Hello <strong style="color:#ffffff;">${recipientDisplayName}</strong>,
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#94a3b8;">
                Welcome to ArenaX Esports! Use the 6-digit verification code below to activate your account and enter the Arena.
              </p>

              <!-- 6-Digit Code Card -->
              <div style="background:linear-gradient(145deg,#0e121d 0%,#090c13 100%);border:1px solid #2a344d;border-radius:14px;padding:26px 20px;text-align:center;margin:24px 0;">
                <span style="display:block;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;">YOUR VERIFICATION CODE</span>
                <span style="display:inline-block;font-size:38px;font-weight:900;letter-spacing:10px;color:#f0c040;text-shadow:0 0 20px rgba(240,192,64,0.3);font-family:'Courier New',Courier,monospace;padding-left:10px;">
                  ${code}
                </span>
                <p style="margin:12px 0 0 0;font-size:12px;color:#ef4444;font-weight:600;">
                  ⏳ This code expires in 5 minutes
                </p>
              </div>

              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#94a3b8;">
                Enter this code on the verification screen in the ArenaX app to confirm your email.
              </p>

              <div style="background-color:#0d111a;border-left:3px solid #f0c040;padding:12px 16px;border-radius:4px;margin-top:20px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">
                  If you didn't create an ArenaX Esports account, you can safely ignore this email.
                </p>
              </div>
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

    // 6. Send Email via Brevo SMTP
    await sendMailInternal({
      to: email,
      recipientName: recipientDisplayName,
      subject: 'Verify Your ArenaX Account',
      htmlBody
    });

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email.'
    });
  } catch (err) {
    console.error('[Verification Code] Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to dispatch verification code'
    });
  }
}
