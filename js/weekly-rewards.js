// ArenaX - Weekly Rewards System Integration (Client-Side)
import { auth } from './firebase-config.js';

let weeklyRewardState = {
  currentDay: 1,
  isEligible: false,
  remainingMs: 0,
  rewards: [15, 20, 25, 30, 35, 40],
  loading: false,
  claiming: false,
  countdownInterval: null
};

window.weeklyRewardState = weeklyRewardState;

// Format remaining cooldown in ms to HH:MM:SS
function formatCountdown(ms) {
  if (!ms || ms <= 0) return '00:00:00';
  const totalSecs = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Start 1-second live countdown for cooldown
function startCountdownTimer() {
  if (weeklyRewardState.countdownInterval) {
    clearInterval(weeklyRewardState.countdownInterval);
  }
  weeklyRewardState.countdownInterval = setInterval(() => {
    if (weeklyRewardState.remainingMs > 0) {
      weeklyRewardState.remainingMs -= 1000;
      if (weeklyRewardState.remainingMs <= 0) {
        weeklyRewardState.remainingMs = 0;
        weeklyRewardState.isEligible = true;
        renderWeeklyRewardsUI();
      } else {
        const btn = document.getElementById('btnClaimWeeklyReward');
        if (btn && !weeklyRewardState.isEligible) {
          btn.textContent = `Next in ${formatCountdown(weeklyRewardState.remainingMs)}`;
        }
      }
    }
  }, 1000);
}

// Render the 7-day rewards grid inside modal
function renderWeeklyRewardsGrid() {
  const grid = document.getElementById('weeklyRewardsGrid');
  if (!grid) return;

  const currentDay = weeklyRewardState.currentDay || 1;
  const activeIndex = currentDay - 1; // 0-based
  const isEligible = weeklyRewardState.isEligible;
  const rewards = [15, 20, 25, 30, 35, 40];

  let html = '';

  // Days 1 through 6
  rewards.forEach((amount, i) => {
    const isDayDone = isEligible ? i < activeIndex : i <= activeIndex;
    const isDayActive = isEligible && i === activeIndex;

    let cardClasses = 'border-[1.5px] border-[#ffab3d] bg-[#fff1cf]';
    let headerClasses = 'bg-[#ffab3d]';
    let textClasses = 'text-[#e08a1a]';
    let doneAttr = isDayDone ? ' ✓' : '';

    if (isDayActive) {
      cardClasses = 'border-[1.5px] border-[#f26a00] bg-gradient-to-b from-[#ffb340] to-[#f28a1a] shadow-sm';
      headerClasses = 'bg-[#f26a00]';
      textClasses = 'text-white font-extrabold';
    } else if (isDayDone) {
      cardClasses = 'border-[1.5px] border-[#ffab3d]/40 bg-[#fff8e7]';
      headerClasses = 'bg-[#ffab3d]/70';
    }

    html += `
      <div class="col-span-3 rounded-[8px] overflow-hidden text-center flex flex-col transition-transform duration-150 ${cardClasses}">
        <div class="text-[11.5px] font-extrabold py-[3px] text-white ${headerClasses}">
          Day ${i + 1}d${doneAttr}
        </div>
        <div class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-0 min-h-[76px] ${isDayDone ? 'opacity-40' : ''}">
          <!-- Coin SVG -->
          <svg class="w-[30px] h-[30px] ${isDayActive ? 'drop-shadow-[0_0_6px_#fff]' : ''}" viewBox="0 0 1024 1024">
            <circle cx="512" cy="512" r="500" fill="#ffb800" />
            <circle cx="512" cy="512" r="430" fill="#ffd23a" />
            <g transform="translate(512 512) scale(.62) translate(-512 -512)" stroke="#ff8a00" stroke-width="124" stroke-linecap="round">
              <line x1="350" y1="263" x2="495" y2="408" />
              <line x1="760" y1="350" x2="615" y2="495" />
              <line x1="263" y1="673" x2="408" y2="528" />
              <line x1="528" y1="615" x2="673" y2="760" />
            </g>
          </svg>
          <div class="text-[9.5px] font-bold ${textClasses}">
            Gold x${amount}
          </div>
        </div>
      </div>
    `;
  });

  // Day 7: Mystery Gift (col-span-6)
  const isDay7Done = isEligible ? activeIndex > 6 : (activeIndex >= 6 && !isEligible);
  const isDay7Active = isEligible && activeIndex === 6;

  let day7CardClasses = 'border-[1.5px] border-[#ffab3d] bg-[#fff1cf]';
  let day7HeaderClasses = 'bg-[#ffab3d]';
  let day7TextClasses = 'text-[#e0701a]';
  let day7DoneAttr = isDay7Done ? ' ✓' : '';

  if (isDay7Active) {
    day7CardClasses = 'border-[1.5px] border-[#f26a00] bg-gradient-to-b from-[#ffb340] to-[#f28a1a] shadow-sm';
    day7HeaderClasses = 'bg-[#f26a00]';
    day7TextClasses = 'text-white';
  } else if (isDay7Done) {
    day7CardClasses = 'border-[1.5px] border-[#ffab3d]/40 bg-[#fff8e7]';
    day7HeaderClasses = 'bg-[#ffab3d]/70';
  }

  html += `
    <div class="col-span-6 rounded-[8px] overflow-hidden text-center flex flex-col transition-transform duration-150 ${day7CardClasses}">
      <div class="text-[11.5px] font-extrabold py-[3px] text-white ${day7HeaderClasses}">
        Day 7d${day7DoneAttr}
      </div>
      <div class="flex-1 flex flex-row items-center justify-center gap-2.5 py-2 px-0 min-h-[76px] ${isDay7Done ? 'opacity-40' : ''}">
        <!-- Gift SVG -->
        <svg class="w-10 h-10 ${isDay7Active ? 'drop-shadow-[0_0_6px_#fff]' : ''}" viewBox="0 0 40 40">
          <rect x="5" y="16" width="30" height="21" rx="3" fill="#ff8a2a" />
          <rect x="3" y="11" width="34" height="8" rx="3" fill="#ff6a1a" />
          <rect x="18" y="11" width="5" height="26" fill="#ffd23a" />
          <path d="M20 11C10 1 6 10 14 11zM20 11c10-10 14-1 6 0z" fill="#ffd23a" />
        </svg>
        <div class="text-[11px] font-extrabold ${day7TextClasses}">
          Mystery Gift
        </div>
      </div>
    </div>
  `;

  grid.innerHTML = html;
}

// Render complete UI inside the modal
function renderWeeklyRewardsUI() {
  renderWeeklyRewardsGrid();

  const btn = document.getElementById('btnClaimWeeklyReward');
  const cooldownNotice = document.getElementById('weeklyRewardCooldownNotice');
  const errEl = document.getElementById('weeklyRewardError');

  if (errEl) errEl.classList.add('hidden');

  if (btn) {
    if (weeklyRewardState.claiming) {
      btn.disabled = true;
      btn.className = 'w-full mt-5 rounded-[30px] py-[13px] text-[17px] font-extrabold text-white transition-all select-none bg-[#c9c9c9] shadow-[0_3px_0_#a5a5a5] cursor-not-allowed opacity-90';
      btn.innerHTML = `
        <span class="flex items-center justify-center gap-2">
          <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          Claiming...
        </span>
      `;
      if (cooldownNotice) cooldownNotice.classList.add('hidden');
    } else if (weeklyRewardState.isEligible) {
      btn.disabled = false;
      btn.className = 'w-full mt-5 rounded-[30px] py-[13px] text-[17px] font-extrabold text-white transition-all select-none cursor-pointer bg-gradient-to-b from-[#ff9a1f] to-[#ff7f00] shadow-[0_3px_0_#d96a00] active:translate-y-[2px] active:shadow-[0_1px_0_#d96a00] hover:brightness-105';
      btn.textContent = 'Claim';
      if (cooldownNotice) cooldownNotice.classList.add('hidden');
    } else {
      btn.disabled = true;
      btn.className = 'w-full mt-5 rounded-[30px] py-[13px] text-[17px] font-extrabold text-white transition-all select-none bg-[#c9c9c9] shadow-[0_3px_0_#a5a5a5] cursor-not-allowed opacity-90';
      if (weeklyRewardState.remainingMs > 0) {
        btn.textContent = `Next in ${formatCountdown(weeklyRewardState.remainingMs)}`;
        if (cooldownNotice) cooldownNotice.classList.remove('hidden');
      } else {
        btn.textContent = 'Claimed';
        if (cooldownNotice) cooldownNotice.classList.add('hidden');
      }
    }
  }
}

// Show Toast Notification inside modal
function showWeeklyRewardsToast(msg) {
  const toast = document.getElementById('weeklyRewardToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('opacity-0', 'translate-y-10');
  toast.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-10');
  }, 2200);
}

// Fetch Weekly Reward status from Server
async function fetchWeeklyRewardsStatus(forceOpen = false) {
  const fireUser = auth.currentUser;
  const profile = window.userProfile;
  const uid = fireUser?.uid || profile?.uid;

  if (!uid || window.guestProfile) {
    return null;
  }

  try {
    weeklyRewardState.loading = true;
    let token = null;
    if (fireUser && typeof fireUser.getIdToken === 'function') {
      try {
        token = await fireUser.getIdToken();
      } catch (tErr) {
        console.warn('[Weekly Rewards] Token retrieval error:', tErr);
      }
    }

    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/weekly-rewards/status?uid=${encodeURIComponent(uid)}`, { headers });
    const data = await res.json();

    if (data.success) {
      weeklyRewardState.currentDay = data.currentDay || 1;
      weeklyRewardState.isEligible = !!data.isEligible;
      weeklyRewardState.remainingMs = data.remainingMs || 0;
      weeklyRewardState.rewards = data.rewards || [15, 20, 25, 30, 35, 40];

      startCountdownTimer();

      // Render updated UI
      renderWeeklyRewardsUI();

      // If forceOpen is requested OR if claim is eligible:
      if (forceOpen || data.isEligible) {
        openWeeklyRewardsModal();
      } else {
        console.log(`[Weekly Rewards] Cooldown active for player (${Math.round(data.remainingMs / 1000 / 60)} mins left). Modal not auto-opened.`);
      }

      return data;
    } else {
      console.warn('[Weekly Rewards] Status returned error:', data.error);
      return null;
    }
  } catch (err) {
    console.error('[Weekly Rewards] Failed to fetch status:', err);
    return null;
  } finally {
    weeklyRewardState.loading = false;
  }
}

// Open Weekly Rewards Modal
function openWeeklyRewardsModal(forceCheck = false) {
  const modal = document.getElementById('mWeeklyRewards');
  if (!modal) {
    console.warn('[Weekly Rewards] Modal element #mWeeklyRewards not found in DOM.');
    return;
  }

  // If forceCheck requested from a button click, refresh status from server
  if (forceCheck) {
    fetchWeeklyRewardsStatus(true);
    return;
  }

  renderWeeklyRewardsUI();
  modal.classList.remove('hidden');
}

// Close Weekly Rewards Modal
function closeWeeklyRewardsModal() {
  const modal = document.getElementById('mWeeklyRewards');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Handle Claim Button Click
async function handleClaimWeeklyReward() {
  if (weeklyRewardState.claiming || !weeklyRewardState.isEligible) return;

  const fireUser = auth.currentUser;
  const profile = window.userProfile;
  const uid = fireUser?.uid || profile?.uid;

  if (!uid) {
    const errEl = document.getElementById('weeklyRewardError');
    if (errEl) {
      errEl.textContent = 'Please log in to claim your reward.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  weeklyRewardState.claiming = true;
  renderWeeklyRewardsUI();

  try {
    let token = null;
    if (fireUser && typeof fireUser.getIdToken === 'function') {
      try {
        token = await fireUser.getIdToken();
      } catch (tErr) {}
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/weekly-rewards/claim', {
      method: 'POST',
      headers,
      body: JSON.stringify({ uid })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to claim reward.');
    }

    // Success!
    const msg = data.isMystery
      ? `🎁 Mystery Gift claimed! +${data.rewardAmount} AX Coins`
      : `✨ +${data.rewardAmount} AX Coins claimed!`;

    showWeeklyRewardsToast(msg);

    // Update state to cooldown
    weeklyRewardState.isEligible = false;
    weeklyRewardState.remainingMs = 24 * 60 * 60 * 1000;
    weeklyRewardState.currentDay = data.nextDay || (weeklyRewardState.currentDay >= 7 ? 1 : weeklyRewardState.currentDay + 1);

    // Update AX Coins wallet in existing UI
    if (data.newBalance != null) {
      if (window.userProfile) window.userProfile.balance = data.newBalance;
      if (window.currentUser) window.currentUser.balance = data.newBalance;
      const homeCoins = document.getElementById('homeCoinsVal');
      if (homeCoins) homeCoins.textContent = Number(data.newBalance).toLocaleString();
      const wBal = document.getElementById('wBal');
      if (wBal) wBal.textContent = Number(data.newBalance).toLocaleString();
    }

    renderWeeklyRewardsUI();

    // Automatically close modal after user views success toast
    setTimeout(() => {
      closeWeeklyRewardsModal();
    }, 1600);
  } catch (err) {
    console.error('[Weekly Rewards] Claim error:', err);
    const errEl = document.getElementById('weeklyRewardError');
    if (errEl) {
      errEl.textContent = err.message || 'Error claiming reward.';
      errEl.classList.remove('hidden');
    }
  } finally {
    weeklyRewardState.claiming = false;
    renderWeeklyRewardsUI();
  }
}

// Guard to prevent duplicate concurrent checks on arena entry
let arenaEntryCheckInProgress = false;
let lastArenaEntryCheckTime = 0;

// Arena Entry Lifecycle Hook:
// Triggered strictly after the Arena opens and user is authenticated
function checkArenaWeeklyRewardsEligibility() {
  const now = Date.now();
  // Prevent duplicate execution within 3 seconds
  if (arenaEntryCheckInProgress || (now - lastArenaEntryCheckTime < 3000)) {
    return;
  }

  const fireUser = auth.currentUser;
  const profile = window.userProfile;
  const uid = fireUser?.uid || profile?.uid;

  if (!uid || window.guestProfile) {
    return;
  }

  arenaEntryCheckInProgress = true;
  lastArenaEntryCheckTime = now;

  console.log('[Arena Lifecycle] Authenticated user entered Arena. Triggering Weekly Rewards eligibility check for UID:', uid);

  fetchWeeklyRewardsStatus(false).finally(() => {
    arenaEntryCheckInProgress = false;
  });
}

// Bind methods to window
window.checkArenaWeeklyRewardsEligibility = checkArenaWeeklyRewardsEligibility;
window.fetchWeeklyRewardsStatus = fetchWeeklyRewardsStatus;
window.openWeeklyRewardsModal = openWeeklyRewardsModal;
window.closeWeeklyRewardsModal = closeWeeklyRewardsModal;
window.handleClaimWeeklyReward = handleClaimWeeklyReward;
window.renderWeeklyRewardsUI = renderWeeklyRewardsUI;
