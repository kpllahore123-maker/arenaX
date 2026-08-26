const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert(
          JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        )
      });
    } else {
      console.warn('[Vercel Serverless] Missing Firebase Admin credentials in environment variables.');
    }
  } catch (initErr) {
    console.error('[Vercel Serverless] Firebase admin initialization error:', initErr);
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, title, body, icon, url, data } = req.body || {};

    if (!token) {
      return res.status(400).json({ success: false, error: 'Target FCM token is required' });
    }

    const message = {
      token,
      notification: { 
        title: title || 'ArenaX', 
        body: body || '' 
      },
      webpush: {
        notification: { 
          icon: icon || 'https://arenax.cyou/arenax_logo.jpg' 
        },
        fcmOptions: { 
          link: url || 'https://arenax.cyou/' 
        }
      },
      data: Object.fromEntries(
        Object.entries(data || {}).map(([k, v]) => [k, String(v)])
      )
    };

    const response = await admin.messaging().send(message);
    return res.status(200).json({ success: true, response });
  } catch (error) {
    console.error('FCM send error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
