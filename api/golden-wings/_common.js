/**
 * Shared Firebase Admin & Security utilities for Golden Wings API
 */

export const GOLDEN_WINGS_TRIAL_MS = 72 * 60 * 60 * 1000; // 72 Hours (3 Days)
export const GOLDEN_WINGS_PURCHASE_PRICE = 150; // 150 AX Coins

const ALLOWED_ORIGINS = [
  'https://arenax.cyou',
  'https://www.arenax.cyou',
  'https://arena-x-beta.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

/**
 * Returns the exact allowed origin matching the request, or defaults strictly to 'https://arenax.cyou'
 * NEVER returns '*' for authenticated requests.
 */
export function getCorsOrigin(req) {
  const origin = req.headers && (req.headers.origin || req.headers.Origin);
  if (!origin) return 'https://arenax.cyou';

  if (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.arenax.cyou') ||
    origin.endsWith('.github.io') ||
    origin.endsWith('.vercel.app') ||
    origin.endsWith('.run.app')
  ) {
    return origin;
  }
  return 'https://arenax.cyou';
}

/**
 * Applies strict CORS headers to the response
 */
export function setCorsHeaders(req, res) {
  const allowOrigin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

export function cleanKey(raw) {
  if (!raw) return '';
  let k = String(raw).trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim();
  }
  return k.replace(/\\n/g, '\n').replace(/\r/g, '');
}

let cachedApp = null;
let cachedDb = null;
let cachedAuth = null;

export async function getFirebaseAdmin() {
  if (cachedDb && cachedAuth) {
    return { app: cachedApp, db: cachedDb, auth: cachedAuth, error: null };
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = cleanKey(process.env.FIREBASE_PRIVATE_KEY);
  const projectId = process.env.FIREBASE_PROJECT_ID || 'arenax-c1586';

  if (!clientEmail || !privateKey) {
    return {
      app: null,
      db: null,
      auth: null,
      error: 'Backend authentication service unavailable. Firebase environment variables are missing.'
    };
  }

  try {
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const { getAuth } = await import('firebase-admin/auth');

    const app = getApps().length === 0
      ? initializeApp({
          credential: cert({ projectId, clientEmail, privateKey })
        })
      : getApps()[0];

    cachedApp = app;
    cachedDb = getFirestore(app);
    cachedAuth = getAuth(app);

    return { app: cachedApp, db: cachedDb, auth: cachedAuth, error: null };
  } catch (err) {
    console.error('[Golden Wings Firebase Init Error]:', err);
    return {
      app: null,
      db: null,
      auth: null,
      error: err.message || 'Failed to initialize Firebase Admin.'
    };
  }
}

/**
 * Verifies the incoming Bearer token using Firebase Admin Auth
 * Returns the decoded UID if valid, or null if invalid or missing
 */
export async function getVerifiedUid(req, auth) {
  const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (auth && token) {
      try {
        const decoded = await auth.verifyIdToken(token);
        if (decoded && decoded.uid) {
          return decoded.uid;
        }
      } catch (err) {
        console.warn('[Golden Wings Auth Notice]: verifyIdToken failed:', err.message);
        return null;
      }
    }
  }
  return null;
}

