// ArenaX Unified Firebase Cloud Messaging & PWA Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// 1. Initialize Firebase with ArenaX project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOBynDQ00o2Yh_TD9rsQnHypf97ne6hmM",
  authDomain: "arenax-c1586.firebaseapp.com",
  projectId: "arenax-c1586",
  storageBucket: "arenax-c1586.firebasestorage.app",
  messagingSenderId: "1069776825982",
  appId: "1:1069776825982:web:f2d7f11cef4c206206b22f"
};

if (!firebase.apps || !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// 2. Retrieve Firebase Messaging instance
const messaging = firebase.messaging();

// 3. Handle background push notifications when app is closed / backgrounded
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background push message:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'ArenaX Tournament Alert';
  const notificationBody = payload.notification?.body || payload.data?.body || 'You have a new update in ArenaX Esports!';
  const notificationIcon = payload.notification?.icon || payload.data?.icon || 'arenax_logo.jpg';
  const notificationBadge = payload.notification?.badge || payload.data?.badge || 'favicon.ico';
  const clickAction = payload.fcmOptions?.link || payload.notification?.click_action || payload.data?.click_action || payload.data?.url || './';

  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: notificationBadge,
    image: payload.notification?.image || payload.data?.image || undefined,
    tag: payload.data?.tag || payload.collapse_key || 'arenax-fcm-alert',
    renotify: true,
    data: {
      url: clickAction,
      ...payload.data
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 4. Handle notification click (focus existing tab or open new window)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 5. Offline caching and PWA service worker capabilities
importScripts('./sw.js');
