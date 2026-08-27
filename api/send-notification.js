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
    console.log('[send-notification] Firebase admin initialized successfully');
  } catch (initErr) {
    console.error('[send-notification] Firebase admin init FAILED:', initErr.message);
  }
}

export default async function handler(req, res) {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify Firebase admin is initialized
    if (!admin.apps.length) {
      console.error('[send-notification] Firebase admin not initialized');
      return res.status(500).json({ 
        success: false, 
        error: 'Firebase admin failed to initialize - check environment variables' 
      });
    }

    // Only accept POST requests
    if (req.method !== 'POST') {
      console.warn(`[send-notification] Invalid method: ${req.method}`);
      return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    // Extract request body
    const { token, title, body, icon, url, data } = req.body || {};

    // Validate required FCM token
    if (!token) {
      console.warn('[send-notification] Missing FCM token in request body');
      return res.status(400).json({ 
        success: false, 
        error: 'Target FCM token is required' 
      });
    }

    // Log incoming notification request (first 20 chars of token for privacy)
    console.log('[send-notification] Processing push notification', {
      token: token.substring(0, 20) + '...',
      title: title || 'ArenaX',
      body: body?.substring(0, 50) || '(empty)'
    });

    // Build FCM message payload
    const message = {
      token,
      notification: { 
        title: title || 'ArenaX', 
        body: body || '' 
      },
      webpush: {
        notification: { 
          icon: icon || 'https://arenax.cyou/arenax_logo.jpg',
          badge: 'https://arenax.cyou/icon-192.png',
          tag: 'arenax-notif'
        },
        fcmOptions: { 
          link: url || 'https://arenax.cyou/' 
        }
      },
      data: Object.fromEntries(
        Object.entries(data || {}).map(([k, v]) => [k, String(v)])
      )
    };

    // Send via Firebase Cloud Messaging
    const response = await admin.messaging().send(message);
    
    console.log('[send-notification] Success - Message ID:', response);
    return res.status(200).json({ 
      success: true, 
      messageId: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    // Log detailed error information
    console.error('[send-notification] FCM send failed', {
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
    
    // Return appropriate error response
    const statusCode = error.code === 'messaging/invalid-registration-token' ? 400 : 500;
    return res.status(statusCode).json({ 
      success: false, 
      error: error.message,
      code: error.code
    });
  }
}
