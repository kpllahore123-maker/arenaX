// ==========================================
// ARENAX MAIN RUNTIME APPLICATION CONTROLLER
// ==========================================


function getNumericPlayerId(uid, currentHandle) {
  if (currentHandle) {
    const digitsOnly = String(currentHandle).replace(/^ID:\s*/i, '').replace(/^@/, '').trim();
    if (/^\d{6,8}$/.test(digitsOnly)) {
      return digitsOnly;
    }
  }
  if (!uid) return String(Math.floor(100000 + Math.random() * 900000));
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash << 5) - hash + uid.charCodeAt(i);
    hash |= 0;
  }
  const numericId = 100000 + (Math.abs(hash) % 900000);
  return String(numericId);
}
window.getNumericPlayerId = getNumericPlayerId;
const storage = window.storage || (window.getStorage ? window.getStorage(window.app) : null);
const googleProvider = window.googleProvider || (window.GoogleAuthProvider ? new window.GoogleAuthProvider() : null);

// Register Service Worker for FCM dynamically with directory path context
let messaging = null;

if ('serviceWorker' in navigator) {
  // PWA Update flow functions
  function setupPwaUpdateDetection(reg) {
    // Only activate in PWA mode
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true || document.referrer.includes('android-app://');
    if (!isPWA) {
      console.log("PWA Update Detection: Running in standard browser tab. Update modal suppressed.");
      return;
    }

    console.log("PWA Update Detection: Running in PWA standalone mode. Monitoring for updates...");

    // Check for updates on load
    if (reg.waiting) {
      showPwaUpdateModal(reg);
    }

    // Listen for new service worker installing/waiting
    reg.addEventListener('updatefound', () => {
      const installingWorker = reg.installing;
      if (installingWorker) {
        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available, show update popup
              showPwaUpdateModal(reg);
            }
          }
        });
      }
    });

    // Periodically check for SW updates (every 15 minutes)
    setInterval(() => {
      reg.update().catch(err => console.warn("Failed to check for SW update:", err));
    }, 15 * 60 * 1000);
  }

  let isPwaUpdating = false;

  function showPwaUpdateModal(reg) {
    const modal = document.getElementById('pwaUpdateModal');
    const percentText = document.getElementById('pwaUpdatePercent');
    const bar = document.getElementById('pwaUpdateBar');
    const updateBtn = document.getElementById('pwaUpdateNowBtn');
    const laterBtn = document.getElementById('pwaUpdateLaterBtn');
    const autoToggle = document.getElementById('pwaAutoUpdateToggle');

    if (!modal) return;

    // Initialize progress
    if (percentText && bar) {
      percentText.textContent = '0%';
      bar.style.width = '0%';
    }

    // Read saved auto-update preference from localStorage
    const savedAutoUpdate = localStorage.getItem('pwa_auto_update_enabled') !== 'false';
    if (autoToggle) {
      autoToggle.checked = savedAutoUpdate;
    }

    // If auto-update is enabled, trigger update automatically
    if (savedAutoUpdate) {
      console.log("PWA Auto-Update enabled. Automatically updating app...");
      triggerPwaUpdate(reg);
      return;
    }

    // Show PWA Update modal with scale-in transition
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Setup click handlers
    if (updateBtn) {
      updateBtn.onclick = () => {
        triggerPwaUpdate(reg);
      };
    }

    if (laterBtn) {
      laterBtn.onclick = () => {
        // Hide modal
        modal.classList.remove('flex');
        modal.classList.add('hidden');
      };
    }

    if (autoToggle) {
      autoToggle.onchange = (e) => {
        localStorage.setItem('pwa_auto_update_enabled', e.target.checked);
        if (e.target.checked) {
          triggerPwaUpdate(reg);
        }
      };
    }
  }

  function triggerPwaUpdate(reg) {
    if (isPwaUpdating) return;
    isPwaUpdating = true;

    const percentText = document.getElementById('pwaUpdatePercent');
    const bar = document.getElementById('pwaUpdateBar');
    const modal = document.getElementById('pwaUpdateModal');

    // Show modal if it was hidden (for auto-update)
    if (modal && modal.classList.contains('hidden')) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    // Disable interaction during progress animation
    const updateBtn = document.getElementById('pwaUpdateNowBtn');
    const laterBtn = document.getElementById('pwaUpdateLaterBtn');
    if (updateBtn) updateBtn.disabled = true;
    if (laterBtn) laterBtn.disabled = true;

    // Animate progress bar elegantly from 0% to 100%
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // Perform the update swap
        setTimeout(() => {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          } else {
            // Fallback reload if no waiting worker but we are forced
            window.location.reload();
          }
        }, 500);
      }

      if (percentText && bar) {
        percentText.textContent = `${progress}%`;
        bar.style.width = `${progress}%`;
      }
    }, 150);
  }

  // Controller change listener to reload page when a new SW takes control
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      console.log('[SW Lifecycle] Service Worker controller changed. Reloading page...');
      window.location.reload();
    }
  });

  // Stale Service Worker Cleanup Helper
  async function cleanupStaleServiceWorkers(expectedScriptFilename, expectedScope) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      console.log('[SW Diagnostics] Active Service Worker registrations count:', regs.length);
      for (const reg of regs) {
        const activeUrl = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
        const isExpectedScript = activeUrl.includes(expectedScriptFilename);
        const isExpectedScope = expectedScope ? reg.scope === expectedScope : true;

        console.log(`[SW Diagnostics] Registration inspect -> Scope: ${reg.scope} | Script: ${activeUrl}`);

        if (!isExpectedScript || !isExpectedScope) {
          console.warn(`[SW Cleanup] Unregistering conflicting/stale worker: ${activeUrl} at scope: ${reg.scope}`);
          await reg.unregister();
        }
      }
    } catch (err) {
      console.warn('[SW Cleanup] Error cleaning up stale registrations:', err);
    }
  }

  const registerSW = async () => {
    try {
      const basePath = (typeof window.getAppBasePath === 'function') ? window.getAppBasePath() : './';
      const swPath = basePath + 'firebase-messaging-sw.js';
      const targetScope = new URL(basePath, window.location.href).href;

      console.log('=== [ArenaX Push Notification & Service Worker Diagnostics] ===');
      console.log('1. Base Path:', basePath);
      console.log('2. SW Script Path:', swPath);
      console.log('3. Target Scope:', targetScope);
      console.log('4. Active Controller:', navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL : 'None (Uncontrolled on first boot)');
      console.log('5. Current Notification Permission:', typeof Notification !== 'undefined' ? Notification.permission : 'Unsupported');
      console.log('=================================================================');

      // Cleanup any obsolete or duplicate service workers
      await cleanupStaleServiceWorkers('firebase-messaging-sw.js', targetScope);

      let reg;
      try {
        reg = await navigator.serviceWorker.register(swPath, { scope: basePath });
      } catch (swErr) {
        console.warn('Fallback registering sw.js at scope:', basePath, swErr);
        reg = await navigator.serviceWorker.register(basePath + 'sw.js', { scope: basePath });
      }
      console.log('Service Worker registered successfully with scope:', reg.scope);

      // Force activation immediately if worker is waiting
      if (reg.waiting) {
        console.log('[SW Lifecycle] Waiting worker detected. Sending SKIP_WAITING signal...');
        reg.waiting.postMessage({ type: 'SKIP_WAITING', action: 'skipWaiting' });
      }

      // Listen for updatefound and force activation as soon as installed
      reg.addEventListener('updatefound', () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              console.log('[SW Lifecycle] New service worker installed. Forcing immediate skipWaiting...');
              if (reg.waiting) {
                reg.waiting.postMessage({ type: 'SKIP_WAITING', action: 'skipWaiting' });
              }
            }
          });
        }
      });
      
      // Setup PWA Update detection and auto-update flow
      setupPwaUpdateDetection(reg);
      
      // Initialize messaging and setup foreground notification listener
      try {
        const { getMessaging, onMessage, isSupported } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js');
        const supported = await isSupported();
        if (supported) {
          messaging = getMessaging(app);
          onMessage(messaging, (payload) => {
            console.log('FCM: Foreground message received:', payload);
            // Show foreground notification as browser notification if possible
            if (Notification.permission === 'granted') {
              const title = payload.notification?.title || payload.data?.title || 'ArenaX Tournament Alert';
              const basePath = (typeof window.getAppBasePath === 'function') ? window.getAppBasePath() : './';
              const options = {
                body: payload.notification?.body || payload.data?.body || '',
                icon: payload.notification?.icon || payload.data?.icon || basePath + 'icon-192.png',
                badge: payload.notification?.badge || payload.data?.badge || basePath + 'favicon.ico',
                data: {
                  url: payload.fcmOptions?.link || payload.notification?.click_action || payload.data?.click_action || payload.data?.url || './',
                  ...payload.data
                }
              };
              new Notification(title, options);
            }
          });
        } else {
          console.log('FCM is not supported in this browser environment.');
        }
      } catch (fcmErr) {
        console.error('FCM: Failed to initialize messaging after SW registration:', fcmErr);
      }
    } catch (err) {
      console.error('Service Worker registration failed:', err);
    }
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}

// FCM Diagnostic Methods
async function requestFCMToken(showSuccessAlert = false) {
  showDiagnosticError(null);
  try {
    if (typeof Notification === 'undefined') {
      showDiagnosticError("Push notifications are not supported by this browser.");
      return;
    }

    console.log("FCM: Checking notification permission. Current state:", Notification.permission);
    
    // Explicit handling of 'denied' state - do not call requestPermission() as browsers will silently reject
    if (Notification.permission === 'denied') {
      const blockedMsg = "Notifications are blocked in your browser settings. Tap the lock icon 🔒 in your browser address bar → Site Settings → Notifications → Allow, then refresh the page.";
      console.warn("FCM: Permission is blocked at browser level.");
      showDiagnosticError(blockedMsg);
      if (showSuccessAlert) {
        alert("⚠️ Notifications are blocked in your browser settings.\n\nTo enable them:\n1. Click the Lock/Tune icon (🔒) in your address bar.\n2. Open 'Site Settings' (or Permissions).\n3. Set 'Notifications' to 'Allow'.\n4. Refresh this page.");
      }
      updateDiagnosticUI();
      return;
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      console.log("FCM: Prompting user for permission...");
      permission = await Notification.requestPermission();
    }
    updateDiagnosticUI();
    
    if (permission !== 'granted') {
      const deniedMsg = "Notification permission was denied. Tap the lock icon 🔒 in your address bar → Site Settings → Notifications → Allow, then refresh.";
      showDiagnosticError(deniedMsg);
      if (showSuccessAlert) {
        alert("⚠️ " + deniedMsg);
      }
      return;
    }
    
    const { getMessaging, getToken, isSupported } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js');
    const supported = await isSupported();
    if (!supported) {
      showDiagnosticError("FCM is not supported in this browser environment.");
      return;
    }
    
    if (!messaging) {
      messaging = getMessaging(app);
    }
    
    const basePath = (typeof window.getAppBasePath === 'function') ? window.getAppBasePath() : './';
    const swPath = basePath + 'firebase-messaging-sw.js';
    let reg;
    try {
      reg = await navigator.serviceWorker.register(swPath, { scope: basePath });
    } catch (swErr) {
      reg = await navigator.serviceWorker.register(basePath + 'sw.js', { scope: basePath });
    }
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING', action: 'skipWaiting' });
    }
    await navigator.serviceWorker.ready;
    
    const token = await getToken(messaging, {
      vapidKey: "BDdgfDjDrlojgRVmno7aaRuIpUyZMBI7Dh-EnXLBvXzXMsIsvojEag3SvYX63M67MtIClFHUMkyiCmmIwA00FEM",
      serviceWorkerRegistration: reg
    });
    
    if (token) {
      console.log("FCM: Manual token success:", token);
      localStorage.setItem('fcm_token_arena_x', token);
      updateDiagnosticUI();
      
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          fcmToken: token,
          fcmTokenUpdatedAt: serverTimestamp()
        }, { merge: true });
        console.log("FCM: Saved token to user profile in Firestore");
      }
      if (showSuccessAlert) {
        alert("🎉 FCM Token generated and saved successfully!");
      }
    } else {
      showDiagnosticError("Failed to retrieve token. No token returned from FCM.");
    }
  } catch (err) {
    console.error("FCM: Error requesting token:", err);
    showDiagnosticError("FCM Error: " + (err.message || String(err)));
  }
}

function copyFCMToken() {
  const token = localStorage.getItem('fcm_token_arena_x');
  if (token) {
    navigator.clipboard.writeText(token)
      .then(() => alert('📋 FCM Token copied to clipboard!'))
      .catch(() => alert('Failed to copy. Please manually select the token and copy it.'));
  }
}

function updateDiagnosticUI() {
  const perm = typeof Notification !== 'undefined' ? Notification.permission : 'default';
  
  const permEl = $('diagnosticPermission');
  if (permEl) {
    permEl.textContent = perm;
    if (perm === 'granted') {
      permEl.className = 'font-bold px-1.5 py-0.5 rounded text-[10px] uppercase bg-green-500/10 text-green-500 border border-green-500/20';
    } else if (perm === 'denied') {
      permEl.className = 'font-bold px-1.5 py-0.5 rounded text-[10px] uppercase bg-red-500/10 text-red-500 border border-red-500/20';
    } else {
      permEl.className = 'font-bold px-1.5 py-0.5 rounded text-[10px] uppercase bg-ele text-t3 border border-bdr';
    }
  }

  const reqBox = $('diagnosticPermissionRequestBox');
  if (reqBox) {
    if (perm !== 'granted') {
      reqBox.classList.remove('hidden');
    } else {
      reqBox.classList.add('hidden');
    }
  }

  const token = localStorage.getItem('fcm_token_arena_x');
  const tokenBox = $('diagnosticTokenBox');
  const copyBtn = $('btnCopyFcmToken');
  const genBtn = $('btnGenerateFcmToken');

  if (token) {
    if (tokenBox) {
      tokenBox.textContent = token;
      tokenBox.classList.remove('hidden');
    }
    if (copyBtn) {
      copyBtn.classList.remove('hidden');
    }
    if (genBtn) {
      genBtn.textContent = 'Regenerate Token';
      genBtn.className = 'w-full py-1.5 bg-ele text-t2 hover:text-white text-[10px] font-bold rounded transition cursor-pointer';
    }
  } else {
    if (tokenBox) {
      tokenBox.classList.add('hidden');
    }
    if (copyBtn) {
      copyBtn.classList.add('hidden');
    }
    if (genBtn) {
      genBtn.textContent = 'Generate Token';
      genBtn.className = 'w-full py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-[10px] font-bold rounded transition cursor-pointer';
    }
  }
}

function showDiagnosticError(msg) {
  const errDiv = $('diagnosticErrorDiv');
  if (errDiv) {
    if (msg) {
      errDiv.textContent = msg;
      errDiv.classList.remove('hidden');
    } else {
      errDiv.classList.add('hidden');
    }
  }
}

// Expose FCM methods to window
window.requestFCMToken = requestFCMToken;
window.copyFCMToken = copyFCMToken;
window.updateDiagnosticUI = updateDiagnosticUI;

// Staff Access logic
const ADMIN_UIDS = ['xDa31jOrsoQC2HxjSheO3wBqyII2', 'lCNKrLAliFSvuML6Nwrr6YlNOtG3'];

// Local states
let userProfile = null;
let guestProfile = null;
let activeChatSubTab = 'global';
let unreadGlobal = false;
let globalChatUnsub = null;
let globalChatTypingUnsub = null;
let globalTypingTimeout = null;
// Screen Navigation State
let activeMainTab = 'Profile';
window.activeMainTab = activeMainTab;
let activeDMOrientationUid = null;
let toursData = [];
let userRegs = {};
let friendList = [];
let depositUnsub = null;
let userDepositsList = [];
let userProfileTransactionsList = [];
const AVATAR_SEEDS = ['ax1', 'ax2', 'ax3', 'ax4', 'bot1', 'bot2', 'bot3', 'bot4'];
let selectedAvatarSeed = AVATAR_SEEDS[0];
let devPopupShownThisSession = false;
let notifPopupShownThisSession = false;

// Interactive Tutorial States & Steps config
let currentTutorialStep = 0;
let activeHighlightedElementId = null;
const tutorialSteps = [
  {
    title: "Aapka Profile Hub 👤",
    text: "Aao gamer! Yeh aapka personal Profile Hub hai. Yahan aap apna display name, unique handle, level ranks, wallet AX balance aur total hearts popularity rating live dekh sakte hain.",
    tab: "Profile",
    highlight: "profileCard",
  },
  {
    title: "Esports Tournaments 🏆",
    text: "Events page par aapko saare live, upcoming aur ended matches milenge. Apni pasand ke esports contest me register karke cash prize pools jeeten!",
    tab: "Tour",
    highlight: "toursWrapper",
  },
  {
    title: "Secure AX Wallet 💰",
    text: "Wallet section se aap asani se Recharge kar sakte hain (JazzCash, NayaPay ke zariye) aur apni winnings ko seedha bank ya wallet me instant withdraw kar sakte hain.",
    tab: "Wallet",
    highlight: "wCard",
  },
  {
    title: "Global Chat & Voice Lobbies 🎤",
    text: "Dosre gamers ke sath connect hon! Global feed me chat karen, friends add karen aur high-quality low-latency audio room channels join karke dosto se voice chat karen.",
    tab: "Chat",
    highlight: "tChat",
  },
  {
    title: "Profile Customization 🎨",
    text: "Edit Display Name ya Customize Profile par click karke bio, social links aur custom avatar set karen. Premium VIP lekar golden frames aur glowing banners unlock karen! 👑",
    tab: "Profile",
    highlight: "btnCustomize",
  }
];

// Customization States
let selectedBannerTheme = 'dark';
let selectedAvatarFrame = 'none';
let selectedNameColor = '#ffffff';
let selectedCustomAvatarUrl = null;

// Helper selection with safe recursive null fallback proxy
const createDummyProxy = () => {
  const dummyFn = (...args) => createDummyProxy();
  dummyFn.classList = {
    add: () => {},
    remove: () => {},
    toggle: () => {},
    contains: () => false
  };
  dummyFn.style = {};
  dummyFn.dataset = {};
  dummyFn.children = [];
  dummyFn.files = [];
  dummyFn.value = '';
  dummyFn.textContent = '';
  dummyFn.innerHTML = '';
  dummyFn.className = '';
  dummyFn.addEventListener = () => {};
  dummyFn.removeEventListener = () => {};
  dummyFn.setAttribute = () => {};
  dummyFn.getAttribute = () => null;
  dummyFn.removeAttribute = () => {};
  dummyFn.focus = () => {};
  dummyFn.blur = () => {};
  dummyFn.click = () => {};
  dummyFn.scrollTo = () => {};
  dummyFn.scrollIntoView = () => {};
  dummyFn.appendChild = () => {};
  dummyFn.removeChild = () => {};
  dummyFn.querySelector = () => null;
  dummyFn.querySelectorAll = () => [];
  return new Proxy(dummyFn, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === Symbol.toPrimitive || prop === 'toString' || prop === 'valueOf') return () => '';
      return dummyFn;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    }
  });
};

const $ = (id) => {
  const el = document.getElementById(id);
  return el || createDummyProxy();
};
window.$ = $;

// Capture referral parameter and store it in localStorage
const urlParams = new URLSearchParams(window.location.search);
const referrerParam = urlParams.get('ref') || urlParams.get('referrer');
if (referrerParam) {
  localStorage.setItem('arenaX_ref', referrerParam);
}

// Custom Interactive Cursor Logic
const cur = $('cur');
const curR = $('curR');
let mx = 0, my = 0, rx = 0, ry = 0;
if (cur && curR) {
  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (cur) {
      cur.style.left = mx + 'px';
      cur.style.top = my + 'px';
    }
  });
  function loopCursor() {
    if (curR) {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      curR.style.left = rx + 'px';
      curR.style.top = ry + 'px';
      requestAnimationFrame(loopCursor);
    }
  }
  loopCursor();
  document.addEventListener('mousedown', () => { if (cur) cur.classList.add('scale-150'); });
  document.addEventListener('mouseup', () => { if (cur) cur.classList.remove('scale-150'); });
}

// Screen Route controls
let splashDismissed = false;

if (typeof window !== 'undefined') {
  setTimeout(() => {
    if (typeof window.initArenaX3DBackgroundPreload === 'function') {
      window.initArenaX3DBackgroundPreload();
    }
  }, 50);
}
function goTo(screenId) {
  document.querySelectorAll('.scr, #sLogin, #sDash').forEach(s => s.classList.add('hidden'));
  const target = $(screenId);
  if (target) target.classList.remove('hidden');

  // Trigger smooth ArenaX splash exit if not already dismissed
  if (window.ArenaSplash) {
    window.ArenaSplash.finish();
  }
}
window.goTo = goTo;

// Helper to render Verified Blue Tick badge
window.getBlueTickBadgeHtml = function(userObj, sizeClass = 'w-4 h-4') {
  if (!userObj) return '';
  if (userObj.hasBlueTick || userObj.isVerified || userObj.blueTick || userObj.verified) {
    return `<img src="bluetick.png" class="${sizeClass} inline-block align-middle ml-1 shrink-0 drop-shadow-[0_0_6px_rgba(29,155,240,0.5)]" alt="Verified" title="Verified Badge"/>`;
  }
  return '';
};

// Helper to render Player Name with Premium Gold styling, VIP Font, and Verified Tick Badge
window.formatPlayerNameHtml = function(userObj, extraClasses = '', badgeSizeClass = 'w-4 h-4') {
  if (!userObj) return '';
  const name = userObj.name || userObj.userName || userObj.playerName || 'Player';
  const isPrem = !!(userObj.premium || userObj.isPremium || userObj.isVIP || userObj.vip);
  const isVer = !!(userObj.isVerified || userObj.hasBlueTick || userObj.blueTick || userObj.verified);
  const fontClass = (isPrem && userObj.selectedFont) ? userObj.selectedFont : '';

  let html = `<span class="${isPrem ? 'golden-name-shimmer text-amber-400 font-extrabold ' : ''}${fontClass ? fontClass + ' ' : ''}${extraClasses}">${name}</span>`;
  if (isPrem) {
    html += `<i class="fas fa-crown text-amber-400 text-xs ml-1 shrink-0" title="VIP Premium"></i>`;
  }
  if (isVer) {
    html += window.getBlueTickBadgeHtml(userObj, badgeSizeClass);
  }
  return html;
};

window.applyAvatarFrame = function(imgElement, isEquipped) {
  if (!imgElement) return;
  const parent = imgElement.parentElement;
  if (!parent) return;
  
  const computedPos = window.getComputedStyle(parent).position;
  if (computedPos === 'static') {
    parent.style.position = 'relative';
  }

  if (isEquipped) {
    if (parent.classList.contains('overflow-hidden')) {
      parent.classList.remove('overflow-hidden');
    }
    imgElement.classList.add('rounded-full', 'object-cover');
  }

  let existingFrame = parent.querySelector('.avatar-frame-overlay');
  if (isEquipped) {
    if (!existingFrame) {
      existingFrame = document.createElement('img');
      existingFrame.className = 'avatar-frame-overlay absolute -inset-[22%] w-[144%] h-[144%] pointer-events-none z-20 max-w-none object-contain';
      existingFrame.src = '/arenaX/avatarframe1.svg';
      existingFrame.onerror = function() { if(this.src.includes('/arenaX/avatarframe1.svg')){this.src='/avatarframe1.svg';}else if(this.src.includes('/avatarframe1.svg')){this.src='/avatarframe1.png';} };
      existingFrame.alt = 'Avatar Frame';
      parent.appendChild(existingFrame);
    }
  } else {
    if (existingFrame) {
      existingFrame.remove();
    }
  }
};

window.updateAllAvatarFrames = function() {
  const profile = window.userProfile || window.guestProfile || window.currentUser;
  const isEquippedLocal = localStorage.getItem('user_frame_equipped') === 'true';
  const isEquipped = !!(profile ? (profile.frameEquipped !== undefined ? profile.frameEquipped : isEquippedLocal) : isEquippedLocal);
  
  if (profile && profile.av) {
    ['avImg', 'homeAvImg', 'pAv', 'setAv', 'voiceMyAvatar', 'custAvPreview', 'taskModalUserAv', 'custModalFrameAvatar'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.src = profile.av;
    });
  }

  ['avImg', 'homeAvImg', 'pAv', 'setAv', 'voiceMyAvatar', 'custAvPreview', 'taskModalUserAv', 'custModalFrameAvatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) window.applyAvatarFrame(el, isEquipped);
  });
};

// Lauch Dashboard
function boot() {
  const profile = userProfile || guestProfile;
  const numId = 'ID: ' + getNumericPlayerId(profile.uid, profile.handle);
  $('pName').innerHTML = `${profile.name || 'Player'}${window.getBlueTickBadgeHtml(profile)}`;
  $('pHandle').textContent = numId;
  $('pAv').src = profile.av;
  $('avImg').src = profile.av;
  if ($('homeAvImg')) $('homeAvImg').src = profile.av;
  if ($('homeCoinsVal')) $('homeCoinsVal').textContent = (profile.balance || 0).toLocaleString();
  if ($('setName')) $('setName').innerHTML = `${profile.name || 'Player'}${window.getBlueTickBadgeHtml(profile)}`;
  if ($('setHandle')) $('setHandle').textContent = numId;
  if ($('setAv')) $('setAv').src = profile.av;
  $('wBal').textContent = (profile.balance || 0).toLocaleString();
  $('pPopularityVal').textContent = profile.popularity || 0;

  if (window.updateAllAvatarFrames) window.updateAllAvatarFrames();
  if (typeof window.preloadRankingData === 'function') window.preloadRankingData();
  if (typeof window.updatePlayerShowUI === 'function') window.updatePlayerShowUI(profile);

  // 1. Profile Banner Theme (Premium only)
  const card = $('profileCard');
  if (profile.premium && profile.bannerTheme) {
    const gradients = {
      red: 'linear-gradient(135deg, #3f0f15 0%, #1a0508 100%)',
      gold: 'linear-gradient(135deg, #3b2f0f 0%, #1a1405 100%)',
      blue: 'linear-gradient(135deg, #0f233f 0%, #050e1a 100%)',
      purple: 'linear-gradient(135deg, #2b0f3f 0%, #12051a 100%)',
      green: 'linear-gradient(135deg, #0f3f1e 0%, #051a0b 100%)',
      sunset: 'linear-gradient(135deg, #3f1e0f 0%, #1a0512 100%)',
      ocean: 'linear-gradient(135deg, #0f3f3b 0%, #051a18 100%)',
      dark: 'linear-gradient(135deg, #151821 0%, #0a0b10 100%)'
    };
    card.style.background = gradients[profile.bannerTheme] || '';
  } else {
    card.style.background = '';
  }

  // 2. Username Color (Premium only)
  const pNameEl = $('pName');
  if (pNameEl) {
    if (profile.premium && (profile.goldenNameEnabled !== false)) {
      pNameEl.classList.add('golden-name-shimmer');
      pNameEl.style.background = '';
      pNameEl.style.webkitBackgroundClip = '';
      pNameEl.style.webkitTextFillColor = '';
      pNameEl.style.fontWeight = '';
      pNameEl.style.fontStyle = 'italic';
      pNameEl.style.color = '';
    } else if (profile.premium && profile.nameColor) {
      pNameEl.classList.remove('golden-name-shimmer');
      pNameEl.style.background = 'none';
      pNameEl.style.webkitBackgroundClip = 'initial';
      pNameEl.style.webkitTextFillColor = 'initial';
      pNameEl.style.color = profile.nameColor;
      pNameEl.style.fontWeight = '';
      pNameEl.style.fontStyle = '';
    } else {
      pNameEl.classList.remove('golden-name-shimmer');
      pNameEl.style.background = 'none';
      pNameEl.style.webkitBackgroundClip = 'initial';
      pNameEl.style.webkitTextFillColor = 'initial';
      pNameEl.style.color = '';
      pNameEl.style.fontWeight = '';
      pNameEl.style.fontStyle = '';
    }

    // Apply VIP Custom Font to pName and setName
    const allFontClasses = [
      'font-poppins', 'font-orbitron', 'font-luckiest-guy', 'font-fredoka',
      'font-bungee', 'font-chakra', 'font-press-start', 'font-cinzel',
      'font-rajdhani', 'font-unifraktur', 'font-permanent-marker', 'font-pacifico'
    ];
    allFontClasses.forEach(cls => pNameEl.classList.remove(cls));
    if ((profile.premium || profile.isVIP || profile.isPremium) && profile.selectedFont) {
      pNameEl.classList.add(profile.selectedFont);
    }
    if ($('setName')) {
      allFontClasses.forEach(cls => $('setName').classList.remove(cls));
      if ((profile.premium || profile.isVIP || profile.isPremium) && profile.selectedFont) {
        $('setName').classList.add(profile.selectedFont);
      }
    }
  }

  // 3. Avatar Frame / Border Glow (Premium only)
  const avImg = $('pAv');
  if (profile.premium && profile.avatarFrame && profile.avatarFrame !== 'none') {
    const frameColors = {
      gold: '#c0a030',
      fire: '#ff4500',
      ice: '#00bfff',
      royal: '#8b5cf6'
    };
    const color = frameColors[profile.avatarFrame];
    avImg.style.boxShadow = `0 0 12px ${color}`;
    avImg.style.borderColor = color;
  } else {
    avImg.style.boxShadow = '';
    avImg.style.borderColor = '';
  }

  // 4. Custom Badge Display (Read-only)
  if (profile.badge) {
    $('pBadgeText').textContent = profile.badge;
    $('pBadge').classList.remove('hidden');
  } else {
    $('pBadge').classList.add('hidden');
  }

  // Render player-owned custom premium badges
  renderEarnedBadgesUI();

  // 5. Bio Description
  if (profile.bio) {
    $('pBio').textContent = profile.bio;
    $('pBio').classList.remove('hidden');
  } else {
    $('pBio').classList.add('hidden');
  }

  // 6. Game Info & Socials Details Card
  let hasDetails = false;
  
  if (profile.country) {
    const countryNames = {
      PK: '🇵🇰 Pakistan',
      IN: '🇮🇳 India',
      BD: '🇧🇩 Bangladesh',
      SA: '🇸🇦 Saudi Arabia',
      AE: '🇦🇪 UAE',
      US: '🇺🇸 USA',
      GB: '🇬🇧 UK',
      Other: '🌍 Other'
    };
    $('pDetailCountry').textContent = countryNames[profile.country] || profile.country;
    $('pDetailCountryContainer').classList.remove('hidden');
    hasDetails = true;
  } else {
    $('pDetailCountryContainer').classList.add('hidden');
  }

  if (profile.favoriteGame) {
    $('pDetailFavGame').textContent = profile.favoriteGame;
    $('pDetailFavGameContainer').classList.remove('hidden');
    hasDetails = true;
  } else {
    $('pDetailFavGameContainer').classList.add('hidden');
  }

  if (profile.gameUID) {
    $('pDetailGameUID').textContent = profile.gameUID;
    $('pDetailGameUIDContainer').classList.remove('hidden');
    hasDetails = true;
  } else {
    $('pDetailGameUIDContainer').classList.add('hidden');
  }

  let hasSocials = false;
  if (profile.socialDiscord) {
    $('pSocialDiscordText').textContent = profile.socialDiscord;
    $('pSocialDiscord').href = `https://discord.com/users/${profile.socialDiscord}`;
    $('pSocialDiscord').classList.remove('hidden');
    hasSocials = true;
  } else {
    $('pSocialDiscord').classList.add('hidden');
  }

  if (profile.socialInstagram) {
    $('pSocialInstagramText').textContent = profile.socialInstagram;
    $('pSocialInstagram').href = `https://instagram.com/${profile.socialInstagram.replace('@', '')}`;
    $('pSocialInstagram').classList.remove('hidden');
    hasSocials = true;
  } else {
    $('pSocialInstagram').classList.add('hidden');
  }

  if (profile.socialYoutube) {
    $('pSocialYoutube').href = profile.socialYoutube.startsWith('http') ? profile.socialYoutube : `https://youtube.com/${profile.socialYoutube}`;
    $('pSocialYoutube').classList.remove('hidden');
    hasSocials = true;
  } else {
    $('pSocialYoutube').classList.add('hidden');
  }

  if (hasSocials) {
    $('pDetailSocials').classList.remove('hidden');
    hasDetails = true;
  } else {
    $('pDetailSocials').classList.add('hidden');
  }

  if (hasDetails) {
    $('pDetailsCard').classList.remove('hidden');
  } else {
    $('pDetailsCard').classList.add('hidden');
  }

  if (guestProfile) {
    $('gBanner').classList.remove('hidden');
    $('badgeGuest').classList.remove('hidden');
    $('wLock').classList.remove('hidden');
    $('sLock').classList.remove('hidden');
    $('chatBox').classList.add('hidden');
    $('wCard').classList.add('opacity-35', 'pointer-events-none');
    $('prmPromo').classList.add('hidden');
    $('badgePrm').classList.add('hidden');
    $('prmBanner').classList.add('hidden');
  } else {
    $('gBanner').classList.add('hidden');
    $('badgeGuest').classList.add('hidden');
    $('wLock').classList.add('hidden');
    $('sLock').classList.add('hidden');
    $('chatBox').classList.remove('hidden');
    $('wCard').classList.remove('opacity-35', 'pointer-events-none');
    
    // Check and set Premium states
    if (userProfile.premium) {
      $('badgePrm').classList.remove('hidden');
      $('prmBanner').classList.remove('hidden');
      $('prmPromo').classList.add('hidden');
      $('profileCard').classList.add('prm-glow');
    } else {
      $('badgePrm').classList.add('hidden');
      $('prmBanner').classList.add('hidden');
      $('prmPromo').classList.remove('hidden');
      $('profileCard').classList.remove('prm-glow');
    }
  }

  // Set referral link for logged-in users (Production-ready GitHub Pages URL as requested)
  if (userProfile) {
    $('referralLinkInput').value = window.location.origin + window.location.pathname + '?ref=' + userProfile.uid;
  } else {
    $('referralLinkInput').value = 'Link restricted. Please authenticate fully to get a referral code!';
  }

  loadTournamentsList();
  // Auto refresh live tournament stats every 3 seconds
  if (!window.tournamentAutoRefreshInterval) {
    window.tournamentAutoRefreshInterval = setInterval(() => {
      if (typeof renderTournaments === 'function') {
        renderTournaments();
      }
    }, 3000);
  }
  loadLiveNotifications();
  if (typeof window.initGlobalChat === 'function') {
    window.initGlobalChat();
  }
  
  if (window.ArenaSplash) {
    window.ArenaSplash.status('Ready');
    window.ArenaSplash.finish();
  }

  goTo('sDash');

  if (!devPopupShownThisSession) {
    $('mUnderDevPopup').classList.remove('hidden');
    devPopupShownThisSession = true;
  }
  if (typeof initVoiceRoomsSystem === 'function') {
    initVoiceRoomsSystem();
  }
  if (typeof renderProfileMomentsSection === 'function') {
    renderProfileMomentsSection();
  }
  syncPremiumModalState();
  if (typeof window.updateDiscordSecurityUI === 'function') {
    window.updateDiscordSecurityUI();
  }
  if (typeof window.checkDiscordJustLinked === 'function') {
    window.checkDiscordJustLinked();
  }
  if (typeof window.checkAndProcessDiscordCallback === 'function') {
    window.checkAndProcessDiscordCallback();
  }
}

function syncPremiumModalState() {
  const profile = userProfile || guestProfile;
  const isPremium = profile ? !!profile.premium : false;
  
  const purchaseView = document.getElementById('prmPurchaseView');
  const activeView = document.getElementById('prmActiveView');
  const activeVideo = document.getElementById('prmActiveVideo');
  
  if (purchaseView && activeView) {
    if (isPremium) {
      purchaseView.classList.add('hidden');
      activeView.classList.remove('hidden');
      if (activeVideo) {
        activeVideo.play().catch(err => console.log("Premium video playback error:", err));
      }
    } else {
      purchaseView.classList.remove('hidden');
      activeView.classList.add('hidden');
    }
  }
}
window.syncPremiumModalState = syncPremiumModalState;

// Navigation Tab controls
function switchTab(tabId) {
  if (tabId === 'Support') {
    if (typeof window.openSupportDrawer === 'function') {
      window.openSupportDrawer();
    }
    return;
  }
  if (tabId === 'Voice') {
    if (typeof window.listenToVoiceRooms === 'function') {
      window.listenToVoiceRooms();
    }
  }
  activeMainTab = tabId;
  window.activeMainTab = tabId;
  document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
  $('t' + tabId).classList.remove('hidden');
  document.querySelectorAll('.ni').forEach(btn => {
    const isTarget = btn.dataset.t === tabId;
    if (isTarget) {
      btn.classList.add('text-gold');
      btn.classList.remove('text-t3');
    } else {
      btn.classList.remove('text-gold');
      btn.classList.add('text-t3');
    }

    // Special active animation glow for center Events circle button
    const centerCircle = $('centerEventBtnCircle');
    if (centerCircle) {
      if (tabId === 'Tour') {
        centerCircle.classList.add('ring-4', 'ring-indigo-400/60', 'scale-105');
        if ($('navEventsText')) {
          $('navEventsText').classList.add('text-indigo-400');
          $('navEventsText').classList.remove('text-t3');
        }
      } else {
        centerCircle.classList.remove('ring-4', 'ring-indigo-400/60', 'scale-105');
        if ($('navEventsText')) {
          $('navEventsText').classList.remove('text-indigo-400');
          $('navEventsText').classList.add('text-t3');
        }
      }
    }
  });

  if (tabId === 'Chat') {
    loadFriendSystem();
    if (activeChatSubTab === 'global') {
      unreadGlobal = false;
      updateChatUnreadDot();
      updateSubGlobalDot();
    }
  }

  if (tabId === 'Tour') {
    if (typeof window.renderTournaments === 'function') {
      window.renderTournaments();
    }
    // Set daily tasks visit flag to true
    if (userProfile) {
      const todayStr = new Date(Date.now() + (5 * 60 * 60 * 1000)).toISOString().split('T')[0];
      updateDoc(doc(db, 'users', userProfile.uid), {
        'dailyTasks.visit': true,
        'dailyTasks.date': todayStr
      }).catch(e => console.warn(e));
    }
  }

  if (tabId === 'Submission') {
    if (typeof window.playSubmissionSplash === 'function') {
      window.playSubmissionSplash();
    }
  }
}
window.switchTab = switchTab;

document.querySelectorAll('.ni').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.t));
});

function mergeAndRenderTransactions() {
  const combined = [...userDepositsList, ...userProfileTransactionsList];
  combined.sort((a, b) => {
    let timeA = 0;
    if (a.submittedAt) {
      timeA = a.submittedAt.seconds ? a.submittedAt.seconds * 1000 : new Date(a.submittedAt).getTime();
    } else if (a.timestamp) {
      timeA = new Date(a.timestamp).getTime();
    } else if (a.createdAt) {
      timeA = a.createdAt.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime();
    }
    
    let timeB = 0;
    if (b.submittedAt) {
      timeB = b.submittedAt.seconds ? b.submittedAt.seconds * 1000 : new Date(b.submittedAt).getTime();
    } else if (b.timestamp) {
      timeB = new Date(b.timestamp).getTime();
    } else if (b.createdAt) {
      timeB = b.createdAt.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime();
    }
    
    return timeB - timeA;
  });
  renderUserDeposits(combined);
}

// Setup global listener unsubs
let userProfileUnsub = null;
let friendReqsUnsub = null;
let friendsListUnsub = null;
let notificationsUnsub = null;
let invitationsUnsub = null;
let activeRoomMembersUnsub = null;
let activeRoomChatUnsub = null;
let activeRoomSignalingUnsub = null;
let activeRoomDocUnsub = null;

function cleanupAllUserListeners() {
  console.log("[Auth Engine] Cleaning up all active user-specific snapshot listeners...");
  if (userProfileUnsub) {
    try { userProfileUnsub(); } catch(e){}
    userProfileUnsub = null;
  }
  if (typeof depositUnsub !== 'undefined' && depositUnsub) {
    try { depositUnsub(); } catch(e){}
    depositUnsub = null;
  }
  if (window.userMailsUnsub) {
    try { window.userMailsUnsub(); } catch(e){}
    window.userMailsUnsub = null;
  }
  if (window.userSubmissionsUnsub) {
    try { window.userSubmissionsUnsub(); } catch(e) {}
    window.userSubmissionsUnsub = null;
  }
  if (notificationsUnsub) {
    try { notificationsUnsub(); } catch(e){}
    notificationsUnsub = null;
  }
  if (friendReqsUnsub) {
    try { friendReqsUnsub(); } catch(e){}
    friendReqsUnsub = null;
  }
  if (friendsListUnsub) {
    try { friendsListUnsub(); } catch(e){}
    friendsListUnsub = null;
  }
  if (typeof invitationsUnsub !== 'undefined' && invitationsUnsub) {
    try { invitationsUnsub(); } catch(e){}
    invitationsUnsub = null;
  }
  if (typeof globalChatUnsub !== 'undefined' && globalChatUnsub) {
    try { globalChatUnsub(); } catch(e){}
    globalChatUnsub = null;
  }
  if (typeof globalChatTypingUnsub !== 'undefined' && globalChatTypingUnsub) {
    try { globalChatTypingUnsub(); } catch(e){}
    globalChatTypingUnsub = null;
  }
  if (typeof activeRoomSignalingUnsub !== 'undefined' && activeRoomSignalingUnsub) {
    try { activeRoomSignalingUnsub(); } catch(e){}
    activeRoomSignalingUnsub = null;
  }
  if (typeof activeRoomDocUnsub !== 'undefined' && activeRoomDocUnsub) {
    try { activeRoomDocUnsub(); } catch(e){}
    activeRoomDocUnsub = null;
  }
  if (typeof activeRoomMembersUnsub !== 'undefined' && activeRoomMembersUnsub) {
    try { activeRoomMembersUnsub(); } catch(e){}
    activeRoomMembersUnsub = null;
  }
  if (typeof activeRoomChatUnsub !== 'undefined' && activeRoomChatUnsub) {
    try { activeRoomChatUnsub(); } catch(e){}
    activeRoomChatUnsub = null;
  }
}

// Setup Auth State listener
onAuthStateChanged(auth, async (fireUser) => {
  cleanupAllUserListeners();
  if (fireUser && !guestProfile) {
    // Check email verification for password auth users
    const isPasswordUser = fireUser.providerData.some(p => p.providerId === 'password') || (fireUser.email && !fireUser.providerData.some(p => p.providerId === 'google.com'));
    if (isPasswordUser) {
      try {
        await fireUser.reload();
      } catch (e) {}
      if (!fireUser.emailVerified) {
        console.warn("[Auth Engine] Unverified email. Access blocked until verified.");
        userProfile = null;
        cleanupAllUserListeners();
        await signOut(auth);
        if ($('loginErr')) {
          $('loginErr').textContent = '⚠️ Email Not Verified! A verification link was sent to ' + (fireUser.email || '') + '. Please verify your email in your inbox before entering ArenaX.';
          $('loginErr').classList.remove('hidden');
        }
        if ($('btnResendVerifyLogin')) {
          $('btnResendVerifyLogin').classList.remove('hidden');
        }
        goTo('sLogin');
        return;
      }
    }

    // Start real-time submissions listener
    if (typeof window.startUserSubmissionsListener === 'function') {
      window.startUserSubmissionsListener(fireUser.uid);
    }

    // Start real-time deposit listener for user
    const qDeposits = query(
      collection(db, 'deposit_requests'),
      where('userId', '==', fireUser.uid)
    );
    depositUnsub = onSnapshot(qDeposits, (dSnap) => {
      let list = [];
      dSnap.forEach(dDoc => {
        list.push({ id: dDoc.id, ...dDoc.data() });
      });
      userDepositsList = list;
      mergeAndRenderTransactions();
    }, (err) => {
      console.warn("Deposits listen warning:", err);
    });

    // Start real-time mails listener for user
    const qMails = query(
      collection(db, 'users', fireUser.uid, 'mails'),
      orderBy('createdAt', 'desc')
    );
    window.userMailsUnsub = onSnapshot(qMails, (mSnap) => {
      let list = [];
      let uncollectedCount = 0;
      mSnap.forEach(mDoc => {
        const d = mDoc.data();
        list.push({ id: mDoc.id, ...d });
        if (!d.read) {
          uncollectedCount++;
        } else if (d.giftBadgeId && !d.collected) {
          uncollectedCount++;
        }
      });
      window.userMails = list;
      if ($('mInboxBadges') && !$('mInboxBadges').classList.contains('hidden')) {
        renderInboxUI();
      }
      updateInboxNotificationBadge(uncollectedCount);
    }, (err) => {
      console.error("Error fetching player mails: ", err);
    });

    // Read and listen to Firestore User Profile in real time!
    userProfileUnsub = onSnapshot(doc(db, 'users', fireUser.uid), (snap) => {
      if (snap.exists()) {
        userProfile = { ...snap.data(), id: fireUser.uid, uid: fireUser.uid };
        window.userProfile = userProfile;
        window.currentUser = userProfile;
        userProfileTransactionsList = userProfile.transactions || [];
        mergeAndRenderTransactions();
        
        // Comprehensive Account Moderation & Ban Checker
        const isPermBanned = (userProfile.banned && userProfile.banType === 'full') || userProfile.accountStatus === 'permanently_blocked';
        if (isPermBanned) {
          const ruleInfo = userProfile.banRule ? `\nViolation Reference: ${userProfile.banRule}` : '';
          alert(`❌ Account Permanently Banned!\n\nReason: ${userProfile.banReason || 'Severe Rule Violations'}${ruleInfo}\n\nThis account has been permanently suspended by ArenaX Moderation.`);
          signOut(auth);
          userProfile = null;
          goTo('sLogin');
          return;
        }

        const isTempBanned = (userProfile.banned && userProfile.banType === 'temporary') || userProfile.accountStatus === 'temporarily_blocked';
        if (isTempBanned) {
          const banUntilVal = userProfile.blockedUntil || userProfile.banUntil;
          const untilDate = banUntilVal ? (banUntilVal.toDate ? banUntilVal.toDate() : new Date(banUntilVal)) : null;
          
          if (untilDate && Date.now() < untilDate.getTime()) {
            const timeStr = untilDate.toLocaleString();
            alert(`⏳ Account Temporarily Blocked!\n\nAccess blocked until: ${timeStr}\nReason: ${userProfile.banReason || 'Policy Violation'}\n\nYour account will be restored once the block duration expires.`);
            signOut(auth);
            userProfile = null;
            goTo('sLogin');
            return;
          } else if (untilDate && Date.now() >= untilDate.getTime()) {
            // Temporary ban expired, automatically unban in database
            updateDoc(doc(db, 'users', fireUser.uid), {
              banned: false,
              banType: 'none',
              accountStatus: 'active',
              blockedUntil: null,
              banUntil: null
            }).catch(console.warn);
            userProfile.banned = false;
            userProfile.accountStatus = 'active';
          }
        }

        // Suspension / Restriction Check
        if (userProfile.restricted || userProfile.accountStatus === 'restricted') {
          if (userProfile.restrictedUntil) {
            const untilDate = userProfile.restrictedUntil.toDate ? userProfile.restrictedUntil.toDate() : new Date(userProfile.restrictedUntil);
            if (Date.now() >= untilDate.getTime()) {
              // Restriction expired
              updateDoc(doc(db, 'users', fireUser.uid), {
                restricted: false,
                accountStatus: 'active',
                restrictedUntil: null
              }).catch(console.warn);
              userProfile.restricted = false;
              userProfile.accountStatus = 'active';
            }
          }
        }

        boot();
      } else {
        // Bootstrap new user in Firestore
        const defaultName = fireUser.displayName || (fireUser.email ? fireUser.email.split('@')[0] : 'ArenaX Player');
        const defaultHandle = getNumericPlayerId(fireUser.uid);
        const defaultAv = fireUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fireUser.uid}`;

        const refId = localStorage.getItem('arenaX_ref');
        const newProfile = {
          uid: fireUser.uid,
          name: defaultName,
          handle: defaultHandle,
          av: defaultAv,
          email: fireUser.email || '',
          premium: false,
          banned: false,
          banType: 'none',
          banReason: '',
          banUntil: null,
          balance: 0,
          createdAt: new Date().toISOString()
        };

        if (refId && refId !== fireUser.uid) {
          newProfile.referredBy = refId;
        }

        setDoc(doc(db, 'users', fireUser.uid), newProfile)
          .then(async () => {
            userProfile = { ...newProfile, id: fireUser.uid, uid: fireUser.uid };

            // If user has been referred, credit the referrer
            if (refId && refId !== fireUser.uid) {
              localStorage.removeItem('arenaX_ref');
              try {
                const refUserDocRef = doc(db, 'users', refId);
                const refSnap = await getDoc(refUserDocRef);
                if (refSnap.exists()) {
                  const referrerData = refSnap.data();

                  // Award 50 AX Coins to the referrer
                  await updateDoc(refUserDocRef, {
                    balance: increment(50)
                  });

                  // Log as an approved deposit in transaction logs
                  const txnId = 'REF-BONUS-' + Math.floor(100000 + Math.random() * 900000);
                  await addDoc(collection(db, 'deposit_requests'), {
                    userId: refId,
                    userName: referrerData.name,
                    userHandle: referrerData.handle,
                    amountPKR: 0,
                    amountAX: 50,
                    method: 'Referral Bonus',
                    txnId: txnId,
                    status: 'approved',
                    type: 'deposit',
                    notes: `Referred new player: ${defaultName}`,
                    submittedAt: serverTimestamp()
                  });

                  // Add notification for referrer
                  await addDoc(collection(db, 'notifications'), {
                    userId: refId,
                    title: 'Referral Reward Credited! 🎁',
                    body: `Your friend ${defaultName} joined ArenaX! You have been rewarded 50 AX Coins.`,
                    createdAt: serverTimestamp(),
                    read: false
                  });

                  // Create a referral tracking record
                  await addDoc(collection(db, 'referrals'), {
                    referredBy: refId,
                    referredUserId: fireUser.uid,
                    referredUserName: defaultName,
                    createdAt: serverTimestamp()
                  });
                }
              } catch (refErr) {
                console.error('Failed to reward referrer:', refErr);
              }
            }

            boot();
          })
          .catch(err => console.error('Bootstrap profile error: ', err));
      }
    }, (err) => {
      console.warn("Firestore user profile snapshot listener warning (non-fatal):", err);
      if (err.code === 'permission-denied') {
        console.log("[Auth Engine] Attempting to refresh user authentication session...");
        if (auth.currentUser) {
          auth.currentUser.getIdToken(true)
            .then(() => console.log("[Auth Engine] Session re-verified and token refreshed successfully."))
            .catch(e => console.error("[Auth Engine] Failed to refresh token during snapshot failure:", e));
        }
      }
    });
  } else if (!guestProfile) {
    if (window.unsubReferrals) {
      try { window.unsubReferrals(); } catch (e) {}
      window.unsubReferrals = null;
    }
    userProfile = null;
    goTo('sLogin');
  }
});

// Auth Trigger handlers
$('bGoogle').addEventListener('click', async () => {
  if (!$('termsCheckbox').checked) {
    $('loginErr').textContent = '⚠️ You must agree to the Terms & Conditions and Privacy Policy to enter the Arena!';
    $('loginErr').classList.remove('hidden');
    return;
  }
  $('loginErr').classList.add('hidden');
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      $('loginErr').textContent = err.message;
      $('loginErr').classList.remove('hidden');
    }
  }
});

let currentLoginMode = 'login';

$('lnkSignup').addEventListener('click', () => {
  if (currentLoginMode === 'login') {
    currentLoginMode = 'signup';
    $('loginTitle').textContent = 'Create Account';
    $('iUsername').classList.remove('hidden');
    $('bEmail').textContent = 'Sign up';
    $('lnkForgot').classList.add('hidden');
    $('txtTogglePrompt').textContent = 'Have an account?';
    $('lnkSignup').textContent = 'Sign in';
    $('loginErr').classList.add('hidden');
  } else {
    currentLoginMode = 'login';
    $('loginTitle').textContent = 'Welcome back';
    $('iUsername').classList.add('hidden');
    $('bEmail').textContent = 'Log in';
    $('lnkForgot').classList.remove('hidden');
    $('txtTogglePrompt').textContent = "Don't have an account?";
    $('lnkSignup').textContent = 'Sign up';
    $('loginErr').classList.add('hidden');
  }
});

$('bEmail').addEventListener('click', async () => {
  if (!$('termsCheckbox').checked) {
    $('loginErr').textContent = '⚠️ You must agree to the Terms & Conditions and Privacy Policy to enter the Arena!';
    $('loginErr').classList.remove('hidden');
    return;
  }
  
  const em = $('iEmail').value.trim();
  const pw = $('iPass').value.trim();

  const validateEmailFormat = (str) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(str);

  if (!em || !pw) {
    $('loginErr').textContent = '⚠️ Please enter both email address and password.';
    $('loginErr').classList.remove('hidden');
    return;
  }

  if (!validateEmailFormat(em)) {
    $('loginErr').textContent = '⚠️ Please enter a valid real email address (e.g. name@example.com).';
    $('loginErr').classList.remove('hidden');
    return;
  }

  if (pw.length < 6) {
    $('loginErr').textContent = '⚠️ Password must be at least 6 characters.';
    $('loginErr').classList.remove('hidden');
    return;
  }

  if (currentLoginMode === 'signup') {
    const username = $('iUsername').value.trim();
    if (!username) {
      $('loginErr').textContent = 'Please enter a username.';
      $('loginErr').classList.remove('hidden');
      return;
    }

    $('loginErr').classList.add('hidden');
    try {
      const cred = await createUserWithEmailAndPassword(auth, em, pw);
      await updateProfile(cred.user, { displayName: username });
      
      // Send verification email
      try {
        await sendEmailVerification(cred.user);
      } catch (vErr) {
        console.warn('Email verification send error:', vErr);
      }

      // Force sign out until email is verified
      await signOut(auth);

      alert('✉️ Account created successfully! A verification email has been sent to ' + em + '.\n\nPlease check your inbox and spam folder and click the verification link before signing in.');
      
      // Switch UI to login mode
      $('lnkSignup').click();
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        $('loginErr').textContent = '⚠️ This email address is already registered. Please sign in or reset password.';
      } else if (err.code === 'auth/invalid-email') {
        $('loginErr').textContent = '⚠️ Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        $('loginErr').textContent = '⚠️ Password must be at least 6 characters.';
      } else {
        $('loginErr').textContent = err.message;
      }
      $('loginErr').classList.remove('hidden');
    }
  } else {
    $('loginErr').classList.add('hidden');
    try {
      const cred = await signInWithEmailAndPassword(auth, em, pw);

      // Block unverified logins
      if (!cred.user.emailVerified) {
        await signOut(auth);
        $('loginErr').textContent = '⚠️ Email Not Verified! We sent a verification link to ' + em + '. Please check your inbox and click the link to verify before logging in.';
        $('loginErr').classList.remove('hidden');
        return;
      }
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        $('loginErr').textContent = '⚠️ Incorrect email or password. Please try again or click Forgot Password!';
      } else if (err.code === 'auth/invalid-email') {
        $('loginErr').textContent = '⚠️ Please enter a valid email address.';
      } else {
        $('loginErr').textContent = err.message;
      }
      $('loginErr').classList.remove('hidden');
    }
  }
});

// Forgot Password Handler
$('lnkForgot').addEventListener('click', async () => {
  const em = $('iEmail').value.trim();
  if (!em) {
    $('loginErr').textContent = '⚠️ Please enter your email address in the Email field above to reset your password.';
    $('loginErr').classList.remove('hidden');
    return;
  }
  try {
    await sendPasswordResetEmail(auth, em);
    alert('✉️ Password reset link sent!\n\nWe have sent a password reset email to: ' + em + '\nPlease check your inbox and spam folder.');
    $('loginErr').classList.add('hidden');
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      $('loginErr').textContent = '⚠️ No registered user found with this email address. Please sign up!';
    } else if (err.code === 'auth/invalid-email') {
      $('loginErr').textContent = '⚠️ Please enter a valid email address.';
    } else {
      $('loginErr').textContent = '⚠️ ' + err.message;
    }
    $('loginErr').classList.remove('hidden');
  }
});

// Guest Sign In Flow
$('bGuest').addEventListener('click', () => {
  if (!$('termsCheckbox').checked) {
    $('loginErr').textContent = '⚠️ You must agree to the Terms & Conditions and Privacy Policy to enter the Arena!';
    $('loginErr').classList.remove('hidden');
    return;
  }
  $('mGuest').classList.remove('hidden');
});
$('bGBack').addEventListener('click', () => $('mGuest').classList.add('hidden'));
$('bGConfirm').addEventListener('click', () => {
  if (!$('termsCheckbox').checked) {
    alert('You must agree to the Terms & Conditions and Privacy Policy to enter the Arena!');
    return;
  }
  $('mGuest').classList.add('hidden');
  const gid = Math.floor(100000 + Math.random() * 900000);
  guestProfile = {
    uid: `guest_${gid}`,
    name: 'Guest Player',
    handle: `@guest#${gid}`,
    av: `https://api.dicebear.com/7.x/bottts/svg?seed=g${gid}`,
    email: '',
    premium: false,
    banned: false,
    balance: 0
  };
  userProfile = null;
  boot();
});

// Resend Verification Email Handler
if ($('btnResendVerifyLogin')) {
  $('btnResendVerifyLogin').addEventListener('click', async () => {
    const em = $('iEmail').value.trim();
    const pw = $('iPass').value.trim();
    if (!em || !pw) {
      alert('Please enter your registered Email and Password above to resend the verification email.');
      return;
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, em, pw);
      if (cred.user.emailVerified) {
        alert('Your email is already verified! You can log in now.');
        $('btnResendVerifyLogin').classList.add('hidden');
      } else {
        await sendEmailVerification(cred.user);
        alert('✉️ Verification email sent! Please check your inbox and spam folder at: ' + em);
      }
      await signOut(auth);
    } catch (err) {
      alert('Error: ' + (err.message || err));
    }
  });
}

// Log out handler
$('bLogout').addEventListener('click', async () => {
  if (!confirm('Are you sure you want to sign out?')) return;
  guestProfile = null;
  userProfile = null;
  cleanupAllUserListeners();
  goTo('sLogin');
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Sign out error:', err);
  }
});

// Delete account handler
if ($('bDeleteAccount')) {
  $('bDeleteAccount').addEventListener('click', async () => {
    if (!confirm('⚠️ Are you sure you want to PERMANENTLY delete your ArenaX account?\n\nThis action cannot be undone. All your stats, wallet balance, and tournament records will be permanently erased.')) return;
    
    if (guestProfile) {
      guestProfile = null;
      userProfile = null;
      cleanupAllUserListeners();
      goTo('sLogin');
      alert('Guest profile cleared.');
      return;
    }

    const fireUser = auth.currentUser;
    if (fireUser) {
      try {
        const uid = fireUser.uid;
        try {
          await deleteDoc(doc(db, 'users', uid));
        } catch (e) {
          console.warn("Error deleting Firestore user doc:", e);
        }
        await deleteUser(fireUser);
        userProfile = null;
        cleanupAllUserListeners();
        goTo('sLogin');
        alert('Your ArenaX account has been permanently deleted.');
      } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
          alert('For security reasons, please sign out and sign in again before deleting your account.');
        } else {
          alert('Delete account error: ' + (err.message || err));
        }
      }
    }
  });
}

// ── TOURNAMENTS LOGIC ──
function loadTournamentsList() {
  const q = query(collection(db, 'tournaments'));
  onSnapshot(q, (snap) => {
    toursData = [];
    snap.forEach(d => {
      toursData.push({ id: d.id, ...d.data() });
    });

    // Client-side sort by createdAt descending
    toursData.sort((a, b) => {
      const timeA = a.createdAt?.seconds || a.createdAt || 0;
      const timeB = b.createdAt?.seconds || b.createdAt || 0;
      return timeB - timeA;
    });

    // Automatically enforce 'soccer' accentTheme on any Champions, Soccer, or Football tournaments loaded from database
    toursData.forEach(t => {
      if (t.name && (t.name.toLowerCase().includes('champions') || t.name.toLowerCase().includes('soccer') || t.name.toLowerCase().includes('football'))) {
        t.accentTheme = 'soccer';
      }
    });
    
    // Listen to user registrations
    const profile = userProfile || guestProfile;
    if (profile && !guestProfile) {
      const qRegs = query(
        collection(db, 'tournament_registrations'),
        where('userId', '==', profile.uid)
      );
      onSnapshot(qRegs, (regSnap) => {
        userRegs = {};
        regSnap.forEach(rd => {
          const r = rd.data();
          userRegs[r.tournamentId] = { id: rd.id, ...r };
        });
        renderTournaments();
      }, (err) => {
        console.warn("Registrations listen error:", err);
        renderTournaments();
      });
    } else {
      renderTournaments();
    }
  }, (err) => {
    console.warn("Tournaments listen error:", err);
    // Use fallback demo data on listen failure
    toursData = [
      {
        id: 'demo_champions',
        name: 'ArenaX Champions Cup',
        game: 'eFootball / FC 24',
        status: 'upcoming',
        registered: 12,
        maxPlayers: 32,
        prize: '50,000 AX Coins',
        date: 'Jul 15, 2026',
        time: '08:00 PM PKT',
        entryFee: 'Rs 200',
        teamType: 'Squad (4 Players)',
        hasTeams: true,
        accentTheme: 'soccer'
      },
      {
        id: 'demo1',
        name: 'Grand RP Duo Showdown',
        game: 'Grand RP Mobile',
        status: 'live',
        registered: 18,
        maxPlayers: 32,
        prize: '10,000 AX',
        date: 'Live Now',
        time: '08:00 PM',
        entryFee: 'Rs 150',
        teamType: 'Duo (2 Players)',
        accentTheme: 'crimson'
      },
      {
        id: 'demo2',
        name: 'City Cup Championship',
        game: 'Grand RP Mobile',
        status: 'upcoming',
        registered: 4,
        maxPlayers: 64,
        prize: '25,000 AX',
        date: 'July 5, 2026',
        time: '09:00 PM',
        entryFee: 'Free',
        teamType: 'Squad (4 Players)',
        accentTheme: 'ice'
      }
    ];
    renderTournaments();
  });
}

function getLiveTrackerWidgetHTML(t) {
  if (t.status !== 'live') return '';
  
  const total = t.totalPlayers !== undefined ? t.totalPlayers : (t.registered || 0);
  const alive = t.alivePlayers !== undefined ? t.alivePlayers : total;
  const dead = t.eliminatedPlayers !== undefined ? t.eliminatedPlayers : 0;
  
  const percent = total > 0 ? (alive / total) * 100 : 0;
  
  // Choose status message
  let statusMsg = '';
  if (alive === 1) {
    statusMsg = `
      <div class="mt-2 text-center text-xs font-black text-gold animate-bounce flex items-center justify-center gap-1">
        <span>🏆 Winner Announced Soon!</span>
      </div>
    `;
  } else if (alive === 0 && t.winnerName) {
    statusMsg = `
      <div class="mt-2 text-center p-1.5 bg-gold/15 border border-gold/30 rounded-lg">
        <div class="text-[9px] uppercase tracking-widest text-gold font-black">MATCH CHAMPION</div>
        <div class="text-xs font-black text-white flex items-center justify-center gap-1.5 mt-0.5">
          <i class="fas fa-trophy text-gold"></i> ${t.winnerName}
        </div>
      </div>
    `;
  }
  
  return `
    <div class="bg-[#0b0e17] border border-red/40 rounded-xl p-3.5 space-y-2.5 relative overflow-hidden shadow-[0_0_15px_rgba(232,64,74,0.08)] mb-3">
      <!-- Glow effect -->
      <div class="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-red to-transparent"></div>
      
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-black text-red tracking-wider flex items-center gap-1.5 uppercase">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-red"></span>
          </span>
          LIVE MATCH IN PROGRESS
        </span>
        <span class="text-[9px] text-t3 font-mono font-bold uppercase tracking-wider">Tracker Mode</span>
      </div>
      
      <div class="grid grid-cols-2 gap-3 text-xs pt-1">
        <div class="bg-[#121625]/40 border border-bdr/20 p-2 rounded-lg flex flex-col justify-center">
          <div class="text-[9px] text-t3 uppercase font-black tracking-wider mb-0.5">Total Players</div>
          <div class="text-white font-mono font-black text-sm flex items-center gap-1">
            <i class="fas fa-users text-t3 text-xs"></i> ${total}
          </div>
        </div>
        
        <div class="bg-[#121625]/40 border border-bdr/20 p-2 rounded-lg space-y-1.5">
          <div class="flex justify-between text-[9px] font-black uppercase tracking-wider">
            <span class="text-green">🟢 Alive: ${alive}</span>
            <span class="text-red">💀 Dead: ${dead}</span>
          </div>
          <!-- Mini Progress Bar -->
          <div class="w-full h-2 bg-red rounded-full overflow-hidden flex border border-bdr/10">
            <div class="h-full bg-green transition-all duration-500" style="width: ${percent}%;"></div>
          </div>
        </div>
      </div>
      
      ${statusMsg}
    </div>
  `;
}

function renderTournaments() {
  const listEl = $('tList');
  if (!listEl) return;
  listEl.innerHTML = '';
  const filter = activeTournamentFilter();
  const data = toursData || [];
  const filtered = data.filter(t => {
    // Team War tournaments are exclusive to the Squad Team Wars tab
    if (t.teamType === 'Team War') return false;
    return filter === 'all' || t.status === filter;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="p-8 bg-card border border-bdr rounded-xl text-center text-xs text-t3">
        <i class="fas fa-calendar-times text-2xl mb-2"></i>
        <p>No tournaments matches found in this category.</p>
      </div>`;
    return;
  }

  filtered.forEach(t => {
    const reg = userRegs[t.id];
    const borderCls = reg && reg.status === 'approved' ? 'border-green bg-green/5' : reg && reg.status === 'rejected' ? 'border-red/40 bg-red/5' : 'border-bdr';

    let dynamicCardClasses = `p-4 bg-card border ${borderCls} rounded-xl space-y-3 relative transition hover:border-gold duration-200 cursor-pointer`;
    if (t.accentTheme === 'crimson') {
      dynamicCardClasses = `p-4 bg-gradient-to-b from-red/10 to-card/95 border border-red/40 rounded-xl space-y-3 relative transition hover:border-red duration-200 cursor-pointer shadow-[0_0_12px_rgba(232,64,74,0.05)]`;
    } else if (t.accentTheme === 'gold') {
      dynamicCardClasses = `p-4 bg-gradient-to-b from-gold/10 to-card/95 border border-gold/40 rounded-xl space-y-3 relative transition hover:border-gold duration-200 cursor-pointer shadow-[0_0_12px_rgba(240,192,64,0.05)]`;
    } else if (t.accentTheme === 'royal') {
      dynamicCardClasses = `p-4 bg-gradient-to-b from-purple/10 to-card/95 border border-purple/40 rounded-xl space-y-3 relative transition hover:border-purple duration-200 cursor-pointer shadow-[0_0_12px_rgba(167,139,250,0.05)]`;
    } else if (t.accentTheme === 'mint') {
      dynamicCardClasses = `p-4 bg-gradient-to-b from-green/10 to-card/95 border border-green/40 rounded-xl space-y-3 relative transition hover:border-green duration-200 cursor-pointer shadow-[0_0_12px_rgba(61,220,132,0.05)]`;
    } else if (t.accentTheme === 'ice') {
      dynamicCardClasses = `p-4 bg-gradient-to-b from-blue/10 to-card/95 border border-blue/40 rounded-xl space-y-3 relative transition hover:border-blue duration-200 cursor-pointer shadow-[0_0_12px_rgba(79,158,255,0.05)]`;
    } else if (t.accentTheme === 'soccer') {
      dynamicCardClasses = `p-5 bg-gradient-to-br from-[#0c2e1f] via-[#101917] to-[#0a0c12] border-2 border-emerald-500/50 hover:border-emerald-300 rounded-2xl space-y-3.5 relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_25px_rgba(16,185,129,0.25)] cursor-pointer group`;
    }

    const card = document.createElement('div');
    card.className = dynamicCardClasses;

    if (t.accentTheme === 'soccer') {
      card.innerHTML = `
        <!-- Soccer Pitch Visual Gridlines -->
        <div class="absolute inset-0 opacity-[0.05] pointer-events-none select-none">
          <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-white"></div>
          <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-white"></div>
          <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white"></div>
          <div class="absolute inset-4 border border-white"></div>
        </div>
        
        <!-- Glowing Ambient Lights -->
        <div class="absolute top-0 left-1/4 w-16 h-1 bg-emerald-400 blur-sm"></div>
        <div class="absolute top-0 right-1/4 w-16 h-1 bg-emerald-400 blur-sm"></div>
        
        <!-- Background Icon -->
        <div class="absolute -right-8 -bottom-8 opacity-10 text-emerald-400 text-8xl rotate-12 transition-transform duration-500 group-hover:rotate-45 pointer-events-none select-none">
          <i class="fas fa-futbol"></i>
        </div>

        ${getLiveTrackerWidgetHTML(t)}

        <div class="flex justify-between items-start gap-3 relative z-10">
          <div>
            <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span class="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[8px] font-black uppercase tracking-widest rounded-md">
                🏆 HYBRID SOCCER
              </span>
              <span class="px-2 py-0.5 bg-gold/15 border border-gold/30 text-gold text-[8px] font-black uppercase tracking-widest rounded-md">
                SPECIAL EVENT
              </span>
              ${t.isComingSoon ? `
                <span class="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[8px] font-black uppercase tracking-widest rounded-md animate-pulse">
                  🔒 COMING SOON
                </span>
              ` : ''}
            </div>
            <h4 class="font-display font-black text-lg text-white leading-tight uppercase tracking-wide group-hover:text-emerald-300 transition-colors">${t.name}</h4>
            <p class="text-[10px] text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
              <i class="fas fa-gamepad"></i> ${t.game || 'Grand RP Mobile'}
            </p>
          </div>
          <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${t.isComingSoon ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35' : t.status === 'live' ? 'bg-red text-white animate-pulse' : t.status === 'cancelled' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35' : t.status === 'ended' ? 'bg-neutral-800 text-t3 border border-neutral-700' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'}">
            ${t.isComingSoon ? 'Coming Soon' : t.status === 'live' ? '🔴 Live' : t.status === 'cancelled' ? '❌ Cancelled' : t.status === 'ended' ? 'Ended' : 'Upcoming'}
          </span>
        </div>

        <!-- Scoreboard Style Grid -->
        <div class="grid grid-cols-3 gap-2 text-xs font-semibold text-t2 bg-black/50 p-3 rounded-xl border border-emerald-500/15 relative z-10">
          <div class="text-center border-r border-emerald-500/10">
            <span class="text-[9px] text-emerald-400/60 uppercase font-black tracking-wider block mb-0.5">Prize Pool</span>
            <span class="text-gold font-display text-base font-black tracking-tight">${t.isComingSoon ? 'Coming Soon' : (t.prize || 'TBD')}</span>
          </div>
          <div class="text-center border-r border-emerald-500/10">
            <span class="text-[9px] text-emerald-400/60 uppercase font-black tracking-wider block mb-0.5">Slots Filled</span>
            <span class="text-white font-mono text-sm font-bold">${t.isComingSoon ? 'Coming Soon' : `${t.registered || 0}/${t.maxPlayers || 32}`}</span>
          </div>
          <div class="text-center">
            <span class="text-[9px] text-emerald-400/60 uppercase font-black tracking-wider block mb-0.5">Entry Fee</span>
            <span class="text-emerald-300 font-bold font-mono text-sm">${t.isComingSoon ? 'Coming Soon' : (t.entryFee || 'Free')}</span>
          </div>
        </div>

        <div class="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-t3 font-medium relative z-10 pt-1">
          <span class="flex items-center gap-1 text-emerald-400/90"><i class="fas fa-calendar-alt text-emerald-400"></i> ${t.isComingSoon ? 'Coming Soon' : (t.date || 'TBA')}</span>
          <span class="flex items-center gap-1 text-emerald-400/90"><i class="fas fa-clock text-emerald-400"></i> ${t.isComingSoon ? 'Coming Soon' : (t.time || 'TBA')}</span>
          <span class="flex items-center gap-1 text-emerald-400/90"><i class="fas fa-users text-emerald-400"></i> ${t.teamType || 'Solo'}</span>
          ${t.map ? `<span class="flex items-center gap-1 text-emerald-400/90"><i class="fas fa-map-marked-alt text-emerald-400"></i> Map: <strong class="text-white">${t.map}</strong></span>` : ''}
          ${t.perKill ? `<span class="flex items-center gap-1 text-emerald-400/90"><i class="fas fa-crosshairs text-emerald-400"></i> Per Kill: <strong class="text-white">${t.perKill}</strong></span>` : ''}
        </div>

        ${reg && !t.isComingSoon ? `
          <div class="pt-2 border-t border-emerald-500/10 flex justify-between items-center text-xs relative z-10">
            <span class="font-bold uppercase tracking-wider text-[10px] ${reg.status==='approved'?'text-emerald-400':reg.status==='rejected'?'text-red':'text-gold'}">
              ${reg.status === 'approved' ? '✓ Registered' : reg.status === 'rejected' ? 'Rejected' : 'Verification Pending...'}
            </span>
            <span class="text-[10px] text-t3 font-mono">TXN: ${reg.txnId}</span>
          </div>
        ` : ''}

        ${t.liveMessage ? `
          <div class="p-2.5 ${t.status === 'cancelled' ? 'bg-amber-500/5 border border-amber-500/20 text-amber-400' : 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-300'} rounded-lg text-[11px] font-medium flex gap-2 items-start leading-normal relative z-10">
            <i class="fas ${t.status === 'cancelled' ? 'fa-exclamation-triangle animate-pulse text-amber-400' : 'fa-bullhorn animate-bounce text-emerald-400'} text-xs mt-0.5"></i>
            <div>
              <span class="font-bold uppercase text-[9px] block mb-0.5 tracking-wider ${t.status === 'cancelled' ? 'text-amber-400' : 'text-emerald-400'}">
                ${t.status === 'cancelled' ? '⚠️ Cancellation Notice' : '🔴 Live Notice'}
              </span>
              ${t.liveMessage}
            </div>
          </div>
        ` : ''}

        <div class="pt-2 flex gap-2 flex-wrap relative z-10">
          ${t.isComingSoon ? `
            <button class="b-coming-soon flex-1 py-2 bg-neutral-800/80 border border-neutral-700 hover:bg-neutral-800 text-t3 text-[11px] font-black uppercase tracking-wider rounded-lg transition">
              🔒 Locked (Coming Soon)
            </button>
          ` : t.status === 'cancelled' ? '' : `
            <button class="b-part flex-1 min-w-[120px] py-1.5 bg-emerald-500/15 border border-emerald-500/35 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-black uppercase tracking-wider rounded-lg transition" data-tid="${t.id}" data-tname="${t.name}">
              <i class="fas fa-users mr-1"></i> Slots
            </button>
            ${t.status === 'ended' ? `
              <button class="b-result flex-1 min-w-[120px] py-1.5 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/25 text-blue-400 text-[11px] font-black uppercase tracking-wider rounded-lg transition" data-tid="${t.id}" data-tname="${t.name}">
                <i class="fas fa-poll mr-1"></i> Match Result
              </button>
            ` : t.status === 'upcoming' ? `
              <button class="b-register flex-1 min-w-[120px] py-1.5 bg-gold/15 border border-gold/30 hover:bg-gold/25 text-gold text-[11px] font-black uppercase tracking-wider rounded-lg transition" data-tid="${t.id}" data-tname="${t.name}">
                <i class="fas fa-gamepad mr-1"></i> Participate
              </button>
            ` : ''}
          `}
        </div>
      `;
    } else {
      card.innerHTML = `
        ${getLiveTrackerWidgetHTML(t)}

        <div class="flex justify-between items-start gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-1.5 mb-1">
              <h4 class="font-display font-bold text-base text-white leading-tight">${t.name}</h4>
              ${t.isComingSoon ? `
                <span class="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[8px] font-black uppercase tracking-widest rounded-md">
                  COMING SOON
                </span>
              ` : ''}
            </div>
            <p class="text-[10px] text-t3 font-medium mt-0.5">${t.game || 'Grand RP Mobile'}</p>
          </div>
          <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${t.isComingSoon ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' : t.status === 'live' ? 'bg-red/15 text-red border border-red/25' : t.status === 'upcoming' ? 'bg-blue/15 text-blue border border-blue/25' : t.status === 'cancelled' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' : 'bg-neutral-800 text-t3 border border-neutral-700'}">
            ${t.isComingSoon ? 'Coming Soon' : t.status === 'live' ? '🔴 Live' : t.status === 'upcoming' ? 'Upcoming' : t.status === 'cancelled' ? '❌ Cancelled' : 'Ended'}
          </span>
        </div>

        <div class="grid grid-cols-3 gap-2 text-xs font-semibold text-t2 bg-[#111420]/40 p-2.5 rounded-lg border border-bdr/20">
          <div>
            <span class="text-[9px] text-t3 uppercase font-bold block">Prize Pool</span>
            <span class="text-gold font-display text-sm font-bold">${t.isComingSoon ? 'Coming Soon' : (t.prize || 'TBD')}</span>
          </div>
          <div>
            <span class="text-[9px] text-t3 uppercase font-bold block">Size Slots</span>
            <span class="text-white">${t.isComingSoon ? 'Coming Soon' : `${t.registered || 0}/${t.maxPlayers || 32}`}</span>
          </div>
          <div>
            <span class="text-[9px] text-t3 uppercase font-bold block">Entry Fee</span>
            <span class="text-gold font-medium">${t.isComingSoon ? 'Coming Soon' : (t.entryFee || 'Free')}</span>
          </div>
        </div>

        <div class="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-t3 font-medium">
          <span><i class="fas fa-calendar mr-1 text-gold"></i> ${t.isComingSoon ? 'Coming Soon' : (t.date || 'TBA')}</span>
          <span><i class="fas fa-clock mr-1 text-gold"></i> ${t.isComingSoon ? 'Coming Soon' : (t.time || 'TBA')}</span>
          <span><i class="fas fa-users mr-1 text-gold"></i> ${t.teamType || 'Solo'}</span>
          ${t.map ? `<span><i class="fas fa-map-marked-alt mr-1 text-emerald-400"></i> Map: <strong class="text-white">${t.map}</strong></span>` : ''}
          ${t.perKill ? `<span><i class="fas fa-crosshairs mr-1 text-red"></i> Per Kill: <strong class="text-white">${t.perKill}</strong></span>` : ''}
        </div>

        ${reg && !t.isComingSoon ? `
          <div class="pt-2 border-t border-bdr/20 flex justify-between items-center text-xs">
            <div class="flex flex-col gap-0.5">
              <span class="font-bold uppercase tracking-wider text-[10px] ${reg.status==='approved'?'text-green':reg.status==='rejected'?'text-red':reg.status==='cancelled'?'text-t3':'text-gold'}">
                ${reg.status === 'approved' ? 'Slots Verified ✓' : reg.status === 'rejected' ? 'Registration Rejected' : reg.status==='cancelled'?'Slot Cancelled ✕':'Verification Pending...'}
              </span>
              ${reg.revokeReason ? `<span class="text-[9px] text-red leading-tight max-w-[150px] whitespace-normal">Reason: ${reg.revokeReason}</span>` : ''}
              <span class="text-[9px] text-t3 font-mono">TXN: ${reg.txnId.slice(0, 16)}</span>
            </div>
            ${(t.status === 'upcoming' && (reg.status === 'pending' || reg.status === 'approved')) ? `
              <button class="b-self-cancel px-2.5 py-1 bg-red/10 border border-red/20 hover:bg-red/25 text-red text-[10px] font-bold uppercase rounded-lg transition" data-tid="${t.id}" data-regid="${reg.id}">
                Cancel Slot
              </button>
            ` : ''}
          </div>
        ` : ''}

        ${t.liveMessage ? `
          <div class="p-2.5 ${t.status === 'cancelled' ? 'bg-amber-500/5 border border-amber-500/20 text-amber-400' : 'bg-red/5 border border-red/20 text-red/90'} rounded-lg text-[11px] font-medium flex gap-2 items-start leading-normal">
            <i class="fas ${t.status === 'cancelled' ? 'fa-exclamation-triangle animate-pulse text-amber-400' : 'fa-bullhorn animate-bounce text-red'} text-xs mt-0.5"></i>
            <div>
              <span class="font-bold uppercase text-[9px] block mb-0.5 tracking-wider ${t.status === 'cancelled' ? 'text-amber-400' : 'text-red'}">
                ${t.status === 'cancelled' ? '⚠️ Cancellation Notice' : '🔴 Live Notice'}
              </span>
              ${t.liveMessage}
            </div>
          </div>
        ` : ''}

        ${t.status === 'live' && t.youtubeLink ? `
          <div class="pt-1">
            <a href="${t.youtubeLink}" target="_blank" rel="noopener noreferrer" class="b-live-stream flex items-center justify-center gap-2 w-full py-1.5 bg-red hover:bg-[#cc3540] text-white text-[11px] font-bold rounded-lg transition shadow-md shadow-red/20">
              <i class="fab fa-youtube text-sm"></i> Watch Live YouTube Stream
            </a>
          </div>
        ` : ''}

        <div class="pt-2 flex gap-2 flex-wrap">
          ${t.isComingSoon ? `
            <button class="b-coming-soon flex-1 py-2 bg-neutral-800/80 border border-neutral-700 text-t3 text-[11px] font-black uppercase tracking-wider rounded-lg transition">
              🔒 Locked (Coming Soon)
            </button>
          ` : t.status === 'cancelled' ? '' : `
            <button class="b-part flex-1 min-w-[120px] py-1.5 bg-gold/10 border border-gold/20 hover:bg-gold/25 text-gold text-[11px] font-bold rounded-lg transition" data-tid="${t.id}" data-tname="${t.name}">
              <i class="fas fa-users mr-1"></i> Slots
            </button>
            ${t.status === 'ended' ? `
              <button class="b-result flex-1 min-w-[120px] py-1.5 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/25 text-blue-400 text-[11px] font-bold rounded-lg transition" data-tid="${t.id}" data-tname="${t.name}">
                <i class="fas fa-poll mr-1"></i> Match Result
              </button>
            ` : t.status === 'upcoming' ? `
              <button class="b-register flex-1 min-w-[120px] py-1.5 bg-gold/10 border border-gold/20 hover:bg-gold/25 text-gold text-[11px] font-bold rounded-lg transition" data-tid="${t.id}" data-tname="${t.name}">
                <i class="fas fa-gamepad mr-1"></i> Participate
              </button>
            ` : ''}
          `}
        </div>
      `;
    }

    card.addEventListener('click', (e) => {
      if (t.isComingSoon) {
        alert("Coming soon! This tournament is not open for registration yet.");
        return;
      }
      if (t.status === 'cancelled') {
        alert("This tournament has been cancelled! All registration and participation options are disabled.");
        return;
      }
      if (e.target.closest('.b-part') || e.target.closest('.b-result') || e.target.closest('.b-register') || e.target.closest('.b-live-stream') || e.target.closest('.b-self-cancel')) return;
      handleTourCardClick(t);
    });

    const btnComingSoon = card.querySelector('.b-coming-soon');
    if (btnComingSoon) {
      btnComingSoon.addEventListener('click', (e) => {
        e.stopPropagation();
        alert("Coming soon! This tournament is not open for registration yet.");
      });
    }

    const btnPart = card.querySelector('.b-part');
    if (btnPart) {
      btnPart.addEventListener('click', (e) => {
        e.stopPropagation();
        if (t.isComingSoon) {
          alert("Coming soon! This tournament is not open for registration yet.");
          return;
        }
        openTournamentParticipation(t);
      });
    }

    const btnResult = card.querySelector('.b-result');
    if (btnResult) {
      btnResult.addEventListener('click', (e) => {
        e.stopPropagation();
        openTournamentLeaderboard(t);
      });
    }

    const btnRegister = card.querySelector('.b-register');
    if (btnRegister) {
      btnRegister.addEventListener('click', (e) => {
        e.stopPropagation();
        if (t.isComingSoon) {
          alert("Coming soon! This tournament is not open for registration yet.");
          return;
        }
        handleTourCardClick(t);
      });
    }

    const btnSelfCancel = card.querySelector('.b-self-cancel');
    if (btnSelfCancel) {
      btnSelfCancel.addEventListener('click', async (e) => {
        e.stopPropagation();
        const regId = btnSelfCancel.dataset.regid;
        const tourId = btnSelfCancel.dataset.tid;
        await window.selfCancelRegistration(regId, tourId, t.name, t.entryFee);
      });
    }

    listEl.appendChild(card);
  });
}

function activeTournamentFilter() {
  const activeBtn = document.querySelector('.fb.on');
  return activeBtn ? activeBtn.dataset.f : 'all';
}

document.querySelectorAll('.fb').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.fb').forEach(b => b.classList.remove('on', 'bg-gold', 'text-bg'));
    btn.classList.add('on');
    renderTournaments();
  });
});

// Click card tournament detail & rules lock checkers
function handleTourCardClick(tour) {
  if (tour.isComingSoon) {
    alert("This tournament is coming soon!");
    return;
  }
  if (tour.status === 'cancelled') {
    alert("This tournament has been cancelled! All registration and participation options are disabled.");
    return;
  }
  const profile = userProfile || guestProfile;
  
  // 1. Check if user is banned from tournaments (onlyBan) or overall banned
  if (profile && (profile.banType === 'tournament' || profile.banned)) {
    const ruleInfo = profile.banRule ? `\n\nRule Violation: ${profile.banRule}` : '';
    alert(`❌ Tournament Access Blocked!\n\nYou are banned from participating in tournaments.\n\nReason: ${profile.banReason || 'Unspecified Rule Violations'}${ruleInfo}\n\nIf you feel this is unfair, try contacting live support.`);
    return;
  }

  // 2. Check if user is already approved/verified in this tournament
  const reg = userRegs[tour.id];
  if (reg && reg.status === 'approved') {
    alert(`you are already registered`);
    return;
  }

  // 3. DISCORD VERIFICATION GATE: Tournament Participation Gate Check
  if (profile && !profile.discordVerified) {
    window.openDiscordVerificationGate(tour);
    return;
  }

  // Otherwise, if rejected or not registered, allow registration flow
  openTournamentRegister(tour);
}

// Open and control Tournament Detail Form Modal
let activeRegisterTour = null;
function openTournamentRegister(tour) {
  if (guestProfile) {
    alert('Guest accounts are restricted from registering for tournaments. Please register a real profile!');
    return;
  }

  const profile = userProfile || guestProfile;
  if (profile && !profile.discordVerified) {
    window.openDiscordVerificationGate(tour);
    return;
  }

  activeRegisterTour = tour;
  $('tdetName').textContent = tour.name;
  $('tdetGame').textContent = tour.game || 'Grand RP Mobile';
  $('tdetPlayers').textContent = `${tour.registered || 0}/${tour.maxPlayers || 32}`;
  $('tdetPrize').textContent = tour.prize || 'TBD';
  const statusLabels = {
    upcoming: 'Upcoming',
    live: '🔴 Live Now',
    ended: 'Ended',
    cancelled: '❌ Cancelled'
  };
  $('tdetStatus').textContent = statusLabels[tour.status] || tour.status;
  $('tdetExtra').textContent = `Format: ${tour.teamType || 'Solo'} — Entry: ${tour.entryFee || 'Free'}`;

  // Reset and hide dynamic or participation buttons if cancelled
  if (tour.status === 'cancelled') {
    $('bParticipate').classList.add('hidden');
  } else {
    $('bParticipate').classList.remove('hidden');
  }

  // Reset steps
  document.querySelectorAll('#tregStep1, #tregStep2, #tregStep3, #tregStep4').forEach(step => step.classList.add('hidden'));
  $('tregStep1').classList.remove('hidden');

  $('tregRealName').value = '';
  $('tregGameName').value = '';
  $('tregUID').value = (userProfile && userProfile.gameUID) ? userProfile.gameUID : '';
  $('tregAge').value = '';
  $('tregCheck1').checked = false;
  $('tregCheck2').checked = false;

  $('mTourDetail').classList.remove('hidden');
}

$('bCloseTourDetail').addEventListener('click', () => $('mTourDetail').classList.add('hidden'));
$('bParticipate').addEventListener('click', () => {
  if (activeRegisterTour.status === 'ended') {
    alert('This tournament has already ended!');
    return;
  }
  if (activeRegisterTour.status === 'cancelled') {
    alert('This tournament has been cancelled!');
    return;
  }
  $('tregStep1').classList.add('hidden');
  $('tregStep2').classList.remove('hidden');
});

$('tregDecline').addEventListener('click', () => $('mTourDetail').classList.add('hidden'));
$('tregAgree').addEventListener('click', () => {
  if (!$('tregRealName').value.trim() || !$('tregGameName').value.trim() || !$('tregUID').value.trim() || !$('tregAge').value.trim()) {
    alert('Please fill out all required fields!');
    return;
  }
  if (!$('tregCheckRules').checked) {
    alert('You must read and agree to the ArenaX rules to participate in tournaments!');
    return;
  }
  if (!$('tregCheck1').checked || !$('tregCheck2').checked) {
    alert('You must accept the terms & anti-cheat guidelines!');
    return;
  }

  // Parse the entry fee
  const feeString = activeRegisterTour.entryFee || '';
  let feeAmount = 0;
  if (feeString && !feeString.toLowerCase().includes('free')) {
    const matches = feeString.match(/\d+/);
    if (matches) feeAmount = parseInt(matches[0], 10);
  }

  const balance = userProfile ? (userProfile.balance || 0) : 0;

  $('tregFeeAX').textContent = `${feeAmount} AX Coins`;
  $('tregBalanceAX').textContent = `${balance} AX Coins`;
  
  if (balance < feeAmount) {
    $('tregBalanceAfterAX').textContent = `Insufficient Balance`;
    $('tregBalanceAfterAX').className = 'font-bold text-red';
    $('tregStatusMsg').innerHTML = `<p class="text-red font-semibold">⚠️ Insufficient coins! You need ${feeAmount} AX Coins to register but you only have ${balance} AX Coins. Please deposit coins first.</p>`;
    $('tregSubmit').disabled = true;
    $('tregSubmit').classList.add('opacity-50', 'cursor-not-allowed');
    $('tregSubmit').textContent = 'Insufficient Balance';
  } else {
    $('tregBalanceAfterAX').textContent = `${balance - feeAmount} AX Coins`;
    $('tregBalanceAfterAX').className = 'font-bold text-green';
    $('tregStatusMsg').innerHTML = `<p class="text-t2 font-medium">✅ You have enough coins. ${feeAmount} AX Coins will be deducted from your ArenaX wallet automatically when the admin approves your registration slot.</p>`;
    $('tregSubmit').disabled = false;
    $('tregSubmit').classList.remove('opacity-50', 'cursor-not-allowed');
    $('tregSubmit').textContent = 'Confirm & Submit Entry';
  }

  $('tregStep2').classList.add('hidden');
  $('tregStep3').classList.remove('hidden');
});

$('tregBack').addEventListener('click', () => {
  $('tregStep3').classList.add('hidden');
  $('tregStep2').classList.remove('hidden');
});

$('tregSubmit').addEventListener('click', async () => {
  // Parse the entry fee again to double check
  const feeString = activeRegisterTour.entryFee || '';
  let feeAmount = 0;
  if (feeString && !feeString.toLowerCase().includes('free')) {
    const matches = feeString.match(/\d+/);
    if (matches) feeAmount = parseInt(matches[0], 10);
  }

  const balance = userProfile ? (userProfile.balance || 0) : 0;
  if (balance < feeAmount) {
    alert('Insufficient coins! Please deposit more coins to register. ❌');
    return;
  }

  $('tregSubmit').disabled = true;
  $('tregSubmit').textContent = 'Submitting...';

  try {
    const autoTxnId = 'AX-WALLET-REG-' + Math.floor(100000 + Math.random() * 900000);
    await addDoc(collection(db, 'tournament_registrations'), {
      tournamentId: activeRegisterTour.id,
      tournamentName: activeRegisterTour.name,
      userId: userProfile.uid,
      userName: userProfile.name,
      userHandle: userProfile.handle,
      realName: $('tregRealName').value.trim(),
      gameName: $('tregGameName').value.trim(),
      gameUID: $('tregUID').value.trim(),
      age: $('tregAge').value.trim(),
      txnId: autoTxnId,
      screenshot: 'Auto-verified ArenaX Wallet Hold',
      status: 'pending',
      submittedAt: serverTimestamp()
    });

    // Update user profile and complete Task 2
    if (userProfile && userProfile.uid) {
      try {
        await updateDoc(doc(db, 'users', userProfile.uid), {
          hasSubmittedRegistration: true
        });
        userProfile.hasSubmittedRegistration = true;
      } catch (e) {
        console.error("Error setting hasSubmittedRegistration in Firestore:", e);
      }
    }

    $('tregStep3').classList.add('hidden');
    $('tregStep4').classList.remove('hidden');

    // Squad invitation check for Team Leaders
    try {
      const teamsRef = collection(db, 'teams');
      const q = query(teamsRef, where('leaderId', '==', userProfile.uid), limit(1));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const teamDoc = qSnap.docs[0];
        const teamData = teamDoc.data();
        const teamId = teamDoc.id;
        
        window.activeSquadInviteTeam = { id: teamId, ...teamData };
        window.activeSquadInviteTour = activeRegisterTour;
        
        $('squadInvitePromptMsg').textContent = `You successfully registered for the tournament "${activeRegisterTour.name}"! Do you want to invite your Guild "${teamData.name}" members to join your tournament squad?`;
        $('mSquadInvitePromptModal').classList.remove('hidden');
      }
    } catch (e) {
      console.error("Error checking leading teams on register success:", e);
    }
  } catch (err) {
    alert('Registration error: ' + err.message);
  } finally {
    $('tregSubmit').disabled = false;
    $('tregSubmit').textContent = 'Confirm & Submit Entry';
  }
});

$('tregDone').addEventListener('click', () => $('mTourDetail').classList.add('hidden'));

window.selfCancelRegistration = async function(regId, tournamentId, tournamentName, entryFeeString) {
  if (!confirm(`Are you sure you want to cancel your slot and leave the tournament "${tournamentName}"?`)) {
    return;
  }

  try {
    const regDocRef = doc(db, 'tournament_registrations', regId);
    const regSnap = await getDoc(regDocRef);
    if (!regSnap.exists()) {
      alert("Registration record not found.");
      return;
    }
    const regData = regSnap.data();

    // Calculate fee to refund if approved
    let feeAmount = 0;
    if (entryFeeString && !entryFeeString.toLowerCase().includes('free')) {
      const matches = entryFeeString.match(/\d+/);
      if (matches) feeAmount = parseInt(matches[0], 10);
    }

    // Only refund if they were approved (deductions only happen on approval)
    const wasApproved = regData.status === 'approved';
    
    if (wasApproved && feeAmount > 0) {
      // Refund user balance
      await updateDoc(doc(db, 'users', regData.userId), {
        balance: increment(feeAmount)
      });

      // Write deposit log
      await addDoc(collection(db, 'deposit_requests'), {
        userId: regData.userId,
        userName: regData.userName || '',
        userEmail: '',
        type: 'deposit',
        method: 'Tournament Fee Refund (User Cancelled)',
        amountPKR: 0,
        amountAX: feeAmount,
        txnId: 'REF-' + Math.floor(100000 + Math.random() * 900000),
        status: 'approved',
        submittedAt: serverTimestamp()
      });
    }

    // Update registration status to cancelled
    await updateDoc(regDocRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelledBy: 'user'
    });

    // If it was approved, decrement the tournament's registered slots
    if (wasApproved) {
      await updateDoc(doc(db, 'tournaments', tournamentId), {
        registered: increment(-1)
      });

      // Remove player from leaderboard
      try {
        const leadQuery = query(
          collection(db, 'leaderboards'),
          where('tournamentId', '==', tournamentId),
          where('userId', '==', regData.userId)
        );
        const leadSnap = await getDocs(leadQuery);
        for (const d of leadSnap.docs) {
          await deleteDoc(doc(db, 'leaderboards', d.id));
        }
      } catch (leadErr) {
        console.error('Error removing player from leaderboard on self-cancel:', leadErr);
      }
    }

    alert(`Successfully cancelled your slot for "${tournamentName}".${wasApproved && feeAmount > 0 ? ` ${feeAmount} AX Coins have been refunded to your wallet.` : ''} ✅`);
  } catch (err) {
    alert("Error cancelling registration: " + err.message);
  }
};

// ── RED REPORT SYSTEM LOGIC ──
window.activeRedReportSlab = 'Support'; // 'Support', 'RedReport', 'FAQ'
window.activeRedReportFilter = 'open'; // 'open', 'closed', 'my'
window.uploadedEvidenceUrl = '';
window.uploadedEvidenceType = 'link'; // 'link', 'image', 'video'
window.activeReviewReportId = '';

// Support Drawer Controls
window.openSupportDrawer = function() {
  const drawer = $('dSupportDrawer');
  const backdrop = $('mSupportDrawerBackdrop');
  if (!drawer) return;

  drawer.classList.remove('hidden');
  if (backdrop) backdrop.classList.remove('hidden');

  setTimeout(() => {
    drawer.classList.remove('opacity-0');
    drawer.classList.add('opacity-100');
    if (backdrop) backdrop.classList.add('opacity-100');
  }, 20);

  // Play video sticker
  const helpVid = $('vHelpSupportSticker');
  if (helpVid) {
    const basePath = (typeof window.getAppBasePath === 'function') ? window.getAppBasePath() : './';
    const source = helpVid.querySelector('source');
    if (source && !source.src.includes('help.mp4')) {
      source.src = basePath + 'help.mp4';
    }
    helpVid.play().catch(e => console.log('Auto-play help sticker:', e));
  }

  if (window.activeRedReportSlab === 'Support' || !window.activeRedReportSlab) {
    switchSupportSubSlab('Support');
  } else if (window.activeRedReportSlab === 'RedReport') {
    switchSupportSubSlab('RedReport');
  } else if (window.activeRedReportSlab === 'Rating') {
    switchSupportSubSlab('Rating');
  } else if (window.activeRedReportSlab === 'FAQ') {
    switchSupportSubSlab('FAQ');
  }
};

window.closeSupportDrawer = function() {
  const drawer = $('dSupportDrawer');
  const backdrop = $('mSupportDrawerBackdrop');
  if (!drawer) return;

  drawer.classList.remove('opacity-100');
  drawer.classList.add('opacity-0');
  if (backdrop) backdrop.classList.remove('opacity-100');

  setTimeout(() => {
    drawer.classList.add('hidden');
    if (backdrop) backdrop.classList.add('hidden');
  }, 300);
};

if ($('bCloseSupportDrawer')) $('bCloseSupportDrawer').addEventListener('click', () => closeSupportDrawer());
if ($('mSupportDrawerBackdrop')) $('mSupportDrawerBackdrop').addEventListener('click', () => closeSupportDrawer());

// Floating Red Report & Support Hub Drawer Controls
window.openRedReportHubDrawer = function() {
  const drawer = $('dRedReportHubDrawer');
  const backdrop = $('mRedReportHubDrawerBackdrop');
  if (!drawer || !backdrop) return;
  drawer.classList.remove('hidden');
  backdrop.classList.remove('hidden');
  setTimeout(() => {
    drawer.classList.remove('translate-x-full');
    backdrop.classList.remove('opacity-0');
    backdrop.classList.add('opacity-100');
  }, 20);
};

window.closeRedReportHubDrawer = function() {
  const drawer = $('dRedReportHubDrawer');
  const backdrop = $('mRedReportHubDrawerBackdrop');
  if (!drawer || !backdrop) return;
  drawer.classList.add('translate-x-full');
  backdrop.classList.remove('opacity-100');
  backdrop.classList.add('opacity-0');
  setTimeout(() => {
    drawer.classList.add('hidden');
    backdrop.classList.add('hidden');
  }, 300);
};

if ($('bTopbarMenu')) $('bTopbarMenu').addEventListener('click', () => openRedReportHubDrawer());
if ($('bCloseRedReportHubDrawer')) $('bCloseRedReportHubDrawer').addEventListener('click', () => closeRedReportHubDrawer());
if ($('mRedReportHubDrawerBackdrop')) $('mRedReportHubDrawerBackdrop').addEventListener('click', () => closeRedReportHubDrawer());

if ($('btnHubChat')) {
  $('btnHubChat').addEventListener('click', () => {
    closeRedReportHubDrawer();
    switchTab('Chat');
  });
}

$('btnHubRules').addEventListener('click', () => {
  closeRedReportHubDrawer();
  switchTab('Rules');
});

$('btnHubSupport').addEventListener('click', () => {
  closeRedReportHubDrawer();
  switchSupportSubSlab('Support');
  openSupportDrawer();
});

$('btnHubRedReport').addEventListener('click', () => {
  closeRedReportHubDrawer();
  switchSupportSubSlab('RedReport');
  openSupportDrawer();
});

// Setup Sub-Slab Navigation inside Support
window.switchSupportSubSlab = function(slab) {
  window.activeRedReportSlab = slab;
  
  // Ensure main top headers are visible when switching sub-slabs
  if ($('dSupportMainHeader')) $('dSupportMainHeader').classList.remove('hidden');
  if ($('dSupportMobileTabs')) $('dSupportMobileTabs').classList.remove('hidden');

  // Update Slabs styling
  const subBtns = document.querySelectorAll('.sub-slab-btn');
  subBtns.forEach(btn => {
    btn.classList.remove('bg-amber-400', 'text-slate-950');
    btn.classList.add('text-slate-400', 'hover:text-white');
  });

  // Hide all sections
  $('dSupportChatContent').classList.add('hidden');
  $('dRedReportContent').classList.add('hidden');
  $('dSupportFAQContent').classList.add('hidden');

  if (slab === 'Support') {
    if ($('bSubSlabSupport')) {
      $('bSubSlabSupport').classList.add('bg-amber-400', 'text-slate-950');
      $('bSubSlabSupport').classList.remove('text-slate-400');
    }
    $('dSupportChatContent').classList.remove('hidden');
    if ($('dSupportIntroView')) $('dSupportIntroView').classList.remove('hidden');
    if ($('dSupportActiveChatView')) $('dSupportActiveChatView').classList.add('hidden');
    if ($('ratingBox')) $('ratingBox').classList.add('hidden');
  } else if (slab === 'Rating') {
    if ($('bSubSlabRating')) {
      $('bSubSlabRating').classList.add('bg-amber-400', 'text-slate-950');
      $('bSubSlabRating').classList.remove('text-slate-400');
    }
    $('dSupportChatContent').classList.remove('hidden');
    if ($('dSupportIntroView')) $('dSupportIntroView').classList.add('hidden');
    if ($('dSupportActiveChatView')) $('dSupportActiveChatView').classList.add('hidden');
    if ($('ratingBox')) $('ratingBox').classList.remove('hidden');
  } else if (slab === 'RedReport') {
    if ($('bSubSlabRedReport')) {
      $('bSubSlabRedReport').classList.add('bg-amber-400', 'text-slate-950');
      $('bSubSlabRedReport').classList.remove('text-slate-400');
    }
    $('dRedReportContent').classList.remove('hidden');
    initRedReportsListener();
  } else if (slab === 'FAQ') {
    if ($('bSubSlabFAQ')) {
      $('bSubSlabFAQ').classList.add('bg-amber-400', 'text-slate-950');
      $('bSubSlabFAQ').classList.remove('text-slate-400');
    }
    $('dSupportFAQContent').classList.remove('hidden');
  }
}

if ($('bSubSlabSupport')) $('bSubSlabSupport').addEventListener('click', () => switchSupportSubSlab('Support'));
if ($('bSubSlabRating')) $('bSubSlabRating').addEventListener('click', () => switchSupportSubSlab('Rating'));
if ($('bSubSlabRedReport')) $('bSubSlabRedReport').addEventListener('click', () => switchSupportSubSlab('RedReport'));
if ($('bSubSlabFAQ')) $('bSubSlabFAQ').addEventListener('click', () => switchSupportSubSlab('FAQ'));

if ($('bStartLiveChatBtn')) {
  $('bStartLiveChatBtn').addEventListener('click', () => {
    // Hide main top nav & mobile tabs to give full focus to active chat
    if ($('dSupportMainHeader')) $('dSupportMainHeader').classList.add('hidden');
    if ($('dSupportMobileTabs')) $('dSupportMobileTabs').classList.add('hidden');
    if ($('dSupportIntroView')) $('dSupportIntroView').classList.add('hidden');
    if ($('dSupportActiveChatView')) $('dSupportActiveChatView').classList.remove('hidden');
    loadLiveSupportChat();
    const chatMsgs = $('chatMsgs');
    if (chatMsgs) chatMsgs.scrollTop = chatMsgs.scrollHeight;
  });
}

if ($('bBackToIntro')) {
  $('bBackToIntro').addEventListener('click', () => {
    // Restore main top nav & mobile tabs when leaving active chat
    if ($('dSupportMainHeader')) $('dSupportMainHeader').classList.remove('hidden');
    if ($('dSupportMobileTabs')) $('dSupportMobileTabs').classList.remove('hidden');
    if ($('dSupportActiveChatView')) $('dSupportActiveChatView').classList.add('hidden');
    if ($('dSupportIntroView')) $('dSupportIntroView').classList.remove('hidden');
  });
}

// Setup sub-filter switching for Red Reports
window.activeRedReportFilter = 'all';
window.switchRedReportFilter = function(filter) {
  window.activeRedReportFilter = filter;
  
  const tabs = document.querySelectorAll('.red-sub-tab');
  tabs.forEach(tab => {
    tab.classList.remove('bg-red/20', 'text-white');
    tab.classList.add('text-t3', 'hover:text-white');
  });

  if (filter === 'all') {
    $('bRedSubAll').classList.add('bg-red/20', 'text-white');
    $('bRedSubAll').classList.remove('text-t3');
  } else if (filter === 'created') {
    $('bRedSubCreated').classList.add('bg-red/20', 'text-white');
    $('bRedSubCreated').classList.remove('text-t3');
  } else if (filter === 'reviewed') {
    $('bRedSubReviewed').classList.add('bg-red/20', 'text-white');
    $('bRedSubReviewed').classList.remove('text-t3');
  } else if (filter === 'from_me') {
    $('bRedSubFromMe').classList.add('bg-red/20', 'text-white');
    $('bRedSubFromMe').classList.remove('text-t3');
  }

  renderRedReports();
}

$('bRedSubAll').addEventListener('click', () => switchRedReportFilter('all'));
$('bRedSubCreated').addEventListener('click', () => switchRedReportFilter('created'));
$('bRedSubReviewed').addEventListener('click', () => switchRedReportFilter('reviewed'));
$('bRedSubFromMe').addEventListener('click', () => switchRedReportFilter('from_me'));

// New File Upload & Evidence management
const fileInput = $('rrFileInput');
$('rrUploadArea').addEventListener('click', () => fileInput.click());

// Drag and drop event listeners
$('rrUploadArea').addEventListener('dragover', (e) => {
  e.preventDefault();
  $('rrUploadArea').classList.add('border-red-500');
});
$('rrUploadArea').addEventListener('dragleave', () => {
  $('rrUploadArea').classList.remove('border-red-500');
});
$('rrUploadArea').addEventListener('drop', (e) => {
  e.preventDefault();
  $('rrUploadArea').classList.remove('border-red-500');
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    fileInput.files = e.dataTransfer.files;
    handleEvidenceFileSelection(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target && e.target.files && e.target.files.length > 0) {
    handleEvidenceFileSelection(e.target.files[0]);
  }
});

function handleEvidenceFileSelection(file) {
  if (!file) return;
  
  if (file.size > 20 * 1024 * 1024) { // 20MB max
    alert('Evidence file size exceeds the 20MB limit!');
    return;
  }

  $('rrUploadProgress').classList.remove('hidden');
  $('rrUploadSuccess').classList.add('hidden');
  $('rrUploadTitle').classList.add('hidden');

  const storageRef = ref(storage, 'red_reports/' + Date.now() + '_' + file.name);
  uploadBytes(storageRef, file).then(async (snapshot) => {
    const downloadUrl = await getDownloadURL(snapshot.ref);
    window.uploadedEvidenceUrl = downloadUrl;
    window.uploadedEvidenceType = file.type.startsWith('image/') ? 'image' : 'video';
    $('rrUploadProgress').classList.add('hidden');
    $('rrUploadSuccess').classList.remove('hidden');
    $('rrUploadSuccess').textContent = `✓ Uploaded: ${file.name}`;
    $('rrProofUrl').value = downloadUrl; // Autofill pasted link just in case
  }).catch(err => {
    console.error(err);
    $('rrUploadProgress').classList.add('hidden');
    $('rrUploadTitle').classList.remove('hidden');
    alert('Upload error: ' + err.message);
  });
}

// Helper to validate if reported player exists in database (exact/case-insensitive match)
async function validateReportedPlayer(reportedName) {
  if (!reportedName) return null;
  
  // Try exact name match
  const qName = query(collection(db, 'users'), where('name', '==', reportedName));
  const snapName = await getDocs(qName);
  if (!snapName.empty) {
    return snapName.docs[0].data();
  }

  // Try exact handle match
  let cleanHandle = reportedName.startsWith('@') ? reportedName.slice(1) : reportedName;
  const qHandle = query(collection(db, 'users'), where('handle', '==', cleanHandle));
  const snapHandle = await getDocs(qHandle);
  if (!snapHandle.empty) {
    return snapHandle.docs[0].data();
  }

  // Try case-insensitive name or handle match across some users
  const qAll = query(collection(db, 'users'), limit(500));
  const snapAll = await getDocs(qAll);
  const targetLower = reportedName.toLowerCase().replace(/^@/, '');
  
  let found = null;
  snapAll.forEach(docSnap => {
    if (found) return;
    const u = docSnap.data();
    const uNameLower = (u.name || '').toLowerCase();
    const uHandleLower = (u.handle || '').toLowerCase();
    if (uNameLower === targetLower || uHandleLower === targetLower) {
      found = u;
    }
  });
  
  return found;
}

let rrPlayerNameCheckTimeout = null;

async function checkReportedPlayerLive() {
  const nameInput = $('rrPlayerName').value.trim();
  const statusDiv = $('rrPlayerNameStatus');
  
  if (!nameInput) {
    statusDiv.classList.add('hidden');
    statusDiv.textContent = '';
    return;
  }
  
  statusDiv.classList.remove('hidden');
  statusDiv.className = 'text-[9px] mt-1 text-gold/80 font-semibold flex items-center gap-1';
  statusDiv.innerHTML = '<i class="fas fa-spinner animate-spin mr-1"></i> Checking player name...';
  
  try {
    const foundUser = await validateReportedPlayer(nameInput);
    if (foundUser) {
      statusDiv.className = 'text-[9px] mt-1 text-emerald-400 font-semibold flex items-center gap-1';
      statusDiv.innerHTML = `<i class="fas fa-check-circle text-emerald-400 mr-1"></i> Player found: <span class="text-white">${foundUser.name}</span>${foundUser.handle ? ` (@${foundUser.handle})` : ''}`;
      if (foundUser.gameUID) {
        $('rrPlayerUID').value = foundUser.gameUID;
      }
    } else {
      statusDiv.className = 'text-[9px] mt-1 text-red-400 font-semibold flex items-center gap-1';
      statusDiv.innerHTML = `<i class="fas fa-times-circle text-red-400 mr-1"></i> Wrong name or username! Player not found.`;
    }
  } catch (err) {
    statusDiv.className = 'text-[9px] mt-1 text-red-400';
    statusDiv.textContent = 'Verification error: ' + err.message;
  }
}

$('rrPlayerName').addEventListener('input', () => {
  clearTimeout(rrPlayerNameCheckTimeout);
  rrPlayerNameCheckTimeout = setTimeout(checkReportedPlayerLive, 600);
});

$('rrPlayerName').addEventListener('blur', () => {
  clearTimeout(rrPlayerNameCheckTimeout);
  checkReportedPlayerLive();
});

// Open modal to file new red report
$('bFileRedReport').addEventListener('click', () => {
  if (guestProfile) {
    alert('Guest profiles are restricted from filing Red Reports.');
    return;
  }
  
  window.uploadedEvidenceUrl = '';
  window.uploadedEvidenceType = 'link';
  
  $('rrYourName').value = userProfile.name;
  $('rrPlayerName').value = '';
  $('rrPlayerUID').value = '';
  $('rrCheatCategory').value = 'Aimbot / Headshot Lock';
  $('rrDescription').value = '';
  $('rrProofUrl').value = '';
  
  // Reset status
  $('rrPlayerNameStatus').classList.add('hidden');
  $('rrPlayerNameStatus').textContent = '';
  
  // Reset upload area state
  $('rrUploadProgress').classList.add('hidden');
  $('rrUploadSuccess').classList.add('hidden');
  $('rrUploadTitle').classList.remove('hidden');
  
  $('mFileRedReport').classList.remove('hidden');
});

$('bCloseRedReportModal').addEventListener('click', () => {
  $('mFileRedReport').classList.add('hidden');
});

$('bSubmitRedReport').addEventListener('click', async () => {
  const reportedName = $('rrPlayerName').value.trim();
  const reportedUID = $('rrPlayerUID').value.trim();
  const cheatType = $('rrCheatCategory').value;
  const description = $('rrDescription').value.trim();
  let finalEvidenceUrl = $('rrProofUrl').value.trim();

  if (!reportedName || !reportedUID || !description) {
    alert('Please fill out all required fields marked with *!');
    return;
  }

  $('bSubmitRedReport').disabled = true;
  $('bSubmitRedReport').textContent = 'Verifying player...';

  try {
    const foundUser = await validateReportedPlayer(reportedName);
    if (!foundUser) {
      alert('❌ Wrong name or username! This player does not exist in our database. Please enter the exact registered name or username (e.g. saadanadnan).');
      $('bSubmitRedReport').disabled = false;
      $('bSubmitRedReport').textContent = 'Submit Report';
      return;
    }

    // Use uploaded file URL if we uploaded one
    if (window.uploadedEvidenceUrl) {
      finalEvidenceUrl = window.uploadedEvidenceUrl;
    }

    $('bSubmitRedReport').textContent = 'Submitting report...';
    await addDoc(collection(db, 'red_reports'), {
      reporterUid: userProfile.uid,
      reporterName: userProfile.name,
      reportedNickname: foundUser.name, // Save the exact correct name
      gameUID: reportedUID,
      cheatType: cheatType,
      description: description,
      evidenceUrl: finalEvidenceUrl || '',
      evidenceType: window.uploadedEvidenceUrl ? window.uploadedEvidenceType : 'link',
      status: 'created',
      verdict: '',
      createdAt: serverTimestamp()
    });

    $('mFileRedReport').classList.add('hidden');
    alert('Red Report filed successfully! 🚨\n\nIt is now live under the Created tab. Staff and moderators will inspect logs and evidence within 12 hours.');
  } catch (err) {
    alert('Submission error: ' + err.message);
  } finally {
    $('bSubmitRedReport').disabled = false;
    $('bSubmitRedReport').textContent = 'Submit Report';
  }
});

// Real-time listener for red reports
window.redReportsUnsub = null;
window.allRedReports = [];

window.initRedReportsListener = function() {
  if (window.redReportsUnsub) return; // Keep active subscription
  
  const q = query(collection(db, 'red_reports'), orderBy('createdAt', 'desc'));
  window.redReportsUnsub = onSnapshot(q, (snapshot) => {
    window.allRedReports = [];
    snapshot.forEach(doc => {
      window.allRedReports.push({ id: doc.id, ...doc.data() });
    });
    renderRedReports();
    updateRedReportTabsCount();
  }, (err) => {
    console.error('Red Reports database error:', err);
  });
}

window.updateRedReportTabsCount = function() {
  const reports = window.allRedReports || [];
  const allCount = reports.length;
  const createdCount = reports.filter(r => r.status === 'created').length;
  const reviewedCount = reports.filter(r => r.status === 'reviewed').length;
  const fromMeCount = reports.filter(r => r.reporterUid === userProfile?.uid).length;

  $('allReportsCount').textContent = allCount;
  $('createdReportsCount').textContent = createdCount;
  $('reviewedReportsCount').textContent = reviewedCount;
  $('fromMeReportsCount').textContent = fromMeCount;
}

window.renderRedReports = function() {
  const container = $('dRedReportsList');
  if (!container) return;
  container.innerHTML = '';

  const reports = window.allRedReports || [];
  let filtered = [];
  if (window.activeRedReportFilter === 'all') {
    filtered = reports;
  } else if (window.activeRedReportFilter === 'created') {
    filtered = reports.filter(r => r.status === 'created');
  } else if (window.activeRedReportFilter === 'reviewed') {
    filtered = reports.filter(r => r.status === 'reviewed');
  } else if (window.activeRedReportFilter === 'from_me') {
    filtered = reports.filter(r => r.reporterUid === userProfile?.uid);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 text-t3 text-xs space-y-2">
        <i class="fas fa-folder-open text-2xl opacity-40"></i>
        <p>No reports found in this category.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(r => {
    const card = document.createElement('div');
    card.className = 'p-4 bg-card border border-bdr rounded-xl space-y-3';
    
    const formattedDate = r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleString() : 'Just now';
    
    let mediaHTML = '';
    if (r.evidenceUrl) {
      if (r.evidenceType === 'image') {
        mediaHTML = `
          <div class="mt-2.5">
            <img src="${r.evidenceUrl}" class="rounded-lg max-h-48 object-cover border border-bdr cursor-zoom-in active:scale-95 transition" onclick="window.open('${r.evidenceUrl}', '_blank')" alt="evidence-proof" referrerPolicy="no-referrer"/>
            <span class="text-[9px] text-t3 block mt-1"><i class="fas fa-search-plus mr-1"></i> Click to enlarge image</span>
          </div>
        `;
      } else if (r.evidenceType === 'video') {
        mediaHTML = `
          <div class="mt-2.5">
            <video src="${r.evidenceUrl}" controls class="rounded-lg max-h-48 border border-bdr w-full"></video>
          </div>
        `;
      } else if (r.evidenceUrl.startsWith('http')) {
        mediaHTML = `
          <div class="mt-2">
            <a href="${r.evidenceUrl}" target="_blank" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red/10 border border-red/20 hover:bg-red/25 text-red text-[11px] font-bold rounded-lg transition">
              <i class="fas fa-external-link-alt"></i> Open Proof Evidence Link
            </a>
          </div>
        `;
      }
    }

    let verdictHTML = '';
    let statusBadgeHTML = '';
    if (r.status === 'created') {
      statusBadgeHTML = `<span class="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded text-[9px] font-bold uppercase tracking-wider">Created</span>`;
    } else {
      let verdictColorClass = 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20';
      if (r.verdict === 'Confirmed Cheat') {
        verdictColorClass = 'text-red bg-red/10 border border-red/20';
      } else if (r.verdict === 'False Report') {
        verdictColorClass = 'text-slate-400 bg-slate-500/10 border border-slate-500/20';
      }
      
      statusBadgeHTML = `<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold uppercase tracking-wider">Reviewed</span>`;
      
      verdictHTML = `
        <div class="p-2.5 ${verdictColorClass} rounded-lg text-xs mt-2.5 space-y-1">
          <div class="font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1">
            <i class="fas fa-gavel"></i> VERDICT: ${r.verdict || 'Reviewed'}
          </div>
          ${r.verdictComment ? `<p class="text-[11px] text-t2 font-medium leading-relaxed bg-black/20 p-2 rounded border border-white/5 mt-1 select-text">${r.verdictComment}</p>` : ''}
          <span class="text-[9px] text-t3 block font-mono">Resolved: ${r.closedAt ? new Date(r.closedAt.seconds * 1000).toLocaleString() : 'Recently'}</span>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="flex justify-between items-start gap-2">
        <div>
          <h4 class="text-white text-sm font-bold flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full ${r.status === 'created' ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-400'}"></span>
            ${r.reportedNickname || 'N/A'}
          </h4>
          <p class="text-[10px] text-red-400 font-semibold uppercase tracking-wider mt-0.5">${r.cheatType || 'N/A'}</p>
        </div>
        ${statusBadgeHTML}
      </div>

      <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-t3 font-medium border-t border-b border-bdr/40 py-2">
        <span><i class="fas fa-id-card text-t2 mr-1"></i> Player UID: <strong class="text-t2">${r.gameUID || 'N/A'}</strong></span>
        <span><i class="fas fa-user-circle text-t2 mr-1"></i> Reported By: <strong class="text-t2">${r.reporterName || 'N/A'}</strong></span>
        <span><i class="fas fa-calendar-alt text-t2 mr-1"></i> Filed Date: <strong class="text-t2">${formattedDate}</strong></span>
      </div>

      <div class="text-xs text-t2 leading-relaxed">
        <p class="whitespace-pre-line">${r.description || ''}</p>
      </div>

      ${mediaHTML}

      ${(() => {
        let defendantHTML = '';
        const pGameUID = userProfile?.gameUID ? String(userProfile.gameUID).trim().toLowerCase() : '';
        const rGameUID = r.gameUID ? String(r.gameUID).trim().toLowerCase() : '';
        const pName = userProfile?.name ? String(userProfile.name).trim().toLowerCase().replace(/^@/, '') : '';
        const pHandle = userProfile?.handle ? String(userProfile.handle).trim().toLowerCase().replace(/^@/, '') : '';
        const rReported = r.reportedNickname ? String(r.reportedNickname).trim().toLowerCase().replace(/^@/, '') : '';

        const isAccused = !!(userProfile && (
          (rGameUID && pGameUID === rGameUID) ||
          (rReported && (pName === rReported || pHandle === rReported))
        ));

        if (r.defendantComment) {
          defendantHTML = `
            <div class="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs space-y-1 mt-2.5">
              <div class="font-bold text-[10px] text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <i class="fas fa-shield-alt"></i> ${isAccused ? 'Your Statement / Explanation' : "Accused Player's Explanation"}:
              </div>
              <p class="text-[11px] text-t2 font-medium leading-relaxed select-text whitespace-pre-line bg-black/20 p-2 rounded border border-white/5 mt-1">${r.defendantComment}</p>
              <span class="text-[9px] text-t3 block font-mono">Submitted: ${r.defendantCommentAt ? (r.defendantCommentAt.seconds ? new Date(r.defendantCommentAt.seconds * 1000).toLocaleString() : new Date(r.defendantCommentAt).toLocaleString()) : 'Recently'}</span>
            </div>
          `;
        } else if (isAccused) {
          defendantHTML = `
            <div class="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs space-y-2 mt-2.5">
              <div class="font-bold text-[10px] text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <i class="fas fa-shield-alt"></i> Submit Your Explanation / Statement (Optional)
              </div>
              <p class="text-[10px] text-t3 leading-relaxed">A complaint has been filed against you. You may optionally submit your statement or explanation here so the administration can review your side of the case.</p>
              <textarea id="defTxt-${r.id}" rows="3" placeholder="Enter your explanation, details, or links to counter-proof..." class="w-full bg-card border border-bdr rounded-lg px-2.5 py-2 text-t1 outline-none text-xs focus:border-amber-500 transition resize-none font-medium"></textarea>
              <button onclick="window.submitDefComment('${r.id}', document.getElementById('defTxt-${r.id}').value)" class="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-bg text-[10px] font-bold rounded transition">Submit Statement</button>
            </div>
          `;
        }
        return defendantHTML;
      })()}

      ${verdictHTML}
    `;

    container.appendChild(card);
  });
}

window.toggleEditDefendantComment = function(id) {
  const sec = document.getElementById('editSec-' + id);
  if (sec) {
    sec.classList.toggle('hidden');
  }
};

window.submitDefComment = async function(id, text) {
  if (!text || !text.trim()) {
    alert("Please write a detailed statement or defense!");
    return;
  }
  const btn = event?.target;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Submitting...';
  }
  try {
    const reportRef = doc(db, 'red_reports', id);
    await updateDoc(reportRef, {
      defendantComment: text.trim(),
      defendantCommentAt: serverTimestamp()
    });
    alert("Defense statement submitted successfully! ✅");
  } catch (err) {
    alert("Error submitting defense: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Submit Statement';
    }
  }
};

window.submitRedReportComment = async function(id) {
  if (!userProfile) {
    alert("Please sign in to comment on reports.");
    return;
  }
  
  const textarea = document.getElementById(`commTxt-${id}`);
  const text = textarea ? textarea.value.trim() : '';
  if (!text) {
    alert("Please enter a comment or reply text!");
    return;
  }
  
  const report = window.allRedReports.find(r => r.id === id);
  if (!report) {
    alert("Report not found.");
    return;
  }
  
  const pGameUID = userProfile.gameUID ? String(userProfile.gameUID).trim().toLowerCase() : '';
  const rGameUID = report.gameUID ? String(report.gameUID).trim().toLowerCase() : '';
  const pName = userProfile.name ? String(userProfile.name).trim().toLowerCase().replace(/^@/, '') : '';
  const pHandle = userProfile.handle ? String(userProfile.handle).trim().toLowerCase().replace(/^@/, '') : '';
  const rReported = report.reportedNickname ? String(report.reportedNickname).trim().toLowerCase().replace(/^@/, '') : '';
  const rReporterUid = report.reporterUid || '';

  const isAccused = (
    (rGameUID && pGameUID === rGameUID) ||
    (rReported && (pName === rReported || pHandle === rReported)) ||
    (report.reportedUid && userProfile.uid === report.reportedUid)
  );
  const isReporter = userProfile.uid === rReporterUid;
  const isStaff = userProfile.email === 'admin@arenax.com' || (userProfile.email && userProfile.email.includes('kpllahore'));
  
  let role = 'player';
  if (isStaff) role = 'moderator';
  else if (isAccused) role = 'accused';
  else if (isReporter) role = 'reporter';
  
  const sendBtn = document.getElementById(`commBtn-${id}`);
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner animate-spin"></i> Posting...';
  }
  
  try {
    const reportRef = doc(db, 'red_reports', id);
    const newComment = {
      authorName: userProfile.name || userProfile.handle || "ArenaX Player",
      authorUid: userProfile.uid,
      text: text,
      role: role,
      createdAt: new Date().toISOString()
    };
    
    await updateDoc(reportRef, {
      comments: arrayUnion(newComment)
    });
    
    if (textarea) textarea.value = '';
  } catch (err) {
    alert("Error posting comment: " + err.message);
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="fas fa-paper-plane text-[9px]"></i> Comment';
    }
  }
};

// Admin verdict / review actions
window.openReviewReportModal = async function(id, name) {
  window.activeReviewReportId = id;
  $('revPlayerTitle').textContent = `Reviewing Player: ${name}`;
  $('revVerdict').value = '';
  $('revPunishment').value = 'none';
  
  const statusDiv = $('revMatchedUserStatus');
  statusDiv.className = 'text-[9px] mt-1 text-gold/80 font-semibold flex items-center gap-1';
  statusDiv.innerHTML = '<i class="fas fa-spinner animate-spin"></i> Finding linked player...';
  
  $('mReviewRedReport').classList.remove('hidden');
  
  try {
    const foundUser = await validateReportedPlayer(name);
    if (foundUser) {
      statusDiv.className = 'text-[9px] mt-1 text-emerald-400 font-semibold flex items-center gap-1';
      statusDiv.innerHTML = `<i class="fas fa-check-circle"></i> Linked Account: <strong class="text-white">${foundUser.name}</strong>${foundUser.handle ? ` (@${foundUser.handle})` : ''} - UID: ${foundUser.uid || foundUser.id}`;
      window.activeReviewMatchedUser = foundUser;
      $('revPunishment').value = 'full_perm'; // Default prefill standard punishment
    } else {
      statusDiv.className = 'text-[9px] mt-1 text-red-400 font-semibold flex items-center gap-1';
      statusDiv.innerHTML = '<i class="fas fa-times-circle"></i> Accused player account not found in database.';
      window.activeReviewMatchedUser = null;
    }
  } catch (err) {
    statusDiv.className = 'text-[9px] mt-1 text-red-400';
    statusDiv.textContent = 'Error linking player: ' + err.message;
    window.activeReviewMatchedUser = null;
  }
};

$('bCloseReviewModal').addEventListener('click', () => {
  $('mReviewRedReport').classList.add('hidden');
});

$('bSubmitReview').addEventListener('click', async () => {
  const verdict = $('revVerdict').value.trim();
  if (!verdict) {
    alert('Please write a detailed verdict explaining the moderator action!');
    return;
  }

  const punishment = $('revPunishment').value;

  $('bSubmitReview').disabled = true;
  $('bSubmitReview').textContent = 'Saving decision...';

  try {
    if (punishment !== 'none' && window.activeReviewMatchedUser) {
      const targetUser = window.activeReviewMatchedUser;
      const targetUid = targetUser.uid || targetUser.id;
      
      let updateFields = {};
      
      if (punishment.startsWith('full_')) {
        let duration = punishment.split('_')[1];
        let expiry = null;
        if (duration !== 'perm') {
          let days = parseInt(duration);
          expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        }
        updateFields = {
          banned: true,
          banType: 'full',
          banReason: `[Auto punishment via Red Report #${window.activeReviewReportId}]: ${verdict}`,
          banUntil: expiry
        };
      } else if (punishment.startsWith('tour_')) {
        let duration = punishment.split('_')[1];
        let expiry = null;
        if (duration !== 'perm') {
          let days = parseInt(duration);
          expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        }
        updateFields = {
          banned: true,
          banType: 'tournament',
          banReason: `[Auto punishment via Red Report #${window.activeReviewReportId}]: ${verdict}`,
          banUntil: expiry
        };
      } else if (punishment.startsWith('mute_')) {
        let duration = punishment.split('_')[1];
        let expiry = null;
        if (duration !== 'perm') {
          expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        }
        updateFields = {
          muted: true,
          muteReason: `[Auto punishment via Red Report #${window.activeReviewReportId}]: ${verdict}`,
          muteUntil: expiry
        };
      }
      
      await updateDoc(doc(db, 'users', targetUid), updateFields);
    }

    const reportRef = doc(db, 'red_reports', window.activeReviewReportId);
    await updateDoc(reportRef, {
      status: 'closed',
      verdict: 'Confirmed Cheat',
      verdictComment: verdict,
      closedAt: serverTimestamp()
    });

    $('mReviewRedReport').classList.add('hidden');
    alert(`Report closed and verdict published successfully! ✅${punishment !== 'none' ? ' Direct punishment applied to the player!' : ''}`);
  } catch (err) {
    alert('Error submitting verdict: ' + err.message);
  } finally {
    $('bSubmitReview').disabled = false;
    $('bSubmitReview').textContent = 'Close & Save Verdict';
  }
});

// ── TOURNAMENTS PARTICIPATION & PROFILE PREVIEWS ──
window.openTournamentParticipation = async function(tour) {
  $('partTourName').textContent = tour.name;
  const container = $('participantsContainer');
  container.innerHTML = `
    <div class="p-8 text-center text-t3 text-xs">
      <i class="fas fa-circle-notch animate-spin text-2xl text-gold mb-2"></i>
      <p>Loading verified registrations...</p>
    </div>
  `;
  $('participationCountText').textContent = 'Loading...';
  $('mTournamentParticipation').classList.remove('hidden');

  try {
    const qParts = query(
      collection(db, 'tournament_registrations'),
      where('tournamentId', '==', tour.id),
      where('status', '==', 'approved')
    );
    const snap = await getDocs(qParts);
    container.innerHTML = '';
    
    if (snap.empty) {
      container.innerHTML = `
        <div class="p-8 text-center text-t3 text-xs border border-dashed border-bdr/40 rounded-xl bg-card/40">
          <i class="fas fa-user-slash text-2xl mb-2"></i>
          <p>No verified participants yet for this event.</p>
        </div>
      `;
      $('participationCountText').textContent = '0 Approved Slots';
      return;
    }

    $('participationCountText').textContent = `${snap.size} Approved Slot(s)`;

    // Fetch and display each approved user
    snap.forEach(docSnap => {
      const reg = docSnap.data();
      const pId = reg.userId;
      const defaultName = reg.userName || 'Anonymous Player';
      const pGameName = reg.gameName || defaultName;
      const pGameUID = reg.gameUID || 'No Game ID';

      // Use unique avatar seed based on player name/ID to show instantly
      const seed = pId || defaultName;
      const tempAv = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;

      const item = document.createElement('div');
      item.className = 'p-3 bg-card/60 border border-bdr/60 hover:border-gold/40 hover:bg-card rounded-xl flex items-center justify-between gap-3 transition duration-200 cursor-pointer';
      
      // We will define unique IDs to dynamically inject custom state when fetched
      const avId = `part-av-${pId}-${docSnap.id}`;
      const nameId = `part-name-${pId}-${docSnap.id}`;
      const badgesContainerId = `part-badges-${pId}-${docSnap.id}`;
      const rightSecId = `part-right-${pId}-${docSnap.id}`;

      item.innerHTML = `
        <div class="flex items-center gap-3">
          <img class="w-10 h-10 rounded-full border border-bdr object-cover transition" src="${tempAv}" alt="Avatar" id="${avId}"/>
          <div>
            <div class="font-display font-bold text-sm text-white flex flex-wrap items-center gap-1" id="${nameId}">
              <span>${defaultName}</span>
              <i class="fas fa-check-circle text-green text-[10px]" title="Slot Verified"></i>
            </div>
            <div class="text-[10px] text-t3 font-medium">IGN: <span class="text-gold font-mono">${pGameName}</span></div>
            <div class="flex gap-1 mt-0.5" id="${badgesContainerId}"></div>
          </div>
        </div>
        <div class="text-right flex flex-col items-end gap-1" id="${rightSecId}">
          <span class="px-2 py-0.5 text-[8px] font-bold bg-green/10 text-green rounded border border-green/20 uppercase tracking-wider">Slot OK</span>
          <span class="text-[9px] text-t3 font-mono">UID: ${pGameUID}</span>
        </div>
      `;

      item.addEventListener('click', () => {
        openParticipantProfileCard(pId, reg);
      });

      // Try to load user's customized avatar and details if exists
      getDoc(doc(db, 'users', pId)).then(uSnap => {
        if (uSnap.exists()) {
          const u = uSnap.data();
          
          // 1. Customized Avatar
          if (u.av) {
            const imgEl = item.querySelector(`#${avId}`);
            if (imgEl) imgEl.src = u.av;
          }

          // 2. Custom Frame if Premium
          if (u.premium && u.avatarFrame) {
            const imgEl = item.querySelector(`#${avId}`);
            if (imgEl) {
              if (u.avatarFrame === 'gold') {
                imgEl.className = 'w-10 h-10 rounded-full border border-gold shadow-[0_0_8px_rgba(240,192,64,0.3)] object-cover';
              } else if (u.avatarFrame === 'fire') {
                imgEl.className = 'w-10 h-10 rounded-full border border-red shadow-[0_0_8px_rgba(232,64,74,0.3)] object-cover';
              } else if (u.avatarFrame === 'ice') {
                imgEl.className = 'w-10 h-10 rounded-full border border-blue shadow-[0_0_8px_rgba(79,158,255,0.3)] object-cover';
              } else if (u.avatarFrame === 'royal') {
                imgEl.className = 'w-10 h-10 rounded-full border border-purple shadow-[0_0_8px_rgba(167,139,250,0.3)] object-cover';
              }
            }
          }

          // 3. Customized Display Name & Color
          const nameContainer = item.querySelector(`#${nameId}`);
          if (nameContainer) {
            const nameSpan = nameContainer.querySelector('span');
            if (nameSpan) {
              nameSpan.textContent = u.name || defaultName;
              if (u.premium && u.nameColor) {
                nameSpan.style.color = u.nameColor;
              }
            }
          }

          // 4. Badges (Premium, Rank)
          const badgesContainer = item.querySelector(`#${badgesContainerId}`);
          if (badgesContainer) {
            let badgesHTML = '';
            if (u.premium) {
              badgesHTML += `<span class="px-1.5 py-0.2 text-[7px] font-bold bg-purple/10 text-purple rounded border border-purple/20 uppercase flex items-center gap-0.5"><i class="fas fa-crown text-[6px]"></i> Premium</span>`;
            }
            if (u.rank) {
              badgesHTML += `<span class="px-1.5 py-0.2 text-[7px] font-bold bg-gold/10 text-gold rounded border border-gold/20 uppercase">${u.rank}</span>`;
            }
            badgesContainer.innerHTML = badgesHTML;
          }
        }
      }).catch(e => console.error('Error fetching participant details in check participation list: ', e));

      container.appendChild(item);
    });

  } catch (err) {
    container.innerHTML = `
      <div class="p-6 bg-red/10 border border-red/20 rounded-xl text-center text-xs text-red">
        <i class="fas fa-exclamation-triangle text-xl mb-1.5"></i>
        <p>Failed loading players: ${err.message}</p>
      </div>
    `;
    $('participationCountText').textContent = 'Error';
  }
};

$('bCloseParticipation').addEventListener('click', () => $('mTournamentParticipation').classList.add('hidden'));

// ── DETAILED PLAYER CARD MODAL DISPLAY ──
window.openParticipantProfileCard = async function(pId, registrationData) {
  openPlayerProfileCard(pId);
};

$('bCloseParticipantProfile').addEventListener('click', () => $('mViewParticipantProfile').classList.add('hidden'));

// ── POPULARITY CAROUSEL & HISTORY LOG ──
window.vppCarouselTimer = null;
window.startVppCarousel = function(receivedTypes) {
  if (window.vppCarouselTimer) {
    clearInterval(window.vppCarouselTimer);
    window.vppCarouselTimer = null;
  }

  const imgEl = $('vppCarouselImg') || $('vppCarouselImgReact');
  const dotsEl = $('vppCarouselDots');
  if (!imgEl) return;

  const basePath = (typeof window.getAppBasePath === 'function') ? window.getAppBasePath() : './';
  
  // Received types array, e.g. ['rose', 'rocket', 'trophy']. Default to ['rose'] if user has 0 total.
  const types = (receivedTypes && receivedTypes.length > 0) ? receivedTypes : ['rose'];
  let currentIndex = 0;

  const getImgSrc = (t) => {
    if (t === 'rocket') return basePath + 'rocket.png';
    if (t === 'trophy') return basePath + 'poptrophy.png';
    return basePath + 'rose.png';
  };

  const updateImage = (index) => {
    const t = types[index];
    const src = getImgSrc(t);

    imgEl.style.opacity = '0';
    imgEl.style.transform = 'scale(0.8)';
    setTimeout(() => {
      imgEl.src = src;
      imgEl.style.opacity = '1';
      imgEl.style.transform = 'scale(1)';
    }, 150);

    if (dotsEl) {
      if (types.length <= 1) {
        dotsEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>`;
      } else {
        dotsEl.innerHTML = types.map((_, i) => 
          `<span class="w-1.5 h-1.5 rounded-full ${i === index ? 'bg-rose-500 scale-125' : 'bg-gray-300'} transition-all"></span>`
        ).join('');
      }
    }
  };

  updateImage(0);

  if (types.length > 1) {
    window.vppCarouselTimer = setInterval(() => {
      currentIndex = (currentIndex + 1) % types.length;
      updateImage(currentIndex);
    }, 2800);
  }
};


// ── TOURNAMENT LEADERBOARD DISPLAY ──
window.openTournamentLeaderboard = async function(tour) {
  $('leadTourName').textContent = tour.name;
  const container = $('leaderboardListContainer');
  const podium = $('leaderboardPodium');
  
  // Reset
  podium.classList.add('hidden');
  container.innerHTML = `
    <div class="p-8 text-center text-t3 text-xs">
      <i class="fas fa-circle-notch animate-spin text-2xl text-gold mb-2"></i>
      <p>Fetching leaderboard statistics...</p>
    </div>
  `;
  $('leadTotalEntries').textContent = 'Loading...';
  $('mTournamentLeaderboard').classList.remove('hidden');

  try {
    const q = query(
      collection(db, 'leaderboards'),
      where('tournamentId', '==', tour.id)
    );
    const snap = await getDocs(q);
    container.innerHTML = '';

    if (snap.empty) {
      container.innerHTML = `
        <div class="p-8 text-center text-t3 text-xs border border-dashed border-bdr/40 rounded-xl bg-card/40">
          <i class="fas fa-trophy text-2xl mb-2 text-t3"></i>
          <p>No leaderboard records found for this tournament yet.</p>
          <p class="text-[10px] text-t3/80 mt-1">Staff will update rankings as matches finalize.</p>
        </div>
      `;
      $('leadTotalEntries').textContent = '0 Entries';
      return;
    }

    $('leadTotalEntries').textContent = `${snap.size} ENTRANT(S)`;

    // Map entries
    const entries = [];
    snap.forEach(docSnap => {
      entries.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Sort by rank explicitly just in case index is creating delays
    entries.sort((a, b) => Number(a.rank) - Number(b.rank));

    // Podium Setup (Ranks 1, 2, 3)
    const first = entries.find(e => Number(e.rank) === 1);
    const second = entries.find(e => Number(e.rank) === 2);
    const third = entries.find(e => Number(e.rank) === 3);

    if (first || second || third) {
      podium.classList.remove('hidden');
      
      // Rank 1
      if (first) {
        $('podium1Name').innerHTML = `${first.playerName}${window.getBlueTickBadgeHtml(first)}`;
        $('podium1Score').textContent = first.score || 'Champion';
        $('podium1Av').src = first.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(first.playerName)}`;
      } else {
        $('podium1Name').textContent = 'TBA';
        $('podium1Score').textContent = '-';
        $('podium1Av').src = 'https://api.dicebear.com/7.x/bottts/svg?seed=tba1';
      }

      // Rank 2
      if (second) {
        $('podium2Name').innerHTML = `${second.playerName}${window.getBlueTickBadgeHtml(second)}`;
        $('podium2Score').textContent = second.score || 'Runner-up';
        $('podium2Av').src = second.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(second.playerName)}`;
      } else {
        $('podium2Name').textContent = 'TBA';
        $('podium2Score').textContent = '-';
        $('podium2Av').src = 'https://api.dicebear.com/7.x/bottts/svg?seed=tba2';
      }

      // Rank 3
      if (third) {
        $('podium3Name').innerHTML = `${third.playerName}${window.getBlueTickBadgeHtml(third)}`;
        $('podium3Score').textContent = third.score || '3rd Place';
        $('podium3Av').src = third.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(third.playerName)}`;
      } else {
        $('podium3Name').textContent = 'TBA';
        $('podium3Score').textContent = '-';
        $('podium3Av').src = 'https://api.dicebear.com/7.x/bottts/svg?seed=tba3';
      }
    }

    // List Container
    entries.forEach(e => {
      const rankBg = Number(e.rank) === 1 ? 'bg-gold/15 text-gold border-gold/30' :
                     Number(e.rank) === 2 ? 'bg-slate-400/10 text-slate-300 border-slate-500/20' :
                     Number(e.rank) === 3 ? 'bg-amber-700/15 text-amber-500 border-amber-800/20' :
                     'bg-[#1e2440] text-t2 border-bdr/60';

      const item = document.createElement('div');
      item.className = 'p-3 bg-card/60 border border-bdr/50 rounded-xl flex items-center justify-between gap-3 transition hover:bg-card';
      item.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-6 h-6 rounded-full border flex items-center justify-center font-mono font-bold text-xs ${rankBg}">
            ${e.rank}
          </div>
          <img class="w-8 h-8 rounded-full border border-bdr object-cover" src="${e.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(e.playerName)}"/>
          <div>
            <div class="font-bold text-sm text-white flex items-center gap-1.5">
              ${e.playerName}${window.getBlueTickBadgeHtml(e)}
              ${e.userId ? `<span class="text-[8px] bg-gold/10 text-gold px-1.5 py-0.2 rounded border border-gold/20 flex items-center gap-0.5"><i class="fas fa-check-circle text-[7px]"></i> Verified</span>` : ''}
            </div>
            ${e.playerHandle ? `<div class="text-[9px] text-t3 font-medium">${e.playerHandle}</div>` : ''}
          </div>
        </div>
        <div class="text-right flex flex-col items-end gap-0.5">
          <span class="text-xs font-bold font-mono text-gold">${e.score || 'Completed'}</span>
          ${e.userId ? `
            <button class="b-view-p-card text-[9px] text-blue-400 hover:text-white hover:underline font-bold" data-uid="${e.userId}">
              View Profile <i class="fas fa-chevron-right text-[7px]"></i>
            </button>
          ` : ''}
        </div>
      `;

      if (e.userId) {
        item.querySelector('.b-view-p-card')?.addEventListener('click', (ev) => {
          ev.stopPropagation();
          // Fetch registration data placeholder to reuse the profile display modal
          const dummyReg = {
            userName: e.playerName,
            userHandle: e.playerHandle || '@player#0000',
            gameUID: 'Linked Profile'
          };
          openParticipantProfileCard(e.userId, dummyReg);
        });
      }

      container.appendChild(item);
    });

  } catch (err) {
    container.innerHTML = `
      <div class="p-6 bg-red/10 border border-red/20 rounded-xl text-center text-xs text-red">
        <i class="fas fa-exclamation-triangle text-xl mb-1.5"></i>
        <p>Failed loading leaderboard: ${err.message}</p>
      </div>
    `;
    $('leadTotalEntries').textContent = 'Error';
  }
};

$('bCloseLeaderboard').addEventListener('click', () => $('mTournamentLeaderboard').classList.add('hidden'));

// ── ACCORDION INTERACTIVITY ──
window.toggleAccordion = (index) => {
  const accordions = document.querySelectorAll('.ai .ab');
  const icons = document.querySelectorAll('.ai i.fa-chevron-down');
  
  accordions.forEach((ab, i) => {
    if (i === index) {
      ab.classList.toggle('hidden');
      icons[i].classList.toggle('rotate-180');
    } else {
      ab.classList.add('hidden');
      icons[i].classList.remove('rotate-180');
    }
  });
};

// Search rules
$('rSearch').addEventListener('input', (e) => {
  const queryStr = e.target.value.toLowerCase();
  document.querySelectorAll('.ai').forEach(ai => {
    const text = ai.textContent.toLowerCase();
    ai.classList.toggle('hidden', !text.includes(queryStr));
  });
});

// ── WALLET DEPOSITS & TRANSACTIONS ──
let selectedDepMethod = 'jc';
const payInstructions = {
  jc: '<strong>JazzCash Transfer:</strong><br/>1. Open your JazzCash Mobile App.<br/>2. Select Send Money → Mobile Account.<br/>3. Enter Receiver Number: <strong class="text-gold">0302-4686897</strong>.<br/>4. Enter PKR Amount & confirm.<br/>5. Put Ref Key: <strong class="text-gold">AX-COINS</strong>.<br/>6. Enter Transaction ID (TXN ID) below to claim coins instantly.',
  ep: '<strong>NayaPay Transfer:</strong><br/>1. Open your NayaPay Mobile App.<br/>2. Select Send Money → NayaPay User Account.<br/>3. Enter Receiver Number: <strong class="text-gold">0303-9229405</strong>.<br/>4. Enter PKR Amount & confirm.<br/>5. Put Ref Key: <strong class="text-gold">AX-COINS</strong>.<br/>6. Enter Transaction ID (TXN ID) below to claim coins instantly.'
};

$('bDep').addEventListener('click', () => {
  $('payStep1').classList.remove('hidden');
  $('payStep2').classList.add('hidden');
  $('payAmtInp').value = '';
  $('mPayment').classList.remove('hidden');
});

document.querySelectorAll('.pm-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedDepMethod = btn.dataset.m;
    $('payInstr').innerHTML = payInstructions[selectedDepMethod];
    $('payStep1').classList.add('hidden');
    $('payStep2').classList.remove('hidden');
  });
});

$('payBackBtn').addEventListener('click', () => {
  $('payStep2').classList.add('hidden');
  $('payStep1').classList.remove('hidden');
});

document.querySelectorAll('.amt-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.amt-chip').forEach(c => c.classList.remove('border-gold', 'text-gold'));
    chip.classList.add('border-gold', 'text-gold');
    $('payAmtInp').value = chip.dataset.v;
    $('payAmtInp').dispatchEvent(new Event('input'));
  });
});

// Estimated Coins Live update listener
$('payAmtInp').addEventListener('input', () => {
  const amt = parseFloat($('payAmtInp').value) || 0;
  if (amt > 0) {
    const bonusAX = Math.floor(amt * 1.15);
    $('payEstimatedAX').textContent = `${bonusAX.toLocaleString()} AX`;
    $('payEstimatedAXLabel').innerHTML = `Includes <strong class="text-green">15% bonus</strong> coins!`;
  } else {
    $('payEstimatedAX').textContent = `0 AX`;
    $('payEstimatedAXLabel').innerHTML = `Get <strong class="text-green">15% bonus</strong> AX coins on every deposit!`;
  }
});

$('payConfirmBtn').addEventListener('click', async () => {
  if (!userProfile) {
    alert('Connect a full account to deposit real money.');
    return;
  }
  const amt = parseFloat($('payAmtInp').value);
  if (!amt || amt < 50) {
    alert('Minimum deposit is Rs 50!');
    return;
  }
  const txnId = $('payTxnId').value.trim();
  if (!txnId) {
    alert('Please enter your payment Transaction ID (TXN ID / TID) to claim coins!');
    return;
  }

  try {
    const finalAX = Math.floor(amt * 1.15);
    const methodStr = selectedDepMethod === 'jc' ? 'JazzCash' : 'NayaPay';

    // Submit to Firestore deposit_requests collection
    await addDoc(collection(db, 'deposit_requests'), {
      userId: userProfile.uid,
      userName: userProfile.name,
      userHandle: userProfile.handle,
      amountPKR: amt,
      amountAX: finalAX,
      method: methodStr,
      txnId: txnId,
      status: 'pending',
      rejectionReason: '',
      submittedAt: serverTimestamp()
    });

    $('mPayment').classList.add('hidden');
    $('payAmtInp').value = '';
    $('payTxnId').value = '';
    $('payEstimatedAX').textContent = '0 AX';

    alert(`Deposit request submitted successfully! ⏳\n\nYour transaction ID: ${txnId}\nPKR Amount: Rs ${amt}\nAX Coins: ${finalAX} AX\n\nPlease wait for administration to review your request. We are verifying your payment.`);
  } catch (err) {
    alert('Error submitting deposit request: ' + err.message);
  }
});

function renderUserDeposits(list) {
  const histEl = $('wHist');
  if (!histEl) return;
  
  if (!list || list.length === 0) {
    histEl.innerHTML = `
      <div class="p-6 bg-card border border-bdr rounded-xl text-center text-xs text-t3">
        <i class="fas fa-receipt text-2xl mb-1.5"></i>
        <p>No recorded transactions yet.</p>
      </div>
    `;
    return;
  }

  histEl.innerHTML = '';
  list.forEach(tx => {
    const isWithdrawal = tx.type === 'withdrawal' || tx.type === 'withdraw' || (tx.type === 'adjustment' && tx.amount < 0);
    const item = document.createElement('div');
    item.className = 'p-3.5 bg-card border border-bdr rounded-xl flex flex-col gap-2.5';

    let statusHtml = '';
    let statusClass = '';
    let bgIconClass = '';
    let textAmtClass = '';

    if (tx.type === 'adjustment') {
      const isAdd = tx.amount >= 0;
      statusClass = isAdd ? 'text-green bg-green/10 border border-green/20' : 'text-red bg-red/10 border border-red/20';
      bgIconClass = isAdd ? 'bg-green/10 border border-green/20 text-green' : 'bg-red/10 border border-red/20 text-red';
      textAmtClass = isAdd ? 'text-green' : 'text-red';
      statusHtml = `
        <div class="flex items-center gap-1 text-[10px] font-bold ${isAdd ? 'text-green' : 'text-red'} uppercase">
          <i class="fas ${isAdd ? 'fa-check-circle' : 'fa-times-circle'}"></i> Balance Adjusted
        </div>
        <p class="text-[9px] text-t3 leading-normal mt-0.5">${tx.message || (isAdd ? 'Coins added by Admin.' : 'Coins deducted by Admin.')}</p>
      `;
      
      const dateStr = tx.timestamp || 'Just now';
      const amountAX = Math.abs(tx.amount);
      const methodLabel = tx.account || 'Admin Adjustment';
      const txnLabel = tx.id || 'ADJ';
      
      item.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs ${bgIconClass}">
              <i class="fas ${isAdd ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
            </div>
            <div>
              <div class="text-white font-bold uppercase text-[10px]">${methodLabel}</div>
              <div class="text-[9px] text-t3 font-mono mt-0.5">${dateStr}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-display font-black text-sm ${textAmtClass}">
              ${isAdd ? '+' : '-'}${amountAX} AX
            </div>
            <div class="text-[9px] text-t3 font-mono">-</div>
          </div>
        </div>
        
        <div class="p-2.5 bg-[#0a0d16]/60 border border-bdr/55 rounded-lg flex flex-col">
          <div class="flex justify-between items-center text-[9px] border-b border-bdr/35 pb-1 mb-1 font-mono">
            <span class="text-t3 uppercase">ID: ${txnLabel}</span>
            <span class="px-1.5 py-0.5 rounded text-[8px] ${statusClass} uppercase font-bold tracking-wider">approved</span>
          </div>
          ${statusHtml}
        </div>
      `;
    } else {
      if (tx.status === 'pending') {
        statusClass = 'text-gold bg-gold/10 border border-gold/20';
        bgIconClass = 'bg-gold/10 border border-gold/20 text-gold';
        textAmtClass = 'text-gold';
        statusHtml = isWithdrawal ? `
          <div class="flex items-center gap-1.5 text-[10px] font-black uppercase text-gold">
            <span class="w-1.5 h-1.5 rounded-full bg-gold animate-pulse"></span>
            Withdrawal Pending Review
          </div>
          <p class="text-[9px] text-t3 leading-normal mt-0.5">⏳ Wait for administration to process your withdrawal request... Will be credited in 24-48 hours.</p>
        ` : `
          <div class="flex items-center gap-1.5 text-[10px] font-black uppercase text-gold">
            <span class="w-1.5 h-1.5 rounded-full bg-gold animate-pulse"></span>
            Pending Administration Review
          </div>
          <p class="text-[9px] text-t3 leading-normal mt-0.5">⏳ Wait for administration to review your request... We are checking your TXN ID.</p>
        `;
      } else if (tx.status === 'approved') {
        statusClass = 'text-green bg-green/10 border border-green/20';
        bgIconClass = isWithdrawal ? 'bg-red/10 border border-red/20 text-red' : 'bg-green/10 border border-green/20 text-green';
        textAmtClass = isWithdrawal ? 'text-red' : 'text-green';
        statusHtml = isWithdrawal ? `
          <div class="flex items-center gap-1 text-[10px] font-bold text-red uppercase">
            <i class="fas fa-arrow-up"></i> Successful Withdrawal
          </div>
          <p class="text-[9px] text-t3 leading-normal mt-0.5">Successfully processed! Rs ${tx.amountPKR} sent to ${tx.method}.</p>
        ` : `
          <div class="flex items-center gap-1 text-[10px] font-bold text-green uppercase">
            <i class="fas fa-check-circle"></i> Successful deposit
          </div>
          <p class="text-[9px] text-t3 leading-normal mt-0.5">Successfully processed! ${tx.amountAX} AX Coins credited to wallet.</p>
        `;
      } else {
        statusClass = 'text-red bg-red/10 border border-red/20';
        bgIconClass = 'bg-red/10 border border-red/20 text-red';
        textAmtClass = 'text-red';
        statusHtml = `
          <div class="flex items-center gap-1 text-[10px] font-bold text-red uppercase">
            <i class="fas fa-times-circle"></i> Rejected ${isWithdrawal ? 'Withdrawal' : 'Deposit'}
          </div>
          <p class="text-[9px] text-red/80 font-semibold leading-normal mt-0.5">Reason: ${tx.rejectionReason || 'Invalid details.'}</p>
        `;
      }

      const dateStr = tx.submittedAt ? new Date(tx.submittedAt.seconds * 1000).toLocaleString() : 'Just now';

      item.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs ${bgIconClass}">
              <i class="fas ${isWithdrawal ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
            </div>
            <div>
              <div class="text-white font-bold uppercase text-[10px]">${isWithdrawal ? 'Withdrawal' : 'Deposit'} (${tx.method})</div>
              <div class="text-[9px] text-t3 font-mono mt-0.5">${dateStr}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-display font-black text-sm ${textAmtClass}">
              ${isWithdrawal ? '-' : '+'}${tx.amountAX} AX
            </div>
            <div class="text-[9px] text-t3 font-mono">Rs ${tx.amountPKR}</div>
          </div>
        </div>
        
        <div class="p-2.5 bg-[#0a0d16]/60 border border-bdr/55 rounded-lg flex flex-col">
          <div class="flex justify-between items-center text-[9px] border-b border-bdr/35 pb-1 mb-1 font-mono">
            <span class="text-t3 uppercase">ID: ${tx.txnId}</span>
            <span class="px-1.5 py-0.5 rounded text-[8px] ${statusClass} uppercase font-bold tracking-wider">${tx.status}</span>
          </div>
          ${statusHtml}
        </div>
      `;
    }

    histEl.appendChild(item);
  });
}

$('bWith').addEventListener('click', async () => {
  if (!userProfile) {
    alert('Connect a full account to request withdrawals.');
    return;
  }

  // Check tournament participation to unlock withdrawals
  let hasPlayed = false;
  if (userProfile.hasSubmittedRegistration) {
    hasPlayed = true;
  } else {
    try {
      const regQuery = query(collection(db, 'tournament_registrations'), where('userId', '==', userProfile.uid));
      const regSnap = await getDocs(regQuery);
      if (!regSnap.empty) {
        hasPlayed = true;
      }
    } catch (e) {
      console.warn("Error querying registrations, falling back to false:", e);
    }
  }

  if (!hasPlayed) {
    alert('⚠️ Withdrawal Locked!\n\nYou have to play at least one tournament to unlock withdrawals.');
    return;
  }

  const curBal = userProfile.balance || 0;
  if (curBal <= 0) {
    alert('No balance available to withdraw!');
    return;
  }
  const amtStr = prompt(`Withdraw how many AX Coins? (Minimum 300 AX. Max: ${curBal})`);
  if (!amtStr) return;
  const amt = parseFloat(amtStr);
  if (isNaN(amt) || amt <= 0 || amt > curBal) {
    alert('Invalid withdrawal amount!');
    return;
  }
  if (amt < 300) {
    alert('The minimum withdrawal limit is 300 AX Coins. Please enter a valid amount of 300 AX Coins or more to proceed.');
    return;
  }
  const account = prompt('Enter your JazzCash / NayaPay Account Number and Name to receive PKR:');
  if (!account || !account.trim()) {
    alert('Withdrawal account details are required!');
    return;
  }

  try {
    const newBal = curBal - amt;
    // Deduct immediately to prevent double spending
    await updateDoc(doc(db, 'users', userProfile.uid), {
      balance: newBal
    });

    const txnId = `WTH-${Math.floor(100000 + Math.random() * 900000)}`;

    // Save as a withdrawal type under deposit_requests collection
    await addDoc(collection(db, 'deposit_requests'), {
      userId: userProfile.uid,
      userName: userProfile.name,
      userHandle: userProfile.handle,
      amountPKR: amt, // For withdrawals, coin-to-PKR is 1:1
      amountAX: amt,
      method: 'JazzCash/NayaPay',
      txnId: txnId,
      status: 'pending',
      type: 'withdrawal',
      accountDetails: account.trim(),
      rejectionReason: '',
      submittedAt: serverTimestamp()
    });

    alert(`Withdrawal request submitted successfully! ⏳\n\nCoins Deducted: ${amt} AX\nTransaction ID: ${txnId}\n\nOur team will review and verify your request within 24-48 hours. PKR will be sent to:\n${account}`);
  } catch (err) {
    alert('Failed to submit withdrawal: ' + err.message);
  }
});

$('bClosePayment').addEventListener('click', () => $('mPayment').classList.add('hidden'));
$('bClosePayment2').addEventListener('click', () => $('mPayment').classList.add('hidden'));

// Copy Referral Link Event
$('bCopyReferral').addEventListener('click', () => {
  if (!userProfile) {
    alert('Please register and login to get a unique referral link.');
    return;
  }
  const input = $('referralLinkInput');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(input.value).then(() => {
      const btn = $('bCopyReferral');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      btn.classList.add('bg-green-500', 'text-white');
      btn.classList.remove('bg-gold', 'text-bg');
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('bg-green-500', 'text-white');
        btn.classList.add('bg-gold', 'text-bg');
      }, 2000);
    }).catch(err => {
      console.error('Copy failed: ', err);
      input.select();
    });
  } else {
    input.select();
    document.execCommand('copy');
    const btn = $('bCopyReferral');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    setTimeout(() => { btn.innerHTML = originalText; }, 2000);
  }
});

// ── CUSTOMIZE PROFILE MODAL ──
window.VIP_FONTS = [
  { id: 'poppins', name: 'Poppins', className: 'font-poppins', desc: 'Modern Clean' },
  { id: 'orbitron', name: 'Orbitron', className: 'font-orbitron', desc: 'Futuristic Sci-Fi' },
  { id: 'luckiest-guy', name: 'Luckiest Guy', className: 'font-luckiest-guy', desc: 'Bold Bubble' },
  { id: 'fredoka', name: 'Fredoka', className: 'font-fredoka', desc: 'Rounded Casual' },
  { id: 'bungee', name: 'Bungee', className: 'font-bungee', desc: 'Urban Block' },
  { id: 'chakra', name: 'Chakra Petch', className: 'font-chakra', desc: 'Esports Angular' },
  { id: 'press-start', name: 'Press Start 2P', className: 'font-press-start', desc: '8-Bit Retro Pixel' },
  { id: 'cinzel', name: 'Cinzel', className: 'font-cinzel', desc: 'Roman Serif' },
  { id: 'rajdhani', name: 'Rajdhani', className: 'font-rajdhani', desc: 'Tactical Cyber' },
  { id: 'unifraktur', name: 'Unifraktur', className: 'font-unifraktur', desc: 'Gothic Medieval' },
  { id: 'permanent-marker', name: 'Permanent Marker', className: 'font-permanent-marker', desc: 'Street Marker' },
  { id: 'pacifico', name: 'Pacifico', className: 'font-pacifico', desc: 'Flowing Script' }
];

let selectedVipFont = 'font-poppins';
let fontPreviewMode = 'gg';

window.updateCustomizeFontPreview = function() {
  const profile = userProfile || guestProfile || {};
  const currentFont = selectedVipFont || profile.selectedFont || 'font-poppins';
  const found = window.VIP_FONTS.find(f => f.className === currentFont) || window.VIP_FONTS[0];

  const badge = $('custCurrentFontBadge');
  if (badge) {
    window.VIP_FONTS.forEach(f => badge.classList.remove(f.className));
    badge.classList.add(found.className);
    badge.textContent = 'Gg';
  }

  const nameEl = $('custCurrentFontName');
  if (nameEl) {
    nameEl.textContent = `${found.name} (${found.desc})`;
  }
};

window.setFontPreviewMode = function(mode) {
  fontPreviewMode = mode;
  const btnGg = $('btnFontPreviewGg');
  const btnName = $('btnFontPreviewName');
  if (btnGg && btnName) {
    if (mode === 'gg') {
      btnGg.className = 'px-2.5 py-1 rounded-md text-[11px] font-bold transition bg-blue-600 text-white shadow-sm cursor-pointer';
      btnName.className = 'px-2.5 py-1 rounded-md text-[11px] font-bold transition text-gray-400 hover:text-white cursor-pointer';
    } else {
      btnName.className = 'px-2.5 py-1 rounded-md text-[11px] font-bold transition bg-blue-600 text-white shadow-sm cursor-pointer';
      btnGg.className = 'px-2.5 py-1 rounded-md text-[11px] font-bold transition text-gray-400 hover:text-white cursor-pointer';
    }
  }
  window.renderFontPickerGrid();
};

window.renderFontPickerGrid = function() {
  const container = $('fontPickerGrid');
  if (!container) return;

  const profile = userProfile || guestProfile || {};
  const isVIP = !!(profile.isVIP || profile.isPremium || profile.premium || profile.vip);
  const currentFontClass = selectedVipFont || profile.selectedFont || 'font-poppins';
  const previewText = fontPreviewMode === 'gg' ? 'Gg' : (profile.name || 'Player');

  // Update modal preview header name
  const namePreviewEl = $('fontModalCurrentNamePreview');
  if (namePreviewEl) {
    window.VIP_FONTS.forEach(f => namePreviewEl.classList.remove(f.className));
    namePreviewEl.classList.add(currentFontClass);
    namePreviewEl.textContent = profile.name || 'Player';
  }

  // Update VIP Badge state in modal
  const vipBadgeEl = $('fontModalVipBadge');
  if (vipBadgeEl) {
    if (isVIP) {
      vipBadgeEl.className = 'px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center gap-1';
      vipBadgeEl.innerHTML = '<i class="fas fa-crown text-amber-400 text-[9px]"></i> VIP Unlocked';
    } else {
      vipBadgeEl.className = 'px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full flex items-center gap-1';
      vipBadgeEl.innerHTML = '<i class="fas fa-lock text-purple-300 text-[9px]"></i> VIP Exclusive';
    }
  }

  const unlockBtn = $('btnUnlockVipFromFontModal');
  if (unlockBtn) {
    if (!isVIP) {
      unlockBtn.classList.remove('hidden');
    } else {
      unlockBtn.classList.add('hidden');
    }
  }

  container.innerHTML = window.VIP_FONTS.map(font => {
    const isSelected = currentFontClass === font.className;
    return `
      <button
        type="button"
        id="font-card-${font.id}"
        onclick="window.handleFontCardClick('${font.className}')"
        class="relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl transition-all duration-200 cursor-pointer min-h-[96px] sm:min-h-[108px] text-center select-none group ${
          isSelected
            ? 'border-2 border-[#3b82f6] bg-[#161c2e] ring-2 ring-blue-500/40 shadow-[0_0_18px_rgba(59,130,246,0.35)] scale-[1.03]'
            : 'border border-[#262c47] bg-[#131622] hover:bg-[#1b2033] hover:border-slate-500 hover:scale-[1.02]'
        } ${!isVIP ? 'opacity-85' : ''}"
      >
        ${
          isSelected
            ? '<div class="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] shadow-md"><i class="fas fa-check"></i></div>'
            : (!isVIP ? '<div class="absolute top-2 right-2 text-amber-400/80"><i class="fas fa-lock text-[10px]"></i></div>' : '')
        }
        <div class="text-2xl sm:text-3xl text-white font-black tracking-wide drop-shadow transition-transform duration-200 group-hover:scale-105 ${font.className} truncate max-w-full px-1">
          ${previewText}
        </div>
        <div class="text-[10px] sm:text-[11px] text-gray-400 font-medium mt-1.5 truncate max-w-full group-hover:text-gray-200">
          ${font.name}
        </div>
      </button>
    `;
  }).join('');
};

window.handleFontCardClick = async function(fontClassName) {
  const profile = userProfile || guestProfile || {};
  const isVIP = !!(profile.isVIP || profile.isPremium || profile.premium || profile.vip);

  if (!isVIP) {
    const toast = $('fontModalToast');
    const toastText = $('fontModalToastText');
    if (toast && toastText) {
      toast.className = 'mx-4 sm:mx-5 mt-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2 animate-fade-in';
      toastText.innerHTML = '🔒 VIP Fonts require a VIP / Premium Pass! Upgrade to equip.';
      toast.classList.remove('hidden');
      setTimeout(() => { if (toast) toast.classList.add('hidden'); }, 3500);
    }
    return;
  }

  selectedVipFont = fontClassName;
  window.renderFontPickerGrid();
  window.updateCustomizeFontPreview();

  // Save to Firestore and state immediately
  await window.saveSelectedFont(fontClassName);
};

window.saveSelectedFont = async function(fontClassName) {
  const profile = userProfile || guestProfile;
  if (!profile) return;

  const found = window.VIP_FONTS.find(f => f.className === fontClassName) || { name: 'Custom' };

  try {
    if (userProfile && userProfile.uid) {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        selectedFont: fontClassName
      });
      userProfile.selectedFont = fontClassName;
    } else if (guestProfile) {
      guestProfile.selectedFont = fontClassName;
      try { localStorage.setItem('arenaX_guest_profile', JSON.stringify(guestProfile)); } catch(e){}
    }

    // Apply globally to UI names
    if (window.applySelectedFontToUI) window.applySelectedFontToUI(fontClassName);

    // Show stylish toast confirmation
    const toast = $('fontModalToast');
    const toastText = $('fontModalToastText');
    if (toast && toastText) {
      toast.className = 'mx-4 sm:mx-5 mt-3 p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center gap-2 animate-fade-in';
      toastText.innerHTML = `✨ Successfully applied <b>${found.name}</b> font to your IGN!`;
      toast.classList.remove('hidden');
      setTimeout(() => { if (toast) toast.classList.add('hidden'); }, 2500);
    }
  } catch (err) {
    console.error('Failed to save selected font:', err);
  }
};

window.applySelectedFontToUI = function(fontClassName) {
  const allVipFontClasses = window.VIP_FONTS.map(f => f.className);
  const pName = $('pName');
  const setName = $('setName');
  const previewText = $('goldenNamePreviewText');

  [pName, setName, previewText].forEach(el => {
    if (!el) return;
    allVipFontClasses.forEach(cls => el.classList.remove(cls));
    if (fontClassName) el.classList.add(fontClassName);
  });
};

window.openFontPickerModal = function() {
  const profile = userProfile || guestProfile || {};
  selectedVipFont = profile.selectedFont || 'font-poppins';
  window.renderFontPickerGrid();
  window.updateCustomizeFontPreview();

  const modal = $('mChooseFont');
  if (modal) {
    modal.classList.remove('hidden');
  }
};

window.closeFontPickerModal = function() {
  const modal = $('mChooseFont');
  if (modal) {
    modal.classList.add('hidden');
  }
  window.updateCustomizeFontPreview();
  if (window.updateGoldenNamePreview) window.updateGoldenNamePreview();
};

const bannerGradients = {
  red: 'linear-gradient(135deg, #3f0f15 0%, #1a0508 100%)',
  gold: 'linear-gradient(135deg, #3b2f0f 0%, #1a1405 100%)',
  blue: 'linear-gradient(135deg, #0f233f 0%, #050e1a 100%)',
  purple: 'linear-gradient(135deg, #2b0f3f 0%, #12051a 100%)',
  green: 'linear-gradient(135deg, #0f3f1e 0%, #051a0b 100%)',
  sunset: 'linear-gradient(135deg, #3f1e0f 0%, #1a0512 100%)',
  ocean: 'linear-gradient(135deg, #0f3f3b 0%, #051a18 100%)',
  dark: 'linear-gradient(135deg, #151821 0%, #0a0b10 100%)'
};

const nameColors = {
  white: '#ffffff',
  gold: '#c0a030',
  red: '#ff4d4d',
  blue: '#3b82f6',
  green: '#10b981',
  purple: '#8b5cf6',
  orange: '#f97316',
  cyan: '#06b6d4'
};

function loadBannerThemeSelector() {
  const container = $('custBannerThemes');
  const isPremium = userProfile ? userProfile.premium : false;
  container.innerHTML = Object.keys(bannerGradients).map(theme => `
    <button type="button" class="theme-opt h-10 rounded-lg border border-bdr relative transition flex items-center justify-center cursor-pointer ${isPremium ? '' : 'opacity-60'}" data-theme="${theme}" style="background: ${bannerGradients[theme]}">
      <span class="text-[9px] font-bold uppercase tracking-wider text-white/90 bg-black/40 px-1.5 py-0.5 rounded">${theme}</span>
      <div class="theme-check absolute inset-0 border border-gold rounded-lg ${selectedBannerTheme === theme ? '' : 'hidden'} flex items-center justify-center bg-black/25">
        <i class="fas fa-check text-gold text-xs"></i>
      </div>
    </button>
  `).join('');

  container.querySelectorAll('.theme-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      if (userProfile && !userProfile.premium) {
        alert('🔒 Profile Banner Theme is a Premium feature!\n\nUpgrade to VIP Premium Pass to unlock this feature!');
        return;
      }
      container.querySelectorAll('.theme-opt .theme-check').forEach(c => c.classList.add('hidden'));
      opt.querySelector('.theme-check').classList.remove('hidden');
      selectedBannerTheme = opt.dataset.theme;
    });
  });
}

function loadNameColorSelector() {
  const container = $('custNameColors');
  const isPremium = userProfile ? userProfile.premium : false;
  container.innerHTML = Object.keys(nameColors).map(colorKey => `
    <button type="button" class="color-opt w-full aspect-square rounded-full border border-bdr relative transition flex items-center justify-center cursor-pointer ${isPremium ? '' : 'opacity-60'}" data-color="${nameColors[colorKey]}" style="background-color: ${nameColors[colorKey]}">
      <div class="color-check absolute inset-0 border border-white rounded-full ${selectedNameColor.toLowerCase() === nameColors[colorKey].toLowerCase() ? '' : 'hidden'} flex items-center justify-center bg-black/20">
        <i class="fas fa-check text-white text-[9px]"></i>
      </div>
    </button>
  `).join('');

  container.querySelectorAll('.color-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      if (userProfile && !userProfile.premium) {
        alert('🔒 Username Color is a Premium feature!\n\nUpgrade to VIP Premium Pass to unlock this feature!');
        return;
      }
      container.querySelectorAll('.color-opt .color-check').forEach(c => c.classList.add('hidden'));
      opt.querySelector('.color-check').classList.remove('hidden');
      selectedNameColor = opt.dataset.color;
      if (window.updateGoldenNamePreview) window.updateGoldenNamePreview();
    });
  });
}

function loadAvatarPickerGrid() {
  const grid = $('custAvatars');
  const userSeed = (userProfile && userProfile.av && userProfile.av.includes('seed=')) ? userProfile.av.split('seed=')[1] : null;
  const isPremium = userProfile ? userProfile.premium : false;
  
  grid.innerHTML = AVATAR_SEEDS.map((s, i) => {
    const isSelected = userSeed === s || (!userSeed && i === 0);
    return `
      <button class="cav-opt bg-ele border border-bdr rounded-xl p-1.5 transition overflow-hidden relative ${isPremium ? '' : 'opacity-60'} ${isSelected ? 'border-gold scale-105' : ''}" data-seed="${s}">
        <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${s}" class="w-full h-auto object-cover rounded-lg" alt=""/>
      </button>
    `;
  }).join('');

  grid.querySelectorAll('.cav-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      grid.querySelectorAll('.cav-opt').forEach(o => o.classList.remove('border-gold', 'scale-105'));
      opt.classList.add('border-gold', 'scale-105');
      selectedAvatarSeed = opt.dataset.seed;
      selectedCustomAvatarUrl = null; // Clear custom upload if user picks a seed
      $('custAvPreview').src = `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedAvatarSeed}`;
    });
  });
}

// Helper function to resize uploaded image to compact Data URL
function resizeImageToDataUrl(file, maxWidth = 300, maxHeight = 300, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Custom Avatar File Browse and Upload
$('btnBrowseAvatar').addEventListener('click', (e) => {
  e.preventDefault();
  $('fileAvatar').click();
});

$('fileAvatar').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('❌ Invalid file type! Please upload an image file (PNG, JPG, WEBP).');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert('❌ File is too large! Maximum size allowed is 5MB.');
    return;
  }

  const statusEl = $('uploadStatus');
  statusEl.classList.remove('hidden');
  statusEl.innerHTML = `<span class="text-purple flex items-center gap-1.5"><i class="fas fa-spinner fa-spin"></i> Processing ${file.name}...</span>`;

  try {
    // Generate fast, reliable, compact Data URL locally
    const dataUrl = await resizeImageToDataUrl(file, 300, 300, 0.85);

    $('custAvPreview').src = dataUrl;
    selectedCustomAvatarUrl = dataUrl;

    statusEl.innerHTML = `<span class="text-green-400 font-semibold flex items-center gap-1.5"><i class="fas fa-check-circle"></i> Photo loaded! Click "Save Changes" to apply.</span>`;

    // Optional background storage upload attempt
    if (userProfile && userProfile.uid && typeof ref === 'function' && typeof uploadBytes === 'function') {
      try {
        const timestamp = Date.now();
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const storagePath = `avatars/${userProfile.uid}_${timestamp}_${cleanFileName}`;
        const storageRef = ref(storage, storagePath);
        uploadBytes(storageRef, file).then(async (snapshot) => {
          const downloadURL = await getDownloadURL(snapshot.ref);
          if (downloadURL) {
            selectedCustomAvatarUrl = downloadURL;
            $('custAvPreview').src = downloadURL;
          }
        }).catch(err => console.warn('Background storage upload fallback:', err));
      } catch (err) {
        console.warn('Background storage exception:', err);
      }
    }
  } catch (err) {
    console.error('File processing failed:', err);
    statusEl.innerHTML = `<span class="text-red-400 font-semibold"><i class="fas fa-exclamation-triangle mr-1"></i> Failed to process image: ${err.message}</span>`;
  }
});

$('bCloseCustomize').addEventListener('click', () => $('mCustomize').classList.add('hidden'));
$('bCloseCustomizeCross').addEventListener('click', () => $('mCustomize').classList.add('hidden'));

$('bSaveCustomize').addEventListener('click', async () => {
  const profile = userProfile || guestProfile;
  if (!profile) return;

  const name = $('custName').value.trim();
  const country = $('custCountry').value;
  const favoriteGame = $('custFavGame').value;
  const gameUID = $('custGameUID').value.trim();
  const socialDiscord = $('custDiscord').value.trim();
  const socialInstagram = $('custInstagram').value.trim();
  const socialYoutube = $('custYoutube').value.trim();

  if (!name) {
    alert('Display Name is required!');
    return;
  }

  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const nameChanged = name !== profile.name;
  if (nameChanged && profile.lastNameChangeAt && (Date.now() - profile.lastNameChangeAt < fourteenDaysMs)) {
    const msLeft = fourteenDaysMs - (Date.now() - profile.lastNameChangeAt);
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
    alert(`You can change your name only after 14 days! Please wait ${daysLeft} more day(s).`);
    return;
  }

  // Common updates for all users
  const updateData = {
    name,
    country,
    favoriteGame,
    gameUID,
    socialDiscord,
    socialInstagram,
    socialYoutube,
    bio: $('custBio') ? $('custBio').value.trim() : ''
  };

  if (nameChanged) {
    updateData.lastNameChangeAt = Date.now();
  }

  // Set avatar url for all users (free and premium)
  if (selectedCustomAvatarUrl) {
    updateData.av = selectedCustomAvatarUrl;
  } else if (selectedAvatarSeed) {
    updateData.av = `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedAvatarSeed}`;
  }

  // Premium-only visual themes
  if (profile.premium || profile.isVIP || profile.isPremium) {
    updateData.bannerTheme = selectedBannerTheme;
    updateData.avatarFrame = $('custAvatarFrame').value;
    updateData.nameColor = selectedNameColor;
    updateData.goldenNameEnabled = $('chkGoldenName') ? $('chkGoldenName').checked : true;
    if (selectedVipFont) {
      updateData.selectedFont = selectedVipFont;
    }
  }

  try {
    if (userProfile && userProfile.uid) {
      await updateDoc(doc(db, 'users', userProfile.uid), updateData);
      Object.assign(userProfile, updateData);

      // Sync updated avatar and name to all friends' friend list documents
      try {
        if (updateData.av || updateData.name) {
          const syncData = {};
          if (updateData.av) syncData.av = updateData.av;
          if (updateData.name) syncData.name = updateData.name;
          const friendsSnap = await getDocs(collection(db, 'users', userProfile.uid, 'friends'));
          friendsSnap.forEach(fDoc => {
            updateDoc(doc(db, 'users', fDoc.id, 'friends', userProfile.uid), syncData).catch(() => {});
          });
        }
      } catch (e) {
        console.warn("Failed syncing profile update to friends:", e);
      }
    } else if (guestProfile) {
      Object.assign(guestProfile, updateData);
      try {
        localStorage.setItem('arenaX_guest_profile', JSON.stringify(guestProfile));
      } catch (e) {}
    }

    // Immediately update UI avatar images across all sections
    const newAv = updateData.av || profile.av;
    if (newAv) {
      if ($('pAv')) $('pAv').src = newAv;
      if ($('avImg')) $('avImg').src = newAv;
      if ($('homeAvImg')) $('homeAvImg').src = newAv;
      if ($('custAvPreview')) $('custAvPreview').src = newAv;
    }
    if ($('pName')) $('pName').textContent = updateData.name;

    $('mCustomize').classList.add('hidden');
    alert('Profile customizations saved successfully! ✅');
  } catch (err) {
    console.error(err);
    alert('Error saving profile: ' + err.message);
  }
});

// Open VIP Plans modal
let premiumDuration = 'weekly';
$('prmWeekly').addEventListener('click', () => {
  premiumDuration = 'weekly';
  $('prmWeekly').classList.add('border-purple');
  $('prmWeekly').classList.remove('border-bdr');
  $('prmMonthly').classList.remove('border-purple');
  $('prmMonthly').classList.add('border-bdr');
  $('bBuyPremium').textContent = 'Upgrade Weekly — 199 AX Coins';
});

$('prmMonthly').addEventListener('click', () => {
  premiumDuration = 'monthly';
  $('prmMonthly').classList.add('border-purple');
  $('prmMonthly').classList.remove('border-bdr');
  $('prmWeekly').classList.remove('border-purple');
  $('prmWeekly').classList.add('border-bdr');
  $('bBuyPremium').textContent = 'Upgrade Monthly — 399 AX Coins';
});

$('bBuyPremium').addEventListener('click', async () => {
  if (!userProfile) {
    alert('Please connect a full account to purchase premium.');
    return;
  }
  const costCoins = premiumDuration === 'weekly' ? 199 : 399;
  const balance = userProfile.balance || 0;
  
  if (balance < costCoins) {
    alert('Insufficient coins! Please deposit more coins into your ArenaX wallet to purchase premium. ❌');
    return;
  }
  
  if (confirm(`Confirm activating Premium pass? This will deduct ${costCoins} AX Coins from your ArenaX wallet immediately.`)) {
    try {
      const newBal = balance - costCoins;
      await updateDoc(doc(db, 'users', userProfile.uid), {
        premium: true,
        balance: newBal
      });
      
      // Log transaction history
      await addDoc(collection(db, 'deposit_requests'), {
        userId: userProfile.uid,
        userName: userProfile.name,
        userEmail: userProfile.email || '',
        type: 'withdrawal',
        method: premiumDuration === 'weekly' ? 'Weekly Sub' : 'Monthly Sub',
        amountPKR: 0,
        amountAX: costCoins,
        txnId: 'PRM-' + Math.floor(100000 + Math.random() * 900000),
        status: 'approved',
        submittedAt: serverTimestamp()
      });
      
      userProfile.premium = true;
      syncPremiumModalState();
      alert(`Congratulations! ArenaX Premium VIP activated. ${costCoins} AX Coins deducted. Access all benefits now! ✅`);
    } catch (err) {
      alert(err.message);
    }
  }
});

$('bClosePremium').addEventListener('click', () => $('mPremium').classList.add('hidden'));

// Real-time listen to live app announcements & notifications
function loadLiveNotifications() {
  const profile = userProfile || guestProfile;
  if (!profile || guestProfile) return;

  if (notificationsUnsub) {
    try { notificationsUnsub(); } catch (e) {}
    notificationsUnsub = null;
  }

  let isInitial = true;

  const qNotifs = query(
    collection(db, 'notifications'),
    where('userId', '==', profile.uid)
  );
  notificationsUnsub = onSnapshot(qNotifs, (snap) => {
    let unreadCount = 0;
    const items = [];
    snap.forEach(d => {
      const n = d.data();
      items.push({ id: d.id, ...n });
      if (!n.read) unreadCount++;
    });

    const dot = $('notifDot');
    if (unreadCount > 0) {
      dot.classList.remove('hidden');
    } else {
      dot.classList.add('hidden');
    }

    // Trigger toast alert for newly added unread notifications in real time
    snap.docChanges().forEach((change) => {
      if (change.type === 'added' && !isInitial) {
        const n = change.doc.data();
        if (!n.read) {
          const title = n.title || 'New Notification';
          const body = n.message || n.body || '';
          showToastNotification(title, body);
        }
      }
    });

    isInitial = false;
  }, (err) => {
    console.warn("Notifications listen warning:", err);
    if (err.code === 'permission-denied') {
      console.log("[Auth Engine] Attempting token refresh on notifications snapshot permission denied...");
      if (auth.currentUser) {
        auth.currentUser.getIdToken(true).catch(e => console.warn(e));
      }
    }
  });
}

function showToastNotification(title, body) {
  // Create toast container if it doesn't exist
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0 pointer-events-none';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'bg-[#111420] border border-[#252a45] text-white rounded-xl shadow-2xl p-4 flex flex-col gap-1 transform translate-x-full opacity-0 transition-all duration-300 pointer-events-auto cursor-pointer hover:bg-[#171b2e]';
  toast.innerHTML = `
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-[#f0c040]/10 flex items-center justify-center text-[#f0c040] text-sm">
          <i class="fas fa-bell"></i>
        </div>
        <span class="font-display font-bold text-xs text-[#f0c040] tracking-wide uppercase">${title}</span>
      </div>
      <button class="text-[#4a5070] hover:text-white transition text-xs"><i class="fas fa-times"></i></button>
    </div>
    <p class="text-xs text-[#8890b0] pl-10 leading-relaxed">${body}</p>
  `;

  // Close toast on button click or click on toast itself
  const closeBtn = toast.querySelector('button');
  const dismiss = () => {
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => {
      toast.remove();
    }, 300);
  };
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dismiss();
  });
  toast.addEventListener('click', () => {
    dismiss();
    const bellBtn = $('bBell');
    if (bellBtn) bellBtn.click();
  });

  container.appendChild(toast);

  // Trigger slide in
  setTimeout(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
  }, 10);

  // Auto dismiss after 7 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      dismiss();
    }
  }, 7000);
}

$('bBell').addEventListener('click', async () => {
  if (guestProfile) {
    alert('Log in to see your verified slot notifications!');
    return;
  }

  try {
    const qNotifs = query(collection(db, 'notifications'), where('userId', '==', userProfile.uid));
    const snap = await getDocs(qNotifs);
    const unread = [];
    const msgs = [];
    
    snap.forEach(d => {
      const n = d.data();
      const msgText = n.message || (n.title ? `${n.title}\n${n.body}` : n.body) || 'New Notification';
      msgs.push(msgText);
      if (!n.read) unread.push(d.id);
    });

    // Mark as read in Firestore
    for (const id of unread) {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    }

    if (msgs.length === 0) {
      alert('No new notifications yet!');
    } else {
      alert(`🔔 Notifications:\n\n${msgs.map(m => `• ${m}`).join('\n\n')}`);
    }
  } catch (err) {
    alert('No notifications loaded.');
  }
});

// Button upgrades redirections
$('gUpgradeBtn').addEventListener('click', () => alert('Exit guest profile, and connect real Google or email ID to save AX earnings!'));
$('btnEditProfile').addEventListener('click', () => {
  if ($('mSettings')) $('mSettings').classList.add('hidden');
  if (guestProfile) {
    alert('Connect a full account first to change Display Name!');
    return;
  }
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  if (userProfile && userProfile.lastNameChangeAt && (Date.now() - userProfile.lastNameChangeAt < fourteenDaysMs)) {
    const msLeft = fourteenDaysMs - (Date.now() - userProfile.lastNameChangeAt);
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
    alert(`You can change your name only after 14 days! Please wait ${daysLeft} more day(s).`);
    return;
  }
  const currentName = userProfile ? userProfile.name : 'Player';
  const n = prompt('Enter your new Display Name:', currentName);
  if (n && n.trim() && userProfile && n.trim() !== userProfile.name) {
    updateDoc(doc(db, 'users', userProfile.uid), { 
      name: n.trim(),
      lastNameChangeAt: Date.now()
    })
      .then(() => alert('Name updated successfully!'))
      .catch(err => alert(err.message));
  }
});

// Trigger customise modal
$('btnCustomize').addEventListener('click', () => {
  if ($('mSettings')) $('mSettings').classList.add('hidden');
  const profile = userProfile || guestProfile;
  if (!profile) return;

  // Basic Info Values
  $('custName').value = profile.name || '';
  $('custCountry').value = profile.country || '';
  $('custFavGame').value = profile.favoriteGame || '';
  $('custGameUID').value = profile.gameUID || '';
  $('custBadgeVal').textContent = profile.badge || 'No badge awarded yet';

  // Social Connections
  $('custDiscord').value = profile.socialDiscord || '';
  $('custInstagram').value = profile.socialInstagram || '';
  $('custYoutube').value = profile.socialYoutube || '';

  // Values
  $('custBio').value = profile.bio || '';
  $('custAvPreview').src = profile.av || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.uid || 'ax'}`;
  selectedCustomAvatarUrl = null; // reset upload state
  $('uploadStatus').classList.add('hidden');
  $('uploadStatus').innerHTML = '';

  selectedBannerTheme = profile.bannerTheme || 'dark';
  selectedAvatarFrame = profile.avatarFrame || 'none';
  selectedNameColor = profile.nameColor || '#ffffff';
  selectedVipFont = profile.selectedFont || 'font-poppins';
  if (window.updateCustomizeFontPreview) window.updateCustomizeFontPreview();

  // Always enable avatar photo upload and bio for everyone
  $('custBio').disabled = false;
  $('custBio').classList.remove('opacity-60', 'pointer-events-none');
  $('btnBrowseAvatar').disabled = false;
  $('btnBrowseAvatar').classList.remove('opacity-60', 'pointer-events-none');

  if (profile.premium) {
    $('custPrmBadge').textContent = 'Premium Active';
    $('custPrmBadge').classList.remove('bg-purple/20', 'text-purple');
    $('custPrmBadge').classList.add('bg-green-500/20', 'text-green-400');
    
    $('custAvatarFrame').disabled = false;
    $('custAvatarFrame').classList.remove('opacity-60', 'pointer-events-none');

    if ($('custGoldenNameBox')) $('custGoldenNameBox').classList.remove('opacity-60', 'pointer-events-none');
    if ($('chkGoldenName')) {
      $('chkGoldenName').disabled = false;
      $('chkGoldenName').checked = profile.goldenNameEnabled !== false;
    }
  } else {
    $('custPrmBadge').textContent = 'Standard Account';
    $('custPrmBadge').classList.remove('bg-purple/20', 'text-purple');
    $('custPrmBadge').classList.add('bg-gold/20', 'text-gold');
    
    $('custAvatarFrame').disabled = true;
    $('custAvatarFrame').classList.add('opacity-60', 'pointer-events-none');

    if ($('custGoldenNameBox')) $('custGoldenNameBox').classList.add('opacity-60', 'pointer-events-none');
    if ($('chkGoldenName')) {
      $('chkGoldenName').disabled = true;
      $('chkGoldenName').checked = false;
    }
  }

  // Attach live preview event listeners once
  if ($('custName') && !$('custName').dataset.goldenBound) {
    $('custName').dataset.goldenBound = 'true';
    $('custName').addEventListener('input', () => { if (window.updateGoldenNamePreview) window.updateGoldenNamePreview(); });
  }
  if ($('chkGoldenName') && !$('chkGoldenName').dataset.goldenBound) {
    $('chkGoldenName').dataset.goldenBound = 'true';
    $('chkGoldenName').addEventListener('change', () => { if (window.updateGoldenNamePreview) window.updateGoldenNamePreview(); });
  }

  // Load select grids/swatches
  loadAvatarPickerGrid();
  loadBannerThemeSelector();
  loadNameColorSelector();
  if (window.updateCustomizeFrameButtonState) window.updateCustomizeFrameButtonState();

  $('mCustomize').classList.remove('hidden');
});

$('btnChangeAv').addEventListener('click', () => $('btnCustomize').click());
$('btnPlayerChat').addEventListener('click', () => {
  if ($('mSettings')) $('mSettings').classList.add('hidden');
  switchTab('Chat');
});
$('btnPremium').addEventListener('click', () => {
  if ($('mSettings')) $('mSettings').classList.add('hidden');
  syncPremiumModalState();
  $('mPremium').classList.remove('hidden');
});

const bOpenPremium = document.getElementById('bOpenPremium');
if (bOpenPremium) {
  bOpenPremium.addEventListener('click', () => {
    if ($('mSettings')) $('mSettings').classList.add('hidden');
    syncPremiumModalState();
    $('mPremium').classList.remove('hidden');
  });
}

// Premium Card Scroll Button Handler
let currentCardScroll = 'weekly';
const prmScrollNextBtn = $('prmScrollNextBtn');
if (prmScrollNextBtn) {
  prmScrollNextBtn.addEventListener('click', () => {
    const container = $('prmCardScrollContainer');
    if (currentCardScroll === 'weekly') {
      if ($('prmMonthly')) $('prmMonthly').click();
      if (container) container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
      currentCardScroll = 'monthly';
      if ($('prmScrollIcon')) $('prmScrollIcon').className = 'fas fa-chevron-left';
    } else {
      if ($('prmWeekly')) $('prmWeekly').click();
      if (container) container.scrollTo({ left: 0, behavior: 'smooth' });
      currentCardScroll = 'weekly';
      if ($('prmScrollIcon')) $('prmScrollIcon').className = 'fas fa-chevron-right';
    }
  });
}

// Topbar Menu Click Handler (Opens Menu Hub Drawer)
if ($('bTopbarMenu')) {
  $('bTopbarMenu').addEventListener('click', () => {
    if (typeof window.openRedReportHubDrawer === 'function') {
      window.openRedReportHubDrawer();
    }
  });
}

// Patch Notes Modal Handlers
if ($('btnHubPatchNotes')) {
  $('btnHubPatchNotes').addEventListener('click', () => {
    if (typeof window.closeRedReportHubDrawer === 'function') {
      window.closeRedReportHubDrawer();
    }
    if ($('mPatchNotes')) $('mPatchNotes').classList.remove('hidden');
  });
}

if ($('bClosePatchNotes')) {
  $('bClosePatchNotes').addEventListener('click', () => {
    if ($('mPatchNotes')) $('mPatchNotes').classList.add('hidden');
  });
}

if ($('bClosePatchNotesCross')) {
  $('bClosePatchNotesCross').addEventListener('click', () => {
    if ($('mPatchNotes')) $('mPatchNotes').classList.add('hidden');
  });
}

// PWA Installation Flow
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  window.pwaDeferredPrompt = e;
});

const installBtn = $('btnHubInstallApp');
if (installBtn) {
  installBtn.addEventListener('click', () => {
    if (typeof window.closeRedReportHubDrawer === 'function') {
      window.closeRedReportHubDrawer();
    }
    if ($('mSettings')) $('mSettings').classList.add('hidden');
    if ($('mAppDownloadOptions')) $('mAppDownloadOptions').classList.remove('hidden');
  });
}

window.addEventListener('appinstalled', (event) => {
  console.log('App successfully installed:', event);
  deferredPrompt = null;
  const installBtn = $('btnHubInstallApp');
  if (installBtn) {
    installBtn.classList.add('hidden');
  }
  alert('ArenaX Esports installed successfully! 🎉');
});

// Profile Tab Grouped Settings Triggers
if ($('btnProfileManage')) {
  $('btnProfileManage').addEventListener('click', () => {
    if ($('mSettings')) $('mSettings').classList.add('hidden');
    if ($('btnCustomize')) $('btnCustomize').click();
    else $('mCustomize').classList.remove('hidden');
  });
}
if ($('btnProfileSecurity')) {
  $('btnProfileSecurity').addEventListener('click', () => {
    if ($('mSettings')) $('mSettings').classList.add('hidden');
    if ($('mPrivacy')) $('mPrivacy').classList.remove('hidden');
  });
}
if ($('btnResendVerifyEmail')) {
  $('btnResendVerifyEmail').addEventListener('click', async () => {
    if (!auth.currentUser) {
      alert('⚠️ Please sign in with your email account first.');
      return;
    }
    if (auth.currentUser.emailVerified) {
      alert('✅ Your email address (' + auth.currentUser.email + ') is already verified!');
      return;
    }
    try {
      await sendEmailVerification(auth.currentUser);
      alert('✉️ Verification email sent to ' + auth.currentUser.email + '!\n\nPlease check your inbox and click the verification link.');
    } catch (err) {
      alert('⚠️ Could not send verification email: ' + err.message);
    }
  });
}
if ($('btnSendResetPassword')) {
  $('btnSendResetPassword').addEventListener('click', async () => {
    if (!auth.currentUser || !auth.currentUser.email) {
      alert('⚠️ Please sign in with an email account first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      alert('✉️ Password reset link sent to: ' + auth.currentUser.email + '\n\nPlease check your inbox to reset your password.');
    } catch (err) {
      alert('⚠️ Could not send password reset email: ' + err.message);
    }
  });
}
if ($('btnProfileNotifications')) {
  $('btnProfileNotifications').addEventListener('click', () => {
    if ($('mEnableNotifications')) $('mEnableNotifications').classList.remove('hidden');
  });
}
if ($('btnProfileLanguage')) {
  $('btnProfileLanguage').addEventListener('click', () => {
    if ($('mSettings')) $('mSettings').classList.add('hidden');
    if ($('mLanguageSelectionModal')) $('mLanguageSelectionModal').classList.remove('hidden');
  });
}
if ($('btnProfileHelp')) {
  $('btnProfileHelp').addEventListener('click', () => {
    if ($('mSettings')) $('mSettings').classList.add('hidden');
    if (typeof window.openSupportDrawer === 'function') {
      window.openSupportDrawer();
    }
  });
}
if ($('btnProfileTerms')) {
  $('btnProfileTerms').addEventListener('click', () => {
    if ($('mSettings')) $('mSettings').classList.add('hidden');
    if ($('mTerms')) $('mTerms').classList.remove('hidden');
  });
}
if ($('btnProfileAbout')) {
  $('btnProfileAbout').addEventListener('click', () => {
    if ($('mSettings')) $('mSettings').classList.add('hidden');
    if ($('mPatchNotes')) $('mPatchNotes').classList.remove('hidden');
  });
}

// Settings Page Triggers
function openSettingsPage() {
  const prof = userProfile || guestProfile;
  if ($('setName')) $('setName').innerHTML = `${prof.name || 'Player'}${window.getBlueTickBadgeHtml(prof)}`;
  if ($('setHandle')) $('setHandle').textContent = prof.handle || '@player#0000';
  if ($('setAv')) $('setAv').src = prof.av;
  
  if ($('lblVerifyStatus')) {
    if (auth.currentUser) {
      if (auth.currentUser.emailVerified) {
        $('lblVerifyStatus').textContent = '✅ Verified (' + auth.currentUser.email + ')';
        $('lblVerifyStatus').className = 'text-[10px] text-emerald-400 font-bold';
      } else {
        $('lblVerifyStatus').textContent = '⚠️ Unverified - Click to resend verification link to ' + auth.currentUser.email;
        $('lblVerifyStatus').className = 'text-[10px] text-amber-400 font-medium';
      }
    } else {
      $('lblVerifyStatus').textContent = 'Send verification link to inbox';
      $('lblVerifyStatus').className = 'text-[10px] text-t3 font-normal';
    }
  }

  $('mSettings').classList.remove('hidden');
  if (typeof window.updateDiagnosticUI === 'function') {
    window.updateDiagnosticUI();
  }
}

if ($('bSettingsTop')) {
  $('bSettingsTop').addEventListener('click', openSettingsPage);
}
if ($('bSettings')) {
  $('bSettings').addEventListener('click', openSettingsPage);
}
$('bCloseSettingsCross').addEventListener('click', () => $('mSettings').classList.add('hidden'));
$('bCloseSettings').addEventListener('click', () => $('mSettings').classList.add('hidden'));
$('bSaveSettings').addEventListener('click', () => {
  alert('⚙️ Settings saved successfully!');
  $('mSettings').classList.add('hidden');
});

// Terms Modal Triggers
$('bViewTerms').addEventListener('click', () => $('mTerms').classList.remove('hidden'));
$('lnkTerms').addEventListener('click', (e) => {
  e.preventDefault();
  $('mTerms').classList.remove('hidden');
});
$('bCloseTerms').addEventListener('click', () => $('mTerms').classList.add('hidden'));

// Privacy Modal Triggers
$('bViewPrivacy').addEventListener('click', () => $('mPrivacy').classList.remove('hidden'));
$('lnkPrivacy').addEventListener('click', (e) => {
  e.preventDefault();
  $('mPrivacy').classList.remove('hidden');
});
$('bClosePrivacy').addEventListener('click', () => $('mPrivacy').classList.add('hidden'));

// Trigger and launch support chat connection listener when support tab mounts
const navSupportBtn = document.querySelector('.ni[data-t="Support"]');
if (navSupportBtn) {
  navSupportBtn.addEventListener('click', () => {
    if (typeof window.openSupportDrawer === 'function') {
      window.openSupportDrawer();
    }
  });
}

// ==================== ARENAX STADIUM SYNTH AUDIO ENGINE ====================
class ArenaAudioEngine {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  // Synthesize stadium referee whistle sweep
  playWhistle() {
    try {
      this.init();
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.12);
      osc.frequency.setValueAtTime(2600, ctx.currentTime + 0.12);
      osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.35);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch(e) {}
  }
  // Synthesize custom crowd cheer roar
  playCrowdRoar() {
    try {
      this.init();
      const ctx = this.ctx;
      const bufferSize = ctx.sampleRate * 2.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.7);
      filter.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 2.2);
      filter.Q.value = 1.0;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.4);
      
      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      noiseNode.start();
      noiseNode.stop(ctx.currentTime + 2.4);
    } catch(e) {}
  }
  // Play stadium soccer ball kick thump sound
  playKick() {
    try {
      this.init();
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch(e) {}
  }
  // Victory fanfare song arpeggio for rewards
  playVictory() {
    try {
      this.init();
      const ctx = this.ctx;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        
        gain.gain.setValueAtTime(0.04, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.4);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.45);
      });
    } catch(e) {}
  }
  // Crystal coin chime
  playChime() {
    try {
      this.init();
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, ctx.currentTime);
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch(e) {}
  }
}
const stadiumAudio = new ArenaAudioEngine();

// Confetti Particle Burst System
function spawnConfetti(colors) {
  try {
    const root = document.body;
    const count = 35;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'fixed w-2.5 h-2.5 rounded-full pointer-events-none z-[9999] transition-all duration-1000 ease-out';
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.left = '50vw';
      p.style.top = '60vh';
      root.appendChild(p);
      
      const angle = Math.random() * Math.PI * 2;
      const distance = 60 + Math.random() * 180;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance - (120 + Math.random() * 120);
      
      setTimeout(() => {
        p.style.transform = `translate(${tx}px, ${ty}px) scale(0.5) rotate(${Math.random() * 360}deg)`;
        p.style.opacity = '0';
      }, 10);
      
      setTimeout(() => p.remove(), 1100);
    }
  } catch(e) {}
}

// ==================== ARENAX FOOTBALL GROUND SYSTEM ====================
window.completeFootballMission = function(missionId) {
  // Football features have been fully removed.
};
window.checkAndRechargeBalls = function() {
  // Football shootout features have been fully removed.
};











// ==================== CAMPAIGN EVENTS & STATE ====================
window.checkAndSyncWorldCupTasks = async function() {};
window.renderWorldCupCampaignQuests = function() {};
window.claimWorldCupCampaignGifts = async function() {};

// Under Development Popup modal listeners
function dismissUnderDevBannerModal() {
  const popup = $('mUnderDevPopup');
  if (popup) {
    popup.classList.add('hidden');
    popup.style.display = 'none';
  }
  if (window.ArenaSplash) {
    window.ArenaSplash.finish();
  }
  if (typeof window.checkAndShowNotificationPopup === 'function') {
    window.checkAndShowNotificationPopup();
  }
}

if ($('bCloseUnderDev')) {
  $('bCloseUnderDev').addEventListener('click', (e) => {
    if (e) e.preventDefault();
    dismissUnderDevBannerModal();
  });
}
if ($('bCloseUnderDevCross')) {
  $('bCloseUnderDevCross').addEventListener('click', (e) => {
    if (e) e.preventDefault();
    dismissUnderDevBannerModal();
  });
}

// ==================== BROWSER PUSH NOTIFICATIONS SYSTEM ====================
window.checkAndShowNotificationPopup = function() {
  if (notifPopupShownThisSession) {
    if (typeof window.checkAndPromptTutorial === 'function') {
      window.checkAndPromptTutorial();
    }
    return;
  }
  
  // 1. Check if browser notifications are already granted
  if (window.Notification && Notification.permission === 'granted') {
    if (typeof window.checkAndPromptTutorial === 'function') {
      window.checkAndPromptTutorial();
    }
    return;
  }
  
  // 2. Only show for fully logged-in user, not guests
  if (guestProfile || !userProfile) {
    if (typeof window.checkAndPromptTutorial === 'function') {
      window.checkAndPromptTutorial();
    }
    return;
  }
  
  // 3. Check localStorage cooldown: ask again after 3 days
  const lastAsked = localStorage.getItem('notifAsked');
  if (lastAsked) {
    const timestamp = parseInt(lastAsked, 10);
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    if (Date.now() - timestamp < threeDaysMs) {
      if (typeof window.checkAndPromptTutorial === 'function') {
        window.checkAndPromptTutorial();
      }
      return;
    }
  }
  
  // Show the popup!
  $('mEnableNotifications').classList.remove('hidden');
  notifPopupShownThisSession = true;
};

// Event listeners for Push Notification Popup buttons
$('btnNotifNotNow').addEventListener('click', () => {
  $('mEnableNotifications').classList.add('hidden');
  // Close popup and save ask time to localStorage to ask again after 3 days
  localStorage.setItem('notifAsked', Date.now().toString());
  if (typeof window.checkAndPromptTutorial === 'function') {
    window.checkAndPromptTutorial();
  }
});

$('btnNotifAllow').addEventListener('click', async () => {
  $('mEnableNotifications').classList.add('hidden');
  
  if (window.Notification) {
    try {
      if (Notification.permission === 'denied') {
        alert("⚠️ Notifications are currently blocked in your browser settings.\n\nTo enable them:\n1. Click the Lock/Tune icon (🔒) in your browser address bar.\n2. Tap 'Site settings' or 'Permissions'.\n3. Set 'Notifications' to 'Allow'.\n4. Refresh this page.");
        localStorage.setItem('notifAsked', Date.now().toString());
        if (typeof window.checkAndPromptTutorial === 'function') {
          window.checkAndPromptTutorial();
        }
        return;
      }

      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        // Save FCM/permission status to Firestore under user profile
        if (userProfile && userProfile.uid) {
          try {
            await updateDoc(doc(db, 'users', userProfile.uid), {
              notificationsEnabled: true,
              notificationPermission: 'granted',
              notificationGrantedAt: new Date().toISOString()
            });
            
            // Register service worker, fetch the real FCM Token, and save it to Firestore
            if (typeof window.requestFCMToken === 'function') {
              console.log("FCM: Registering and requesting token automatically...");
              await window.requestFCMToken(false);
            }
          } catch (fErr) {
            console.error("Failed to update notification settings in user profile:", fErr);
          }
        }
        
        // Show success toast
        showToastNotification('🔔 Notifications Enabled!', 'You will now receive real-time alerts for tournaments, rewards, and match status!');
        
        // Trigger a real browser notification to let the user see it's active
        try {
          new Notification("ArenaX Notifications Active!", {
            body: "You've successfully enabled real-time esports notifications!",
            icon: (typeof window.getAppBasePath === 'function' ? window.getAppBasePath() : './') + 'favicon.ico'
          });
        } catch (notifErr) {
          console.warn("Could not display initial test notification:", notifErr);
        }
      } else {
        // If they denied, record cooldown and guide them
        localStorage.setItem('notifAsked', Date.now().toString());
        alert("⚠️ Notification permission was blocked. You can enable it anytime by clicking the Lock icon (🔒) next to the URL in your address bar.");
      }
    } catch (e) {
      console.error("Error requesting notification permission:", e);
    }
  } else {
    showToastNotification('⚠️ Unsupported Browser', 'Push notifications are not supported in your browser.');
  }
  if (typeof window.checkAndPromptTutorial === 'function') {
    window.checkAndPromptTutorial();
  }
});

// ==================== LOCALIZATION & TRANSLATIONS ENGINE ====================
window.appLanguage = 'ur'; // default language

const translations = {
  en: {
    navProfile: "Profile",
    navEvents: "Events",
    navWallet: "Wallet",
    navVoice: "Voice",
    navChat: "Chat",
    navSupport: "Support",
    accNavHeader: "Account Navigation",
    editDisplayName: "Edit Display Name",
    customizeProfile: "Customize Profile",
    directMessages: "Direct Messages",
    premiumPasses: "Premium Passes",
    signOut: "Sign Out",
    lblTournaments: "Tournaments",
    lblWins: "Wins",
    lblWinRate: "Win Rate",
    lblBestFinish: "Best Finish",
    lblMyProfileHeader: "My Profile",
    lblMyWalletHeader: "My Wallet",
    tutorialSteps: [
      {
        title: "Your Profile Hub 👤",
        text: "Welcome gamer! This is your personal Profile Hub. Here you can view your display name, unique handle, level ranks, wallet AX balance, and total hearts popularity rating live.",
        tab: "Profile",
        highlight: "profileCard",
      },
      {
        title: "Esports Tournaments 🏆",
        text: "On the Events page, you will find all live, upcoming, and ended matches. Register in your favorite esports contest to win AX coins and real cash prizes!",
        tab: "Tour",
        highlight: "toursWrapper",
      },
      {
        title: "Secure AX Wallet 💰",
        text: "From the Wallet section, you can easily deposit funds and withdraw your winnings directly to your bank account or local digital wallets.",
        tab: "Wallet",
        highlight: "wCard",
      },
      {
        title: "Global Chat & Voice Lobbies 🎤",
        text: "Connect with other players! Chat in the global feed, add friends, and join high-quality low-latency voice channels to coordinate with your team.",
        tab: "Chat",
        highlight: "tChat",
      },
      {
        title: "Profile Customization 🎨",
        text: "Click Edit Display Name or Customize Profile to set your bio, social links, and avatars. Unlock premium golden frames and glowing banners! 👑",
        tab: "Profile",
        highlight: "btnCustomize",
      }
    ]
  },
  ur: {
    navProfile: "پروفائل",
    navEvents: "ٹورنامنٹس",
    navWallet: "والٹ",
    navVoice: "وائس چیٹ",
    navChat: "چیٹ",
    navSupport: "سپورٹ",
    accNavHeader: "اکاؤنٹ نیویگیشن",
    editDisplayName: "نام تبدیل کریں",
    customizeProfile: "پروفائل سجائیں",
    directMessages: "ڈائریکٹ میسجز",
    premiumPasses: "پریمیئم پاسز",
    signOut: "سائن آؤٹ",
    lblTournaments: "ٹورنامنٹس",
    lblWins: "جیتیں",
    lblWinRate: "جیت کا تناسب",
    lblBestFinish: "بہترین پوزیشن",
    lblMyProfileHeader: "میری پروفائل",
    lblMyWalletHeader: "میرا والٹ",
    tutorialSteps: [
      {
        title: "Aapka Profile Hub 👤",
        text: "Aao gamer! Yeh aapka personal Profile Hub hai. Yahan aap apna display name, unique handle, level ranks, wallet AX balance aur total hearts popularity rating live dekh sakte hain.",
        tab: "Profile",
        highlight: "profileCard",
      },
      {
        title: "Esports Tournaments 🏆",
        text: "Events page par aapko saare live, upcoming aur ended matches milenge. Apni pasand ke esports contest me register karke cash prize pools jeeten!",
        tab: "Tour",
        highlight: "toursWrapper",
      },
      {
        title: "Secure AX Wallet 💰",
        text: "Wallet section se aap asani se Recharge kar sakte hain aur apni winnings ko seedha bank ya digital wallet me instant withdraw kar sakte hain.",
        tab: "Wallet",
        highlight: "wCard",
      },
      {
        title: "Global Chat & Voice Lobbies 🎤",
        text: "Dosre gamers ke sath connect hon! Global feed me chat karen, friends add karen aur high-quality low-latency audio room channels join karke dosto se voice chat karen.",
        tab: "Chat",
        highlight: "tChat",
      },
      {
        title: "Profile Customization 🎨",
        text: "Edit Display Name ya Customize Profile par click karke bio, social links aur custom avatar set karen. Premium VIP lekar golden frames aur glowing banners unlock karen! 👑",
        tab: "Profile",
        highlight: "btnCustomize",
      }
    ]
  }
};

window.applyAppLanguage = function(lang) {
  window.appLanguage = lang;
  
  const dict = translations[lang] || translations.ur;
  
  // Save preference
  const profile = userProfile || guestProfile;
  if (profile && profile.uid) {
    localStorage.setItem('arenaX_language_' + profile.uid, lang);
  }
  localStorage.setItem('arenaX_global_lang', lang);
  
  // Update UI Elements
  if ($('navProfileText')) $('navProfileText').textContent = dict.navProfile;
  if ($('navEventsText')) $('navEventsText').textContent = dict.navEvents;
  if ($('navWalletText')) $('navWalletText').textContent = dict.navWallet;
  if ($('navVoiceText')) $('navVoiceText').textContent = dict.navVoice;
  if ($('navChatText')) $('navChatText').textContent = dict.navChat;
  if ($('navSupportText')) $('navSupportText').textContent = dict.navSupport;
  
  if ($('lblTournaments')) $('lblTournaments').textContent = dict.lblTournaments;
  if ($('lblWins')) $('lblWins').textContent = dict.lblWins;
  if ($('lblWinRate')) $('lblWinRate').textContent = dict.lblWinRate;
  if ($('lblBestFinish')) $('lblBestFinish').textContent = dict.lblBestFinish;
  
  const profileHeader = $('lblMyProfileHeader');
  if (profileHeader) {
    profileHeader.innerHTML = `<i class="fas fa-user-circle text-gold"></i> ${dict.lblMyProfileHeader}`;
  }
  const walletHeader = $('lblMyWalletHeader');
  if (walletHeader) {
    walletHeader.innerHTML = `<i class="fas fa-wallet text-gold"></i> ${dict.lblMyWalletHeader}`;
  }
  
  if ($('lblAccNavHeader')) $('lblAccNavHeader').textContent = dict.accNavHeader;
  if ($('lblEditDisplayName')) $('lblEditDisplayName').textContent = dict.editDisplayName;
  if ($('lblCustomizeProfile')) $('lblCustomizeProfile').textContent = dict.customizeProfile;
  if ($('lblDirectMessages')) $('lblDirectMessages').textContent = dict.directMessages;
  if ($('lblPremiumPasses')) $('lblPremiumPasses').textContent = dict.premiumPasses;
  if ($('lblSignOut')) $('lblSignOut').textContent = dict.signOut;
  
  // Update Tutorial Choice Modal
  if ($('mTutorialChoiceModal')) {
    const titleEl = $('mTutorialChoiceModal').querySelector('h3');
    const descEl = $('mTutorialChoiceModal').querySelector('p.text-xs');
    if (lang === 'en') {
      if (titleEl) titleEl.textContent = "New Player Tour";
      if (descEl) descEl.textContent = "Welcome gamer! 🎮 Would you like to take a quick 1-minute interactive tour of ArenaX to easily understand matches, tournaments, wallet and chat systems?";
      if ($('btnTutorialSkip')) $('btnTutorialSkip').textContent = "No, Skip ❌";
      if ($('btnTutorialStart')) $('btnTutorialStart').textContent = "Yes, Start! 🚀";
    } else {
      if (titleEl) titleEl.textContent = "New Player Tour";
      if (descEl) descEl.textContent = "Aao gamer! 🎮 Kya aap ArenaX ka quick 1-minute interactive tour lena chahenge taake matches, tournaments, wallet aur chat systems ko asani se samajh saken?";
      if ($('btnTutorialSkip')) $('btnTutorialSkip').textContent = "Nahi, Skip ❌";
      if ($('btnTutorialStart')) $('btnTutorialStart').textContent = "Haan, Start! 🚀";
    }
  }
  
  // Settings Selection Active Highlights
  updateLanguageSettingsUI();
  
  // Sync Tutorial Steps Reference
  tutorialSteps.length = 0;
  dict.tutorialSteps.forEach(s => tutorialSteps.push(s));
  
  // Refresh Tutorial steps visual if currently in tutorial progress
  if ($('mTutorialTourCard') && !$('mTutorialTourCard').classList.contains('hidden')) {
    renderTutorialStep(currentTutorialStep);
  }
};

function updateLanguageSettingsUI() {
  const btnEn = $('btnSettingsLangEn');
  const btnUr = $('btnSettingsLangUr');
  
  if (btnEn && btnUr) {
    if (window.appLanguage === 'en') {
      btnEn.className = "flex-1 py-2 px-3 bg-gold text-bg border border-gold rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer";
      btnUr.className = "flex-1 py-2 px-3 bg-card border border-bdr text-t2 hover:text-white rounded-lg text-xs font-semibold transition hover:border-gold/30 flex items-center justify-center gap-1.5 cursor-pointer";
    } else {
      btnEn.className = "flex-1 py-2 px-3 bg-card border border-bdr text-t2 hover:text-white rounded-lg text-xs font-semibold transition hover:border-gold/30 flex items-center justify-center gap-1.5 cursor-pointer";
      btnUr.className = "flex-1 py-2 px-3 bg-gold text-bg border border-gold rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer";
    }
  }
}

// Bind Settings Language Buttons
if ($('btnSettingsLangEn')) {
  $('btnSettingsLangEn').addEventListener('click', () => {
    window.applyAppLanguage('en');
    showToastNotification('🇺🇸 Language Set', 'Interface language changed to English.');
  });
}
if ($('btnSettingsLangUr')) {
  $('btnSettingsLangUr').addEventListener('click', () => {
    window.applyAppLanguage('ur');
    showToastNotification('🇵🇰 زبان تبدیل', 'زبان کامیابی سے اردو میں تبدیل ہو گئی ہے۔');
  });
}

// Bind Modal Language Buttons
if ($('btnLangEn')) {
  $('btnLangEn').addEventListener('click', () => {
    window.applyAppLanguage('en');
    $('mLanguageSelectionModal').classList.add('hidden');
    
    // Check tutorial state
    const profile = userProfile || guestProfile;
    if (profile && !localStorage.getItem('arenaX_tutorial_done_' + profile.uid)) {
      $('mTutorialChoiceModal').classList.remove('hidden');
    }
  });
}
if ($('btnLangUr')) {
  $('btnLangUr').addEventListener('click', () => {
    window.applyAppLanguage('ur');
    $('mLanguageSelectionModal').classList.add('hidden');
    
    // Check tutorial state
    const profile = userProfile || guestProfile;
    if (profile && !localStorage.getItem('arenaX_tutorial_done_' + profile.uid)) {
      $('mTutorialChoiceModal').classList.remove('hidden');
    }
  });
}

// ==================== INTERACTIVE TUTORIAL SYSTEM IMPLEMENTATION ====================
window.checkAndPromptTutorial = function() {
  const profile = userProfile || guestProfile;
  if (!profile) return;
  const uid = profile.uid;
  if (!uid) return;
  
  // 1. Resolve Language Preference first
  const savedLang = localStorage.getItem('arenaX_language_' + uid) || localStorage.getItem('arenaX_global_lang');
  if (!savedLang) {
    // Show Language selection modal first!
    $('mLanguageSelectionModal').classList.remove('hidden');
    return;
  }
  
  // Apply saved language preference
  window.applyAppLanguage(savedLang);
  
  // 2. Check if they have already finished or skipped the tutorial
  if (localStorage.getItem('arenaX_tutorial_done_' + uid)) {
    return;
  }
  
  // Show the tutorial choice modal
  $('mTutorialChoiceModal').classList.remove('hidden');
};

function highlightElement(id) {
  clearHighlight();
  const el = $(id);
  if (!el) return;
  
  activeHighlightedElementId = id;
  el.classList.add('ring-4', 'ring-emerald-500', 'ring-offset-2', 'ring-offset-[#070913]', 'animate-pulse', 'relative', 'z-40', 'transition-all', 'duration-300');
  
  try {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {}
}

function clearHighlight() {
  if (activeHighlightedElementId) {
    const el = $(activeHighlightedElementId);
    if (el) {
      el.classList.remove('ring-4', 'ring-emerald-500', 'ring-offset-2', 'ring-offset-[#070913]', 'animate-pulse', 'relative', 'z-40', 'transition-all', 'duration-300');
    }
    activeHighlightedElementId = null;
  }
}

function startTutorialTour() {
  $('mTutorialChoiceModal').classList.add('hidden');
  const profile = userProfile || guestProfile;
  if (profile) {
    localStorage.setItem('arenaX_tutorial_done_' + profile.uid, 'completed');
  }
  currentTutorialStep = 0;
  $('mTutorialTourCard').classList.remove('hidden');
  renderTutorialStep(currentTutorialStep);
}

function skipTutorialTour() {
  $('mTutorialChoiceModal').classList.add('hidden');
  const profile = userProfile || guestProfile;
  if (profile) {
    localStorage.setItem('arenaX_tutorial_done_' + profile.uid, 'skipped');
  }
  if (window.appLanguage === 'en') {
    showToastNotification('ℹ️ Tour Skipped', 'You can explore matches directly from the Events tab!');
  } else {
    showToastNotification('ℹ️ Tour Skipped', 'Aap jab chahein events tab se matches explore kar sakte hain!');
  }
}

function endTutorialTour() {
  $('mTutorialTourCard').classList.add('hidden');
  clearHighlight();
  switchTab('Profile');
  if (window.appLanguage === 'en') {
    showToastNotification('🏆 Tour Completed!', 'You have successfully completed the ArenaX tour. Join matches now and dominate!');
  } else {
    showToastNotification('🏆 Tour Completed!', 'Aapne ArenaX ka tour complete kar liya hai. Ab matches join karen aur dominate karen!');
  }
}

function nextTutorialStep() {
  if (currentTutorialStep < tutorialSteps.length - 1) {
    currentTutorialStep++;
    renderTutorialStep(currentTutorialStep);
  } else {
    endTutorialTour();
  }
}

function prevTutorialStep() {
  if (currentTutorialStep > 0) {
    currentTutorialStep--;
    renderTutorialStep(currentTutorialStep);
  }
}

function renderTutorialStep(stepIndex) {
  const step = tutorialSteps[stepIndex];
  if (!step) return;
  
  // Switch tab programmatically
  switchTab(step.tab);
  
  // Update step indicators
  $('tutorialStepIndicator').textContent = `Step ${stepIndex + 1} of ${tutorialSteps.length}`;
  $('tutorialStepTitle').textContent = step.title;
  $('tutorialStepText').textContent = step.text;
  
  // Prev button visibility
  if (stepIndex === 0) {
    $('btnTutorialPrev').classList.add('hidden');
  } else {
    $('btnTutorialPrev').classList.remove('hidden');
  }
  
  // Next button text
  if (stepIndex === tutorialSteps.length - 1) {
    $('btnTutorialNext').innerHTML = `Finish Tour 🏆`;
    $('btnTutorialNext').className = "px-4 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-bg text-[10px] font-black uppercase tracking-wider rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer";
  } else {
    $('btnTutorialNext').innerHTML = `Next Step <i class="fas fa-arrow-right text-[9px]"></i>`;
    $('btnTutorialNext').className = "px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer";
  }
  
  // Highlight with a slight delay for smooth tab rendering
  setTimeout(() => {
    highlightElement(step.highlight);
  }, 120);
}

// Bind tutorial event listeners
$('btnTutorialStart').addEventListener('click', startTutorialTour);
$('btnTutorialSkip').addEventListener('click', skipTutorialTour);
$('btnTutorialEnd').addEventListener('click', endTutorialTour);
$('btnTutorialPrev').addEventListener('click', prevTutorialStep);
$('btnTutorialNext').addEventListener('click', nextTutorialStep);

// Initial bootstrapper loads
loadAvatarPickerGrid();

// ==========================================
// ── ARENAX CUSTOM BADGE & MAIL SYSTEM ──
// ==========================================
const PREDEFINED_BADGES = [
  { id: 'blue_tick', name: "Verified Blue Tick", description: "Official verified badge granted by administration, displayed next to user name everywhere.", icon: "fa-check-circle", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
  { id: 'champion', name: "Arena Champion", description: "Earned by winning a premier ArenaX tournament.", icon: "fa-trophy", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  { id: 'veteran', name: "Veteran Warrior", description: "Assigned to players with exceptional career activity.", icon: "fa-shield-halved", color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10" },
  { id: 'moderator', name: "Staff Moderator", description: "Authorized ArenaX moderator and community manager.", icon: "fa-crown", color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
  { id: 'sniper', name: "Sharp Shooter", description: "Exemplary performance and precision in gaming tournaments.", icon: "fa-crosshairs", color: "text-red-400 border-red-500/30 bg-red-500/10" },
  { id: 'mvp', name: "Most Valuable Player", description: "Awarded for exceptional skill and turning the tides of battle.", icon: "fa-wand-magic-sparkles", color: "text-orange-400 border-orange-500/30 bg-orange-500/10" },
  { id: 'vip', name: "VIP Premium Member", description: "Exclusive gold membership tier for valued subscribers.", icon: "fa-bolt", color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" },
  { id: 'supporter', name: "Platform Supporter", description: "Contributed to the growth and development of ArenaX.", icon: "fa-heart", color: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
  { id: 'high_roller', name: "High Roller", description: "Demonstrated bold wagers and high-stakes deposit records.", icon: "fa-coins", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  { id: 'early_bird', name: "Early Bird Access", description: "Joined the ArenaX alpha/beta test phase early on.", icon: "fa-clock", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
  { id: 'fair_play', name: "Fair Play Hero", description: "Exceptional sportsmanship and clean report card.", icon: "fa-face-smile", color: "text-green-400 border-green-500/30 bg-green-500/10" },
  { id: 'helper', name: "Community Helper", description: "Helped other players and was highly rated in live chats.", icon: "fa-comment-dots", color: "text-lime-400 border-lime-500/30 bg-lime-500/10" },
  { id: 'tactician', name: "Master Tactician", description: "Acknowledged for deep strategic planning and tournament setup.", icon: "fa-layer-group", color: "text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10" },
  { id: 'launch_fest_badge', name: "Launch Fest Badge", description: "Claimed Day 7 daily reward during ArenaX Launch Fest.", icon: "fa-award", color: "text-red-400 border-red-500/30 bg-red-500/10" },
  { id: 'pioneer_badge', name: "Pioneer Badge", description: "Completed all Welcome Pack challenges during the Launch Fest.", icon: "fa-rocket", color: "text-violet-400 border-violet-500/30 bg-violet-500/10" },
  { id: 'champion_badge', name: "Champion Badge", description: "Finished 1st place in the Weekly Free Tournament during Launch Fest.", icon: "fa-trophy", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  { id: 'runner_up_badge', name: "Runner Up Badge", description: "Finished 2nd place in the Weekly Free Tournament during Launch Fest.", icon: "fa-medal", color: "text-slate-400 border-slate-500/30 bg-slate-500/10" },
  { id: 'hokage_badge', name: "ArenaX Hokage", description: "Earned from ArenaX Promotion Video Submission Event (Hokage Tier).", icon: "fa-fire", color: "text-amber-500 border-amber-500 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.4)] font-bold animate-pulse" }
];

window.PREDEFINED_BADGES = PREDEFINED_BADGES;

function renderEarnedBadgesUI() {
  const container = $('userEarnedBadges');
  if (!container) return;
  container.innerHTML = '';

  const profile = userProfile || guestProfile;
  if (!profile || !profile.badges || !Array.isArray(profile.badges)) return;

  profile.badges.forEach(badgeId => {
    const badge = PREDEFINED_BADGES.find(b => b.id === badgeId);
    if (badge) {
      const el = document.createElement('span');
      el.className = `px-2 py-0.5 text-[9px] font-bold rounded border uppercase flex items-center gap-1 cursor-pointer transition ${badge.color}`;
      el.title = badge.description;
      el.innerHTML = `<i class="fas ${badge.icon}"></i> ${badge.name}`;
      
      el.addEventListener('click', () => {
        alert(`🎖️ Badge: ${badge.name}\n\nDescription: ${badge.description}\n\nYou own this active profile credential!`);
      });

      container.appendChild(el);
    }
  });
}

window.renderEarnedBadgesUI = renderEarnedBadgesUI;

// Bind Inbox Drawer & Modal Listeners
$('btnHubInbox').addEventListener('click', () => {
  if (typeof window.closeRedReportHubDrawer === 'function') {
    window.closeRedReportHubDrawer();
  }
  openInboxBadgesModal();
});

$('btnHubSubmission').addEventListener('click', () => {
  if (typeof window.closeRedReportHubDrawer === 'function') {
    window.closeRedReportHubDrawer();
  }
  switchTab('Submission');
  if (typeof window.loadUserSubmissions === 'function') {
    window.loadUserSubmissions();
  }
});

$('bCloseInboxBadges').addEventListener('click', () => {
  $('mInboxBadges').classList.add('hidden');
});

$('tabMailInbox').addEventListener('click', () => {
  switchInboxSubtab('mail');
});

$('tabBadgeCollection').addEventListener('click', () => {
  switchInboxSubtab('badge');
});

function switchInboxSubtab(tab) {
  if (tab === 'mail') {
    $('tabMailInbox').className = "flex-1 py-1.5 text-center text-xs font-bold rounded-md transition text-white bg-emerald-500/15 border border-emerald-500/20";
    $('tabBadgeCollection').className = "flex-1 py-1.5 text-center text-xs font-bold rounded-md transition text-t3 hover:text-white hover:bg-white/5";
    $('secMailInbox').classList.remove('hidden');
    $('secBadgeCollection').classList.add('hidden');
  } else {
    $('tabMailInbox').className = "flex-1 py-1.5 text-center text-xs font-bold rounded-md transition text-t3 hover:text-white hover:bg-white/5";
    $('tabBadgeCollection').className = "flex-1 py-1.5 text-center text-xs font-bold rounded-md transition text-white bg-emerald-500/15 border border-emerald-500/20";
    $('secMailInbox').classList.add('hidden');
    $('secBadgeCollection').classList.remove('hidden');
    renderBadgesGridUI();
  }
}

function openInboxBadgesModal() {
  $('mInboxBadges').classList.remove('hidden');
  switchInboxSubtab('mail');
  renderInboxUI();
}

function renderInboxUI() {
  const container = $('inboxMailsList');
  if (!container) return;
  container.innerHTML = '';

  const mails = window.userMails || [];
  if (mails.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-t3 space-y-2">
        <i class="fas fa-envelope-open text-3xl opacity-40"></i>
        <p class="text-xs">Your Inbox is currently empty!</p>
      </div>`;
    return;
  }

  mails.forEach(mail => {
    // Mark unread mail as read after 1.5 seconds automatically
    if (!mail.read && userProfile) {
      setTimeout(async () => {
        try {
          const mRef = doc(db, 'users', userProfile.uid, 'mails', mail.id);
          await updateDoc(mRef, { read: true });
        } catch (e) {
          console.error("Error marking mail as read:", e);
        }
      }, 1500);
    }

    const dateStr = mail.createdAt ? new Date(mail.createdAt.seconds ? mail.createdAt.seconds * 1000 : mail.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now';

    let giftBlock = '';
    if (mail.giftBadgeId) {
      const giftBadge = PREDEFINED_BADGES.find(b => b.id === mail.giftBadgeId);
      if (giftBadge) {
        if (mail.collected) {
          giftBlock = `
            <div class="mt-3 p-2.5 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 text-[9px] font-bold rounded border uppercase ${giftBadge.color}">
                  <i class="fas ${giftBadge.icon} mr-1"></i> ${giftBadge.name}
                </span>
                <span class="text-[9px] text-t3">Claimed successfully</span>
              </div>
              <span class="text-[10px] text-green-400 font-bold flex items-center gap-1"><i class="fas fa-check-circle"></i> Collected</span>
            </div>`;
        } else {
          giftBlock = `
            <div class="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 text-[9px] font-bold rounded border uppercase ${giftBadge.color}">
                  <i class="fas ${giftBadge.icon} mr-1"></i> ${giftBadge.name}
                </span>
              </div>
              <button class="b-collect-gift px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-bg font-black text-[10px] rounded-lg transition cursor-pointer" data-mail-id="${mail.id}" data-badge-id="${giftBadge.id}">
                Collect Gift!
              </button>
            </div>`;
        }
      }
    }

    let customActionBlock = '';
    if (mail.type === 'team_join_request') {
      if (mail.status === 'pending') {
        customActionBlock = `
          <div class="mt-3 flex items-center gap-2 p-2.5 bg-gold/10 border border-gold/20 rounded-xl justify-between">
            <span class="text-[9px] text-t3 font-bold">Request Pending</span>
            <div class="flex gap-2">
              <button class="b-decline-req px-3 py-1 bg-red-500/20 hover:bg-red-500 hover:text-white border border-red-500/30 text-red-400 font-bold text-[10px] rounded-lg transition cursor-pointer" data-mail-id="${mail.id}" data-from-user-id="${mail.fromUserId}" data-team-id="${mail.teamId}" data-team-name="${mail.teamName}">
                Decline
              </button>
              <button class="b-accept-req px-3 py-1 bg-gold hover:bg-[#e8b830] text-bg font-black text-[10px] rounded-lg transition cursor-pointer" data-mail-id="${mail.id}" data-from-user-id="${mail.fromUserId}" data-team-id="${mail.teamId}" data-team-name="${mail.teamName}">
                Accept
              </button>
            </div>
          </div>`;
      } else if (mail.status === 'accepted') {
        customActionBlock = `
          <div class="mt-3 p-2.5 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center justify-between">
            <span class="text-[9px] text-t3 font-bold">Status</span>
            <span class="text-[10px] text-green-400 font-bold flex items-center gap-1"><i class="fas fa-check-circle"></i> Accepted ✔</span>
          </div>`;
      } else if (mail.status === 'declined') {
        customActionBlock = `
          <div class="mt-3 p-2.5 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center justify-between">
            <span class="text-[9px] text-t3 font-bold">Status</span>
            <span class="text-[10px] text-red-400 font-bold flex items-center gap-1"><i class="fas fa-times-circle"></i> Declined ✖</span>
          </div>`;
      }
    } else if (mail.type === 'tournament_invite') {
      if (mail.status === 'pending') {
        customActionBlock = `
          <div class="mt-3 flex items-center gap-2 p-2.5 bg-gold/10 border border-gold/20 rounded-xl justify-between">
            <span class="text-[9px] text-t3 font-bold">Squad Invite</span>
            <button class="b-join-tour px-3 py-1 bg-gold hover:bg-[#e8b830] text-bg font-black text-[10px] rounded-lg transition cursor-pointer" data-mail-id="${mail.id}" data-team-id="${mail.teamId}" data-tour-id="${mail.tournamentId}" data-tour-name="${mail.tournamentName}">
              Join Tournament Slot
            </button>
          </div>`;
      } else if (mail.status === 'joined') {
        customActionBlock = `
          <div class="mt-3 p-2.5 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center justify-between">
            <span class="text-[9px] text-t3 font-bold">Status</span>
            <span class="text-[10px] text-green-400 font-bold flex items-center gap-1"><i class="fas fa-check-circle"></i> Joined Slot ✔</span>
          </div>`;
      }
    }

    const card = document.createElement('div');
    card.className = `p-4 bg-card border ${mail.read ? 'border-bdr/50' : 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]'} rounded-xl relative overflow-hidden transition duration-150`;
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">
          <i class="fas fa-user-shield mr-1"></i> ${mail.sender || 'Admin Staff'}
        </span>
        <span class="text-[9px] text-t3 font-mono">${dateStr}</span>
      </div>
      <h4 class="font-display font-bold text-xs text-white mt-2 leading-snug flex items-center gap-1.5">
        ${!mail.read ? '<span class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse flex-shrink-0"></span>' : ''}
        ${mail.title}
      </h4>
      <p class="text-[10px] text-t2 mt-1 leading-relaxed whitespace-pre-wrap font-sans">${mail.body}</p>
      ${giftBlock}
      ${customActionBlock}
    `;

    const collectBtn = card.querySelector('.b-collect-gift');
    if (collectBtn) {
      collectBtn.addEventListener('click', async (e) => {
        const mailId = e.target.dataset.mailId;
        const badgeId = e.target.dataset.badgeId;
        e.target.disabled = true;
        e.target.textContent = 'Collecting...';
        await claimMailGift(mailId, badgeId, e.target);
      });
    }

    const acceptBtn = card.querySelector('.b-accept-req');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const mailId = btn.dataset.mailId;
        const fromUserId = btn.dataset.fromUserId;
        const teamId = btn.dataset.teamId;
        const teamName = btn.dataset.teamName;
        await window.acceptTeamJoinRequest(mailId, fromUserId, teamId, teamName, btn);
      });
    }

    const declineBtn = card.querySelector('.b-decline-req');
    if (declineBtn) {
      declineBtn.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const mailId = btn.dataset.mailId;
        const fromUserId = btn.dataset.fromUserId;
        const teamId = btn.dataset.teamId;
        const teamName = btn.dataset.teamName;
        await window.declineTeamJoinRequest(mailId, fromUserId, teamId, teamName, btn);
      });
    }

    const joinBtn = card.querySelector('.b-join-tour');
    if (joinBtn) {
      joinBtn.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const mailId = btn.dataset.mailId;
        const teamId = btn.dataset.teamId;
        const tourId = btn.dataset.tourId;
        const tourName = btn.dataset.tourName;
        await window.joinTournamentViaInvite(mailId, teamId, tourId, tourName, btn);
      });
    }

    container.appendChild(card);
  });
}

async function claimMailGift(mailId, badgeId, buttonEl) {
  if (!userProfile) return;
  try {
    const userDocRef = doc(db, 'users', userProfile.uid);
    const mailDocRef = doc(db, 'users', userProfile.uid, 'mails', mailId);

    // 1. Add badge to user's badges array in Firestore
    const updatePayload = {
      badges: arrayUnion(badgeId)
    };
    if (badgeId === 'blue_tick') {
      updatePayload.hasBlueTick = true;
      updatePayload.isVerified = true;
    }
    await updateDoc(userDocRef, updatePayload);

    // 2. Mark mail as collected
    await updateDoc(mailDocRef, {
      collected: true,
      read: true
    });

    alert('🎁 Congratulations! Your gifted badge has been successfully added to your profile credentials!');
    renderInboxUI();
  } catch (e) {
    alert('Failed to collect gift: ' + e.message);
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.textContent = 'Collect Gift!';
    }
  }
}

function renderBadgesGridUI() {
  const container = $('badgesGrid');
  if (!container) return;
  container.innerHTML = '';

  const profile = userProfile || guestProfile;
  const userBadges = (profile && profile.badges) || [];

  PREDEFINED_BADGES.forEach(badge => {
    const isEarned = userBadges.includes(badge.id);

    const card = document.createElement('div');
    card.className = `p-3 bg-card border ${isEarned ? 'border-gold/30 shadow-[0_0_15px_rgba(192,160,48,0.05)]' : 'border-bdr/40 opacity-40 grayscale'} rounded-xl flex flex-col items-center text-center space-y-1.5 relative overflow-hidden transition hover:scale-[1.02] cursor-pointer`;
    card.innerHTML = `
      ${!isEarned ? '<div class="absolute top-1.5 right-1.5 text-[8px] text-t3 bg-white/5 w-4 h-4 rounded-full flex items-center justify-center border border-bdr"><i class="fas fa-lock"></i></div>' : ''}
      <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg ${badge.color} border border-current/20">
        <i class="fas ${badge.icon}"></i>
      </div>
      <div class="text-[10px] font-black uppercase text-white tracking-wide">${badge.name}</div>
      <p class="text-[8px] text-t3 leading-normal max-w-[130px] font-medium font-sans">${badge.description}</p>
      <div class="text-[8px] font-bold uppercase ${isEarned ? 'text-gold' : 'text-t3'} pt-0.5 font-mono">
        ${isEarned ? '<i class="fas fa-check-circle mr-0.5"></i> Earned' : 'Locked'}
      </div>
    `;

    card.addEventListener('click', () => {
      alert(`🎖️ ${badge.name}\n\nDescription: ${badge.description}\n\nStatus: ${isEarned ? '✓ Earned' : '🔒 Locked (Must be gifted by Admin Staff)'}`);
    });

    container.appendChild(card);
  });
}

function updateInboxNotificationBadge(uncollectedCount) {
  const indicator = $('inboxBadgeCount');
  if (indicator) {
    if (uncollectedCount > 0) {
      indicator.textContent = uncollectedCount;
      indicator.classList.remove('hidden');
    } else {
      indicator.classList.add('hidden');
    }
  }
}

// ==========================================
// ── ARENAX GUILDS & TEAMS SYSTEM LOGIC ──
// ==========================================
// ==========================================
// ── ARENAX GUILDS & TEAMS SYSTEM LOGIC ──
// ==========================================
let allGuilds = [];
let selectedGuild = null;
let userGuild = null;
let unsubGuilds = null;
let unsubGuildChat = null;
let activeGuildIdForChat = null;
let showGuildBrowser = false;
let currentGuildTab = 'profile'; // 'profile', 'members', 'tasks', 'team_fight', 'manage', 'crates'
let teamsView = 'list'; // 'list', 'create', 'profile', 'rankings'
let teamsSearchQuery = '';
let selectedTeamData = null;
let customTeamLogoDataUrl = '';

// Expose state variables on window for global inline handlers
window.allGuilds = allGuilds;
window.selectedGuild = selectedGuild;
window.userGuild = userGuild;
window.teamsView = teamsView;
window.currentGuildTab = currentGuildTab;
window.selectedTeamData = selectedTeamData;

window.viewTeamById = function(teamId) {
  const list = window.allGuilds || allGuilds || [];
  const found = list.find(g => g.id === teamId);
  if (found) {
    selectedTeamData = found;
    window.selectedTeamData = found;
    teamsView = 'profile';
    window.teamsView = 'profile';
    window.renderGuildSystemModalContent();
  }
};

window.viewMyTeamProfile = function() {
  const ug = window.userGuild || userGuild;
  if (ug) {
    selectedTeamData = ug;
    window.selectedTeamData = ug;
    teamsView = 'profile';
    window.teamsView = 'profile';
    window.renderGuildSystemModalContent();
  }
};

window.closeGuildsModal = function() {
  const modal = $('mGuildSystemModal');
  if (modal) modal.classList.add('hidden');
};

window.setTeamsView = function(view) {
  teamsView = view;
  window.teamsView = view;
  window.renderGuildSystemModalContent();
};

window.setTeamsTab = function(tab) {
  currentGuildTab = tab;
  window.currentGuildTab = tab;
  window.renderGuildSystemModalContent();
};

window.toggleTeamsSearch = function() {
  const el = $('teamsSearchInputContainer');
  if (el) el.classList.toggle('hidden');
};

window.updateTeamsSearch = function(val) {
  teamsSearchQuery = (val || '').toLowerCase().trim();
  window.renderGuildSystemModalContent();
};


// Global Window Attachments for Main Controller
window.renderInboxUI = typeof renderInboxUI === 'function' ? renderInboxUI : function() {};
window.openInboxBadgesModal = typeof openInboxBadgesModal === 'function' ? openInboxBadgesModal : function() {
  const modal = $('mInboxBadges');
  if (modal) modal.classList.remove('hidden');
};
window.closeInboxBadgesModal = function() {
  const modal = $('mInboxBadges');
  if (modal) modal.classList.add('hidden');
};
window.openDepositModal = function() { const el = window.$("mDeposit"); if (el) el.classList.remove("hidden"); };
window.closeDepositModal = function() { const el = window.$("mDeposit"); if (el) el.classList.add("hidden"); };
window.openWithdrawModal = function() { const el = window.$("mWithdraw"); if (el) el.classList.remove("hidden"); };
window.closeWithdrawModal = function() { const el = window.$("mWithdraw"); if (el) el.classList.add("hidden"); };
window.toggleAccordion = function(id) { const el = window.$(id); if (el) el.classList.toggle("hidden"); };

// =========================================================================
// ── ARENAX DISCORD OAUTH2 VERIFICATION & SECURITY GATE SYSTEM ───────────
// =========================================================================

const DISCORD_CLIENT_ID = '1524144298289791127'; // Discord Developer App Client ID
const DISCORD_REDIRECT_URI = 'https://arenax.cyou/discord-callback';
const VERCEL_API_ENDPOINT = 'https://arena-x-beta.vercel.app/api/discord-callback';

// Cached pending tournament to resume after verification
let pendingTournamentForVerification = null;

/**
 * Initiates the Discord OAuth2 authorization flow with CSRF state protection
 */
window.initiateDiscordOAuthFlow = function(source = 'general') {
  if (guestProfile) {
    alert('Guest accounts cannot link a Discord profile. Please create or log in to a permanent ArenaX account first!');
    return;
  }
  const profile = userProfile || window.userProfile;
  if (!profile || !profile.uid) {
    alert('Please log in before connecting Discord.');
    return;
  }

  // 1. Generate random CSRF state token
  const randomState = 'ax_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
  const statePayload = {
    token: randomState,
    uid: profile.uid,
    source: source,
    timestamp: Date.now()
  };

  try {
    sessionStorage.setItem('ax_discord_oauth_state', JSON.stringify(statePayload));
  } catch (e) {
    console.warn('SessionStorage unavailable for OAuth state, continuing anyway', e);
  }

  // 2. Construct Discord OAuth2 URL with scope=identify only
  const clientId = window.DISCORD_CLIENT_ID || DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(DISCORD_REDIRECT_URI);
  const stateParam = encodeURIComponent(randomState);

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify&state=${stateParam}`;

  // 3. Redirect user to Discord Auth
  window.location.href = discordAuthUrl;
};

/**
 * Check if the current page load is a Discord OAuth callback
 */
window.checkAndProcessDiscordCallback = async function() {
  const urlParams = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname;

  const isDiscordCallbackRoute = pathname.includes('discord-callback') || urlParams.has('code');
  if (!isDiscordCallbackRoute) return;

  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const error = urlParams.get('error');
  const errorDescription = urlParams.get('error_description');

  if (error) {
    alert(`Discord Verification Cancelled: ${errorDescription || error}`);
    cleanupDiscordUrlParams();
    return;
  }

  if (!code) return;

  // Retrieve and verify CSRF state
  let storedState = null;
  try {
    const raw = sessionStorage.getItem('ax_discord_oauth_state');
    if (raw) storedState = JSON.parse(raw);
  } catch (e) {}

  if (storedState && storedState.token && state && storedState.token !== state) {
    console.warn('Discord OAuth state mismatch! Potential CSRF prevented.');
    alert('Security Warning: Discord authentication state mismatch. Please retry verification.');
    cleanupDiscordUrlParams();
    return;
  }

  // Show status banner/toast
  const toastMsg = document.createElement('div');
  toastMsg.id = 'discordVerifyingToast';
  toastMsg.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-[300] bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-bold border border-indigo-400 animate-bounce';
  toastMsg.innerHTML = '<i class="fab fa-discord text-base"></i> Verifying Discord identity with ArenaX...';
  document.body.appendChild(toastMsg);

  try {
    // 1. Call serverless function on Vercel backend
    let response;
    try {
      // First attempt relative /api route or primary Vercel function
      response = await fetch(VERCEL_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code })
      });
    } catch (netErr) {
      // Fallback attempt to relative endpoint if hosted on same origin
      response = await fetch('/api/discord-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code })
      });
    }

    const result = await response.json();

    if (!response.ok || !result.success || !result.discord) {
      throw new Error(result.error || 'Failed to exchange Discord authorization code');
    }

    const discordData = result.discord;

    // 2. Persist Discord identity to Firestore user document
    const uid = (userProfile && userProfile.uid) || (storedState && storedState.uid) || (auth.currentUser && auth.currentUser.uid);
    if (!uid) {
      throw new Error('No active ArenaX player session found to link Discord profile.');
    }

    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      discordUserId: discordData.id,
      discordUsername: discordData.username,
      discordAvatar: discordData.avatar,
      discordGlobalName: discordData.globalName || '',
      discordVerified: true,
      discordLinkedAt: serverTimestamp()
    });

    // Update local profile object in-place
    if (userProfile) {
      userProfile.discordUserId = discordData.id;
      userProfile.discordUsername = discordData.username;
      userProfile.discordAvatar = discordData.avatar;
      userProfile.discordGlobalName = discordData.globalName || '';
      userProfile.discordVerified = true;
    }

    // Refresh UI components immediately across all active screens and modals
    window.renderDiscordAuthWidget();
    window.updateDiscordSecurityUI();

    // Close verification gate modal if open
    window.closeDiscordVerificationGate();

    // Display clear success confirmation toast
    toastMsg.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-[300] bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-bold border border-emerald-400 animate-fade-in';
    toastMsg.innerHTML = `<i class="fas fa-check-circle text-base"></i> Discord Connected: <span class="underline text-emerald-200">@${discordData.username}</span> is now verified!`;

    setTimeout(() => {
      if (toastMsg.parentNode) toastMsg.parentNode.removeChild(toastMsg);
    }, 5000);

    // Context-aware UI navigation back to user location
    const sourceContext = storedState ? storedState.source : 'general';
    if (sourceContext === 'settings' && typeof window.openAxSecurityModal === 'function') {
      window.openAxSecurityModal();
    } else if (pendingTournamentForVerification) {
      const tour = pendingTournamentForVerification;
      pendingTournamentForVerification = null;
      if (typeof openTournamentRegister === 'function') {
        openTournamentRegister(tour);
      }
    } else {
      // Default to returning to current tab (e.g. sDash or sTournaments) smoothly
      if (typeof goTo === 'function' && typeof currentScreen !== 'undefined' && !currentScreen) {
        goTo('sDash');
      }
    }

  } catch (err) {
    console.error('Discord Verification Error:', err);
    alert('❌ Discord Verification Failed: ' + (err.message || err));
    if (toastMsg.parentNode) toastMsg.parentNode.removeChild(toastMsg);
  } finally {
    sessionStorage.removeItem('ax_discord_oauth_state');
    cleanupDiscordUrlParams();
  }
};

function cleanupDiscordUrlParams() {
  try {
    const cleanUrl = window.location.origin + window.location.pathname.replace(/\/discord-callback$/, '') || '/';
    window.history.replaceState({}, document.title, cleanUrl);
  } catch (e) {
    try {
      window.location.replace('/');
    } catch (e2) {}
  }
}

/**
 * Checks if Discord account was just linked in discord-callback.html and triggers notifications/UI refresh
 */
window.checkDiscordJustLinked = function() {
  try {
    const raw = sessionStorage.getItem('ax_discord_just_linked');
    if (!raw) return;
    sessionStorage.removeItem('ax_discord_just_linked');

    const discordData = JSON.parse(raw);
    if (!discordData || !discordData.username) return;

    // Update local profile object immediately
    if (userProfile) {
      userProfile.discordUserId = discordData.id;
      userProfile.discordUsername = discordData.username;
      userProfile.discordAvatar = discordData.avatar;
      userProfile.discordGlobalName = discordData.globalName || '';
      userProfile.discordVerified = true;
    }

    if (typeof window.renderDiscordAuthWidget === 'function') {
      window.renderDiscordAuthWidget();
    }
    if (typeof window.updateDiscordSecurityUI === 'function') {
      window.updateDiscordSecurityUI();
    }
    if (typeof window.closeDiscordVerificationGate === 'function') {
      window.closeDiscordVerificationGate();
    }

    // Success toast notification
    const toastMsg = document.createElement('div');
    toastMsg.id = 'discordJustLinkedToast';
    toastMsg.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-[300] bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-bold border border-emerald-400 animate-fade-in';
    toastMsg.innerHTML = `<i class="fas fa-check-circle text-base text-emerald-200"></i> Discord Connected: <span class="underline text-white">@${discordData.username}</span> is now linked!`;
    document.body.appendChild(toastMsg);

    setTimeout(() => {
      if (toastMsg.parentNode) toastMsg.parentNode.removeChild(toastMsg);
    }, 5000);

    // Context-sensitive reopening
    if (discordData.source === 'settings' && typeof window.openAxSecurityModal === 'function') {
      window.openAxSecurityModal();
    } else if (typeof pendingTournamentForVerification !== 'undefined' && pendingTournamentForVerification) {
      const tour = pendingTournamentForVerification;
      pendingTournamentForVerification = null;
      if (typeof openTournamentRegister === 'function') {
        openTournamentRegister(tour);
      }
    }
  } catch (err) {
    console.warn('Error evaluating checkDiscordJustLinked:', err);
  }
};

/**
 * Disconnects / Unlinks Discord from user's account
 */
window.unlinkDiscordAccount = async function() {
  if (guestProfile || !userProfile) return;
  const confirmUnlink = confirm('Are you sure you want to unlink your Discord account? You will need to reconnect it before registering for future tournaments.');
  if (!confirmUnlink) return;

  try {
    const userDocRef = doc(db, 'users', userProfile.uid);
    await updateDoc(userDocRef, {
      discordUserId: null,
      discordUsername: null,
      discordAvatar: null,
      discordGlobalName: null,
      discordVerified: false,
      discordUnlinkedAt: serverTimestamp()
    });

    userProfile.discordUserId = null;
    userProfile.discordUsername = null;
    userProfile.discordAvatar = null;
    userProfile.discordVerified = false;

    window.renderDiscordAuthWidget();
    window.updateDiscordSecurityUI();

    alert('✓ Discord account unlinked successfully.');
  } catch (e) {
    alert('Failed to unlink Discord: ' + e.message);
  }
};

/**
 * Generates and injects the reusable Discord Connect / Status widget
 */
window.renderDiscordAuthWidget = function() {
  const profile = userProfile || guestProfile;
  const isLinked = profile && profile.discordVerified === true;

  const html = isLinked ? `
    <div class="p-4 bg-gradient-to-r from-indigo-950/40 via-card to-card border border-indigo-500/40 rounded-xl flex items-center justify-between gap-3 shadow-md">
      <div class="flex items-center gap-3">
        <div class="relative">
          <img src="${profile.discordAvatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="Discord Avatar" class="w-11 h-11 rounded-full object-cover border-2 border-indigo-500/60 bg-slate-900 shadow-md" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'"/>
          <span class="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center text-[8px] text-white font-bold" title="Verified">
            ✓
          </span>
        </div>
        <div class="space-y-0.5">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-white leading-tight font-display">${profile.discordUsername || 'Discord User'}</span>
            <span class="px-1.5 py-0.2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[8px] font-black uppercase rounded">Verified</span>
          </div>
          <p class="text-[10px] text-t3 font-mono">ID: ${profile.discordUserId || 'Connected'}</p>
        </div>
      </div>
      <button onclick="window.unlinkDiscordAccount()" class="px-3 py-1.5 bg-red/10 border border-red/30 hover:bg-red/20 text-red text-[10px] font-bold uppercase rounded-lg transition active:scale-95 cursor-pointer">
        Unlink
      </button>
    </div>
  ` : `
    <div class="space-y-3">
      <div class="p-3.5 bg-bg/60 border border-bdr rounded-xl flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full bg-slate-800 border border-bdr flex items-center justify-center text-t3 text-sm">
            <i class="fab fa-discord"></i>
          </div>
          <div>
            <div class="text-xs font-bold text-slate-200">No Discord Linked</div>
            <div class="text-[10px] text-t3">Required for tournament entry & verification</div>
          </div>
        </div>
        <span class="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
          Unlinked
        </span>
      </div>

      <button onclick="window.initiateDiscordOAuthFlow()" class="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-lg shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
        <i class="fab fa-discord text-base"></i> Connect Discord Account
      </button>
    </div>
  `;

  // Inject into gate modal and settings widget containers
  if ($('discordGateWidget')) $('discordGateWidget').innerHTML = html;
  if ($('discordSettingsWidget')) $('discordSettingsWidget').innerHTML = html;
};

/**
 * Updates UI badges and state across the settings panel
 */
window.updateDiscordSecurityUI = function() {
  const profile = userProfile || guestProfile;
  if (!profile) return;

  if (window.accountStanding && typeof window.accountStanding.computeAccountStanding === 'function') {
    const computed = window.accountStanding.computeAccountStanding(profile, null, []);
    window.accountStanding.renderAccountStandingUI(computed, profile);
    if (profile.uid && typeof window.accountStanding.initUserStandingListener === 'function') {
      window.accountStanding.initUserStandingListener(profile.uid);
    }
  } else {
    const isLinked = profile && profile.discordVerified === true;
    const badge = $('badgeAxSecurityStatus');
    if (badge) {
      const hasWarning = (Number(profile.warningCount) || 0) > 0 || profile.accountStatus === 'warned';
      const isRestricted = Boolean(profile.restricted || profile.accountStatus === 'restricted');
      const isAtRisk = Boolean(profile.banned || (Number(profile.warningCount) || 0) >= 2);

      if (isAtRisk) {
        badge.textContent = 'At Risk ✕';
        badge.className = 'text-[9px] bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold uppercase';
      } else if (hasWarning || isRestricted) {
        badge.textContent = 'Limited !';
        badge.className = 'text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase';
      } else {
        badge.textContent = isLinked ? 'All Good ✓' : 'All Good';
        badge.className = 'text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase';
      }
    }
  }
};

/**
 * Opens the Tournament Discord Verification Gate Modal
 */
window.openDiscordVerificationGate = function(tour) {
  pendingTournamentForVerification = tour;
  window.renderDiscordAuthWidget();
  const modal = $('mDiscordVerifyGate');
  if (modal) modal.classList.remove('hidden');
};

window.closeDiscordVerificationGate = function() {
  const modal = $('mDiscordVerifyGate');
  if (modal) modal.classList.add('hidden');
};

/**
 * Opens the AX Security Modal from Profile Settings
 */
window.openAxSecurityModal = function() {
  window.renderDiscordAuthWidget();
  window.updateDiscordSecurityUI();
  const profile = userProfile || guestProfile || {};
  if (window.accountStanding) {
    if (profile.uid && typeof window.accountStanding.refreshUserStanding === 'function') {
      window.accountStanding.refreshUserStanding(profile.uid);
    } else if (typeof window.accountStanding.computeAccountStanding === 'function') {
      const computed = window.accountStanding.computeAccountStanding(profile, null, []);
      window.accountStanding.renderAccountStandingUI(computed, profile);
      window.accountStanding.fetchAiStandingRecommendations(false);
    }
  }
  const modal = $('mAxSecurityModal');
  if (modal) modal.classList.remove('hidden');
};

window.closeAxSecurityModal = function() {
  const modal = $('mAxSecurityModal');
  if (modal) modal.classList.add('hidden');
};

// Event Listeners for AX Security and Discord Modals
document.addEventListener('DOMContentLoaded', () => {
  // AX Security Modal Triggers
  const btnAx = $('btnAxSecurity');
  if (btnAx) btnAx.addEventListener('click', () => window.openAxSecurityModal());

  const bCloseAx = $('bCloseAxSecurity');
  if (bCloseAx) bCloseAx.addEventListener('click', () => window.closeAxSecurityModal());

  const bCloseAxCross = $('bCloseAxSecurityCross');
  if (bCloseAxCross) bCloseAxCross.addEventListener('click', () => window.closeAxSecurityModal());

  // Discord Gate Triggers
  const bCloseGate = $('bCloseDiscordGate');
  if (bCloseGate) bCloseGate.addEventListener('click', () => window.closeDiscordVerificationGate());

  const bCancelGate = $('bCancelDiscordGate');
  if (bCancelGate) bCancelGate.addEventListener('click', () => window.closeDiscordVerificationGate());
});


