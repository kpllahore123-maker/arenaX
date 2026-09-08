import { sendMailInternal } from './send-email.js';

/**
 * Vercel Serverless Function: Record Login Device & Session
 * - Enforces server-side device recognition
 * - Detects new/unrecognized devices
 * - Sends branded security email via Nodemailer + Brevo
 * - Manages user sessions in Firestore
 *
 * Endpoint: POST /api/record-login-device
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
    email,
    displayName,
    deviceId,
    sessionId,
    clientHints
  } = body || {};

  if (!uid || !sessionId || !deviceId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required session parameters: uid, sessionId, or deviceId.'
    });
  }

  // 1. Device and Browser detection with User-Agent verification
  const ua = req.headers['user-agent'] || '';
  
  let platform = 'Unknown Device';
  if (/Android/i.test(ua)) {
    platform = 'Android';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    platform = 'iOS';
  } else if (/Windows NT|Win64|Win32/i.test(ua)) {
    platform = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    platform = 'macOS';
  } else if (/Linux/i.test(ua)) {
    platform = 'Linux';
  } else if (clientHints?.platform) {
    platform = clientHints.platform;
  }

  let browser = 'Browser';
  if (/Edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/OPR|Opera/i.test(ua)) {
    browser = 'Opera';
  } else if (/Chrome/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (clientHints?.browser) {
    browser = clientHints.browser;
  }

  let deviceType = 'desktop';
  if (platform === 'Android' || platform === 'iOS' || /Mobile/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/Tablet|iPad/i.test(ua)) {
    deviceType = 'tablet';
  }

  // 2. IP and Approximate Geolocation resolution
  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    '127.0.0.1';

  let approxLocation = '';
  const vercelCity = req.headers['x-vercel-ip-city'] ? decodeURIComponent(req.headers['x-vercel-ip-city']) : '';
  const vercelRegion = req.headers['x-vercel-ip-country-region'] ? decodeURIComponent(req.headers['x-vercel-ip-country-region']) : '';
  const vercelCountry = req.headers['x-vercel-ip-country'] ? decodeURIComponent(req.headers['x-vercel-ip-country']) : '';

  if (vercelCity && vercelCountry) {
    approxLocation = [vercelCity, vercelRegion, vercelCountry].filter(Boolean).join(', ');
  }

  // Fast fallback for approximate location if not on Vercel or local test
  if (!approxLocation) {
    const tz = clientHints?.timezone || '';
    if (tz.includes('Karachi') || tz.includes('Pakistan')) {
      approxLocation = 'Lahore, Punjab, Pakistan';
    } else if (tz.includes('Dubai') || tz.includes('Emirates')) {
      approxLocation = 'Dubai, United Arab Emirates';
    } else if (tz.includes('New_York') || tz.includes('Chicago') || tz.includes('Los_Angeles')) {
      approxLocation = 'New York, United States';
    } else if (tz.includes('London')) {
      approxLocation = 'London, United Kingdom';
    } else if (tz.includes('Singapore')) {
      approxLocation = 'Central Region, Singapore';
    } else if (clientIp && !clientIp.startsWith('127.') && clientIp !== '::1' && !clientIp.startsWith('192.168.') && !clientIp.startsWith('10.')) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1200);
        const geoRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,city,regionName,country`, { signal: controller.signal });
        clearTimeout(timeout);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && geoData.status === 'success') {
            approxLocation = [geoData.city, geoData.regionName, geoData.country].filter(Boolean).join(', ');
          }
        }
      } catch (err) {
        // Geolocation query soft-fail
      }
    }
  }

  if (!approxLocation) {
    approxLocation = 'Lahore, Punjab, Pakistan';
  }

  // Append approximate disclaimer if not present
  const locationDisplay = approxLocation;

  // 3. Initialize Firebase Admin
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

  let isNewDevice = false;
  const now = Date.now();

  if (clientEmail && privateKey) {
    try {
      const { initializeApp, getApps, cert } = await import('firebase-admin/app');
      const { getFirestore } = await import('firebase-admin/firestore');

      const app = getApps().length === 0
        ? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
        : getApps()[0];
      const db = getFirestore(app);

      // Check server-side known devices subcollection
      const knownDevRef = db.collection('users').doc(uid).collection('known_devices').doc(deviceId);
      const knownDevDoc = await knownDevRef.get();

      if (!knownDevDoc.exists) {
        isNewDevice = true;
        // Register known device
        await knownDevRef.set({
          deviceId,
          platform,
          browser,
          deviceType,
          approximateLocation: locationDisplay,
          firstIp: clientIp,
          firstSeenAt: now,
          lastSeenAt: now
        });

        // Add security activity log entry
        await db.collection('users').doc(uid).collection('account_activity').add({
          userId: uid,
          securityEventType: 'NEW_DEVICE_LOGIN',
          sessionId,
          deviceId,
          platform,
          browser,
          approximateLocation: locationDisplay,
          createdAt: now,
          ip: clientIp,
          isCurrent: true
        });

        // Send Branded Security Email
        if (email && email.includes('@')) {
          const rawOrigin = req.headers.origin || 'https://arenax.cyou';
          const baseOrigin = rawOrigin.replace(/\/+$/, '');
          const reviewUrl = `${baseOrigin}/?open=security-devices`;

          const loginDate = new Date(now);
          const exactTimeFormatted = loginDate.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
          });

          const recipient = displayName || email.split('@')[0];

          const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New login detected on your ArenaX account</title>
</head>
<body style="margin:0;padding:0;background-color:#05070a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#05070a;padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:540px;background-color:#0a0c12;border:1px solid #1f2538;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.65);">
          <!-- Top Banner -->
          <tr>
            <td align="center" style="padding:32px 24px 22px 24px;background:linear-gradient(180deg,#14192b 0%,#0a0c12 100%);border-bottom:1px solid #1c2234;">
              <div style="display:inline-block;padding:7px 16px;border-radius:30px;background-color:#161c2b;border:1px solid #28334d;margin-bottom:12px;">
                <span style="color:#f0c040;font-weight:900;font-size:15px;letter-spacing:2px;text-transform:uppercase;">ARENAX ESPORTS</span>
              </div>
              <h1 style="margin:6px 0 0 0;color:#ffffff;font-size:23px;font-weight:800;letter-spacing:0.4px;">New login detected</h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:32px 28px;">
              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                Hello <strong style="color:#ffffff;">${recipient}</strong>,
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#94a3b8;">
                You've successfully signed in to your ArenaX account from a new device.
              </p>

              <!-- Device Metadata Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0f1422;border:1px solid #1e263d;border-radius:14px;margin-bottom:26px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #1a2236;">
                    <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Device</div>
                    <div style="font-size:15px;font-weight:700;color:#ffffff;">
                      ${platform} <span style="color:#64748b;">•</span> ${browser}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #1a2236;">
                    <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Time</div>
                    <div style="font-size:13px;font-weight:600;color:#e2e8f0;">
                      ${exactTimeFormatted}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Location</div>
                    <div style="font-size:13px;font-weight:600;color:#e2e8f0;">
                      ${locationDisplay} <span style="font-size:11px;color:#94a3b8;font-weight:400;">(Approximate)</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Notice Callout -->
              <div style="background-color:#121829;border-left:4px solid #f0c040;padding:14px 18px;border-radius:8px;margin-bottom:28px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#cbd5e1;">
                  If this was you, no action is needed. If you don't recognize this activity, secure your ArenaX account immediately.
                </p>
              </div>

              <!-- Button CTA -->
              <div style="text-align:center;margin:32px 0 16px 0;">
                <a href="${reviewUrl}" target="_blank" style="display:inline-block;padding:15px 36px;background:linear-gradient(135deg,#f0c040 0%,#d4a017 100%);color:#000000;font-size:14px;font-weight:900;letter-spacing:1px;text-decoration:none;border-radius:50px;box-shadow:0 6px 20px rgba(240,192,64,0.35);text-transform:uppercase;">
                  Review Logged-in Devices
                </a>
              </div>

              <p style="margin:20px 0 0 0;text-align:center;font-size:11px;color:#64748b;">
                Having trouble with the button? Copy and paste: <a href="${reviewUrl}" style="color:#f0c040;text-decoration:underline;">${reviewUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:22px;background-color:#06080d;border-top:1px solid #141824;">
              <p style="margin:0 0 4px 0;font-size:11px;color:#475569;">
                This is an automated security notification protecting your ArenaX Esports profile, wallet balance, and competition history.
              </p>
              <p style="margin:0;font-size:10px;color:#334155;">
                © ${new Date().getFullYear()} ArenaX Esports. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

          try {
            await sendMailInternal({
              to: email,
              recipientName: recipient,
              subject: 'New login detected on your ArenaX account',
              htmlBody
            });
          } catch (mailErr) {
            console.warn('[Record Device] Email send notification failed:', mailErr.message);
          }
        }
      } else {
        // Device recognized! Update lastSeenAt
        isNewDevice = false;
        await knownDevRef.update({
          lastSeenAt: now,
          lastIp: clientIp,
          lastLocation: locationDisplay
        });
      }

      // Record / Update session
      const sessionRef = db.collection('users').doc(uid).collection('sessions').doc(sessionId);
      await sessionRef.set({
        sessionId,
        userId: uid,
        deviceId,
        deviceType,
        platform,
        browser,
        approximateLocation: locationDisplay,
        ip: clientIp,
        createdAt: now,
        lastActiveAt: now,
        isRevoked: false,
        revokedAt: null
      }, { merge: true });

    } catch (adminErr) {
      console.warn('[Record Device] Firebase Admin error:', adminErr.message);
    }
  }

  return res.status(200).json({
    success: true,
    sessionId,
    deviceId,
    isNewDevice,
    device: {
      platform,
      browser,
      deviceType,
      approximateLocation: locationDisplay
    }
  });
}
