/**
 * ArenaX — First Topup Benefits Integration Module
 * Source of Truth UI Reference: first-topup.html
 * 
 * Server-authoritative status checking, atomic claim transactions,
 * permanent Phoenix avatar frame unlocking, and Home page Gift Pack entry point.
 */

(function () {
  'use strict';

  // Global state
  let ftOfferConfig = {
    active: true,
    isCurrentlyValid: true,
    targetAudience: 'all',
    minTopup: 100,
    bonusReward: 150,
    rewardFrame: 'Pheonix',
    frameAsset: 'public/frame4.webm'
  };

  let ftUserStatus = {
    authenticated: false,
    uid: null,
    isTargeted: true,
    hasClaimed: false,
    hasApprovedTopup: false,
    qualifyingTopupAmount: 0,
    eligibleToClaim: false
  };

  let isFirstTopupClaiming = false;
  let hasInitialized = false;

  const isStaticHost = typeof window !== 'undefined' && (
    window.location.hostname === 'arenax.cyou' ||
    window.location.hostname.endsWith('github.io')
  );
  const vercelBase = 'https://arena-x-beta.vercel.app';

  function getApiEndpoint(action) {
    if (isStaticHost) {
      return `${vercelBase}/api/shop?action=${action}`;
    }
    return `/api/shop/${action}`;
  }

  /**
   * Fetches authoritative First Topup status from backend
   */
  async function fetchFirstTopupStatus(force = false) {
    try {
      const authUser = (typeof window.auth !== 'undefined' && window.auth?.currentUser)
        ? window.auth.currentUser
        : (window.currentAuthUser || null);

      let token = '';
      if (authUser && typeof authUser.getIdToken === 'function') {
        token = await authUser.getIdToken().catch(() => '');
      }

      const uid = authUser?.uid || window.userProfile?.uid || null;
      let url = getApiEndpoint('first-topup-status');
      if (uid) {
        url += (url.includes('?') ? '&' : '?') + `uid=${encodeURIComponent(uid)}`;
      }

      const headers = { 'Accept': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res;
      try {
        res = await fetch(url, { method: 'GET', headers });
        if (!res.ok && !url.startsWith(vercelBase)) {
          res = await fetch(`${vercelBase}/api/shop?action=first-topup-status${uid ? '&uid=' + encodeURIComponent(uid) : ''}`, {
            method: 'GET',
            headers
          });
        }
      } catch (err) {
        if (!url.startsWith(vercelBase)) {
          res = await fetch(`${vercelBase}/api/shop?action=first-topup-status${uid ? '&uid=' + encodeURIComponent(uid) : ''}`, {
            method: 'GET',
            headers
          });
        } else {
          throw err;
        }
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data && data.success) {
          if (data.offer) ftOfferConfig = { ...ftOfferConfig, ...data.offer };
          if (data.userStatus) ftUserStatus = { ...ftUserStatus, ...data.userStatus };
        }
      }
    } catch (err) {
      console.warn('[First Topup] Status sync warning:', err.message);
    } finally {
      syncFirstTopupUI();
    }
  }

  /**
   * Syncs Gift Pack button on Home Page and Modal states
   */
  function syncFirstTopupUI() {
    const profile = (typeof window.getActiveUserProfile === 'function')
      ? window.getActiveUserProfile()
      : (window.userProfile || window.currentUser);

    // Profile-level verification fallback
    const isProfileClaimed = Boolean(
      profile?.firstTopupClaimed ||
      profile?.firstTopupReward?.claimed ||
      (profile?.ownedShopItems && profile.ownedShopItems['pheonix']) ||
      (profile?.pheonixFrame?.permanentUnlocked)
    );

    if (isProfileClaimed) {
      ftUserStatus.hasClaimed = true;
      ftUserStatus.eligibleToClaim = false;
    }

    // 1. Gift Pack entry button on Home page
    const giftPackBtn = document.getElementById('btnFirstTopupGiftPack');
    if (giftPackBtn) {
      const isVisible = ftOfferConfig.isCurrentlyValid && ftUserStatus.isTargeted;
      if (isVisible) {
        giftPackBtn.classList.remove('hidden');
        giftPackBtn.style.display = 'flex';
      } else {
        giftPackBtn.classList.add('hidden');
        giftPackBtn.style.display = 'none';
      }
    }

    // 2. Render Modal UI elements if modal exists
    renderFirstTopupModalUI();
  }

  /**
   * Renders the First Topup Modal content dynamically
   */
  function renderFirstTopupModalUI() {
    const profile = (typeof window.getActiveUserProfile === 'function')
      ? window.getActiveUserProfile()
      : (window.userProfile || window.currentUser);

    // Requirement text
    const reqTextEl = document.getElementById('ftModalRequirementText');
    if (reqTextEl) {
      const minAX = ftOfferConfig.minTopup || 100;
      reqTextEl.innerHTML = `Top up <span class="text-amber-400 font-black">${minAX} AX Coins</span> or more`;
    }

    // Avatar preview inside Phoenix Frame card
    const previewAvEl = document.getElementById('ftPreviewAvatar');
    if (previewAvEl) {
      const avUrl = profile?.av || profile?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=ax';
      previewAvEl.src = avUrl;
    }

    // Action button & Hint Box
    const actionBtn = document.getElementById('btnFirstTopupAction');
    const actionText = document.getElementById('ftActionBtnText');
    const actionIcon = document.getElementById('ftActionBtnIcon');
    const statusHint = document.getElementById('ftStatusHintText');
    const errBox = document.getElementById('ftErrorMsg');

    if (errBox) errBox.classList.add('hidden');

    if (!actionBtn || !actionText || !actionIcon) return;

    if (ftUserStatus.hasClaimed) {
      // ── STATE 3: ALREADY CLAIMED ──
      actionBtn.disabled = true;
      actionBtn.className = "w-full py-3 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black text-sm tracking-wide uppercase cursor-not-allowed flex items-center justify-center gap-2 shadow-xs";
      actionText.textContent = "CLAIMED";
      actionIcon.className = "fas fa-check text-xs";
      if (statusHint) {
        statusHint.innerHTML = `<i class="fas fa-check-circle text-emerald-400 mt-0.5 shrink-0 text-xs"></i> <span>Offer claimed! <strong>Pheonix Frame</strong> is equipped and permanently unlocked in Customize Profile.</span>`;
      }
    } else if (ftUserStatus.eligibleToClaim || ftUserStatus.hasApprovedTopup) {
      // ── STATE 2: QUALIFYING TOP-UP APPROVED -> CLAIM ──
      actionBtn.disabled = false;
      actionBtn.className = "w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm tracking-wide uppercase transition-all duration-200 shadow-[0_4px_24px_rgba(245,158,11,0.5)] active:scale-95 cursor-pointer flex items-center justify-center gap-2 animate-pulse";
      actionText.textContent = "CLAIM";
      actionIcon.className = "fas fa-gift text-xs";
      if (statusHint) {
        statusHint.innerHTML = `<i class="fas fa-sparkles text-amber-400 mt-0.5 shrink-0 text-xs"></i> <span>Top-up of <strong>${ftUserStatus.qualifyingTopupAmount || 100}+ AX</strong> verified! Click <strong>CLAIM</strong> now to receive your rewards!</span>`;
      }
    } else {
      // ── STATE 1: NOT QUALIFIED YET -> GET IT ──
      actionBtn.disabled = false;
      actionBtn.className = "w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm tracking-wide uppercase transition-all duration-200 shadow-[0_4px_20px_rgba(245,158,11,0.35)] active:scale-95 cursor-pointer flex items-center justify-center gap-2";
      actionText.textContent = "GET IT";
      actionIcon.className = "fas fa-arrow-right text-xs";
      if (statusHint) {
        const minAX = ftOfferConfig.minTopup || 100;
        statusHint.innerHTML = `<i class="fas fa-info-circle text-amber-400 mt-0.5 shrink-0 text-xs"></i> <span>Deposit <strong>${minAX}+ AX Coins</strong> in Wallet. Once admin approves your top-up, click <strong>CLAIM</strong>!</span>`;
      }
    }
  }

  /**
   * Opens the First Topup Benefits Modal with entrance animation
   */
  window.openFirstTopupModal = function () {
    const modal = document.getElementById('mFirstTopupModal');
    const card = document.getElementById('mFirstTopupCard');
    if (!modal) return;

    // Reset error box
    const errBox = document.getElementById('ftErrorMsg');
    if (errBox) {
      errBox.textContent = '';
      errBox.classList.add('hidden');
    }

    // Refresh status from server
    fetchFirstTopupStatus(true);

    modal.classList.remove('hidden');
    if (card) {
      card.classList.remove('first-topup-modal-exit');
      card.classList.add('first-topup-modal-enter');
    }

    // Start video playback
    const video = document.getElementById('ftFrameVideo');
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
  };

  /**
   * Closes the First Topup Benefits Modal with exit animation
   */
  window.closeFirstTopupModal = function () {
    const modal = document.getElementById('mFirstTopupModal');
    const card = document.getElementById('mFirstTopupCard');
    if (!modal) return;

    if (card) {
      card.classList.remove('first-topup-modal-enter');
      card.classList.add('first-topup-modal-exit');
    }

    setTimeout(() => {
      modal.classList.add('hidden');
    }, 200);
  };

  /**
   * Handles action button click:
   * - "GET IT" -> Navigates to Wallet deposit screen
   * - "CLAIM" -> Executes server-side atomic claim transaction
   */
  window.handleFirstTopupAction = async function () {
    if (ftUserStatus.hasClaimed) return;

    // State 1: GET IT -> Open Wallet deposit
    if (!ftUserStatus.eligibleToClaim && !ftUserStatus.hasApprovedTopup) {
      window.closeFirstTopupModal();
      if (typeof window.switchTab === 'function') {
        window.switchTab('Wallet');
      }
      return;
    }

    // State 2: CLAIM
    if (isFirstTopupClaiming) return;

    const authUser = (typeof window.auth !== 'undefined' && window.auth?.currentUser)
      ? window.auth.currentUser
      : (window.currentAuthUser || null);

    if (!authUser) {
      showError('Please sign in to claim your First Topup rewards.');
      return;
    }

    isFirstTopupClaiming = true;
    const actionBtn = document.getElementById('btnFirstTopupAction');
    const actionText = document.getElementById('ftActionBtnText');
    const actionIcon = document.getElementById('ftActionBtnIcon');

    if (actionBtn) actionBtn.disabled = true;
    if (actionText) actionText.textContent = 'CLAIMING...';
    if (actionIcon) actionIcon.className = 'fas fa-spinner fa-spin text-xs';

    try {
      const token = await authUser.getIdToken();
      const endpoint = getApiEndpoint('first-topup-claim');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      let res;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ uid: authUser.uid })
        });
        if (!res.ok && !endpoint.startsWith(vercelBase)) {
          res = await fetch(`${vercelBase}/api/shop?action=first-topup-claim`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ uid: authUser.uid })
          });
        }
      } catch (err) {
        if (!endpoint.startsWith(vercelBase)) {
          res = await fetch(`${vercelBase}/api/shop?action=first-topup-claim`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ uid: authUser.uid })
          });
        } else {
          throw err;
        }
      }

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || !data.success) {
        const msg = (data && data.message) || (data && data.error) || 'Failed to claim First Topup reward.';
        showError(msg);
        return;
      }

      // ── CLAIM SUCCESSFUL! ATOMICALLY UPDATE CLIENT STATE ──
      ftUserStatus.hasClaimed = true;
      ftUserStatus.eligibleToClaim = false;

      // Update active user profile
      const profile = (typeof window.getActiveUserProfile === 'function')
        ? window.getActiveUserProfile()
        : (window.userProfile || window.currentUser);

      if (profile) {
        if (typeof data.newBalance === 'number') {
          profile.balance = data.newBalance;
        } else {
          profile.balance = Number(profile.balance || 0) + Number(data.bonusCoins || 150);
        }

        profile.firstTopupClaimed = true;
        profile.firstTopupClaimedAt = new Date().toISOString();
        profile.hasFrame = true;
        profile.frameEquipped = true;
        profile.equippedFrameId = 'pheonix';

        if (data.pheonixFrame) {
          profile.pheonixFrame = data.pheonixFrame;
        } else {
          profile.pheonixFrame = {
            id: 'pheonix',
            name: 'Pheonix',
            asset: 'public/frame4.webm',
            permanentUnlocked: true,
            status: 'permanent',
            equipped: true,
            source: 'first_topup_reward'
          };
        }

        if (!profile.ownedShopItems) profile.ownedShopItems = {};
        profile.ownedShopItems['pheonix'] = {
          id: 'pheonix',
          name: 'Pheonix',
          price: 0,
          source: 'first_topup_reward'
        };

        if (profile.goldenWingsFrame) profile.goldenWingsFrame.equipped = false;
        if (profile.eagleFrame) profile.eagleFrame.equipped = false;
      }

      // Update coin displays across UI
      const homeCoinsEl = document.getElementById('homeCoinsVal');
      const shopCoinsEl = document.getElementById('shopCoinsVal');
      const newBalFormatted = profile?.balance?.toLocaleString() || '0';
      if (homeCoinsEl) homeCoinsEl.textContent = newBalFormatted;
      if (shopCoinsEl) shopCoinsEl.textContent = newBalFormatted;

      // Refresh Shop UI
      if (typeof window.updateShopItemsUI === 'function') {
        window.updateShopItemsUI();
      }

      // Refresh Customize Profile Avatar Frames
      if (typeof window.renderCustomizeProfileAvatarFrames === 'function') {
        window.renderCustomizeProfileAvatarFrames();
      }

      // Refresh View Profile avatar
      if (typeof window.renderViewProfileAvatar === 'function' && profile) {
        window.renderViewProfileAvatar(profile);
      }

      // Re-render modal to CLAIMED state
      renderFirstTopupModalUI();

      // Trigger Celebration Toast
      if (typeof window.showToast === 'function') {
        window.showToast(`🎉 Claimed 150 AX Coins and the Pheonix Avatar Frame!`);
      } else {
        alert(`🎉 Congratulations!\n\nYou have received 150 AX Coins and permanently unlocked the Pheonix Avatar Frame!`);
      }
    } catch (claimErr) {
      console.error('[First Topup Claim Error]:', claimErr);
      showError(claimErr.message || 'An error occurred while claiming your reward.');
    } finally {
      isFirstTopupClaiming = false;
    }
  };

  function showError(msg) {
    const errBox = document.getElementById('ftErrorMsg');
    if (errBox) {
      errBox.textContent = msg;
      errBox.classList.remove('hidden');
    } else {
      alert(msg);
    }
    renderFirstTopupModalUI();
  }

  // Initialize listeners
  function init() {
    if (hasInitialized) return;
    hasInitialized = true;

    // Auto-sync status
    fetchFirstTopupStatus();

    // Listen to Firebase auth changes if available
    if (typeof window.auth !== 'undefined' && typeof window.auth.onAuthStateChanged === 'function') {
      window.auth.onAuthStateChanged(() => {
        fetchFirstTopupStatus(true);
      });
    }

    // Refresh when profile is loaded or changed
    window.addEventListener('userProfileUpdated', () => {
      fetchFirstTopupStatus();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exports
  window.firstTopupManager = {
    fetchFirstTopupStatus,
    syncFirstTopupUI,
    openModal: window.openFirstTopupModal,
    closeModal: window.closeFirstTopupModal,
    handleAction: window.handleFirstTopupAction
  };
})();
