// ==========================================
// ARENAX NOTIFICATIONS & FCM PUSH SYSTEM
// ==========================================

// 1. Personal In-App & Firestore Notifications
export async function sendPersonalNotification(recipientUid, payload) {
  try {
    if (!recipientUid || !payload) return;
    const db = window.db;
    const collection = window.collection;
    const addDoc = window.addDoc;
    const serverTimestamp = window.serverTimestamp;
    
    if (!db || !collection || !addDoc) {
      console.warn('Firestore not ready for sendPersonalNotification');
      return;
    }

    const notificationDoc = {
      type: payload.type || 'info',
      title: payload.title || 'Notification',
      body: payload.body || payload.message || '',
      icon: payload.icon || 'bell',
      read: false,
      createdAt: serverTimestamp ? serverTimestamp() : new Date(),
      data: payload.data || {},
      actionUrl: payload.actionUrl || null
    };

    await addDoc(collection(db, 'users', recipientUid, 'notifications'), notificationDoc);
  } catch (err) {
    console.error('sendPersonalNotification error:', err);
  }
}

// 2. PWA Update Lifecycle & Diagnostic Helpers
export function setupPwaUpdateDetection(reg) {
  if (!reg) return;
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true || document.referrer.includes('android-app://');
  
  reg.addEventListener('updatefound', () => {
    const newWorker = reg.installing;
    if (!newWorker) return;
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        showPwaUpdateModal(reg);
      }
    });
  });
}

export function showPwaUpdateModal(reg) {
  const modal = document.getElementById('mPwaUpdateModal');
  if (modal) {
    modal.classList.remove('hidden');
    const updateBtn = document.getElementById('btnApplyPwaUpdate');
    if (updateBtn) {
      updateBtn.onclick = () => triggerPwaUpdate(reg);
    }
  }
}

export function triggerPwaUpdate(reg) {
  if (reg && reg.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
  setTimeout(() => {
    window.location.reload();
  }, 300);
}

export async function cleanupStaleServiceWorkers(expectedScriptFilename, expectedScope) {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      const scriptUrl = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL;
      if (scriptUrl && !scriptUrl.includes(expectedScriptFilename)) {
        await registration.unregister();
      }
    }
  } catch (e) {
    console.warn('SW cleanup notice:', e);
  }
}

// 3. FCM Token Management
export async function requestFCMToken(showSuccessAlert = false) {
  try {
    if (!('Notification' in window)) {
      if (showSuccessAlert && typeof window.showToast === 'function') {
        window.showToast('Push notifications are not supported in this browser.', 'error');
      }
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      if (showSuccessAlert && typeof window.showToast === 'function') {
        window.showToast('Notifications enabled successfully!', 'success');
      }
      updateDiagnosticUI();
      return true;
    } else {
      if (showSuccessAlert && typeof window.showToast === 'function') {
        window.showToast('Notification permission was ' + permission, 'warning');
      }
      return false;
    }
  } catch (err) {
    console.error('requestFCMToken error:', err);
    return null;
  }
}

export function copyFCMToken() {
  const el = document.getElementById('diagnosticFcmToken');
  if (el && el.innerText) {
    navigator.clipboard.writeText(el.innerText).then(() => {
      if (typeof window.showToast === 'function') window.showToast('Token copied to clipboard!', 'success');
    });
  }
}

export function updateDiagnosticUI() {
  const permEl = document.getElementById('diagnosticNotifPermission');
  if (permEl && 'Notification' in window) {
    permEl.innerText = Notification.permission;
  }
}

export function showDiagnosticError(msg) {
  console.warn('[FCM Diagnostic]', msg);
}

// 4. Browser Push Notifications Integration
export function initBrowserPushNotifications() {
  updateDiagnosticUI();
}

// Attach to window object for global availability
window.sendPersonalNotification = sendPersonalNotification;
window.setupPwaUpdateDetection = setupPwaUpdateDetection;
window.showPwaUpdateModal = showPwaUpdateModal;
window.triggerPwaUpdate = triggerPwaUpdate;
window.cleanupStaleServiceWorkers = cleanupStaleServiceWorkers;
window.requestFCMToken = requestFCMToken;
window.copyFCMToken = copyFCMToken;
window.updateDiagnosticUI = updateDiagnosticUI;
window.showDiagnosticError = showDiagnosticError;
window.initBrowserPushNotifications = initBrowserPushNotifications;
