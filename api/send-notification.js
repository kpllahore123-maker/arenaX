import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey ? privateKey.replace(/\\n/g, '\n') : undefined
      })
    });
    console.log('Firebase admin initialized successfully');
  } catch (initErr) {
    console.error('Firebase admin init FAILED:', initErr.message);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!admin.apps.length) {
      return res.status(500).json({ 
        success: false, 
        error: 'Firebase admin failed to initialize - check environment variables' 
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token, title, body, icon, url, data } = req.body || {};

    if (!token) {
      return res.status(400).json({ success: false, error: 'Target FCM token is required' });
    }

    const message = {
      token,
      notification: { title: title || 'ArenaX', body: body || '' },
      webpush: {
        notification: { icon: icon || 'https://arenax.cyou/arenax_logo.jpg' },
        fcmOptions: { link: url || 'https://arenax.cyou/' }
      },
      data: Object.fromEntries(
        Object.entries(data || {}).map(([k, v]) => [k, String(v)])
      )
    };

    const response = await admin.messaging().send(message);
    return res.status(200).json({ success: true, response });
  } catch (error) {
    console.error('FCM send error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
