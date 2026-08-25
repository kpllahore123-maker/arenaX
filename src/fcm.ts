import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app, db, auth } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

const VAPID_KEY = "BDdgfDjDrlojgRVmno7aaRuIpUyZMBI7Dh-EnXLBvXzXMsIsvojEag3SvYX63M67MtIClFHUMkyiCmmIwA00FEM";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider?.providerId || null,
        email: provider?.email || null,
      })) || []
    },
    operationType,
    path
  };
  let jsonStr = '';
  try {
    jsonStr = JSON.stringify(errInfo);
  } catch (_e) {
    jsonStr = JSON.stringify({ error: errMessage, operationType, path });
  }
  console.error('Firestore Error: ', jsonStr);
  throw new Error(jsonStr);
}

export async function cleanupStaleServiceWorkers(expectedScript: string, targetScope?: string): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const activeUrl = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
      const isExpectedScript = activeUrl.includes(expectedScript);
      const isExpectedScope = targetScope ? reg.scope === targetScope : true;

      if (!isExpectedScript || !isExpectedScope) {
        console.warn(`[SW Cleanup] Unregistering stale/duplicate worker: ${activeUrl} (scope: ${reg.scope})`);
        await reg.unregister();
      }
    }
  } catch (err) {
    console.warn('[SW Cleanup] Error during service worker cleanup:', err);
  }
}

export async function autoRequestPermission(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (!('Notification' in window)) {
    console.warn("This browser does not support notifications.");
    return null;
  }

  // If already denied, do not attempt requestPermission to avoid silent failure
  if (Notification.permission === 'denied') {
    console.warn("FCM: Notification permission is blocked in browser settings.");
    return 'denied';
  }

  // If already granted, return directly
  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log("Auto requested notification permission. Result:", permission);
    return permission;
  } catch (error) {
    console.error("Error auto requesting notification permission:", error);
    return null;
  }
}

export async function requestNotificationPermissionAndGetToken(uid: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (!('Notification' in window)) {
    console.warn("This browser does not support notifications.");
    throw new Error("This browser does not support web push notifications.");
  }

  if (!('serviceWorker' in navigator)) {
    console.warn("This browser does not support Service Workers.");
    throw new Error("Service Workers are not supported in this browser.");
  }

  // Explicit check for browser-level block
  if (Notification.permission === 'denied') {
    console.warn("Notification permission is currently blocked in browser settings.");
    throw new Error("Notifications are blocked in your browser settings. Please click the lock/settings icon in your address bar, change Notifications to 'Allow', and refresh the page.");
  }

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("Firebase Messaging is not supported in this browser.");
      throw new Error("Firebase Cloud Messaging is not supported in this browser environment.");
    }

    let permission: NotificationPermission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'denied') {
      throw new Error("Notification permission was denied. Please allow notifications from your browser address bar settings and reload.");
    }

    if (permission === 'granted') {
      const messaging = getMessaging(app);
      
      // Register service worker dynamically based on the current location (defaults to root /)
      const getAppBasePath = () => {
        const win = window as any;
        if (typeof win.getAppBasePath === 'function') {
          return win.getAppBasePath();
        }
        return '/';
      };
      const basePath = getAppBasePath();
      const swPath = (basePath.endsWith('/') ? basePath : basePath + '/') + 'firebase-messaging-sw.js';
      const targetScope = new URL(basePath, window.location.href).href;

      // Clean up stale / obsolete workers first
      await cleanupStaleServiceWorkers('firebase-messaging-sw.js', targetScope);
      
      console.log("[FCM Client] Registering Service Worker at path:", swPath, "scope:", basePath);
      const reg = await navigator.serviceWorker.register(swPath, { scope: basePath });
      console.log("[FCM Client] Service Worker registered successfully:", reg.scope);

      // Force skipWaiting if a waiting worker exists
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING', action: 'skipWaiting' });
      }

      // Explicitly wait until the service worker is active and ready
      await navigator.serviceWorker.ready;
      
      const token = await getToken(messaging, { 
        serviceWorkerRegistration: reg,
        vapidKey: VAPID_KEY 
      });

      if (token) {
        console.log("FCM Token obtained successfully:", token);
        const pathForWrite = `users/${uid}`;
        try {
          await setDoc(doc(db, 'users', uid), { 
            fcmToken: token,
            fcmTokenUpdatedAt: new Date().toISOString()
          }, { merge: true });
          console.log("FCM Token successfully saved to Firestore for uid:", uid);
          if (typeof window !== 'undefined') {
            localStorage.setItem('fcm_token_arena_x', token);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, pathForWrite);
        }
        return token;
      } else {
        console.warn("No registration token returned from FCM.");
        throw new Error("No token returned from Firebase Cloud Messaging.");
      }
    }
  } catch (error: any) {
    console.error("An error occurred while getting the FCM token:", error);
    throw error;
  }
  return null;
}

export function setupForegroundNotificationListener(onNotificationReceived: (payload: any) => void) {
  if (typeof window === 'undefined') return () => {};

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return () => {};
  }

  let unsubscribe = () => {};

  isSupported().then((supported) => {
    if (!supported) return;
    try {
      const messaging = getMessaging(app);
      unsubscribe = onMessage(messaging, (payload) => {
        console.log("Foreground message received:", payload);
        onNotificationReceived(payload);
      });
    } catch (error) {
      console.error("An error occurred while setting up foreground listener:", error);
    }
  }).catch(console.error);

  return () => {
    unsubscribe();
  };
}
