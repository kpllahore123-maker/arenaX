// Vercel Serverless Function: Admin Custom Token Issuer
// Endpoint: /api/admin/create-admin-token

export default async function handler(req, res) {
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
    const { passcode, email } = req.body || {};
    const validPins = ["arenax2026", "arena2026", "arenaxmaster", "arenaxadmin", "admin123", "axpass2026", "master2026"];
    const isPasscodeValid = passcode && validPins.includes(String(passcode).trim().toLowerCase());

    if (!isPasscodeValid) {
      return res.status(403).json({ error: 'Invalid Admin Passcode.' });
    }

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
    const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
    const projectId = process.env.FIREBASE_PROJECT_ID || 'arenax-c1586';

    if (clientEmail && privateKey) {
      const { initializeApp, getApps, cert } = await import('firebase-admin/app');
      const { getAuth } = await import('firebase-admin/auth');

      const app = getApps().length === 0
        ? initializeApp({
            credential: cert({ projectId, clientEmail, privateKey })
          })
        : getApps()[0];

      const auth = getAuth(app);
      const adminUid = "xDa31jOrsoQC2HxjSheO3wBqyII2";
      const targetEmail = email || "kpllahore123@gmail.com";

      const customToken = await auth.createCustomToken(adminUid, {
        email: targetEmail,
        admin: true,
        role: "Master Admin"
      });

      return res.json({
        success: true,
        customToken,
        uid: adminUid,
        email: targetEmail,
        message: 'Admin session token generated successfully.'
      });
    }

    return res.status(503).json({
      error: 'Firebase Admin credentials not configured on serverless environment.'
    });
  } catch (error) {
    console.error('Error creating admin token:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
