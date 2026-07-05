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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function requestNotificationPermissionAndGetToken(uid: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (!('Notification' in window)) {
    console.warn("This browser does not support notifications.");
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn("This browser does not support Service Workers.");
    return null;
  }

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("Firebase Messaging is not supported in this browser.");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = getMessaging(app);
      
      // Register service worker explicitly to guarantee it resolves correctly in container/iframe environments
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log("Service Worker registered successfully:", reg);
      
      const token = await getToken(messaging, { 
        serviceWorkerRegistration: reg,
        vapidKey: VAPID_KEY 
      });

      if (token) {
        console.log("FCM Token obtained:", token);
        const pathForWrite = `users/${uid}`;
        try {
          await setDoc(doc(db, 'users', uid), { fcmToken: token }, { merge: true });
          console.log("FCM Token successfully saved to Firestore for uid:", uid);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, pathForWrite);
        }
        return token;
      } else {
        console.warn("No registration token available. Request permission to generate one.");
      }
    } else {
      console.warn("Notification permission was denied.");
    }
  } catch (error) {
    console.error("An error occurred while getting the FCM token:", error);
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
