// ==========================================
// ARENAX CHAT & DIRECT MESSAGING (DMs) SYSTEM
// ==========================================


// Module variables & listeners
let friendReqsUnsub = null;
let friendsListUnsub = null;
let currentDMUid = null;
let currentDMUnsub = null;
let globalChatUnsub = null;
let globalChatTypingUnsub = null;
let globalTypingTimeout = null;
let unreadGlobal = 0;
let activeChatSubTab = 'global';
let supportUnsub = null;
let supportRequestUnsub = null;
let currentSupportMessages = [];

// ── FRIEND DIRECT MESSAGES LOGIC ──
function loadFriendSystem() {
  const profile = userProfile || guestProfile;
  if (!profile || guestProfile) return;

  if (friendReqsUnsub) {
    try { friendReqsUnsub(); } catch(e){}
    friendReqsUnsub = null;
  }
  if (friendsListUnsub) {
    try { friendsListUnsub(); } catch(e){}
    friendsListUnsub = null;
  }

  // Real-time listen to friendRequests
  friendReqsUnsub = onSnapshot(collection(db, 'users', profile.uid, 'friendRequests'), (snap) => {
    const listEl = $('friendReqsList');
    const modalListEl = $('friendReqsListModal');
    if (listEl) listEl.innerHTML = '';
    if (modalListEl) modalListEl.innerHTML = '';
    
    const reqsCount = snap.size;
    const reqBadge = $('friendRequestsCountBadge');
    const modalBadge = $('modalReqsBadge');
    
    if (reqsCount > 0) {
      if (reqBadge) {
        reqBadge.textContent = reqsCount;
        reqBadge.classList.remove('hidden');
      }
      if (modalBadge) modalBadge.textContent = reqsCount;
      $('friendReqsWrap')?.classList.remove('hidden');
      $('friendReqsWrapModal')?.classList.remove('hidden');
    } else {
      if (reqBadge) reqBadge.classList.add('hidden');
      $('friendReqsWrap')?.classList.add('hidden');
      $('friendReqsWrapModal')?.classList.add('hidden');
    }

    if (snap.empty) return;

    snap.forEach(d => {
      const r = d.data();
      const item = document.createElement('div');
      item.className = 'p-3 bg-ele border border-bdr rounded-xl flex items-center justify-between text-xs font-semibold';
      item.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
          <img src="${r.av || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + r.uid}" class="w-8 h-8 rounded-full border border-bdr shrink-0 object-cover"/>
          <div class="truncate">
            <div class="text-white font-bold leading-tight truncate">${r.name}</div>
            <div class="text-[9px] text-t3 font-medium truncate">${r.handle}</div>
          </div>
        </div>
        <div class="flex gap-1.5 shrink-0">
          <button class="b-acc w-7 h-7 bg-green/10 hover:bg-green/20 text-green rounded-full border border-green/20 transition flex items-center justify-center text-[10px] cursor-pointer" data-uid="${r.uid}" data-name="${r.name}" data-handle="${r.handle}" data-av="${r.av}"><i class="fas fa-check"></i></button>
          <button class="b-dec w-7 h-7 bg-red/10 hover:bg-red/20 text-red rounded-full border border-red/20 transition flex items-center justify-center text-[10px] cursor-pointer" data-uid="${r.uid}"><i class="fas fa-times"></i></button>
        </div>
      `;

      item.querySelector('.b-acc')?.addEventListener('click', (e) => acceptFriendRequest(e.currentTarget.dataset));
      item.querySelector('.b-dec')?.addEventListener('click', (e) => declineFriendRequest(e.currentTarget.dataset.uid));
      
      if (listEl) listEl.appendChild(item);
      if (modalListEl) modalListEl.appendChild(item.cloneNode(true));
    });
  }, (err) => {
    console.warn("Friend requests listen warning:", err);
  });

  // Real-time listen to friends list
  friendsListUnsub = onSnapshot(collection(db, 'users', profile.uid, 'friends'), (snap) => {
    const listEl = $('friendsList');
    const modalListEl = $('friendsModalList');

    const friendsCount = snap.size;
    const countBadge = $('friendsCountBadge');
    if (countBadge) {
      countBadge.textContent = friendsCount;
    }

    if (snap.empty) {
      if (listEl) {
        listEl.innerHTML = `
          <div class="p-8 bg-card border border-bdr rounded-xl text-center text-xs text-t3">
            <i class="fas fa-user-friends text-2xl mb-2"></i>
            <p>No active friends yet. Click the + button to search and add friends!</p>
          </div>`;
      }
      if (modalListEl) {
        modalListEl.innerHTML = `
          <div class="p-8 bg-card border border-bdr rounded-xl text-center text-xs text-t3">
            <i class="fas fa-user-friends text-2xl mb-2"></i>
            <p>No friends added yet. Search players using the + button.</p>
          </div>`;
      }
      return;
    }

    const rawFriends = [];
    snap.forEach(d => {
      rawFriends.push(d.data());
    });

    const renderFriendItems = (friendsArr) => {
      if (listEl) listEl.innerHTML = '';
      if (modalListEl) modalListEl.innerHTML = '';

      friendsArr.forEach(f => {
        const item = document.createElement('div');
        item.className = 'p-3 bg-card border border-bdr hover:border-gold rounded-xl flex items-center gap-3.5 cursor-pointer transition relative group';
        
        const unreadCount = f.unreadCount || Math.floor(Math.random() * 3) + 1;
        const dateStr = f.lastMsgDate || '30/07/2026';
        const lastMsgText = f.lastMsg || 'Tap to start direct messaging...';
        const isOfficial = f.isOfficial || f.name?.toLowerCase().includes('bot') || f.name?.toLowerCase().includes('official');
        const displayHandle = 'ID: ' + getNumericPlayerId(f.uid, f.handle);

        item.innerHTML = `
          <div class="relative shrink-0">
            <img src="${f.av || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + f.uid}" class="w-11 h-11 rounded-full border border-bdr object-cover"/>
            <span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center border border-card shadow-xs">
              ${unreadCount}
            </span>
          </div>
          <div class="min-w-0 flex-1 space-y-0.5">
            <div class="flex items-center justify-between gap-2">
              <div class="text-xs font-bold text-white truncate flex items-center gap-1">
                <span>${f.name}</span>
                ${isOfficial ? '<span class="bg-cyan-400/20 text-cyan-400 font-semibold text-[8px] px-1.5 py-0.2 rounded-full border border-cyan-400/30">Official</span>' : ''}
                ${window.getBlueTickBadgeHtml ? window.getBlueTickBadgeHtml(f) : ''}
              </div>
              <span class="text-[9px] text-t3 shrink-0 font-medium">${dateStr}</span>
            </div>
            <p class="text-[11px] text-t3 truncate leading-snug font-normal">${lastMsgText}</p>
          </div>
        `;

        item.addEventListener('click', () => openFriendDM(f));
        if (listEl) listEl.appendChild(item);

        // Render into friends modal list item
        if (modalListEl) {
          const mItem = document.createElement('div');
          mItem.className = 'p-3 bg-card border border-bdr hover:border-gold rounded-xl flex items-center justify-between gap-3 text-xs transition cursor-pointer';
          mItem.innerHTML = `
            <div class="flex items-center gap-3 min-w-0">
              <img src="${f.av || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + f.uid}" class="w-10 h-10 rounded-full border border-bdr object-cover shrink-0"/>
              <div class="min-w-0">
                <div class="font-bold text-white truncate">${f.name}</div>
                <div class="text-[10px] text-t3 truncate font-mono">${displayHandle}</div>
              </div>
            </div>
            <button class="px-3 py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
              <i class="fas fa-paper-plane"></i> Chat
            </button>
          `;
          mItem.addEventListener('click', () => {
            $('mFriendsModal')?.classList.add('hidden');
            openFriendDM(f);
          });
          modalListEl.appendChild(mItem);
        }
      });
    };

    // Render immediately so mobile users see friends instantly!
    renderFriendItems(rawFriends);

    // Asynchronously enrich in background
    Promise.all(rawFriends.map(async (f) => {
      try {
        if (f.uid) {
          const uSnap = await getDoc(doc(db, 'users', f.uid));
          if (uSnap.exists()) {
            const uData = uSnap.data();
            return {
              ...f,
              name: uData.name || f.name,
              av: uData.av || f.av,
              handle: uData.handle || f.handle
            };
          }
        }
      } catch (e) {}
      return f;
    })).then((enriched) => {
      renderFriendItems(enriched);
    }).catch(e => console.warn("Friend enrich warning:", e));
  }, (err) => {
    console.warn("Friends list listen warning:", err);
  });
}

// Accept and Decline Friend Requests
async function acceptFriendRequest(data) {
  const profile = userProfile || guestProfile;
  try {
    // Add to my friend collection
    await setDoc(doc(db, 'users', profile.uid, 'friends', data.uid), {
      uid: data.uid,
      name: data.name,
      handle: data.handle,
      av: data.av,
      addedAt: serverTimestamp()
    });
    // Add myself to their friend list
    await setDoc(doc(db, 'users', data.uid, 'friends', profile.uid), {
      uid: profile.uid,
      name: profile.name,
      handle: profile.handle,
      av: profile.av,
      addedAt: serverTimestamp()
    });
    // Delete request log
    await deleteDoc(doc(db, 'users', profile.uid, 'friendRequests', data.uid));

    // Send push notification to the original requester that their request was accepted
    if (typeof window.sendPersonalNotification === 'function') {
      window.sendPersonalNotification(data.uid, {
        title: "Friend Request Accepted ✅",
        body: `${profile.name || 'Someone'} accepted your friend request`,
        icon: profile.av || 'arenax_logo.jpg',
        url: 'https://arenax.cyou/#friends',
        data: { type: 'friend_accepted', friendUid: profile.uid }
      }).catch(console.warn);
    }

    alert(`Friendship accepted with ${data.name}! ✓`);
  } catch (err) {
    alert(err.message);
  }
}

async function declineFriendRequest(uid) {
  const profile = userProfile || guestProfile;
  try {
    await deleteDoc(doc(db, 'users', profile.uid, 'friendRequests', uid));
  } catch (err) {
    console.error(err);
  }
}

// Open Friends Modal (Human icon button)
$('btnOpenFriendsModal')?.addEventListener('click', () => {
  if (guestProfile) {
    alert('Guest profiles are restricted. Register a real account!');
    return;
  }
  $('mFriendsModal')?.classList.remove('hidden');
});

$('bCloseFriendsModal')?.addEventListener('click', () => $('mFriendsModal')?.classList.add('hidden'));
$('bCloseFriendsModalDone')?.addEventListener('click', () => $('mFriendsModal')?.classList.add('hidden'));

// Ranking Leaderboard Modal Controls
// Tasks Modal Controls
window.openTasksModal = function() {
  const modal = $('mTasksModal');
  if (modal) modal.classList.remove('hidden');
  updateTasksFrameButtonState();
  if (typeof window.reactOpenTasksModal === 'function') {
    try { window.reactOpenTasksModal(); } catch(e) {}
  }
};
window.closeTasksModal = function() {
  const modal = $('mTasksModal');
  if (modal) modal.classList.add('hidden');
};
function openTasksModal() {
  window.openTasksModal();
}
function closeTasksModal() {
  window.closeTasksModal();
}

window.getActiveUserProfile = function() {
  let profile = window.userProfile || window.guestProfile || window.currentUser;
  if (!profile) {
    if (typeof auth !== 'undefined' && auth && auth.currentUser) {
      profile = {
        uid: auth.currentUser.uid,
        id: auth.currentUser.uid,
        name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Player',
        av: auth.currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${auth.currentUser.uid}`,
        hasFrame: localStorage.getItem('user_has_frame') === 'true',
        frameEquipped: localStorage.getItem('user_frame_equipped') === 'true'
      };
      window.currentUser = profile;
      window.userProfile = profile;
    } else {
      const gid = localStorage.getItem('guest_id') || Math.floor(100000 + Math.random() * 900000);
      localStorage.setItem('guest_id', String(gid));
      profile = {
        uid: `guest_${gid}`,
        id: `guest_${gid}`,
        name: 'Guest Player',
        handle: `@guest#${gid}`,
        av: `https://api.dicebear.com/7.x/bottts/svg?seed=g${gid}`,
        hasFrame: localStorage.getItem('user_has_frame') === 'true',
        frameEquipped: localStorage.getItem('user_frame_equipped') === 'true'
      };
      window.currentUser = profile;
      window.guestProfile = profile;
    }
  }
  return profile;
};

function updateTasksFrameButtonState() {
  const profile = window.getActiveUserProfile();
  if (profile) {
    const btn = $('btnTaskClaimFrame');
    const av = $('taskModalUserAv');
    if (av && profile.av) av.src = profile.av;

    const isUnlocked = !!(profile.hasFrame || localStorage.getItem('user_has_frame') === 'true');
    const isEquipped = !!(profile.frameEquipped || localStorage.getItem('user_frame_equipped') === 'true');

    if (btn) {
      if (isUnlocked) {
        if (isEquipped) {
          btn.textContent = 'Equipped ✓';
          btn.className = 'px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer';
        } else {
          btn.textContent = 'Equip Frame';
          btn.className = 'px-3 py-1.5 bg-[#f0c040] text-[#0a0c12] hover:bg-[#e8b830] rounded-lg text-xs font-bold transition shrink-0 cursor-pointer';
        }
      } else {
        btn.textContent = 'Claim Frame';
        btn.className = 'px-3 py-1.5 bg-[#f0c040] text-[#0a0c12] hover:bg-[#e8b830] rounded-lg text-xs font-bold transition shrink-0 shadow-[0_0_12px_rgba(240,192,64,0.4)] cursor-pointer';
      }
    }
  }
}

window.updateCustomizeFrameButtonState = function() {
  const profile = window.getActiveUserProfile();
  if (!profile) return;

  const btn = $('btnCustModalToggleFrame');
  const statusTxt = $('custModalFrameStatusText');
  const av = $('custModalFrameAvatar');
  
  if (av && profile.av) av.src = profile.av;

  const isUnlocked = !!(profile.hasFrame || localStorage.getItem('user_has_frame') === 'true');
  const isEquipped = !!(profile.frameEquipped || localStorage.getItem('user_frame_equipped') === 'true');

  if (btn) {
    if (isUnlocked) {
      if (isEquipped) {
        btn.textContent = 'Unequip Frame';
        btn.className = 'px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer';
        if (statusTxt) statusTxt.textContent = 'Currently Active across Profile ✓';
      } else {
        btn.textContent = 'Equip Frame';
        btn.className = 'px-3 py-1.5 bg-[#f0c040] text-[#0a0c12] hover:bg-[#e8b830] rounded-lg text-xs font-bold transition shrink-0 cursor-pointer';
        if (statusTxt) statusTxt.textContent = 'Unlocked & Ready to Equip';
      }
    } else {
      btn.textContent = 'Get Frame (Tasks)';
      btn.className = 'px-3 py-1.5 bg-[#f0c040]/20 text-[#f0c040] border border-[#f0c040]/30 hover:bg-[#f0c040]/30 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer';
      if (statusTxt) statusTxt.textContent = 'Locked - Complete 1 Day Login in Tasks';
    }
  }

  if (window.updateAllAvatarFrames) window.updateAllAvatarFrames();
};

window.handleClaimOrToggleFrameFromVanilla = async function() {
  const profile = window.getActiveUserProfile();

  const btn1 = $('btnTaskClaimFrame');
  const btn2 = $('btnCustModalToggleFrame');
  if (btn1) btn1.disabled = true;
  if (btn2) btn2.disabled = true;

  try {
    const isUnlocked = !!(profile.hasFrame || localStorage.getItem('user_has_frame') === 'true');
    const isEquipped = !!(profile.frameEquipped || localStorage.getItem('user_frame_equipped') === 'true');

    if (!isUnlocked) {
      // Claim
      profile.hasFrame = true;
      profile.frameEquipped = true;
      localStorage.setItem('user_has_frame', 'true');
      localStorage.setItem('user_frame_equipped', 'true');
      localStorage.setItem('user_frame_expiry', String(Date.now() + 3 * 24 * 60 * 60 * 1000));

      if (profile.uid && !profile.uid.startsWith('guest_') && typeof db !== 'undefined' && typeof doc !== 'undefined' && typeof updateDoc !== 'undefined') {
        await updateDoc(doc(db, 'users', profile.uid), {
          hasFrame: true,
          frameEquipped: true,
          frameExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        }).catch(e => console.warn(e));
      }

      if (typeof spawnConfetti === 'function') spawnConfetti(['#f0c040', '#a78bfa', '#38bdf8']);
      if (typeof showToastNotification === 'function') showToastNotification("VIP Frame Unlocked! ✨", "You claimed the 3-Day VIP Avatar Frame!");
    } else {
      // Toggle
      const nextEquipped = !isEquipped;
      profile.frameEquipped = nextEquipped;
      localStorage.setItem('user_frame_equipped', String(nextEquipped));

      if (profile.uid && !profile.uid.startsWith('guest_') && typeof db !== 'undefined' && typeof doc !== 'undefined' && typeof updateDoc !== 'undefined') {
        await updateDoc(doc(db, 'users', profile.uid), {
          frameEquipped: nextEquipped
        }).catch(e => console.warn(e));
      }

      if (typeof showToastNotification === 'function') {
        showToastNotification(
          nextEquipped ? "Frame Equipped! ✨" : "Frame Unequipped",
          nextEquipped ? "VIP Frame active across profile!" : "Avatar frame unequipped."
        );
      }
    }

    if (window.updateAllAvatarFrames) window.updateAllAvatarFrames();
    if (typeof updateTasksFrameButtonState === 'function') updateTasksFrameButtonState();
    if (typeof window.updateCustomizeFrameButtonState === 'function') window.updateCustomizeFrameButtonState();
    if (typeof boot === 'function') boot();
  } catch (err) {
    console.error("Frame action error:", err);
    alert("Action failed: " + (err.message || err));
  } finally {
    if (btn1) btn1.disabled = false;
    if (btn2) btn2.disabled = false;
  }
};

window.cachedRankingPlayers = null;
window.isPreloadingRanking = false;

window.preloadRankingData = async function(forceRefresh = false) {
  if (window.isPreloadingRanking && !forceRefresh) return window.cachedRankingPlayers;
  if (!forceRefresh && window.cachedRankingPlayers && window.cachedRankingPlayers.length > 0) {
    if ($('homeRankingAv') && window.cachedRankingPlayers[0]) {
      $('homeRankingAv').src = window.cachedRankingPlayers[0].av;
    }
    return window.cachedRankingPlayers;
  }

  window.isPreloadingRanking = true;
  try {
    const qUsers = query(collection(db, 'users'), limit(100));
    const snap = await getDocs(qUsers);
    let players = [];
    snap.forEach((doc) => {
      const d = doc.data();
      players.push({
        uid: doc.id,
        name: d.name || d.displayName || d.username || 'Player',
        balance: Number(d.balance || d.coins || 0),
        av: d.av || d.avatar || d.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${doc.id}`,
        premium: !!d.premium,
        goldenNameEnabled: d.goldenNameEnabled !== false,
        nameColor: d.nameColor || ''
      });
    });

    if (window.userProfile) {
      const uId = window.userProfile.uid || window.userProfile.id;
      const exists = players.some((p) => p.uid === uId);
      if (!exists) {
        players.push({
          uid: uId || 'me',
          name: window.userProfile.name || 'You',
          balance: Number(window.userProfile.balance || 0),
          av: window.userProfile.av || `https://api.dicebear.com/7.x/bottts/svg?seed=me`,
          premium: !!window.userProfile.premium,
          goldenNameEnabled: window.userProfile.goldenNameEnabled !== false,
          nameColor: window.userProfile.nameColor || ''
        });
      } else {
        players = players.map(p => p.uid === uId ? {
          ...p,
          name: window.userProfile.name || p.name,
          balance: Number(window.userProfile.balance ?? p.balance),
          av: window.userProfile.av || p.av,
          premium: window.userProfile.premium !== undefined ? window.userProfile.premium : p.premium,
          goldenNameEnabled: window.userProfile.goldenNameEnabled !== undefined ? window.userProfile.goldenNameEnabled : p.goldenNameEnabled,
          nameColor: window.userProfile.nameColor || p.nameColor
        } : p);
      }
    }

    players.sort((a, b) => b.balance - a.balance);
    window.cachedRankingPlayers = players;

    if (players.length > 0 && $('homeRankingAv')) {
      $('homeRankingAv').src = players[0].av;
    }

    return players;
  } catch (err) {
    console.warn("Error preloading ranking data:", err);
    return window.cachedRankingPlayers || [];
  } finally {
    window.isPreloadingRanking = false;
  }
};

setTimeout(() => {
  if (typeof window.preloadRankingData === 'function') {
    window.preloadRankingData().catch(() => {});
  }
}, 300);

window.openRankingModal = function() {
  const modal = $('mRankingModal');
  if (modal) modal.classList.remove('hidden');
  renderVanillaRankingList();
};

window.closeRankingModal = function() {
  const modal = $('mRankingModal');
  if (modal) modal.classList.add('hidden');
};

function openRankingModal() {
  window.openRankingModal();
}

window.setRkCategory = function(cat) {
  const btnCoins = $('rkTabCoins');
  const btnWeekly = $('rkTabWeekly');
  if (cat === 'AX Coins') {
    if (btnCoins) btnCoins.className = "px-6 py-1.5 rounded-full text-xs font-bold transition bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg";
    if (btnWeekly) btnWeekly.className = "px-6 py-1.5 rounded-full text-xs font-bold transition text-white/70 hover:text-white";
  } else {
    if (btnWeekly) btnWeekly.className = "px-6 py-1.5 rounded-full text-xs font-bold transition bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg";
    if (btnCoins) btnCoins.className = "px-6 py-1.5 rounded-full text-xs font-bold transition text-white/70 hover:text-white";
  }
};

window.renderRankingUI = function(players) {
  const listContainer = $('rkListContainer');
  if (!listContainer || !players) return;

  if (players.length > 0 && $('homeRankingAv')) {
    $('homeRankingAv').src = players[0].av;
  }

  const p1 = players[0] || { name: 'No Player', balance: 0, av: 'https://api.dicebear.com/7.x/bottts/svg?seed=p1' };
  const p2 = players[1] || { name: '—', balance: 0, av: 'https://api.dicebear.com/7.x/bottts/svg?seed=p2' };
  const p3 = players[2] || { name: '—', balance: 0, av: 'https://api.dicebear.com/7.x/bottts/svg?seed=p3' };

  const applyRkNameStyle = (el, p) => {
    if (!el) return;
    if (p.premium && (p.goldenNameEnabled !== false)) {
      el.classList.add('golden-name-shimmer');
      el.style.background = '';
      el.style.webkitBackgroundClip = '';
      el.style.webkitTextFillColor = '';
      el.style.fontWeight = '';
      el.style.fontStyle = 'italic';
    } else if (p.premium && p.nameColor) {
      el.classList.remove('golden-name-shimmer');
      el.style.background = 'none';
      el.style.webkitBackgroundClip = 'initial';
      el.style.webkitTextFillColor = 'initial';
      el.style.color = p.nameColor;
      el.style.fontWeight = '';
      el.style.fontStyle = '';
    } else {
      el.classList.remove('golden-name-shimmer');
      el.style.background = 'none';
      el.style.webkitBackgroundClip = 'initial';
      el.style.webkitTextFillColor = 'initial';
      el.style.color = '';
      el.style.fontWeight = '';
      el.style.fontStyle = '';
    }
  };

  if ($('rk1Name')) {
    $('rk1Name').textContent = p1.name;
    applyRkNameStyle($('rk1Name'), p1);
    if (p1.uid) {
      $('rk1Name').onclick = () => window.openPlayerProfileCard(p1.uid);
      $('rk1Name').style.cursor = 'pointer';
    }
  }
  if ($('rk1Bal')) $('rk1Bal').textContent = p1.balance.toLocaleString() + ' AX';
  if ($('rk1Av')) {
    $('rk1Av').src = p1.av;
    if (p1.uid) {
      $('rk1Av').onclick = () => window.openPlayerProfileCard(p1.uid);
      $('rk1Av').style.cursor = 'pointer';
    }
  }

  if ($('rk2Name')) {
    $('rk2Name').textContent = p2.name;
    applyRkNameStyle($('rk2Name'), p2);
    if (p2.uid) {
      $('rk2Name').onclick = () => window.openPlayerProfileCard(p2.uid);
      $('rk2Name').style.cursor = 'pointer';
    }
  }
  if ($('rk2Bal')) $('rk2Bal').textContent = p2.balance.toLocaleString() + ' AX';
  if ($('rk2Av')) {
    $('rk2Av').src = p2.av;
    if (p2.uid) {
      $('rk2Av').onclick = () => window.openPlayerProfileCard(p2.uid);
      $('rk2Av').style.cursor = 'pointer';
    }
  }

  if ($('rk3Name')) {
    $('rk3Name').textContent = p3.name;
    applyRkNameStyle($('rk3Name'), p3);
    if (p3.uid) {
      $('rk3Name').onclick = () => window.openPlayerProfileCard(p3.uid);
      $('rk3Name').style.cursor = 'pointer';
    }
  }
  if ($('rk3Bal')) $('rk3Bal').textContent = p3.balance.toLocaleString() + ' AX';
  if ($('rk3Av')) {
    $('rk3Av').src = p3.av;
    if (p3.uid) {
      $('rk3Av').onclick = () => window.openPlayerProfileCard(p3.uid);
      $('rk3Av').style.cursor = 'pointer';
    }
  }

  listContainer.innerHTML = '';
  if (players.length <= 3) {
    listContainer.innerHTML = `<div class="text-center text-gray-400 py-8 text-xs font-semibold">No additional ranked players yet</div>`;
  } else {
    for (let i = 3; i < players.length; i++) {
      const p = players[i];
      const rankNum = i + 1;
      const item = document.createElement('div');
      item.className = "flex items-center justify-between p-3 rounded-2xl bg-gray-50/90 hover:bg-gray-100 border border-gray-100 transition cursor-pointer";
      if (p.uid) {
        item.onclick = () => window.openPlayerProfileCard(p.uid);
      }
      const isGolden = (p.premium && (p.goldenNameEnabled !== false));
      const nameClassAttr = isGolden ? 'golden-name-shimmer' : '';
      const nameStyleAttr = isGolden
        ? 'style="font-style: italic;"'
        : (p.premium && p.nameColor)
        ? `style="color: ${p.nameColor};"`
        : '';

      item.innerHTML = `
        <div class="flex items-center gap-3.5 min-w-0">
          <span class="font-extrabold text-sm text-gray-400 w-5 text-center shrink-0">${rankNum}</span>
          <img src="${p.av}" alt="${p.name}" class="w-11 h-11 rounded-full object-cover border border-gray-200 shrink-0 shadow-xs hover:scale-105 transition cursor-pointer"/>
          <div class="min-w-0">
            <div class="font-bold text-sm text-gray-900 truncate ${nameClassAttr}" ${nameStyleAttr}>${p.name}</div>
            <div class="text-[11px] text-gray-400 font-medium truncate mt-0.5">Rank #${rankNum} • Player</div>
          </div>
        </div>
        <div class="bg-gradient-to-r from-amber-50 to-yellow-100/80 border border-amber-200/90 text-amber-900 px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shrink-0 shadow-xs">
          <i class="fas fa-coins text-amber-500 text-xs"></i>
          <span>${p.balance.toLocaleString()} AX</span>
        </div>
      `;
      listContainer.appendChild(item);
    }
  }
};

async function renderVanillaRankingList() {
  if (window.cachedRankingPlayers && window.cachedRankingPlayers.length > 0) {
    window.renderRankingUI(window.cachedRankingPlayers);
    window.preloadRankingData(true).then(freshPlayers => {
      if (freshPlayers && freshPlayers.length > 0) {
        window.renderRankingUI(freshPlayers);
      }
    });
    return;
  }

  const players = await window.preloadRankingData();
  if (players && players.length > 0) {
    window.renderRankingUI(players);
  }
}

// Add friend modal trigger search (+ button)
$('btnAddFriend')?.addEventListener('click', () => {
  if (guestProfile) {
    alert('Guest profiles are restricted from finding players. Register a real account!');
    return;
  }
  $('friendHandleInp').value = '';
  $('friendSearchResult').innerHTML = '';
  $('bSendFriendReq')?.classList.add('hidden');
  $('mAddFriend')?.classList.remove('hidden');
});

$('bCloseAddFriend')?.addEventListener('click', () => $('mAddFriend')?.classList.add('hidden'));
$('bCloseAddFriendTop')?.addEventListener('click', () => $('mAddFriend')?.classList.add('hidden'));

// ── GLOBAL CHAT SYSTEM LOGIC ──

function initGlobalChat() {
  if (globalChatUnsub) globalChatUnsub();
  if (globalChatTypingUnsub) globalChatTypingUnsub();

  const profile = userProfile || guestProfile;
  if (!profile) return;

  const qGlobal = query(
    collection(db, 'global_chat'),
    orderBy('createdAt', 'desc'),
    limit(60)
  );

  globalChatUnsub = onSnapshot(qGlobal, (snap) => {
    const list = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
    // Reverse to show oldest first at top, newest at bottom
    list.reverse();

    // Trigger unread indicator if chat is not open or not on global subtab
    if ((window.activeMainTab || 'Profile') !== 'Chat' || activeChatSubTab !== 'global') {
      unreadGlobal = true;
      updateChatUnreadDot();
      updateSubGlobalDot();
    }

    renderGlobalMessages(list);
  }, (err) => {
    console.warn("Global chat listen error:", err);
  });

  // Listen for typing users
  const qTyping = query(
    collection(db, 'global_chat_typing'),
    where('typing', '==', true)
  );

  globalChatTypingUnsub = onSnapshot(qTyping, (snap) => {
    const typingNames = [];
    const now = Date.now();
    snap.forEach((d) => {
      const data = d.data();
      const currentUid = (userProfile || guestProfile)?.uid;
      // Skip ourselves, and skip older than 6 seconds
      if (d.id !== currentUid && (now - (data.timestamp || 0)) < 6000) {
        typingNames.push(data.name || 'Anonymous');
      }
    });

    const indicator = $('globalTypingIndicator');
    const textEl = $('globalTypingText');
    if (indicator && textEl) {
      if (typingNames.length > 0) {
        textEl.textContent = `${typingNames.join(', ')} ${typingNames.length === 1 ? 'is' : 'are'} typing...`;
        indicator.classList.remove('hidden');
      } else {
        indicator.classList.add('hidden');
      }
    }
  }, (err) => {
    console.warn("Global chat typing listener error (expected for guests):", err);
  });
}

function renderGlobalMessages(list) {
  const container = $('globalChatMsgs');
  if (!container) return;
  container.innerHTML = '';

  const currentUid = (userProfile || guestProfile)?.uid;

  if (!list || list.length === 0) {
    container.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-t3 text-center p-6">
        <i class="fas fa-globe text-3xl mb-1"></i>
        <p class="text-xs">No messages in Global Chat yet.</p>
        <p class="text-[10px]">Be the first to say hello!</p>
      </div>
    `;
    return;
  }

  list.forEach((msg) => {
    const msgDiv = document.createElement('div');

    // 1. Check for Public Admin Deletion
    if (msg.isDeletedByAdmin) {
      msgDiv.className = 'flex justify-center w-full my-2 px-4';
      msgDiv.innerHTML = `
        <div class="flex items-center gap-2 bg-red-500/10 border border-red-500/25 px-4 py-2 rounded-xl text-[11px] text-red-400 font-bold uppercase tracking-wider font-sans">
          <i class="fas fa-shield-halved text-xs animate-pulse"></i> This message was deleted by administration.
        </div>
      `;
      container.appendChild(msgDiv);
      return;
    }

    // 2. Check for System Announcement
    if (msg.isSystemAnnouncement) {
      msgDiv.className = 'flex justify-center w-full my-3 px-4';
      msgDiv.innerHTML = `
        <div class="flex flex-col items-center text-center bg-amber-500/15 border border-amber-500/25 px-5 py-3 rounded-2xl max-w-[90%] text-xs text-amber-400 font-bold shadow-lg shadow-amber-500/5">
          <div class="flex items-center gap-2 text-[10px] uppercase tracking-wider font-extrabold mb-1.5 text-amber-400">
            <i class="fas fa-bullhorn text-xs"></i> Official Announcement
          </div>
          <p class="font-medium text-white leading-relaxed select-text">${msg.text || ''}</p>
        </div>
      `;
      container.appendChild(msgDiv);
      return;
    }

    // 3. Check for Admin Message
    if (msg.isAdminMessage) {
      msgDiv.className = 'flex gap-2.5 max-w-[85%] mr-auto';
      msgDiv.innerHTML = `
        <div class="w-7 h-7 rounded-full bg-red-500/15 border border-red-500/35 flex items-center justify-center shrink-0 shadow-md">
          <i class="fas fa-shield-alt text-red-500 text-xs"></i>
        </div>
        <div>
          <div class="text-[9px] text-red-400 font-extrabold mb-0.5 tracking-wider uppercase flex items-center gap-1.5">
            ${msg.userName || 'System Admin'}${window.getBlueTickBadgeHtml(msg)} <span class="bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase leading-none">Staff</span>
          </div>
          <div class="p-3 rounded-xl text-xs leading-relaxed bg-[#1b1216] border border-red-500/30 text-white rounded-tl-none font-semibold shadow-lg shadow-red-500/5">
            ${msg.text || ''}
          </div>
        </div>
      `;
      container.appendChild(msgDiv);
      return;
    }

    // 4. Regular Chat Message or Voice Room Invite
    const isMe = msg.userId === currentUid;
    msgDiv.className = `flex gap-2.5 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`;
    
    const isGoldFootball = msg.avatarFrame === 'gold_football';
    const avatarBorder = isGoldFootball 
      ? 'border-2 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-pulse' 
      : 'border border-bdr';

    if (msg.isVoiceRoomInvite) {
      msgDiv.innerHTML = `
        <img
          src="${msg.userAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=ax1'}"
          alt="Avatar"
          class="w-7 h-7 rounded-full bg-panel shrink-0 object-cover ${avatarBorder} cursor-pointer hover:scale-105 transition duration-150"
          onclick="openPlayerProfileCard('${msg.userId}')"
          title="Click to view profile"
        />
        <div class="space-y-1">
          <div class="text-[9px] text-t3 mb-0.5 font-semibold ${isMe ? 'text-right' : ''} flex items-center gap-1.5 ${isMe ? 'justify-end' : ''}">
            <span class="cursor-pointer hover:text-white hover:underline transition duration-150 flex items-center gap-1" onclick="openPlayerProfileCard('${msg.userId}')">${msg.userName || 'Anonymous'}${window.getBlueTickBadgeHtml(msg)}</span>
          </div>
          <div class="p-3 bg-gradient-to-br from-emerald-950/90 via-[#064e3b]/30 to-[#0a120f] border border-emerald-500/40 rounded-xl space-y-2.5 max-w-[280px] shadow-lg shadow-emerald-500/5">
            <div class="flex items-center gap-1.5 text-emerald-400 font-bold uppercase text-[9px] tracking-wider animate-pulse">
              <i class="fas fa-microphone-alt"></i> Live Voice Invite
            </div>
            <p class="text-white text-[11px] font-medium leading-relaxed">
              Hey! Join my squad voice room: <strong class="text-gold">"${msg.voiceRoomName}"</strong> (${msg.voiceRoomGame})
            </p>
            <button class="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer" onclick="joinVoiceRoom('${msg.voiceRoomId}').then(() => { goTo('sVoice'); })">
              <i class="fas fa-sign-in-alt"></i> Connect Live Audio
            </button>
          </div>
        </div>
      `;
    } else {
      msgDiv.innerHTML = `
        <img
          src="${msg.userAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=ax1'}"
          alt="Avatar"
          class="w-7 h-7 rounded-full bg-panel shrink-0 object-cover ${avatarBorder} cursor-pointer hover:scale-105 transition duration-150"
          onclick="openPlayerProfileCard('${msg.userId}')"
          title="Click to view profile"
        />
        <div>
          <div class="text-[9px] text-t3 mb-0.5 font-semibold ${isMe ? 'text-right' : ''} flex items-center gap-1.5 ${isMe ? 'justify-end' : ''}">
            <span class="cursor-pointer hover:text-white hover:underline transition duration-150 flex items-center gap-1" onclick="openPlayerProfileCard('${msg.userId}')">${msg.userName || 'Anonymous'}${window.getBlueTickBadgeHtml(msg)}</span>
          </div>
          <div class="p-3 rounded-xl text-xs leading-relaxed ${isMe ? 'bg-gold text-bg font-semibold rounded-tr-none' : 'bg-card border border-bdr text-white rounded-tl-none'}">
            ${msg.text || ''}
          </div>
        </div>
      `;
    }
    container.appendChild(msgDiv);
  });

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function updateChatUnreadDot() {
  const dot = $('chatDot');
  if (!dot) return;
  if (unreadGlobal) {
    dot.classList.remove('hidden');
    dot.classList.add('bg-gold');
  } else {
    dot.classList.add('hidden');
  }
}

function updateSubGlobalDot() {
  const dot = $('subGlobalDot');
  if (!dot) return;
  if (unreadGlobal && activeChatSubTab !== 'global') {
    dot.classList.remove('hidden');
  } else {
    dot.classList.add('hidden');
  }
}

async function setGlobalTypingState(isTyping) {
  const profile = userProfile || guestProfile;
  if (!profile || guestProfile) return;
  try {
    await setDoc(doc(db, 'global_chat_typing', profile.uid), {
      name: profile.name || 'Anonymous Player',
      typing: isTyping,
      timestamp: Date.now()
    }, { merge: true });
  } catch (e) {
    console.warn("Typing update error:", e);
  }
}

function handleGlobalInputKeyPress() {
  setGlobalTypingState(true);
  if (globalTypingTimeout) clearTimeout(globalTypingTimeout);
  globalTypingTimeout = setTimeout(() => {
    setGlobalTypingState(false);
  }, 2500);
}

// Global Chat & Sub-tabs events
$('btnSubGlobal').addEventListener('click', () => {
  activeChatSubTab = 'global';
  $('btnSubGlobal').className = 'pb-2 text-xs font-bold uppercase tracking-wider text-gold relative transition cursor-pointer';
  $('btnSubDM').className = 'pb-2 text-xs font-bold uppercase tracking-wider text-t2 hover:text-white relative transition cursor-pointer';
  $('subGlobalIndicator').classList.remove('hidden');
  $('subDMIndicator').classList.add('hidden');
  $('globalChatWindow').classList.remove('hidden');
  $('dmChatContainer').classList.add('hidden');
  $('chatTopActionBtns')?.classList.add('hidden');

  unreadGlobal = false;
  updateChatUnreadDot();
  updateSubGlobalDot();
  
  const container = $('globalChatMsgs');
  if (container) container.scrollTop = container.scrollHeight;
});

$('btnSubDM').addEventListener('click', () => {
  activeChatSubTab = 'dm';
  $('btnSubDM').className = 'pb-2 text-xs font-bold uppercase tracking-wider text-gold relative transition cursor-pointer';
  $('btnSubGlobal').className = 'pb-2 text-xs font-bold uppercase tracking-wider text-t2 hover:text-white relative transition cursor-pointer';
  $('subDMIndicator').classList.remove('hidden');
  $('subGlobalIndicator').classList.add('hidden');
  $('dmChatContainer').classList.remove('hidden');
  $('globalChatWindow').classList.add('hidden');
  if (!guestProfile) {
    $('chatTopActionBtns')?.classList.remove('hidden');
  }
});

function checkIfMuted() {
  const profile = userProfile || guestProfile;
  if (!profile || guestProfile) return false;
  
  if (profile.muted) {
    if (profile.muteUntil) {
      const until = new Date(profile.muteUntil).getTime();
      if (Date.now() > until) {
        // Mute has expired, auto-unmute in database
        updateDoc(doc(db, 'users', profile.uid), {
          muted: false,
          muteReason: '',
          muteUntil: null
        }).catch(console.warn);
        return false;
      } else {
        const timeStr = new Date(until).toLocaleString();
        alert(`🔇 You are muted until ${timeStr}.\nReason: ${profile.muteReason || 'No reason specified'}`);
        return true;
      }
    } else {
      alert(`🔇 You are permanently muted from chat.\nReason: ${profile.muteReason || 'No reason specified'}`);
      return true;
    }
  }
  return false;
}

$('globalChatInput').addEventListener('input', () => {
  handleGlobalInputKeyPress();
});

$('globalChatForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (guestProfile) {
    alert('Create an account to participate in Global Chat!');
    return;
  }
  if (checkIfMuted()) {
    return;
  }
  const input = $('globalChatInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';

  // Cancel typing status immediately
  setGlobalTypingState(false);
  if (globalTypingTimeout) clearTimeout(globalTypingTimeout);

  const profile = userProfile || guestProfile;
  const BAD_WORDS = ["bkl", "mc", "bc", "chutiya", "gand", "gandi", "gali", "fuck", "bitch", "asshole", "shitty", "randi", "loda", "lunde", "kutta", "saala", "saale", "madarchod", "behenchod", "harami", "bhonsri"];
  
  let filtered = text;
  let isAbusive = false;
  const lower = text.toLowerCase();
  
  BAD_WORDS.forEach((word) => {
    const regex = new RegExp(word, 'gi');
    if (regex.test(lower)) {
      isAbusive = true;
      filtered = filtered.replace(regex, '***');
    }
  });

  try {
    const msgRef = await addDoc(collection(db, 'global_chat'), {
      userId: profile.uid,
      userName: profile.name,
      hasBlueTick: !!(profile.hasBlueTick || profile.isVerified),
      userAvatar: profile.av || 'https://api.dicebear.com/7.x/bottts/svg?seed=ax1',
      text: filtered,
      originalText: text,
      isAbusive: isAbusive,
      avatarFrame: (profile.avatarFrame || localStorage.getItem('selectedAvatarFrame') || 'none'),
      createdAt: serverTimestamp()
    });

    if (profile && !profile.guest) {
      const todayStr = new Date(Date.now() + (5 * 60 * 60 * 1000)).toISOString().split('T')[0];
      await updateDoc(doc(db, 'users', profile.uid), {
        'dailyTasks.chat': true,
        'dailyTasks.date': todayStr,
        'welcomeBonus.chat': true
      }).catch(e => console.warn("Failed to update chat tasks: ", e));
    }

    if (isAbusive) {
      await addDoc(collection(db, 'chat_reports'), {
        userId: profile.uid,
        userName: profile.name,
        userEmail: profile.email || '',
        messageId: msgRef.id,
        messageText: text,
        createdAt: serverTimestamp(),
        status: 'open'
      });
    }
  } catch (err) {
    console.warn("Failed to send message:", err);
  }
});

let searchFriendTarget = null;
$('btnSearchFriend').addEventListener('click', async () => {
  const rawInput = $('friendHandleInp').value.trim();
  const searchClean = rawInput.replace(/^ID:\s*/i, '').replace(/^ID\s*/i, '').replace(/^@/, '').trim().toLowerCase();

  if (!searchClean) {
    alert('Please enter a Numeric Player ID (e.g. 849201) or Username to search!');
    return;
  }

  $('friendSearchResult').innerHTML = '<div class="text-xs text-t3 animate-pulse">Scanning database for player ID...</div>';
  $('bSendFriendReq').classList.add('hidden');

  try {
    let found = null;
    const currentUid = (userProfile || guestProfile)?.uid;

    // 1. Direct query on handle
    const qUser = query(collection(db, 'users'), where('handle', '==', searchClean));
    const snap = await getDocs(qUser);
    snap.forEach(d => {
      const u = d.data();
      if (!found && u.uid !== currentUid) {
        found = { id: d.id, ...u };
      }
    });

    // 2. Query with '@' prefix
    if (!found) {
      const qUserAt = query(collection(db, 'users'), where('handle', '==', '@' + searchClean));
      const snapAt = await getDocs(qUserAt);
      snapAt.forEach(d => {
        const u = d.data();
        if (!found && u.uid !== currentUid) {
          found = { id: d.id, ...u };
        }
      });
    }

    // 3. Scan user list for matching numeric ID or handle or name
    if (!found) {
      const allUsersSnap = await getDocs(query(collection(db, 'users'), limit(100)));
      allUsersSnap.forEach(d => {
        const u = d.data();
        if (!found && u.uid !== currentUid) {
          const uNumId = getNumericPlayerId(u.uid, u.handle);
          const uHandleClean = (u.handle || '').replace(/^@/, '').toLowerCase();
          const uNameClean = (u.name || '').toLowerCase();
          if (uNumId === searchClean || uHandleClean === searchClean || uNameClean.includes(searchClean) || u.uid === searchClean) {
            found = { id: d.id, ...u };
          }
        }
      });
    }

    if (!found) {
      $('friendSearchResult').innerHTML = '<div class="text-xs text-red font-semibold">No player found matching ID "' + rawInput + '". Double check the ID!</div>';
      return;
    }

    searchFriendTarget = found;
    const foundDisplayHandle = 'ID: ' + getNumericPlayerId(found.uid, found.handle);

    $('friendSearchResult').innerHTML = `
      <div class="p-3 bg-card border border-bdr rounded-xl flex items-center gap-3">
        <img src="${found.av || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + found.uid}" class="w-9 h-9 rounded-full border border-bdr object-cover"/>
        <div>
          <div class="text-xs font-bold text-white">${found.name}</div>
          <div class="text-[10px] text-gold font-bold font-mono">${foundDisplayHandle}</div>
        </div>
      </div>
    `;
    $('bSendFriendReq').classList.remove('hidden');
  } catch (err) {
    $('friendSearchResult').innerHTML = `<div class="text-xs text-red">Search Error: ${err.message}</div>`;
  }
});

$('bSendFriendReq').addEventListener('click', async () => {
  if (!searchFriendTarget) return;
  try {
    await setDoc(doc(db, 'users', searchFriendTarget.uid, 'friendRequests', userProfile.uid), {
      uid: userProfile.uid,
      name: userProfile.name,
      handle: userProfile.handle,
      av: userProfile.av,
      sentAt: serverTimestamp()
    });

    // Send push notification to target receiver
    if (typeof window.sendPersonalNotification === 'function') {
      window.sendPersonalNotification(searchFriendTarget.uid, {
        title: "New Friend Request 👥",
        body: `${userProfile.name || 'Someone'} wants to be your friend`,
        icon: userProfile.av || 'arenax_logo.jpg',
        url: 'https://arenax.cyou/#friends',
        data: { type: 'friend_request', senderUid: userProfile.uid }
      }).catch(console.warn);
    }

    $('mAddFriend').classList.add('hidden');
    alert(`Friend request sent successfully to ${searchFriendTarget.name}!`);
  } catch (err) {
    alert(err.message);
  }
});

// DM CHAT OPEN & LISTEN
let dmUnsub = null;
let activeDMFriendUnsub = null;
let activeDMFriendUid = '';
function openFriendDM(friend) {
  const profile = userProfile || guestProfile;
  if (!profile) return;

  activeDMFriendUid = friend.uid;

  if (activeDMFriendUnsub) {
    activeDMFriendUnsub();
    activeDMFriendUnsub = null;
  }

  // Listen live to target friend's profile to update avatar & name in real time
  if (friend.uid) {
    activeDMFriendUnsub = onSnapshot(doc(db, 'users', friend.uid), (docSnap) => {
      if (docSnap.exists()) {
        const uData = docSnap.data();
        if (uData.av) friend.av = uData.av;
        if (uData.name) friend.name = uData.name;
        if (uData.isVerified !== undefined) friend.isVerified = uData.isVerified;
        if (uData.hasBlueTick !== undefined) friend.hasBlueTick = uData.hasBlueTick;
        if ($('dmChatName')) $('dmChatName').innerHTML = window.formatPlayerNameHtml(friend, 'text-sm font-bold text-gray-900');
        if ($('dmChatAv')) $('dmChatAv').src = friend.av || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.uid}`;
        document.querySelectorAll(`.dm-msg-av-${friend.uid}`).forEach(img => {
          img.src = friend.av;
        });
      }
    });
  }

  if ($('dmChatName')) $('dmChatName').innerHTML = window.formatPlayerNameHtml(friend, 'text-sm font-bold text-gray-900');
  if ($('dmChatAv')) $('dmChatAv').src = friend.av || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.uid}`;
  if ($('dmChatNum')) $('dmChatNum').textContent = friend.badgeNum || '6';

  $('dmMsgs').innerHTML = '<div class="text-center text-xs text-gray-400 py-6 font-medium animate-pulse">Loading chat history...</div>';
  $('mDMChat').classList.remove('hidden');

  if (dmUnsub) {
    dmUnsub();
    dmUnsub = null;
  }

  const myUid = profile.uid || profile.id;
  const myAv = profile.av || `https://api.dicebear.com/7.x/bottts/svg?seed=${myUid}`;
  const friendAv = friend.av || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.uid}`;

  const roomId = [myUid, friend.uid].sort().join('_');
  const q = query(collection(db, 'dms', roomId, 'messages'), orderBy('createdAt', 'asc'));

  dmUnsub = onSnapshot(q, (snap) => {
    const listEl = $('dmMsgs');
    listEl.innerHTML = '';

    let lastTimeStr = '';

    snap.forEach((d) => {
      const m = d.data();
      const isMe = m.sender === myUid;

      // Format timestamp for badge header (e.g. 29/07/2026 14:27)
      let timeStr = '';
      if (m.createdAt) {
        const dt = m.createdAt.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
        const day = String(dt.getDate()).padStart(2, '0');
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const year = dt.getFullYear();
        const hrs = String(dt.getHours()).padStart(2, '0');
        const mins = String(dt.getMinutes()).padStart(2, '0');
        timeStr = `${day}/${month}/${year} ${hrs}:${mins}`;
      } else {
        const dt = new Date();
        const day = String(dt.getDate()).padStart(2, '0');
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const year = dt.getFullYear();
        const hrs = String(dt.getHours()).padStart(2, '0');
        const mins = String(dt.getMinutes()).padStart(2, '0');
        timeStr = `${day}/${month}/${year} ${hrs}:${mins}`;
      }

      // Render date badge if time changed or first msg
      if (timeStr && timeStr !== lastTimeStr) {
        lastTimeStr = timeStr;
        const timeBadge = document.createElement('div');
        timeBadge.className = 'flex justify-center my-2.5';
        timeBadge.innerHTML = `<span class="bg-[#d1d5db] text-white text-[10px] px-2.5 py-0.5 rounded-md font-semibold tracking-wide shadow-2xs">${timeStr}</span>`;
        listEl.appendChild(timeBadge);
      }

      const bubble = document.createElement('div');

      if (m.isVoiceRoomInvite) {
        bubble.className = isMe ? 'flex justify-end' : 'flex justify-start';
        bubble.innerHTML = `
          <div class="p-3 bg-gradient-to-br from-emerald-900 to-teal-950 text-white border border-emerald-500/40 rounded-2xl text-xs space-y-2 shadow-md max-w-[80%]">
            <div class="flex items-center gap-1.5 text-emerald-300 font-bold uppercase text-[9px] tracking-wider animate-pulse">
              <i class="fas fa-headset"></i> Voice Channel Invite
            </div>
            <p class="text-white text-[11px] font-medium leading-snug">
              Come talk! Join my room: <strong class="text-amber-300">"${m.voiceRoomName}"</strong>
            </p>
            <button class="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition shadow cursor-pointer flex items-center justify-center gap-1" onclick="joinVoiceRoom('${m.voiceRoomId}').then(() => { goTo('sVoice'); $('mDMChat').classList.add('hidden'); })">
              <i class="fas fa-sign-in-alt"></i> Join Room
            </button>
          </div>
        `;
      } else {
        if (isMe) {
          // Sent Message (Right) - Image 1 Style: Cyan/Soft Blue bubble, Avatar on right
          bubble.className = 'flex items-start justify-end gap-2 max-w-[88%] ml-auto';
          bubble.innerHTML = `
            <div class="flex items-center gap-1 max-w-[80%]">
              ${m.status === 'error' ? '<span class="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold shrink-0">!</span>' : ''}
              <div class="px-3.5 py-2 bg-[#dcf8ff] text-slate-900 rounded-2xl rounded-tr-xs text-xs font-normal shadow-2xs border border-sky-100 break-words leading-relaxed">
                ${m.text}
              </div>
            </div>
            <img src="${myAv}" class="dm-msg-av-${myUid} w-8 h-8 rounded-full border border-gray-200 object-cover shrink-0 mt-0.5 shadow-2xs"/>
          `;
        } else {
          // Received Message (Left) - Image 1 Style: White bubble, Avatar on left
          bubble.className = 'flex items-start justify-start gap-2 max-w-[88%]';
          bubble.innerHTML = `
            <img src="${friendAv}" class="dm-msg-av-${friend.uid} w-8 h-8 rounded-full border border-gray-200 object-cover shrink-0 mt-0.5 shadow-2xs"/>
            <div class="px-3.5 py-2 bg-white text-slate-900 rounded-2xl rounded-tl-xs text-xs font-normal shadow-2xs border border-gray-100 max-w-[80%] break-words leading-relaxed">
              ${m.text}
            </div>
          `;
        }
      }
      listEl.appendChild(bubble);
    });

    if (snap.empty) {
      listEl.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full py-12 text-center text-gray-400 space-y-1">
          <i class="far fa-comments text-3xl text-gray-300"></i>
          <p class="text-xs font-medium">No messages yet with ${friend.name}</p>
          <p class="text-[10px] text-gray-400">Say hello to start the conversation!</p>
        </div>
      `;
    }
    listEl.scrollTop = listEl.scrollHeight;
  });
}

$('bCloseDMChat').addEventListener('click', () => {
  $('mDMChat').classList.add('hidden');
  if (dmUnsub) {
    dmUnsub();
    dmUnsub = null;
  }
  if (activeDMFriendUnsub) {
    activeDMFriendUnsub();
    activeDMFriendUnsub = null;
  }
});

// Bind DM header click elements to open player profile
if ($('dmChatAv')) {
  $('dmChatAv').addEventListener('click', () => {
    if (activeDMFriendUid) {
      openPlayerProfileCard(activeDMFriendUid);
    }
  });
}
if ($('dmChatName')) {
  $('dmChatName').addEventListener('click', () => {
    if (activeDMFriendUid) {
      openPlayerProfileCard(activeDMFriendUid);
    }
  });
}

// ── NON-INTERACTIVE 3D CHARACTER RENDERER FOR PROFILE ──
window.renderNonInteractive3DCharacter = function(containerId, activeModelFileName) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const THREE = window.THREE;
  if (!THREE) return;

  const width = container.clientWidth || 360;
  const height = container.clientHeight || 340;

  const scene = new THREE.Scene();
  scene.background = null;

  // View Profile specific camera: dedicated FOV & target completely independent from Player Show
  const viewProfileFov = 32;
  const camera = new THREE.PerspectiveCamera(viewProfileFov, width / height, 0.1, 100);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xfffaed, 2.2);
  dirLight1.position.set(3, 5, 4);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x9d4eff, 1.2);
  dirLight2.position.set(-3, 2, -3);
  scene.add(dirLight2);

  const pointLight = new THREE.PointLight(0xf0c040, 1.5, 10);
  pointLight.position.set(0, 1, 2);
  scene.add(pointLight);

  let model = null;
  let mixer = null;
  const clock = new THREE.Clock();

  // Dynamic View Profile framing: calculates accurate bounding box across all meshes/bones,
  // normalizes character height to standard 2.0 units, lifts model slightly so feet clear the
  // bottom card, and calculates camera distance dynamically so head-to-toe is 100% visible.
  const setupAndFrameProfileModel = (modelObj, gltfAnimations, isWaving) => {
    if (!modelObj || !camera || !scene) return;

    // Reset initial transforms
    modelObj.position.set(0, 0, 0);
    modelObj.rotation.set(0, 0, 0);
    modelObj.scale.set(1, 1, 1);
    modelObj.updateMatrixWorld(true);

    // Compute bounding box taking into account skinned meshes and bones
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    let hasValidBounds = false;

    modelObj.traverse((child) => {
      if (child.isBone) {
        child.getWorldPosition(v);
        box.expandByPoint(v);
        hasValidBounds = true;
      }
      if (child.isMesh && child.geometry) {
        if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
        const b = child.geometry.boundingBox;
        if (b) {
          const corners = [
            new THREE.Vector3(b.min.x, b.min.y, b.min.z),
            new THREE.Vector3(b.min.x, b.min.y, b.max.z),
            new THREE.Vector3(b.min.x, b.max.y, b.min.z),
            new THREE.Vector3(b.min.x, b.max.y, b.max.z),
            new THREE.Vector3(b.max.x, b.min.y, b.min.z),
            new THREE.Vector3(b.max.x, b.min.y, b.max.z),
            new THREE.Vector3(b.max.x, b.max.y, b.min.z),
            new THREE.Vector3(b.max.x, b.max.y, b.max.z),
          ];
          corners.forEach((c) => {
            c.applyMatrix4(child.matrixWorld);
            box.expandByPoint(c);
          });
          hasValidBounds = true;
        }
      }
    });

    if (!hasValidBounds || box.isEmpty()) {
      box.setFromObject(modelObj);
    }

    const rawSize = box.getSize(new THREE.Vector3());
    const rawCenter = box.getCenter(new THREE.Vector3());
    const rawHeight = rawSize.y > 0.05 ? rawSize.y : 2.0;
    const rawWidth = rawSize.x > 0.05 ? rawSize.x : 0.8;

    // Normalize character model to standard height 2.0
    const normScale = 2.0 / rawHeight;
    modelObj.scale.set(normScale, normScale, normScale);

    // Center horizontally and vertically at origin, with a slight +0.10 lift so feet stay above the bottom card
    const yLift = 0.10;
    modelObj.position.set(
      -rawCenter.x * normScale,
      -rawCenter.y * normScale + yLift,
      -rawCenter.z * normScale
    );
    modelObj.updateMatrixWorld(true);

    // Position camera specifically for View Profile
    const currentW = container.clientWidth || width || 360;
    const currentH = container.clientHeight || height || 340;
    const aspect = (currentW && currentH && currentH > 0) ? (currentW / currentH) : 1.0;
    camera.aspect = aspect;

    const fovRad = viewProfileFov * (Math.PI / 180);
    const normHeight = 2.0;
    const normWidth = rawWidth * normScale;

    const distV = (normHeight / 2) / Math.tan(fovRad / 2);
    const distH = (normWidth / 2) / (Math.tan(fovRad / 2) * aspect);

    // Generous framing multiplier prevents any clipping of head or waving hand at top
    let cameraDist = Math.max(distV, distH) * 1.42;
    if (aspect < 1.0) {
      cameraDist = Math.max(cameraDist, (distV / aspect) * 1.25);
    }

    camera.position.set(0, yLift, cameraDist);
    camera.lookAt(0, yLift, 0);
    camera.near = 0.1;
    camera.far = 100;
    camera.updateProjectionMatrix();

    // ── ANIMATION HANDLING ──
    // FIX 1: Classic Boy stays static (no animation).
    // FIX 2: Waving Hero plays waving animation in a loop.
    if (isWaving && gltfAnimations && gltfAnimations.length > 0) {
      let wavingClip = gltfAnimations.find((a) =>
        a.name && (a.name.toLowerCase().includes('wave') || a.name.toLowerCase().includes('mixamo') || a.name.toLowerCase().includes('layer0'))
      ) || gltfAnimations[0];
      mixer = new THREE.AnimationMixer(modelObj);
      const action = mixer.clipAction(wavingClip);
      action.reset();
      action.setLoop(THREE.LoopRepeat);
      action.play();
    }

    scene.add(modelObj);
  };

  const createProcedural = () => {
    const group = new THREE.Group();
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x181c2b, roughness: 0.3, metalness: 0.8 });
    const goldMetal = new THREE.MeshStandardMaterial({ color: 0xf0c040, roughness: 0.2, metalness: 0.9 });
    const glowingVisor = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const glowingCore = new THREE.MeshBasicMaterial({ color: 0xf0c040 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 0.7, 8), darkMetal);
    group.add(torso);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.2), goldMetal);
    chest.position.set(0, 0.1, 0.12);
    group.add(chest);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), glowingCore);
    core.position.set(0, 0.1, 0.23);
    group.add(core);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), darkMetal);
    head.position.y = 0.55;
    group.add(head);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.08), glowingVisor);
    visor.position.set(0, 0.58, 0.14);
    group.add(visor);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.08, 32), new THREE.MeshStandardMaterial({ color: 0x121626, roughness: 0.4, metalness: 0.8 }));
    pedestal.position.y = -0.98;
    group.add(pedestal);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.68, 0.74, 32), new THREE.MeshBasicMaterial({ color: 0xf0c040, side: THREE.DoubleSide }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.93;
    group.add(ring);
    return group;
  };

  const modelFileToLoad = activeModelFileName || 'character_boy_1_fbx.glb';
  const cleanFileName = String(modelFileToLoad).replace(/^(\.\/|\/)/, '');
  const isWavingHero = cleanFileName.includes('Convert_Waving') || cleanFileName.toLowerCase().includes('waving');

  // Load from preloaded cache or fetch silently
  if (typeof preloadArenaX3DModel === 'function') {
    preloadArenaX3DModel(cleanFileName).then((cachedGltf) => {
      if (cachedGltf) {
        const cloned = typeof cloneArenaXGltf === 'function' ? cloneArenaXGltf(cachedGltf) : { scene: cachedGltf.scene.clone(), animations: cachedGltf.animations };
        model = cloned.scene;
        setupAndFrameProfileModel(model, cloned.animations || cachedGltf.animations, isWavingHero);
      } else {
        model = createProcedural();
        setupAndFrameProfileModel(model, [], false);
      }
    }).catch(() => {
      model = createProcedural();
      setupAndFrameProfileModel(model, [], false);
    });
  } else {
    model = createProcedural();
    setupAndFrameProfileModel(model, [], false);
  }

  let frameId;
  const animate = () => {
    frameId = requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) {
      mixer.update(delta);
    }
    // Non-interactive: Front-facing, completely still pose (or waving if Convert_Waving), no manual rotation
    if (renderer && scene && camera) renderer.render(scene, camera);
  };
  animate();
};

// ── CUSTOM PLAYER PROFILE CARD CONTROLLER ──
let currentViewedUser = null;

window.openPlayerProfileCard = async function(targetUid) {
  if (!targetUid) return;

  // Reset UI to loading state
  if ($('vppName')) $('vppName').textContent = "Loading Profile...";
  if ($('vppAv')) $('vppAv').src = "https://api.dicebear.com/7.x/bottts/svg?seed=loading";
  if ($('vppBio')) $('vppBio').textContent = "Loading signature...";
  if ($('vppCountryFlag')) $('vppCountryFlag').textContent = "🌍";
  if ($('vppCountryName')) $('vppCountryName').textContent = "Unknown";
  if ($('vppGameUID')) $('vppGameUID').textContent = `ID: ${getNumericPlayerId(targetUid)}`;
  if ($('vppGiftCount')) $('vppGiftCount').textContent = "0";
  if ($('vppStarCount')) $('vppStarCount').textContent = "0";

  // Show modal
  if ($('mViewPlayerProfile')) $('mViewPlayerProfile').classList.remove('hidden');

  try {
    const userDocRef = doc(db, 'users', targetUid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      if ($('vppName')) $('vppName').textContent = "Unknown Player";
      return;
    }

    const u = snap.data();
    currentViewedUser = { uid: targetUid, ...u };
    window.currentViewingPlayerId = targetUid;
    window.currentViewingPlayerName = u.name || u.userName || 'ArenaX Player';
    window.currentViewingPlayerAvatar = u.av || u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUid}`;

    // Fill Top Section
    if ($('vppName')) {
      $('vppName').innerHTML = window.formatPlayerNameHtml(u, 'text-xl sm:text-2xl font-black text-gray-900 tracking-tight');
    }
    if ($('vppAv')) $('vppAv').src = u.av || u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUid}`;
    
    // Country
    const countryNames = {
      PK: { flag: '🇵🇰', name: 'Pakistan' },
      IN: { flag: '🇮🇳', name: 'India' },
      BD: { flag: '🇧🇩', name: 'Bangladesh' },
      SA: { flag: '🇸🇦', name: 'Saudi Arabia' },
      AE: { flag: '🇦🇪', name: 'UAE' },
      US: { flag: '🇺🇸', name: 'USA' },
      GB: { flag: '🇬🇧', name: 'UK' },
      Other: { flag: '🌍', name: 'Other' }
    };
    if (u.country && countryNames[u.country]) {
      if ($('vppCountryFlag')) $('vppCountryFlag').textContent = countryNames[u.country].flag;
      if ($('vppCountryName')) $('vppCountryName').textContent = countryNames[u.country].name;
    } else if (u.countryName) {
      if ($('vppCountryFlag')) $('vppCountryFlag').textContent = u.countryFlag || '🌍';
      if ($('vppCountryName')) $('vppCountryName').textContent = u.countryName;
    } else {
      if ($('vppCountryFlag')) $('vppCountryFlag').textContent = '🇵🇰';
      if ($('vppCountryName')) $('vppCountryName').textContent = 'Pakistan';
    }

    // User ID (Friend Request Numeric ID)
    const numericId = getNumericPlayerId(u.uid || targetUid, u.gameUID || u.handle);
    if ($('vppGameUID')) $('vppGameUID').textContent = `ID: ${numericId}`;

    // Fill Stats Section
    if ($('vppBio')) $('vppBio').textContent = u.bio || u.signature || "This person says nothing!";
    const popVal = u.popularity !== undefined ? u.popularity : (u.giftCount !== undefined ? u.giftCount : 0);
    const roseVal = u.roseCount !== undefined ? u.roseCount : 0;
    const rocketVal = u.rocketCount !== undefined ? u.rocketCount : 0;
    const trophyVal = u.trophyCount !== undefined ? u.trophyCount : 0;

    if ($('vppPopularityVal')) $('vppPopularityVal').textContent = Number(popVal).toLocaleString();
    if ($('vppRoseCountVal')) $('vppRoseCountVal').textContent = Number(roseVal).toLocaleString();
    if ($('vppRocketCountVal')) $('vppRocketCountVal').textContent = Number(rocketVal).toLocaleString();
    if ($('vppTrophyCountVal')) $('vppTrophyCountVal').textContent = Number(trophyVal).toLocaleString();
    if ($('vppGiftCount')) $('vppGiftCount').textContent = Number(popVal).toLocaleString();

    // Start auto-swiping carousel based on actual received gifts
    const receivedTypes = [];
    if (roseVal > 0) receivedTypes.push('rose');
    if (rocketVal > 0) receivedTypes.push('rocket');
    if (trophyVal > 0) receivedTypes.push('trophy');
    if (typeof window.startVppCarousel === 'function') {
      window.startVppCarousel(receivedTypes);
    }

    // Render Team Section for View Profile
    window.renderVppTeamSection(targetUid);

    // Render Moments for viewed user
    const targetMoments = (typeof allMomentsList !== 'undefined' ? allMomentsList : []).filter(m => m.userId === targetUid);
    if ($('vppMomentsCount')) $('vppMomentsCount').textContent = targetMoments.length;
    const momentsContainer = $('vppMomentsContainer');
    if (momentsContainer) {
      if (targetMoments.length === 0) {
        momentsContainer.innerHTML = `<p class="text-xs text-gray-400 italic py-1">No moments yet</p>`;
      } else {
        momentsContainer.innerHTML = `
          <div class="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            ${targetMoments.map(m => `
              <div onclick="openMomentsFeedModalFiltered('${targetUid}', '${safeMomentTxt(u.name || u.userName || 'Player')}')" class="relative w-16 h-16 rounded-xl overflow-hidden border border-amber-500/30 shrink-0 cursor-pointer group shadow-sm bg-black hover:scale-105 transition">
                ${m.mediaType === 'video' ? `
                  <div class="w-full h-full relative">
                    <video src="${m.mediaUrl}" class="w-full h-full object-cover"></video>
                    <div class="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <i class="fas fa-play text-white text-xs drop-shadow"></i>
                    </div>
                  </div>
                ` : `
                  <img src="${m.mediaUrl}" alt="Moment" class="w-full h-full object-cover group-hover:scale-105 transition" />
                `}
              </div>
            `).join('')}
          </div>
        `;
      }
    }

    // Render 3D Character Avatar in Top Stage ONLY IF the viewed user has unlocked Player Show / 3D Model
    const headerBar = document.getElementById('vppTopHeaderBar');
    const heroCanvas = document.getElementById('vppTopHero3DCanvas');
    const blessingBadge = document.getElementById('vppBlessingBadge');
    const hasPlayerShow = !!(u.playerShowUnlocked || u.character3dUnlocked || (Array.isArray(u.unlocked3dModels) && u.unlocked3dModels.length > 0) || u.active3dModel);

    if (hasPlayerShow) {
      if (headerBar) {
        headerBar.className = "relative h-[330px] sm:h-[350px] bg-gradient-to-b from-[#120e24] via-[#1c1635] to-[#2a2046] overflow-hidden shrink-0 z-0 transition-all duration-300";
      }
      if (heroCanvas) {
        heroCanvas.classList.remove('hidden');
        if (typeof window.renderNonInteractive3DCharacter === 'function') {
          let activeModel = typeof getActive3DModelFileName === 'function' ? getActive3DModelFileName(u) : 'character_boy_1_fbx.glb';
          window.renderNonInteractive3DCharacter('vppTopHero3DCanvas', activeModel);
        }
      }
      if (blessingBadge) {
        blessingBadge.classList.remove('hidden');
        if ($('vppBlessingVal')) $('vppBlessingVal').textContent = u.blessingLevel || u.score || 72;
        if ($('vppBlessingAv')) $('vppBlessingAv').src = u.av || u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUid}`;
      }
    } else {
      if (headerBar) {
        headerBar.className = "relative h-20 bg-gradient-to-r from-[#1b1528] via-[#241a38] to-[#171024] px-5 pt-4 flex items-start justify-between shrink-0 z-0 transition-all duration-300";
      }
      if (heroCanvas) {
        heroCanvas.classList.add('hidden');
        heroCanvas.innerHTML = '';
      }
      if (blessingBadge) blessingBadge.classList.add('hidden');
    }

    if ($('vpp3DCharacterSection')) $('vpp3DCharacterSection').classList.add('hidden');

  } catch (err) {
    console.error("Error fetching target player details:", err);
    if ($('vppName')) $('vppName').textContent = "Player Profile";
  }
};

// Bind modal triggers
if ($('bCloseViewPlayerProfile')) {
  $('bCloseViewPlayerProfile').addEventListener('click', () => {
    if ($('mViewPlayerProfile')) $('mViewPlayerProfile').classList.add('hidden');
  });
}
if ($('btnCloseViewPlayerProfileX')) {
  $('btnCloseViewPlayerProfileX').addEventListener('click', () => {
    if ($('mViewPlayerProfile')) $('mViewPlayerProfile').classList.add('hidden');
  });
}

// Copy User ID Button
if ($('btnVppCopyUID')) {
  $('btnVppCopyUID').addEventListener('click', () => {
    if (!$('vppGameUID')) return;
    const text = $('vppGameUID').textContent.replace('ID: ', '').trim();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (typeof showToastNotification === 'function') {
        showToastNotification("Copied! 📋", `User ID ${text} copied to clipboard.`);
      } else {
        alert(`Copied User ID: ${text}`);
      }
    } else {
      alert(`User ID: ${text}`);
    }
  });
}

// Send Gift Buttons in Profile Card Modal
if ($('btnVppSendPopularity')) {
  $('btnVppSendPopularity').addEventListener('click', () => {
    window.openGiftBottomSheet();
  });
}
if ($('btnVppSendGiftBottom')) {
  $('btnVppSendGiftBottom').addEventListener('click', () => {
    window.openGiftBottomSheet();
  });
}

// Chat Button
if ($('btnVppSendDM')) {
  $('btnVppSendDM').addEventListener('click', () => {
    if (!currentViewedUser) return;
    if ($('mViewPlayerProfile')) $('mViewPlayerProfile').classList.add('hidden');
    if (typeof openFriendDM === 'function') {
      openFriendDM(currentViewedUser);
    }
  });
}

// ── VIEW PROFILE TEAM SECTION & TEAM DETAIL PAGE CONTROLLER ──
window.currentVppTeam = null;

window.renderVppTeamSection = async function(targetUid) {
  const container = $('vppTeamCardContainer');
  if (!container) return;

  container.innerHTML = `<div class="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-center text-xs text-gray-400">Loading team info...</div>`;

  try {
    let foundTeam = (window.allGuilds || allGuilds || []).find(g => 
      g.leaderId === targetUid || (g.members && g.members.includes(targetUid))
    );

    if (!foundTeam) {
      try {
        const q1 = query(collection(db, 'teams'), where('leaderId', '==', targetUid));
        const s1 = await getDocs(q1);
        if (!s1.empty) {
          foundTeam = { id: s1.docs[0].id, ...s1.docs[0].data() };
        } else {
          const q2 = query(collection(db, 'teams'), where('members', 'array-contains', targetUid));
          const s2 = await getDocs(q2);
          if (!s2.empty) {
            foundTeam = { id: s2.docs[0].id, ...s2.docs[0].data() };
          }
        }
      } catch (e) {
        console.warn("Direct team query failed:", e);
      }
    }

    window.currentVppTeam = foundTeam;

    if (!foundTeam) {
      container.innerHTML = `
        <div class="bg-gray-50 border border-gray-100 rounded-2xl p-3 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-full bg-gray-200/80 flex items-center justify-center text-gray-400 text-sm">
              🛡️
            </div>
            <div>
              <span class="text-xs font-bold text-gray-600 block leading-tight">Not in a team</span>
              <span class="text-[10px] text-gray-400 font-medium">This player hasn't joined a squad</span>
            </div>
          </div>
        </div>
      `;
      return;
    }

    let roleText = 'Member';
    let roleBadgeClass = 'bg-purple-600 text-white';
    if (foundTeam.leaderId === targetUid) {
      roleText = 'Leader';
      roleBadgeClass = 'bg-emerald-500 text-white';
    } else if (foundTeam.guards && foundTeam.guards.includes(targetUid)) {
      roleText = 'Guard';
      roleBadgeClass = 'bg-sky-500 text-white';
    }

    const logoHtml = foundTeam.logoUrl && foundTeam.logoUrl.startsWith('data:') 
      ? `<img src="${foundTeam.logoUrl}" class="w-full h-full object-cover rounded-full" />` 
      : (foundTeam.logoUrl || '🦁');

    container.innerHTML = `
      <div onclick="window.openTeamDetailPage('${foundTeam.id}')" class="bg-gradient-to-r from-gray-900 via-slate-900 to-gray-950 rounded-2xl p-3 flex items-center justify-between border border-amber-400/30 shadow-md cursor-pointer hover:border-amber-400 transition active:scale-[0.99] group">
        <div class="flex items-center gap-3 min-w-0">
          <div class="relative shrink-0">
            <div class="w-12 h-12 rounded-full border-2 border-amber-400/80 bg-gray-950 p-0.5 overflow-hidden flex items-center justify-center text-2xl shadow-md">
              ${logoHtml}
            </div>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="font-display font-black text-xs sm:text-sm text-white uppercase tracking-wide truncate">
                ${foundTeam.name}
              </h4>
              <span class="px-2 py-0.5 ${roleBadgeClass} text-[9px] font-black uppercase rounded-md shadow-xs shrink-0">
                ${roleText}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-1 text-[10px] font-bold">
              <span class="px-2 py-0.5 bg-sky-500/20 border border-sky-400/30 text-sky-300 rounded-md font-mono flex items-center gap-1">
                🛡️ Lv. ${foundTeam.level || 1}
              </span>
              <span class="px-2 py-0.5 bg-amber-400/15 border border-amber-400/30 text-amber-300 rounded-md font-mono uppercase">
                [${foundTeam.tag || 'SQUAD'}]
              </span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1 text-amber-400 font-bold text-xs group-hover:translate-x-1 transition">
          <i class="fas fa-chevron-right text-xs"></i>
        </div>
      </div>
    `;
  } catch (err) {
    console.error("Error rendering VPP team section:", err);
    container.innerHTML = `<div class="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-center text-xs text-gray-400">Not in a team</div>`;
  }
};

window.onVppTeamClick = function() {
  if (window.currentVppTeam) {
    window.openTeamDetailPage(window.currentVppTeam.id);
  }
};

window.openTeamDetailPage = async function(teamId) {
  if (!teamId) return;

  const modal = $('mTeamDetailPage');
  const container = $('teamDetailPageContent');
  if (!modal || !container) return;

  modal.classList.remove('hidden');
  container.innerHTML = `
    <div class="w-full h-full bg-[#0a0c12] flex flex-col items-center justify-center text-amber-400 space-y-3 p-6">
      <div class="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      <span class="text-xs font-mono font-bold uppercase tracking-widest text-gray-400">Loading Team Details...</span>
    </div>
  `;

  try {
    let team = (window.allGuilds || allGuilds || []).find(g => g.id === teamId);
    if (!team) {
      const snap = await getDoc(doc(db, 'teams', teamId));
      if (snap.exists()) {
        team = { id: snap.id, ...snap.data() };
      }
    }

    if (!team) {
      container.innerHTML = `
        <div class="w-full h-full bg-[#0a0c12] flex flex-col items-center justify-center text-white p-6 space-y-4">
          <p class="text-sm font-bold text-red-400">Team not found or removed.</p>
          <button onclick="window.closeTeamDetailPage()" class="px-5 py-2 bg-white/10 text-white rounded-full text-xs font-bold cursor-pointer">Go Back</button>
        </div>
      `;
      return;
    }

    const memberIds = team.members && team.members.length > 0 ? team.members : [team.leaderId];
    const membersData = await window.fetchGuildMembers(memberIds);

    let leaderProfile = membersData.find(m => m.uid === team.leaderId);
    if (!leaderProfile && team.leaderId) {
      try {
        const lSnap = await getDoc(doc(db, 'users', team.leaderId));
        if (lSnap.exists()) {
          leaderProfile = lSnap.data();
          membersData.unshift(leaderProfile);
        }
      } catch (e) {
        console.warn("Could not fetch leader profile:", e);
      }
    }

    const logoHtml = team.logoUrl && team.logoUrl.startsWith('data:')
      ? `<img src="${team.logoUrl}" class="w-full h-full object-cover rounded-full" />`
      : (team.logoUrl || '🦁');

    const isUserInThisTeam = userProfile && (team.leaderId === userProfile.uid || (team.members && team.members.includes(userProfile.uid)));

    container.innerHTML = `
      <!-- Top Banner & Header -->
      <div class="relative w-full h-52 bg-[#0a0c12] overflow-hidden shrink-0 border-b border-white/10">
        <!-- Background Blur Image -->
        <div class="absolute inset-0 z-0">
          ${team.logoUrl && team.logoUrl.startsWith('data:')
            ? `<img src="${team.logoUrl}" class="w-full h-full object-cover filter blur-2xl opacity-40 scale-125" />`
            : `<div class="w-full h-full bg-gradient-to-b from-amber-950/60 via-gray-900 to-[#0a0c12]"></div>`}
          <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-[#0a0c12]"></div>
        </div>

        <!-- Header Actions: Back Button & Weekly Rank -->
        <div class="relative z-20 p-4 flex items-center justify-between">
          <button onclick="window.closeTeamDetailPage()" class="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg" title="Back">
            <i class="fas fa-chevron-left text-sm"></i>
          </button>

          <div class="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-black text-xs rounded-full shadow-lg border border-amber-300/30 flex items-center gap-1.5">
            <span>Weekly Rank:</span>
            <span class="text-white font-mono font-extrabold text-xs">#${team.weeklyRank || team.rank || 2}</span>
          </div>
        </div>

        <!-- Overlapping Team Info Row -->
        <div class="absolute bottom-3 left-4 right-4 z-20 flex items-end gap-3.5">
          <div class="relative shrink-0">
            <div class="w-20 h-20 rounded-full border-2 border-amber-400 bg-[#121422] p-0.5 overflow-hidden flex items-center justify-center text-4xl shadow-2xl">
              ${logoHtml}
            </div>
          </div>

          <div class="flex-1 min-w-0 pb-0.5">
            <h2 class="font-display font-black text-base sm:text-lg text-white uppercase tracking-wider truncate flex items-center gap-2">
              ${team.name}
            </h2>
            <div class="flex items-center gap-2 mt-1 flex-wrap text-xs">
              <span class="px-2 py-0.5 bg-sky-500/20 border border-sky-400/40 text-sky-300 font-extrabold rounded-md text-[10px] font-mono flex items-center gap-1">
                🛡️ Lv. ${team.level || 1}
              </span>
              <span class="px-2.5 py-0.5 bg-amber-400/20 border border-amber-400/40 text-amber-300 font-black rounded-md text-[10px] font-mono uppercase tracking-wider">
                ${team.tag || 'SQUAD'}
              </span>
            </div>
            <div class="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400 font-mono">
              <span>ID: <strong class="text-gray-200 select-all font-bold">${(team.id || 'N157').substring(0, 8).toUpperCase()}</strong></span>
              <span class="text-amber-400 font-bold flex items-center gap-1">
                🔥 Activeness: ${(team.xp || team.activeness || 4601346).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Scrollable Detail Body -->
      <div class="flex-1 overflow-y-auto p-4 space-y-5 pb-24">
        
        <!-- MAJOR MEMBERS SECTION -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-1.5 h-4 bg-amber-400 rounded-full"></span>
              <h3 class="text-xs font-black text-white uppercase tracking-wider">Major Members</h3>
            </div>
            <span class="text-xs text-gray-400 font-mono font-bold flex items-center gap-1">
              ${memberIds.length}/${team.maxMembers || 120} <i class="fas fa-chevron-right text-[10px] text-gray-500"></i>
            </span>
          </div>

          <!-- Horizontal Avatars Row -->
          <div class="flex items-center gap-3.5 overflow-x-auto pb-2 pt-1 no-scrollbar">
            ${memberIds.map(mUid => {
              const m = membersData.find(u => u.uid === mUid) || { uid: mUid, name: 'Member' };
              const isLeader = mUid === team.leaderId;
              const isGuard = team.guards && team.guards.includes(mUid);

              let roleText = 'Member';
              let roleBg = 'bg-sky-500';
              let frameBorder = 'border-sky-500/60';
              if (isLeader) {
                roleText = 'Leader';
                roleBg = 'bg-gradient-to-r from-pink-500 to-rose-600';
                frameBorder = 'border-pink-500';
              } else if (isGuard) {
                roleText = 'Deputy';
                roleBg = 'bg-gradient-to-r from-cyan-500 to-blue-600';
                frameBorder = 'border-cyan-400';
              }

              const mName = m.name || m.userName || 'Player';
              const mAv = m.av || m.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${mUid}`;

              return `
                <div onclick="window.openPlayerProfileCard('${mUid}')" class="flex flex-col items-center shrink-0 w-16 cursor-pointer active:scale-95 transition">
                  <div class="relative mb-1">
                    <div class="w-14 h-14 rounded-full border-2 ${frameBorder} bg-gray-900 p-0.5 overflow-hidden shadow-lg">
                      <img src="${mAv}" class="w-full h-full object-cover rounded-full" />
                    </div>
                    <span class="absolute -bottom-1 left-1/2 -translate-x-1/2 ${roleBg} text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-tighter whitespace-nowrap shadow-md border border-white/20">
                      ${roleText}
                    </span>
                  </div>
                  <span class="text-[10px] font-bold text-gray-200 truncate w-full text-center mt-1">
                    ${mName}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- INTRODUCTION SECTION -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-4 bg-amber-400 rounded-full"></span>
            <h3 class="text-xs font-black text-white uppercase tracking-wider">Introduction</h3>
          </div>
          <div class="bg-[#121522] border border-white/10 rounded-2xl p-4 text-xs text-gray-300 font-medium leading-relaxed shadow-sm">
            <p>${team.description || "Welcome to our family! This isn't just a group—it's a legacy. Built on loyalty, respect, and unity. Here, we stand together, grow together, and win together. Stay real, stay active, and represent the family with pride. 💜"}</p>
          </div>
        </div>

        <!-- REQUIREMENTS SECTION -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-4 bg-amber-400 rounded-full"></span>
            <h3 class="text-xs font-black text-white uppercase tracking-wider">Requirements</h3>
          </div>
          <div class="bg-[#121522] border border-white/10 rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <span class="text-gray-400 font-semibold">Join Permission</span>
            ${team.joinType === 'application'
              ? `<span class="px-3 py-1 bg-amber-400/15 border border-amber-400/40 text-amber-300 font-bold rounded-full text-[11px] flex items-center gap-1.5">📝 Application Required</span>`
              : `<span class="px-3 py-1 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold rounded-full text-[11px] flex items-center gap-1.5">⚡ Free to Join</span>`
            }
          </div>
        </div>

      </div>

      <!-- FIXED BOTTOM ACTION BUTTON -->
      <div class="fixed bottom-0 left-0 right-0 p-4 bg-[#0a0c12]/95 backdrop-blur-md border-t border-white/10 z-30 flex items-center">
        ${isUserInThisTeam
          ? `<button onclick="window.enterUserTeam('${team.id}')" class="w-full h-12 rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/25 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2">
               <span>Enter my family</span> <i class="fas fa-arrow-right text-xs"></i>
             </button>`
          : (team.joinType === 'application'
              ? `<button onclick="window.applyToTeamFromDetail('${team.id}')" class="w-full h-12 rounded-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-black font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-400/25 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2">
                   <span>Apply to Join</span>
                 </button>`
              : `<button onclick="window.joinTeamFromDetail('${team.id}')" class="w-full h-12 rounded-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-black font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-400/25 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2">
                   <span>Join Team</span>
                 </button>`
            )
        }
      </div>
    `;
  } catch (err) {
    console.error("Error opening team detail page:", err);
    container.innerHTML = `
      <div class="w-full h-full bg-[#0a0c12] flex flex-col items-center justify-center text-white p-6 space-y-4">
        <p class="text-sm font-bold text-red-400">Failed to load team details.</p>
        <button onclick="window.closeTeamDetailPage()" class="px-5 py-2 bg-white/10 text-white rounded-full text-xs font-bold cursor-pointer">Close</button>
      </div>
    `;
  }
};

window.closeTeamDetailPage = function() {
  const modal = $('mTeamDetailPage');
  if (modal) modal.classList.add('hidden');
};

window.enterUserTeam = function(teamId) {
  window.closeTeamDetailPage();
  if ($('mViewPlayerProfile')) $('mViewPlayerProfile').classList.add('hidden');

  const modal = $('mGuildSystemModal');
  if (modal) {
    modal.classList.remove('hidden');
    if (typeof window.renderGuildSystemModalContent === 'function') {
      window.renderGuildSystemModalContent();
    }
  }
};

window.joinTeamFromDetail = async function(teamId) {
  await window.joinTeamDirect(teamId);
  window.openTeamDetailPage(teamId);
};

window.applyToTeamFromDetail = function(teamId) {
  window.applyToTeam(teamId);
};

// ── QUICK BROADCAST SHORTCUT HANDLERS FOR VOICE CHANNELS ──
if ($('btnShareVoiceGlobal')) {
  $('btnShareVoiceGlobal').addEventListener('click', async () => {
    if (!currentVoiceRoomId || !userProfile) {
      showToastNotification("Lobby Required ⚠️", "Join or create a live voice channel first!");
      return;
    }
    try {
      const roomName = $('activeRoomName').textContent;
      const roomGame = $('activeRoomGame').textContent;
      
      await addDoc(collection(db, 'global_chat'), {
        userId: userProfile.uid,
        userName: userProfile.name,
        userAvatar: userProfile.av || 'https://api.dicebear.com/7.x/bottts/svg?seed=ax1',
        text: `[Voice Invite to "${roomName}"]`,
        originalText: `[Voice Invite to "${roomName}"]`,
        isVoiceRoomInvite: true,
        voiceRoomId: currentVoiceRoomId,
        voiceRoomName: roomName,
        voiceRoomGame: roomGame,
        avatarFrame: (userProfile.avatarFrame || localStorage.getItem('selectedAvatarFrame') || 'none'),
        createdAt: serverTimestamp()
      });
      
      $('mInviteFriendToVoice').classList.add('hidden');
      showToastNotification("Broadcasted 📣", "Live Squad invitation posted to Global Chat successfully!");
    } catch (err) {
      console.error("Error broadcasting voice room to global:", err);
      showToastNotification("Error", "Could not broadcast invite.");
    }
  });
}

if ($('btnShareVoiceDMs')) {
  $('btnShareVoiceDMs').addEventListener('click', () => {
    // Simply scroll/focus friends list inside the modal to send individually via DMs
    showToastNotification("Select Friend ✉️", "Click 'Invite' next to any online friend below to send a DM invite instantly!");
    const list = $('voiceInviteFriendsList');
    if (list) {
      list.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// Send DMs perfectly
$('dmSendBtn').addEventListener('click', () => sendDirectMessage());
$('dmInp').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendDirectMessage();
});

async function sendDirectMessage() {
  if (checkIfMuted()) {
    return;
  }
  const txt = $('dmInp').value.trim();
  if (!txt || !activeDMFriendUid) return;
  $('dmInp').value = '';

  const roomId = [userProfile.uid, activeDMFriendUid].sort().join('_');
  try {
    await addDoc(collection(db, 'dms', roomId, 'messages'), {
      text: txt,
      sender: userProfile.uid,
      senderName: userProfile.name,
      createdAt: serverTimestamp()
    });

    // Send push notification to the active DM friend
    if (typeof window.sendPersonalNotification === 'function') {
      window.sendPersonalNotification(activeDMFriendUid, {
        title: userProfile.name || 'ArenaX Player',
        body: txt.length > 100 ? txt.slice(0, 97) + '...' : txt,
        icon: userProfile.av || 'arenax_logo.jpg',
        url: 'https://arenax.cyou/#chat',
        data: { type: 'dm', chatId: roomId, senderUid: userProfile.uid }
      }).catch(console.warn);
    }
  } catch (err) {
    console.error('Error sending DM: ', err);
  }
}

// ── CUSTOMER SUPPORT CHAT FIX & BOT SYNC ──
let supportEscalated = false;
let activeAdminId = "none";
let selectedRating = 5;

function loadLiveSupportChat() {
  const profile = userProfile || guestProfile;
  if (!profile || guestProfile) return;

  const uid = profile.uid || profile.id;
  const ticketId = uid + '_ticket';
  
  if (supportUnsub) {
    supportUnsub();
    supportUnsub = null;
  }
  if (supportRequestUnsub) {
    supportRequestUnsub();
    supportRequestUnsub = null;
  }

  // Real-time listen to user's live support admin request status
  supportRequestUnsub = onSnapshot(doc(db, 'support_requests', uid), (docSnap) => {
    const chatBox = $('chatBox');
    const ratingBox = $('ratingBox');
    const statusText = $('statusIndicatorText');
    const statusDot = $('statusIndicatorDot');
    const bConnectAdmin = $('bConnectAdmin');
    const bEndChat = $('bEndChat');

    if (!docSnap.exists()) {
      // Normal state / No request active (AI Chatbot)
      statusText.textContent = "AI Chatbot Active";
      statusDot.className = "w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse";
      bConnectAdmin.classList.remove('hidden');
      bEndChat.classList.add('hidden');
      chatBox.classList.remove('hidden');
      ratingBox.classList.add('hidden');
    } else {
      const data = docSnap.data();
      const status = data.status;
      const adminName = data.adminName || "Admin";
      activeAdminId = data.adminId || "none";

      if (status === 'waiting') {
        statusText.textContent = "⏳ Waiting for Admin...";
        statusDot.className = "w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse";
        bConnectAdmin.classList.add('hidden');
        bEndChat.classList.remove('hidden');
        chatBox.classList.remove('hidden');
        ratingBox.classList.add('hidden');
      } else if (status === 'connected') {
        statusText.textContent = `🟢 Connected with Admin (${adminName})`;
        statusDot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse";
        bConnectAdmin.classList.add('hidden');
        bEndChat.classList.remove('hidden');
        chatBox.classList.remove('hidden');
        ratingBox.classList.add('hidden');
      } else if (status === 'ended') {
        // Show Rating Screen!
        chatBox.classList.add('hidden');
        ratingBox.classList.remove('hidden');
      }
    }
  }, (err) => {
    console.warn("Error listening to support request status:", err);
  });

  // Persist escalation status from database
  getDoc(doc(db, 'support_tickets', ticketId)).then((ticketDoc) => {
    if (ticketDoc.exists()) {
      const data = ticketDoc.data();
      supportEscalated = data.status === 'escalated';
    } else {
      supportEscalated = false;
    }
  }).catch((err) => console.warn('Failed to fetch ticket status:', err));

  const q = query(collection(db, 'support', ticketId, 'messages'), orderBy('createdAt', 'asc'));
  supportUnsub = onSnapshot(q, (snap) => {
    currentSupportMessages = [];
    const box = $('chatMsgs');
    box.innerHTML = '';

    snap.forEach(d => {
      const m = d.data();
      currentSupportMessages.push(m);
      const isMe = m.sender === 'user';
      const isBot = m.sender === 'bot';
      const isAdmin = m.sender === 'admin';

      let bgCls = 'bg-card border-bdr text-t1 rounded-tl-none';
      let flexCls = '';
      let senderLabel = m.senderName || 'Player';
      let icon = '<i class="fas fa-headset"></i>';

      if (isMe) {
        bgCls = 'bg-gold border-gold text-bg font-semibold rounded-tr-none';
        flexCls = 'flex-row-reverse';
        senderLabel = 'You';
        icon = '<i class="fas fa-user"></i>';
      } else if (isBot) {
        bgCls = 'bg-ele border-bdr text-t1 rounded-tl-none';
        senderLabel = 'Support Bot';
        icon = '<i class="fas fa-robot"></i>';
      } else if (isAdmin) {
        bgCls = 'bg-red/15 border-red/25 text-red rounded-tl-none font-medium';
        senderLabel = 'Moderator Admin';
        icon = '<i class="fas fa-shield-alt text-red"></i>';
      }

      const wrap = document.createElement('div');
      wrap.className = `flex ${flexCls} gap-2.5 max-w-[85%] ${isMe ? 'ml-auto' : ''}`;
      wrap.innerHTML = `
        <div class="w-7 h-7 bg-card border border-bdr rounded-full flex items-center justify-center text-[10px] flex-shrink-0">
          ${icon}
        </div>
        <div class="min-w-0 flex-1">
          <span class="text-[9px] text-t3 uppercase font-bold tracking-wider block mb-0.5 ${isMe?'text-right':''}">${senderLabel}</span>
          <div class="p-3 border rounded-xl text-xs leading-relaxed break-words ${bgCls}">
            ${m.text}
          </div>
        </div>
      `;
      box.appendChild(wrap);
    });

    if (snap.empty) {
      // Restore default bot choices
      box.innerHTML = `
        <div class="flex gap-2">
          <div class="w-7 h-7 rounded-full bg-gold/10 text-gold border border-gold/20 flex items-center justify-center text-xs flex-shrink-0">
            <i class="fas fa-robot"></i>
          </div>
          <div class="max-w-[75%] bg-ele border border-bdr text-t1 rounded-xl p-3 rounded-tl-none space-y-2 leading-relaxed">
            <p>👋 Welcome to ArenaX support chat! How can we assist you today?</p>
            <div class="flex flex-wrap gap-1.5 pt-1.5">
              <button class="qrb px-2.5 py-1 bg-gold/5 border border-gold/20 hover:bg-gold/10 text-gold text-[10px] rounded-full transition" data-m="How to deposit?">How to deposit?</button>
              <button class="qrb px-2.5 py-1 bg-gold/5 border border-gold/20 hover:bg-gold/10 text-gold text-[10px] rounded-full transition" data-m="How to register for tournament?">Tournament Registration</button>
              <button class="qrb px-2.5 py-1 bg-gold/5 border border-gold/20 hover:bg-gold/10 text-gold text-[10px] rounded-full transition" data-m="How to withdraw?">How to withdraw?</button>
              <button class="qrb px-2.5 py-1 bg-gold/5 border border-gold/20 hover:bg-gold/10 text-gold text-[10px] rounded-full transition" data-m="Account banned?">Account Banned?</button>
            </div>
          </div>
        </div>`;
    }
    box.scrollTop = box.scrollHeight;
  });
}

// Intercept clicks on support bot option chips
document.addEventListener('click', (e) => {
  const chip = e.target.closest('.qrb');
  if (chip) {
    sendSupportMessage(chip.dataset.m);
  }
});

$('chatSend').addEventListener('click', () => sendSupportMessage());
$('chatIn').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendSupportMessage();
});

// Connect with Admin Button Handler
$('bConnectAdmin').addEventListener('click', async () => {
  const profile = userProfile || guestProfile;
  if (!profile || guestProfile) return;
  const uid = profile.uid || profile.id;
  const ticketId = uid + '_ticket';

  try {
    // 1. Save to support_requests collection
    await setDoc(doc(db, 'support_requests', uid), {
      userId: uid,
      userName: userProfile.name || 'Player',
      status: 'waiting',
      createdAt: serverTimestamp()
    });

    // 2. Add message logs to chat messages to keep record
    const messagesCol = collection(db, 'support', ticketId, 'messages');
    await addDoc(messagesCol, {
      text: '⏳ Connecting you to a live agent... Please wait while an administrator joins the chat.',
      sender: 'bot',
      senderName: 'Support Bot',
      createdAt: serverTimestamp()
    });

    // Update the support ticket status
    await setDoc(doc(db, 'support_tickets', ticketId), {
      id: ticketId,
      ticketId: ticketId,
      uid: uid,
      userName: userProfile.name || 'Player',
      userHandle: userProfile.handle || 'player',
      lastMsg: '[Bot]: Connecting live agent...',
      status: 'open',
      updatedAt: serverTimestamp()
    }, { merge: true });

  } catch (err) {
    console.error('Error connecting to admin:', err);
  }
});

// End Chat Button Handler
$('bEndChat').addEventListener('click', async () => {
  const profile = userProfile || guestProfile;
  if (!profile || guestProfile) return;
  const uid = profile.uid || profile.id;

  if (confirm('Are you sure you want to end this live support session?')) {
    try {
      await updateDoc(doc(db, 'support_requests', uid), {
        status: 'ended',
        endedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error ending chat:', err);
    }
  }
});

// Star buttons click interactions for feedback
document.querySelectorAll('.star-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const val = parseInt(btn.dataset.val);
    selectedRating = val;
    document.querySelectorAll('.star-btn').forEach(star => {
      const starVal = parseInt(star.dataset.val);
      if (starVal <= val) {
        star.classList.add('text-gold');
        star.classList.remove('text-t3');
      } else {
        star.classList.remove('text-gold');
        star.classList.add('text-t3');
      }
    });
  });
});

// Submit Rating Handler
$('bSubmitRating').addEventListener('click', async () => {
  const profile = userProfile || guestProfile;
  if (!profile || guestProfile) return;
  const uid = profile.uid || profile.id;

  try {
    // 1. Save rating to Firestore support_ratings
    await addDoc(collection(db, 'support_ratings'), {
      userId: uid,
      adminId: activeAdminId || 'none',
      rating: selectedRating,
      feedback: $('feedbackText').value.trim(),
      createdAt: serverTimestamp()
    });

    // 2. Delete support request document to completely reset status
    await deleteDoc(doc(db, 'support_requests', uid));

    // Clear feedback input and reset stars
    $('feedbackText').value = '';
    selectedRating = 5;
    document.querySelectorAll('.star-btn').forEach(star => {
      star.classList.add('text-gold');
      star.classList.remove('text-t3');
    });

    alert('Thank you for your feedback! Your rating was submitted successfully. ✅');
  } catch (err) {
    console.error('Error submitting rating:', err);
  }
});

// Sync both user message and automatic bot responses into Firestore!
const BOT_AUTO_ANSWERS = [
  { keys: ['deposit', 'recharge', 'pay', 'paisa'], ans: '💰 To deposit funds, go to the Wallet tab, click "Recharge", send PKR to JazzCash (0302-4686897) or NayaPay (0303-9229405), and submit your TXN ID. Admin will credit your AX Coins within 15-30 minutes!' },
  { keys: ['register', 'join', 'tournament', 'slot'], ans: '🏆 To register for a tournament, browse available tournaments on the Dashboard, select one, click "Register / Join Slot", and fill in your game profile details. Waiting for admin approval takes around 10-15 mins.' },
  { keys: ['withdraw', 'cashout', 'earnings'], ans: '💸 To withdraw your AX Coins, head to Wallet -> Withdraw, input your desired cashout amount and JazzCash or NayaPay account details. Approved withdrawals are processed within 24-48 hours.' },
  { keys: ['ban', 'suspend', 'block', 'cheat'], ans: '🚫 If your account is banned or you have reports of illegal scripts, our Anti-Cheat system issues permanent locks. You can file a "Red Report" under the Help Desk or contact our support staff for manual verification.' },
];

async function sendSupportMessage(customTxt) {
  const txt = (customTxt || $('chatIn').value).trim();
  if (!txt) return;
  if (!customTxt) $('chatIn').value = '';

  const profile = userProfile || guestProfile;
  if (!profile) return;
  const uid = profile.uid || profile.id;
  const ticketId = uid + '_ticket';
  const messagesCol = collection(db, 'support', ticketId, 'messages');

  try {
    // 1. Write user message to Firestore
    await addDoc(messagesCol, {
      text: txt,
      sender: 'user',
      senderName: profile.name || 'Player',
      createdAt: serverTimestamp()
    });

    // Create Support ticket index reference in Firestore for admin to view
    await setDoc(doc(db, 'support_tickets', ticketId), {
      id: ticketId,
      ticketId: ticketId,
      uid: uid,
      userName: profile.name || 'Player',
      userHandle: profile.handle || 'player',
      lastMsg: txt,
      status: supportEscalated ? 'escalated' : 'open',
      updatedAt: serverTimestamp()
    }, { merge: true });

    // 2. Generate and write automatic bot replies directly to Firestore to keep sync!
    if (supportEscalated) {
      // Ticket is already escalated, let humans handle it
      return;
    }

    const lower = txt.toLowerCase();
    
    // Explicit escalation keywords
    if (['agent', 'human', 'mod', 'admin', 'connect'].some(k => lower.includes(k))) {
      setTimeout(async () => {
        await addDoc(messagesCol, {
          text: 'Connecting you to a live agent... Click the "🔴 Connect with Admin" button above or let me queue you automatically!',
          sender: 'bot',
          senderName: 'Support Bot',
          createdAt: serverTimestamp()
        });
        // Automatically click connect to admin button to trigger queueing
        $('bConnectAdmin').click();
      }, 500);
      return;
    }

    // Call server-side Gemini AI support chat route!
    try {
      // Map history for Gemini backend
      const history = (currentSupportMessages || [])
        .filter(m => m.sender === 'user' || m.sender === 'bot')
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          text: m.text
        }));

      const cleanProfile = profile ? {
        name: profile.name,
        handle: profile.handle,
        balance: profile.balance || 0,
        premium: profile.premium || false
      } : null;

      const cleanTournaments = (toursData || []).map(t => ({
        name: t.name,
        game: t.game,
        entryFee: t.entryFee,
        prize: t.prize,
        status: t.status,
        registered: t.registered,
        maxPlayers: t.maxPlayers
      }));

      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: txt,
          history: history,
          userProfile: cleanProfile,
          tournaments: cleanTournaments
        })
      });

      if (!res.ok) throw new Error('API server returned error');
      const data = await res.json();
      let replyStr = data.text;

      if (replyStr.includes('[ESCALATE]')) {
        supportEscalated = true;
        replyStr = replyStr.replace('[ESCALATE]', '').trim();
        
        setTimeout(async () => {
          await addDoc(messagesCol, {
            text: replyStr,
            sender: 'bot',
            senderName: 'Support Bot',
            createdAt: serverTimestamp()
          });
          await addDoc(messagesCol, {
            text: '🔄 [Ticket Escalated]: Connecting to live human agent moderator... Your query has been marked as high-priority. Please wait!',
            sender: 'bot',
            senderName: 'Support Bot',
            createdAt: serverTimestamp()
          });
          await updateDoc(doc(db, 'support_tickets', ticketId), {
            status: 'escalated',
            lastMsg: '[Bot]: Ticket escalated to live admin.',
            updatedAt: serverTimestamp()
          });
        }, 700);
      } else {
        setTimeout(async () => {
          await addDoc(messagesCol, {
            text: replyStr,
            sender: 'bot',
            senderName: 'Support Bot',
            createdAt: serverTimestamp()
          });
          await updateDoc(doc(db, 'support_tickets', ticketId), {
            lastMsg: `[Bot]: ${replyStr}`,
            updatedAt: serverTimestamp()
          });
        }, 700);
      }
    } catch (apiErr) {
      console.warn("Gemini support API failed, falling back to keywords:", apiErr);
      // Fallback to basic keyword rules
      const matchRule = BOT_AUTO_ANSWERS.find(r => r.keys.some(k => lower.includes(k)));
      const replyStr = matchRule ? matchRule.ans : 'I am support bot assistant. Type "agent" to connect with a live administrator moderator directly.';
      
      setTimeout(async () => {
        await addDoc(messagesCol, {
          text: replyStr,
          sender: 'bot',
          senderName: 'Support Bot',
          createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, 'support_tickets', ticketId), {
          lastMsg: `[Bot]: ${replyStr}`,
          updatedAt: serverTimestamp()
        });
      }, 700);
    }
  } catch (err) {
    console.error('Error writing support log: ', err);
  }
}



// Global Window Attachments
window.loadFriendSystem = loadFriendSystem;
window.acceptFriendRequest = acceptFriendRequest;
window.declineFriendRequest = declineFriendRequest;
window.openTasksModal = openTasksModal;
window.closeTasksModal = closeTasksModal;
window.updateTasksFrameButtonState = updateTasksFrameButtonState;
window.openRankingModal = openRankingModal;
window.renderVanillaRankingList = renderVanillaRankingList;
window.initGlobalChat = initGlobalChat;
window.renderGlobalMessages = renderGlobalMessages;
window.updateChatUnreadDot = updateChatUnreadDot;
window.updateSubGlobalDot = updateSubGlobalDot;
window.setGlobalTypingState = setGlobalTypingState;
window.handleGlobalInputKeyPress = handleGlobalInputKeyPress;
window.checkIfMuted = checkIfMuted;
window.openFriendDM = openFriendDM;
window.sendDirectMessage = sendDirectMessage;
window.loadLiveSupportChat = loadLiveSupportChat;
window.sendSupportMessage = sendSupportMessage;

