// ArenaX Unified PWA Service Worker (Offline & Push Notifications)
if (typeof firebase === 'undefined') {
  try {
    importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
  } catch (e) {
    console.warn('[sw.js] Firebase scripts could not be imported:', e);
  }
}

if (typeof firebase !== 'undefined' && (!firebase.apps || !firebase.apps.length)) {
  firebase.initializeApp({
    apiKey: "AIzaSyDOBynDQ00o2Yh_TD9rsQnHypf97ne6hmM",
    authDomain: "arenax-c1586.firebaseapp.com",
    projectId: "arenax-c1586",
    storageBucket: "arenax-c1586.firebasestorage.app",
    messagingSenderId: "1069776825982",
    appId: "1:1069776825982:web:f2d7f11cef4c206206b22f"
  });
}

if (typeof firebase !== 'undefined' && firebase.messaging) {
  try {
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      console.log('[sw.js] Received background message ', payload);
      const notificationTitle = payload.notification?.title || payload.data?.title || 'ArenaX Notification';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || '',
        icon: payload.notification?.icon || payload.data?.icon || 'arenax_logo.jpg',
        badge: payload.notification?.badge || payload.data?.badge || 'favicon.ico',
        data: {
          url: payload.fcmOptions?.link || payload.notification?.click_action || payload.data?.click_action || payload.data?.url || './',
          ...payload.data
        }
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (e) {
    console.warn('[sw.js] Error attaching onBackgroundMessage:', e);
  }
}

// Cache & Offline Support - Bumped to v13 to invalidate stale client caches immediately
const CACHE_NAME = 'arenax-cache-v13';
const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'arenax_logo.jpg',
  'favicon.ico',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// Install Event
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching initial assets in sw.js');
      return cache.addAll(ASSETS).catch(err => {
        console.warn('Some initial assets failed to cache:', err);
      });
    })
  );
});

// Activate Event - aggressively deletes all outdated cache versions (including v11 and older)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[sw.js] Deleting old stale cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Listen for SKIP_WAITING
self.addEventListener('message', event => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data.action === 'skipWaiting')) {
    self.skipWaiting();
  }
});

// Fetch Event (Network First for navigation, documents, and script bundles / Cache First for static media)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;

  // Never cache Firebase, Firestore, or server API endpoints
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('identitytoolkit') ||
    url.includes('/api/') ||
    url.includes('cloudfunctions.net')
  ) {
    return;
  }

  // Network First for HTML documents, scripts, and code bundles so users immediately get deployed fixes
  const isCodeOrDoc = 
    event.request.mode === 'navigate' || 
    url.endsWith('index.html') || 
    url.endsWith('admin.html') || 
    url.endsWith('/') || 
    url.endsWith('./') ||
    url.includes('/assets/') ||
    url.includes('/js/') ||
    url.endsWith('.js');

  if (isCodeOrDoc) {
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Cache First for static media / fonts / icons
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {});
    })
  );
});
