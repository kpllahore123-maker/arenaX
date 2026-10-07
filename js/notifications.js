// ==========================================
// ARENAX IN-APP NOTIFICATIONS & PUSH ENGINE
// ==========================================

import { 
  db, 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  where 
} from './firebase-config.js';

// DOM selector helper
const $ = (id) => (typeof id === 'string' ? document.getElementById(id) : id);

// In-Memory Notification State
let inAppNotificationsUnsub = null;
let mailsUnsub = null;
let currentNotifications = [];
let notifsData = [];
let mailsData = [];
let relativeTimeInterval = null;
let activeUserUid = null;

// Helper: Safely parse Firestore/JS timestamps into epoch milliseconds
export function parseTimestampMs(timestamp) {
  if (!timestamp) return Date.now();
  if (typeof timestamp === 'number') return timestamp;
  if (timestamp.toMillis && typeof timestamp.toMillis === 'function') return timestamp.toMillis();
  if (timestamp.toDate && typeof timestamp.toDate === 'function') return timestamp.toDate().getTime();
  if (timestamp.seconds !== undefined) {
    return timestamp.seconds * 1000 + (timestamp.nanoseconds ? Math.floor(timestamp.nanoseconds / 1000000) : 0);
  }
  const d = new Date(timestamp).getTime();
  return isNaN(d) ? Date.now() : d;
}

// Helper: Calculate exact relative time with real-time updates
export function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Just now';
  const ms = parseTimestampMs(timestamp);
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));

  if (diffSec < 60) {
    return 'Just now';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// Helper: Filter notifications ensuring unread are never dropped and recent are included
export function filterRecentNotifications(items) {
  if (!Array.isArray(items)) return [];
  // Keep all unread items, and read items up to 50 total
  const unread = items.filter((n) => !n.read);
  const read = items.filter((n) => n.read);
  return [...unread, ...read.slice(0, 45)].sort((a, b) => {
    return parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt);
  });
}

export function filterLastSevenDays(items) {
  return filterRecentNotifications(items);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper: Format message text with bold emphasis matching reference image
export function formatNotificationText(notif) {
  let raw = notif.body || notif.message || notif.title || '';
  if (!raw && notif.title) raw = notif.title;
  let text = escapeHtml(raw);

  // If explicit senderName is present, bold it
  if (notif.senderName) {
    const sName = escapeHtml(notif.senderName);
    const regex = new RegExp(`(^|\\b)(${sName})(\\b)`, 'i');
    text = text.replace(regex, `$1<strong class="font-bold text-white">$2</strong>$3`);
  } else {
    // If text starts with [Username] sent you / wants to be your friend / accepted your friend request
    text = text.replace(
      /^([A-Za-z0-9_]+)\s+(sent you|wants to be your friend|accepted your)/i,
      '<strong class="font-bold text-white">$1</strong> $2'
    );
  }

  // Bold Level X / Lv. X
  text = text.replace(/\b(Level\s+\d+|Lv\.\s*\d+)\b/gi, '<strong class="font-bold text-white">$1</strong>');

  // Bold Supporter, VIP, Champion, Blue Tick, Tournament
  text = text.replace(/\b(Supporter|VIP|Champion|Blue Tick|Tournament)\b/gi, '<strong class="font-bold text-white">$1</strong>');

  return text;
}

// Helper: Determine avatar circle color & icon matching reference screenshot
export function getNotificationVisuals(notif) {
  const type = (notif.type || '').toLowerCase();
  const title = (notif.title || '').toLowerCase();
  const body = (notif.body || notif.message || '').toLowerCase();

  // 1. Gift: Pink circle with 🎁
  if (type.includes('gift') || title.includes('gift') || body.includes('gift') || body.includes('gift card')) {
    return {
      bg: 'bg-[#f43f5e]/25 border border-[#f43f5e]/35 text-[#fb7185]',
      iconHtml: '<span class="text-base select-none">🎁</span>'
    };
  }

  // 2. Friend request / Friend accepted: Sky blue circle with 👤
  if (type.includes('friend') || title.includes('friend') || body.includes('friend')) {
    return {
      bg: 'bg-[#0ea5e9]/25 border border-[#0ea5e9]/35 text-[#38bdf8]',
      iconHtml: '<span class="text-base select-none">👤</span>'
    };
  }

  // 3. Level / XP / Rank: Gold/Amber circle with ⭐
  if (type.includes('level') || title.includes('level') || body.includes('level') || body.includes('reached level') || type.includes('xp')) {
    return {
      bg: 'bg-[#f59e0b]/25 border border-[#f59e0b]/35 text-[#fbbf24]',
      iconHtml: '<span class="text-base select-none">⭐</span>'
    };
  }

  // 4. Badge / Achievement: Gold/Amber circle with 🎖️
  if (type.includes('badge') || title.includes('badge') || body.includes('badge') || type.includes('achievement')) {
    return {
      bg: 'bg-[#f59e0b]/25 border border-[#f59e0b]/35 text-[#fbbf24]',
      iconHtml: '<span class="text-base select-none">⭐</span>'
    };
  }

  // 5. Supporter / VIP / Roles: Purple circle with 🛡️
  if (type.includes('supporter') || title.includes('supporter') || body.includes('supporter') || type.includes('vip') || body.includes('renews')) {
    return {
      bg: 'bg-[#8b5cf6]/25 border border-[#8b5cf6]/35 text-[#a78bfa]',
      iconHtml: '<span class="text-base select-none">🛡️</span>'
    };
  }

  // 6. Tournament: Emerald green circle with 🏆
  if (type.includes('tournament') || title.includes('tournament') || body.includes('tournament') || body.includes('slot') || body.includes('match')) {
    return {
      bg: 'bg-[#10b981]/25 border border-[#10b981]/35 text-[#34d399]',
      iconHtml: '<span class="text-base select-none">🏆</span>'
    };
  }

  // 7. Security / Account / Moderation: Blue circle with 🔒
  if (type.includes('security') || title.includes('security') || body.includes('security') || type.includes('account') || type.includes('device') || type.includes('moderation') || type.includes('warning')) {
    return {
      bg: 'bg-[#3b82f6]/25 border border-[#3b82f6]/35 text-[#60a5fa]',
      iconHtml: '<span class="text-base select-none">🔒</span>'
    };
  }

  // 8. Team / Squad / Guild: Indigo circle with 👥
  if (type.includes('team') || type.includes('guild') || type.includes('squad') || title.includes('team') || body.includes('squad')) {
    return {
      bg: 'bg-[#6366f1]/25 border border-[#6366f1]/35 text-[#818cf8]',
      iconHtml: '<span class="text-base select-none">👥</span>'
    };
  }

  // Default: Slate circle with 🔔
  return {
    bg: 'bg-slate-700/40 border border-slate-600/30 text-slate-300',
    iconHtml: '<i class="fas fa-bell text-sm"></i>'
  };
}

// ── RENDER NOTIFICATIONS UI ──
export function renderNotificationsUI() {
  const container = $('notifsListContainer');
  const footer = $('notifsAllCaughtUpFooter');
  const bellDot = $('notifDot');
  const badgeCount = $('notifsUnreadBadgeCount');

  if (!container) return;

  // Filter recent notifications ensuring unread are never dropped
  const validItems = filterRecentNotifications(currentNotifications);

  // Compute unread count
  const unreadCount = validItems.filter((n) => !n.read).length;

  // Sync Bell Icon Dot & Badge
  if (bellDot) {
    if (unreadCount > 0) {
      bellDot.classList.remove('hidden');
      bellDot.className = 'absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-[#0c101b] shadow-[0_0_8px_rgba(251,191,36,0.9)]';
    } else {
      bellDot.classList.add('hidden');
    }
  }

  if (badgeCount) {
    if (unreadCount > 0) {
      badgeCount.textContent = String(unreadCount);
      badgeCount.classList.remove('hidden');
    } else {
      badgeCount.classList.add('hidden');
    }
  }

  // Check Empty State (no notifications at all)
  if (validItems.length === 0) {
    container.innerHTML = `
      <div class="py-14 px-6 text-center select-none">
        <div class="w-12 h-12 rounded-full bg-slate-800/70 border border-slate-700/50 mx-auto mb-3 flex items-center justify-center text-xl text-amber-400 shadow-inner">
          <i class="fas fa-check-circle"></i>
        </div>
        <p class="text-[14px] font-bold text-white flex items-center justify-center gap-1.5">
          <span>You're all caught up</span>
          <span>🎉</span>
        </p>
        <p class="text-xs text-slate-400 mt-1">No unread notifications right now</p>
      </div>
    `;
    if (footer) footer.classList.add('hidden');
    return;
  }

  // Render Rows List
  container.innerHTML = validItems
    .map((item) => {
      const isUnread = !item.read;
      const visuals = getNotificationVisuals(item);
      const messageHtml = formatNotificationText(item);
      const relativeTime = formatRelativeTime(item.createdAt);
      const timestampMs = parseTimestampMs(item.createdAt);

      return `
        <div 
          class="flex items-start gap-3.5 px-4.5 py-3.5 hover:bg-white/[0.04] transition-colors cursor-pointer group relative ${isUnread ? 'bg-white/[0.02]' : 'opacity-85'}"
          data-notif-id="${escapeHtml(item.id)}"
          data-notif-path="${escapeHtml(item._collectionPath || '')}"
          onclick="window.handleNotificationItemClick('${escapeHtml(item.id)}', '${escapeHtml(item._collectionPath || '')}')"
        >
          <!-- Circular Avatar / Icon -->
          <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-base shadow-sm ${visuals.bg}">
            ${visuals.iconHtml}
          </div>

          <!-- Message and Time -->
          <div class="min-w-0 flex-1 pr-1 select-none">
            <p class="text-[13px] text-slate-200 leading-snug line-clamp-2">
              ${messageHtml}
            </p>
            <span 
              class="text-[11px] text-slate-400 font-medium mt-0.5 block notif-time-ago" 
              data-timestamp="${timestampMs}"
            >
              ${relativeTime}
            </span>
          </div>

          <!-- Unseen Indicator: Yellow Dot on Right -->
          ${
            isUnread
              ? `<span class="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.95)] ring-1 ring-amber-300/40 flex-shrink-0 self-center notif-yellow-dot" title="Unread"></span>`
              : `<span class="w-2.5 h-2.5 flex-shrink-0 opacity-0 pointer-events-none"></span>`
          }
        </div>
      `;
    })
    .join('');

  // Show "You're all caught up 🎉" when no unread notifications remain
  if (footer) {
    if (unreadCount === 0 && validItems.length > 0) {
      footer.classList.remove('hidden');
    } else {
      footer.classList.add('hidden');
    }
  }
}

// Helper: Refresh all relative time labels in real-time as time passes
export function updateRelativeTimeLabels() {
  const elements = document.querySelectorAll('.notif-time-ago');
  elements.forEach((el) => {
    const rawTs = el.getAttribute('data-timestamp');
    if (rawTs) {
      const ts = Number(rawTs);
      el.textContent = formatRelativeTime(ts);
    }
  });
}

// ── MARK INDIVIDUAL NOTIFICATION AS READ ──
export async function markNotificationAsRead(notifId, collectionPath) {
  if (!notifId) return;

  // Optimistically mark as read in local memory
  const item = currentNotifications.find((n) => n.id === notifId);
  if (item && !item.read) {
    item.read = true;
    renderNotificationsUI();
  }

  // Server-side Firestore update
  try {
    const path = collectionPath || (activeUserUid ? `users/${activeUserUid}/notifications` : null);
    if (!path) return;

    const notifRef = doc(db, path, notifId);
    await updateDoc(notifRef, { read: true, status: 'read' });
  } catch (err) {
    console.warn('Error marking notification as read on server:', err);
  }
}

// ── MARK ALL NOTIFICATIONS AS READ ──
export async function markAllNotificationsAsRead() {
  const unreadItems = currentNotifications.filter((n) => !n.read);
  if (unreadItems.length === 0) return;

  // Optimistically remove all yellow dots immediately
  currentNotifications.forEach((n) => {
    n.read = true;
  });
  renderNotificationsUI();

  // Server-side update for all unread documents
  try {
    const promises = unreadItems.map((item) => {
      const path = item._collectionPath || (activeUserUid ? `users/${activeUserUid}/notifications` : null);
      if (!path) return Promise.resolve();
      const notifRef = doc(db, path, item.id);
      return updateDoc(notifRef, { read: true, status: 'read' }).catch((e) => console.warn(e));
    });

    await Promise.all(promises);
  } catch (err) {
    console.warn('Error marking all notifications as read:', err);
  }
}

// ── NOTIFICATION ITEM CLICK HANDLER ──
export function handleNotificationItemClick(notifId, collectionPath) {
  markNotificationAsRead(notifId, collectionPath);

  const item = currentNotifications.find((n) => n.id === notifId);
  if (!item) return;

  // Handle optional deep linking / in-app navigation
  if (item.actionUrl || item.url) {
    const url = item.actionUrl || item.url;
    if (url.startsWith('#')) {
      window.location.hash = url;
    } else if (url.startsWith('http')) {
      window.location.href = url;
    }
  } else if (item.type === 'friend_request' || item.type === 'friend_accept') {
    if (typeof window.goTo === 'function') {
      window.goTo('sFriends');
    }
  } else if (item.type === 'gift') {
    if (typeof window.goTo === 'function') {
      window.goTo('sProfile');
    }
  } else if (item.type === 'tournament') {
    if (typeof window.goTo === 'function') {
      window.goTo('sTournaments');
    }
  }
}

// ── PANEL OPEN / CLOSE / TOGGLE ──
export function openNotificationsPanel() {
  const panel = $('mNotificationsPanel');
  const backdrop = $('notificationsBackdrop');
  if (!panel) return;

  panel.classList.remove('hidden');
  panel.style.display = 'block';

  // Force reflow for CSS transition
  void panel.offsetHeight;

  panel.classList.remove('pointer-events-none', 'opacity-0', 'scale-95', 'translate-y-[-8px]');
  panel.classList.add('opacity-100', 'scale-100', 'translate-y-0');

  if (backdrop) {
    backdrop.classList.remove('hidden');
    void backdrop.offsetHeight;
    backdrop.classList.remove('pointer-events-none');
    backdrop.classList.add('opacity-100', 'pointer-events-auto');
  }

  updateRelativeTimeLabels();
}

export function closeNotificationsPanel() {
  const panel = $('mNotificationsPanel');
  const backdrop = $('notificationsBackdrop');
  if (!panel) return;

  panel.classList.remove('opacity-100', 'scale-100', 'translate-y-0');
  panel.classList.add('opacity-0', 'scale-95', 'translate-y-[-8px]', 'pointer-events-none');

  if (backdrop) {
    backdrop.classList.remove('opacity-100', 'pointer-events-auto');
    backdrop.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
      if (backdrop && backdrop.classList.contains('pointer-events-none')) {
        backdrop.classList.add('hidden');
      }
    }, 200);
  }

  setTimeout(() => {
    if (panel && panel.classList.contains('pointer-events-none')) {
      panel.classList.add('hidden');
      panel.style.display = 'none';
    }
  }, 200);
}

export function toggleNotificationsPanel() {
  const panel = $('mNotificationsPanel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none' && !panel.classList.contains('hidden') && !panel.classList.contains('pointer-events-none');
  if (isOpen) {
    closeNotificationsPanel();
  } else {
    openNotificationsPanel();
  }
}

// ── MERGE & SYNC NOTIFICATIONS ──
function mergeNotificationsAndRender() {
  const map = new Map();

  // 1. Primary notifications
  notifsData.forEach((item) => {
    map.set(item.id, item);
  });

  // 2. Mails that aren't already represented
  mailsData.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });

  currentNotifications = Array.from(map.values()).sort((a, b) => {
    return parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt);
  });

  renderNotificationsUI();
}

// ── REAL-TIME FIRESTORE LISTENER ──
export function initInAppNotifications(profile) {
  if (!profile || profile.isGuest) {
    currentNotifications = [];
    notifsData = [];
    mailsData = [];
    renderNotificationsUI();
    return;
  }

  const uid = profile.uid;
  if (!uid) return;
  activeUserUid = uid;

  if (inAppNotificationsUnsub) {
    try { inAppNotificationsUnsub(); } catch (e) {}
    inAppNotificationsUnsub = null;
  }
  if (mailsUnsub) {
    try { mailsUnsub(); } catch (e) {}
    mailsUnsub = null;
  }

  let isFirstLoad = true;

  try {
    // 1. Primary real-time listener on users/{uid}/notifications
    const notifsRef = collection(db, 'users', uid, 'notifications');
    const qNotifs = query(notifsRef, orderBy('createdAt', 'desc'), limit(50));

    inAppNotificationsUnsub = onSnapshot(qNotifs, (snap) => {
      const items = [];
      snap.forEach((d) => {
        items.push({
          id: d.id,
          _collectionPath: `users/${uid}/notifications`,
          ...d.data(),
          read: Boolean(d.data().read)
        });
      });

      notifsData = items;
      mergeNotificationsAndRender();

      // Trigger toast on new incoming notification
      if (!isFirstLoad) {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const n = change.doc.data();
            if (!n.read) {
              const title = n.title || 'New Notification';
              const body = n.body || n.message || '';
              if (typeof window.showToastNotification === 'function') {
                window.showToastNotification(title, body);
              }
            }
          }
        });
      }

      isFirstLoad = false;
    }, (err) => {
      console.warn('In-app notifications snapshot notice:', err);
    });

    // 2. Secondary listener on users/{uid}/mails (for guild join requests, team invites, system notices)
    const mailsRef = collection(db, 'users', uid, 'mails');
    const qMails = query(mailsRef, orderBy('createdAt', 'desc'), limit(30));

    mailsUnsub = onSnapshot(qMails, (snap) => {
      const items = [];
      snap.forEach((d) => {
        const data = d.data();
        const isRead = data.read === true || data.status === 'read' || data.status === 'accepted' || data.status === 'declined' || data.collected === true;
        items.push({
          id: d.id,
          _collectionPath: `users/${uid}/mails`,
          ...data,
          read: isRead
        });
      });

      mailsData = items;
      mergeNotificationsAndRender();
    }, (err) => {
      console.warn('Mails listener notice:', err);
    });

  } catch (err) {
    console.warn('Could not initialize in-app notifications listener:', err);
  }

  // 3. Start periodic 15-second timer for auto-updating relative time
  if (!relativeTimeInterval) {
    relativeTimeInterval = setInterval(() => {
      updateRelativeTimeLabels();
    }, 15000);

    window.addEventListener('focus', () => updateRelativeTimeLabels());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        updateRelativeTimeLabels();
      }
    });
  }
}

// ── SEND PERSONAL IN-APP NOTIFICATION HELPER ──
export async function sendPersonalNotification(recipientUid, payload) {
  try {
    if (!recipientUid || !payload) return;

    // Check mute / block
    const senderUid = payload.data?.senderUid || payload.senderUid;
    if (senderUid) {
      try {
        const [mutedSnap, blockedSnap] = await Promise.all([
          getDoc(doc(db, 'users', recipientUid, 'muted', senderUid)),
          getDoc(doc(db, 'users', recipientUid, 'blocked', senderUid))
        ]);

        if (mutedSnap && mutedSnap.exists()) {
          console.log(`Notification silenced: recipient ${recipientUid} has muted sender ${senderUid}`);
          return;
        }
        if (blockedSnap && blockedSnap.exists()) {
          console.log(`Notification suppressed: recipient ${recipientUid} has blocked sender ${senderUid}`);
          return;
        }
      } catch (checkErr) {
        console.warn('Mute/block notification check notice:', checkErr);
      }
    }

    const notificationDoc = {
      type: payload.type || 'info',
      title: payload.title || 'Notification',
      body: payload.body || payload.message || '',
      icon: payload.icon || 'bell',
      senderName: payload.senderName || payload.data?.senderName || null,
      senderUid: senderUid || null,
      read: false,
      createdAt: serverTimestamp ? serverTimestamp() : new Date(),
      data: payload.data || {},
      actionUrl: payload.actionUrl || payload.url || null
    };

    await addDoc(collection(db, 'users', recipientUid, 'notifications'), notificationDoc);
  } catch (err) {
    console.error('sendPersonalNotification error:', err);
  }
}

// ── PWA & FCM DIAGNOSTIC HELPERS ──
export function setupPwaUpdateDetection(reg) {
  if (!reg) return;
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
  const modal = $('mPwaUpdateModal');
  if (modal) {
    modal.classList.remove('hidden');
    const updateBtn = $('btnApplyPwaUpdate');
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

export async function cleanupStaleServiceWorkers(expectedScriptFilename) {
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

export async function requestFCMToken(showSuccessAlert = false) {
  try {
    if (typeof window.requestFCMToken === 'function') {
      return await window.requestFCMToken(showSuccessAlert);
    }
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
  const el = $('diagnosticFcmToken');
  if (el && el.innerText) {
    navigator.clipboard.writeText(el.innerText).then(() => {
      if (typeof window.showToast === 'function') window.showToast('Token copied to clipboard!', 'success');
    });
  }
}

export function updateDiagnosticUI() {
  const permEl = $('diagnosticNotifPermission');
  if (permEl && 'Notification' in window) {
    permEl.innerText = Notification.permission;
  }
}

export function showDiagnosticError(msg) {
  console.warn('[FCM Diagnostic]', msg);
}

export function initBrowserPushNotifications() {
  updateDiagnosticUI();
}

// ── BIND EVENT LISTENERS ON PAGE LOAD ──
function initNotificationsDomListeners() {
  const markAllBtn = $('btnMarkAllNotifsRead');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      markAllNotificationsAsRead();
    });
  }

  const closeBtn = $('btnCloseNotifsPanel');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeNotificationsPanel();
    });
  }

  const backdrop = $('notificationsBackdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      closeNotificationsPanel();
    });
  }

  // Dismiss on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNotificationsPanel();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNotificationsDomListeners);
} else {
  initNotificationsDomListeners();
}

// ── ATTACH TO WINDOW OBJECT FOR GLOBAL USABILITY ──
window.sendPersonalNotification = sendPersonalNotification;
window.initInAppNotifications = initInAppNotifications;
window.renderNotificationsUI = renderNotificationsUI;
window.openNotificationsPanel = openNotificationsPanel;
window.closeNotificationsPanel = closeNotificationsPanel;
window.toggleNotificationsPanel = toggleNotificationsPanel;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
window.markNotificationAsRead = markNotificationAsRead;
window.handleNotificationItemClick = handleNotificationItemClick;
window.formatRelativeTime = formatRelativeTime;
window.updateRelativeTimeLabels = updateRelativeTimeLabels;
window.setupPwaUpdateDetection = setupPwaUpdateDetection;
window.showPwaUpdateModal = showPwaUpdateModal;
window.triggerPwaUpdate = triggerPwaUpdate;
window.cleanupStaleServiceWorkers = cleanupStaleServiceWorkers;
window.requestFCMToken = requestFCMToken;
window.copyFCMToken = copyFCMToken;
window.updateDiagnosticUI = updateDiagnosticUI;
window.showDiagnosticError = showDiagnosticError;
window.initBrowserPushNotifications = initBrowserPushNotifications;
