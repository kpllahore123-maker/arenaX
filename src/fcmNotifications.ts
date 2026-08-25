import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, string>;
}

export const VERCEL_FCM_ENDPOINT = 'https://arena-x-beta.vercel.app/api/send-notification';

/**
 * Format raw gift type to clean readable label
 */
export function formatGiftDisplayName(type: string): string {
  if (!type) return 'Gift 🎁';
  const t = type.toLowerCase();
  if (t.includes('rose')) return 'Rose 🌹';
  if (t.includes('rocket')) return 'Rocket 🚀';
  if (t.includes('trophy')) return 'Trophy 🏆';
  if (t.includes('heart')) return 'Heart ❤️';
  return type.charAt(0).toUpperCase() + type.slice(1) + ' 🎁';
}

/**
 * Client-Side Personal Notification Dispatcher for ArenaX Esports PWA
 * 
 * Works seamlessly with Vercel Serverless Backend:
 * 1. Looks up target user's fcmToken from users/{targetUid} in Firestore.
 * 2. Writes an in-app notification record to users/{targetUid}/notifications for 100% reliable in-app delivery.
 * 3. If target user has no fcmToken, skips silently (no error).
 * 4. Calls POST https://arena-x-beta.vercel.app/api/send-notification with { token, title, body, url, icon, data }.
 * 5. All operations are wrapped in safe try/catch blocks so failures never break main actions.
 */
export async function sendPersonalNotification(
  recipientUid: string,
  payload: NotificationPayload
): Promise<boolean> {
  if (!recipientUid) {
    return false;
  }

  try {
    // 1. Look up recipient's user document in Firestore to retrieve fcmToken
    const userDocRef = doc(db, 'users', recipientUid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      return false;
    }

    const userData = userDocSnap.data() || {};
    const fcmToken = userData.fcmToken;

    // Resolve URL to full arenax.cyou URL as required
    let targetUrl = payload.url || 'https://arenax.cyou/';
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      const cleanPath = targetUrl.replace(/^(\.\/|\/)/, '');
      targetUrl = `https://arenax.cyou/${cleanPath}`;
    }

    // Resolve icon URL
    let iconUrl = payload.icon || 'https://arenax.cyou/arenax_logo.jpg';
    if (!iconUrl.startsWith('http://') && !iconUrl.startsWith('https://')) {
      const cleanIcon = iconUrl.replace(/^(\.\/|\/)/, '');
      iconUrl = `https://arenax.cyou/${cleanIcon}`;
    }

    // 2. Also record an in-app notification in Firestore subcollection for reliable in-app alert center
    try {
      await addDoc(collection(db, 'users', recipientUid, 'notifications'), {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || 'arenax_logo.jpg',
        url: targetUrl,
        data: payload.data || {},
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (inAppErr) {
      console.warn('[Notification Engine] In-app notification write skipped:', inAppErr);
    }

    // 3. If target user has no active FCM token registered, skip push silently (no error)
    if (!fcmToken || typeof fcmToken !== 'string' || !fcmToken.trim()) {
      return false;
    }

    // 4. Send via Vercel backend endpoint
    try {
      const resp = await fetch(VERCEL_FCM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          token: fcmToken,
          title: payload.title,
          body: payload.body,
          url: targetUrl,
          icon: iconUrl,
          data: payload.data || {}
        })
      });

      if (resp.ok) {
        return true;
      } else {
        console.warn('[Notification Engine] Vercel push endpoint response:', resp.status);
      }
    } catch (fetchErr) {
      console.warn('[Notification Engine] Non-blocking push dispatch error:', fetchErr);
    }

    return true;
  } catch (err: any) {
    console.warn(`[Notification Engine] Safe handler caught error for recipient ${recipientUid}:`, err?.message || err);
    return false;
  }
}

// Expose globally for index.html compatibility
if (typeof window !== 'undefined') {
  (window as any).sendPersonalNotification = sendPersonalNotification;
  (window as any).formatGiftDisplayName = formatGiftDisplayName;
  (window as any).VERCEL_FCM_ENDPOINT = VERCEL_FCM_ENDPOINT;
}

