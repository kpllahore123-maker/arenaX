// ==========================================
// ARENAX POPULARITY & GIFTS SYSTEM
// ==========================================

window.openPopularityHistoryModal = async function() {
  const modal = $('mPopularityHistoryModal');
  const container = $('popHistoryListContainer');
  const subtitle = $('popHistorySubtitle');
  if (!modal || !container) return;

  const targetUid = window.currentViewingPlayerId || (window.currentViewedUser && window.currentViewedUser.uid);
  const targetName = window.currentViewingPlayerName || 'Player';

  if (subtitle) subtitle.textContent = `Recent gifts received by ${targetName}`;

  modal.classList.remove('hidden');

  container.innerHTML = `
    <div class="p-8 text-center text-gray-400 text-xs">
      <i class="fas fa-circle-notch animate-spin text-lg text-rose-400 mb-2"></i>
      <p>Loading popularity history...</p>
    </div>
  `;

  if (!targetUid) {
    container.innerHTML = `<div class="p-8 text-center text-gray-400 text-xs">No history found</div>`;
    return;
  }

  try {
    const q = query(
      collection(db, 'users', targetUid, 'popularityHistory'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML = `
        <div class="p-8 text-center text-gray-400 space-y-2">
          <div class="text-3xl">🌹</div>
          <p class="text-xs font-bold text-gray-300">No popularity gifts received yet</p>
          <p class="text-[10px] text-gray-500">Be the first to send a Rose, Rocket, or Trophy!</p>
        </div>
      `;
      return;
    }

    const basePath = (typeof window.getAppBasePath === 'function') ? window.getAppBasePath() : './';

    container.innerHTML = '';
    snap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const isRose = data.type === 'rose';
      const isRocket = data.type === 'rocket';
      const isTrophy = data.type === 'trophy';

      let giftIcon = basePath + 'rose.png';
      let giftName = 'Rose 🌹';
      let defaultPopGain = 1;

      if (isRocket) {
        giftIcon = basePath + 'rocket.png';
        giftName = 'Rocket 🚀';
        defaultPopGain = 10;
      } else if (isTrophy) {
        giftIcon = basePath + 'poptrophy.png';
        giftName = 'Trophy 🏆';
        defaultPopGain = 20;
      }

      const popAmount = data.popGain || defaultPopGain;

      let dateStr = 'Recently';
      let timeStr = '';
      if (data.timestamp && data.timestamp.toDate) {
        const dt = data.timestamp.toDate();
        dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        timeStr = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }

      const row = document.createElement('div');
      row.className = "p-3 rounded-2xl bg-[#141726] border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition";

      row.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
          <img src="${data.senderAv || 'https://api.dicebear.com/7.x/bottts/svg?seed=ax'}" onclick="window.openPlayerProfileCard('${data.senderUid}')" class="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0 cursor-pointer shadow-xs hover:scale-105 transition" />
          <div class="min-w-0">
            <div onclick="window.openPlayerProfileCard('${data.senderUid}')" class="font-bold text-xs text-white truncate cursor-pointer hover:text-rose-400 transition">
              ${data.senderName || 'Anonymous'}
            </div>
            <div class="flex items-center gap-1.5 mt-0.5 text-[11px] font-semibold ${isTrophy ? 'text-amber-300' : (isRocket ? 'text-amber-400' : 'text-rose-300')}">
              <img src="${giftIcon}" class="w-4 h-4 object-contain inline-block" />
              <span>Sent ${giftName} (+${popAmount})</span>
            </div>
          </div>
        </div>

        <div class="text-right shrink-0">
          <div class="text-[11px] font-bold text-gray-300 font-mono">${dateStr}</div>
          <div class="text-[10px] text-gray-500 font-medium font-mono">${timeStr}</div>
        </div>
      `;

      container.appendChild(row);
    });

  } catch (err) {
    console.error("Error loading popularity history:", err);
    container.innerHTML = `<div class="p-8 text-center text-red-400 text-xs">Failed to load history</div>`;
  }
};

window.closePopularityHistoryModal = function() {
  const modal = $('mPopularityHistoryModal');
  if (modal) modal.classList.add('hidden');
};

// ── GIFT BOTTOM SHEET FUNCTIONS ──
window.selectedGiftItemType = 'rose';

window.openGiftBottomSheet = function() {
  const sheet = $('mGiftBottomSheet');
  if (!sheet) return;

  const basePath = (typeof window.getAppBasePath === 'function') ? window.getAppBasePath() : './';
  if ($('bsImgRose')) $('bsImgRose').src = basePath + 'rose.png';
  if ($('bsImgRocket')) $('bsImgRocket').src = basePath + 'rocket.png';
  if ($('bsImgTrophy')) $('bsImgTrophy').src = basePath + 'poptrophy.png';

  const recipientName = (window.currentViewedUser && (window.currentViewedUser.name || window.currentViewedUser.userName)) || window.currentViewingPlayerName || 'Player';
  const recipientAv = (window.currentViewedUser && (window.currentViewedUser.av || window.currentViewedUser.avatar)) || window.currentViewingPlayerAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=ax';

  if ($('bsGiftRecipientName')) $('bsGiftRecipientName').textContent = recipientName;
  if ($('bsGiftRecipientAv')) $('bsGiftRecipientAv').src = recipientAv;

  const currentSender = userProfile || window.userProfile || window.currentUser;
  const bal = (currentSender && currentSender.balance !== undefined) ? currentSender.balance : 0;
  if ($('bsUserCoinBalance')) $('bsUserCoinBalance').textContent = Number(bal).toLocaleString();

  window.selectGiftItem('rose');
  sheet.classList.remove('hidden');
};

window.closeGiftBottomSheet = function() {
  const sheet = $('mGiftBottomSheet');
  if (sheet) sheet.classList.add('hidden');
};

window.selectGiftItem = function(type) {
  window.selectedGiftItemType = type;
  const cardRose = $('bsCardRose');
  const cardRocket = $('bsCardRocket');
  const cardTrophy = $('bsCardTrophy');
  const checkRose = $('bsCheckRose');
  const checkRocket = $('bsCheckRocket');
  const checkTrophy = $('bsCheckTrophy');
  const helper = $('bsGiftHelperText');

  const activeStyle = 'relative p-2.5 sm:p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 sm:gap-1.5 cursor-pointer transition-all bg-gradient-to-b from-pink-500/15 via-[#1a1e34] to-[#121526] border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)] ring-1 ring-pink-500/50 scale-[1.02]';
  const inactiveStyle = 'relative p-2.5 sm:p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 sm:gap-1.5 cursor-pointer transition-all bg-[#141727] border-[#252b47] hover:border-pink-500/40';

  if (cardRose) cardRose.className = (type === 'rose') ? activeStyle : inactiveStyle;
  if (cardRocket) cardRocket.className = (type === 'rocket') ? activeStyle : inactiveStyle;
  if (cardTrophy) cardTrophy.className = (type === 'trophy') ? activeStyle : inactiveStyle;

  if (checkRose) checkRose.classList.toggle('hidden', type !== 'rose');
  if (checkRocket) checkRocket.classList.toggle('hidden', type !== 'rocket');
  if (checkTrophy) checkTrophy.classList.toggle('hidden', type !== 'trophy');

  if (helper) {
    if (type === 'rose') helper.textContent = "Receiver's Charm +1 • Gain popularity & status boost";
    else if (type === 'rocket') helper.textContent = "Receiver's Charm +10 • Supercharge popularity & status boost";
    else if (type === 'trophy') helper.textContent = "Receiver's Charm +20 • Ultimate popularity & prestige boost";
  }
};

window.sendPopularityGiftItem = async function(type) {
  const currentSender = userProfile || window.userProfile || window.currentUser;
  if (!currentSender || !currentSender.uid) {
    alert("Please sign in to send popularity! ❌");
    return;
  }

  const recipientId = window.currentViewingPlayerId || (window.currentViewedUser && (window.currentViewedUser.uid || window.currentViewedUser.id));
  if (!recipientId) {
    alert("No recipient selected! ❌");
    return;
  }

  if (recipientId === currentSender.uid) {
    alert("You cannot send popularity to yourself! ❌");
    return;
  }

  const isRose = (type === 'rose');
  const isRocket = (type === 'rocket');
  const isTrophy = (type === 'trophy');

  let price = 10;
  let popGain = 1;
  let itemName = 'Rose';
  let emoji = '🌹';

  if (isRocket) {
    price = 100;
    popGain = 10;
    itemName = 'Rocket';
    emoji = '🚀';
  } else if (isTrophy) {
    price = 190;
    popGain = 20;
    itemName = 'Trophy';
    emoji = '🏆';
  }

  const balance = Number(currentSender.balance || 0);
  if (balance < price) {
    alert(`Insufficient AX Coins! You need ${price} AX Coins to send a ${itemName} ${emoji}. You currently have ${balance} AX Coins. Please deposit coins first. ❌`);
    return;
  }

  const submitBtn = $('bsSendGiftSubmitBtn');
  let origText = '';
  if (submitBtn) {
    submitBtn.disabled = true;
    origText = submitBtn.innerHTML;
    submitBtn.innerHTML = `<i class="fas fa-circle-notch animate-spin text-white"></i> Sending...`;
  }

  try {
    // 1. Deduct price from SENDER's Firestore document
    const senderRef = doc(db, 'users', currentSender.uid);
    await updateDoc(senderRef, {
      balance: increment(-price)
    });

    // Update SENDER local state in memory immediately
    const newSenderBal = Math.max(0, balance - price);
    currentSender.balance = newSenderBal;
    if (userProfile) userProfile.balance = newSenderBal;
    if (window.userProfile) window.userProfile.balance = newSenderBal;
    if (window.currentUser) window.currentUser.balance = newSenderBal;

    // Refresh ALL DOM balance displays instantly
    if ($('bsUserCoinBalance')) $('bsUserCoinBalance').textContent = Number(newSenderBal).toLocaleString();
    if ($('homeCoinsVal')) $('homeCoinsVal').textContent = Number(newSenderBal).toLocaleString();
    if ($('wBal')) $('wBal').textContent = Number(newSenderBal).toLocaleString();
    if ($('userCoinBalance')) $('userCoinBalance').textContent = Number(newSenderBal).toLocaleString();

    // 2. Add popularity, giftCount, roseCount/rocketCount/trophyCount to RECIPIENT's Firestore document
    const recipientRef = doc(db, 'users', recipientId);
    await updateDoc(recipientRef, {
      popularity: increment(popGain),
      giftCount: increment(popGain),
      roseCount: increment(isRose ? 1 : 0),
      rocketCount: increment(isRocket ? 1 : 0),
      trophyCount: increment(isTrophy ? 1 : 0)
    });

    // Save popularity history log entry
    try {
      const sName = currentSender.name || currentSender.userName || 'Player';
      const sAv = currentSender.av || currentSender.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentSender.uid}`;
      await addDoc(collection(db, 'users', recipientId, 'popularityHistory'), {
        senderUid: currentSender.uid,
        senderName: sName,
        senderAv: sAv,
        type: type,
        popGain: popGain,
        timestamp: serverTimestamp()
      });

      // Dispatch client push notification to the recipient
      if (typeof window.sendPersonalNotification === 'function') {
        const giftLabel = typeof window.formatGiftDisplayName === 'function' ? window.formatGiftDisplayName(type) : (type || 'Gift');
        window.sendPersonalNotification(recipientId, {
          title: "New Gift! 🎁",
          body: `${sName} sent you a ${giftLabel}`,
          icon: 'rose.png',
          url: 'https://arenax.cyou/#profile',
          data: { type: 'gift', senderUid: currentSender.uid, giftType: type }
        }).catch(console.warn);
      }
    } catch (e) {
      console.warn("Could not log popularity history:", e);
    }

    // Update RECIPIENT local state in memory & DOM immediately
    if (window.currentViewedUser && (window.currentViewedUser.uid === recipientId || window.currentViewedUser.id === recipientId)) {
      window.currentViewedUser.popularity = (window.currentViewedUser.popularity || 0) + popGain;
      window.currentViewedUser.giftCount = (window.currentViewedUser.giftCount || 0) + popGain;
      if (isRose) {
        window.currentViewedUser.roseCount = (window.currentViewedUser.roseCount || 0) + 1;
      } else if (isRocket) {
        window.currentViewedUser.rocketCount = (window.currentViewedUser.rocketCount || 0) + 1;
      } else if (isTrophy) {
        window.currentViewedUser.trophyCount = (window.currentViewedUser.trophyCount || 0) + 1;
      }
    }

    if ($('vPartPopularityVal')) {
      const cur = parseInt($('vPartPopularityVal').textContent) || 0;
      $('vPartPopularityVal').textContent = cur + popGain;
    }
    if ($('vppPopularityVal')) {
      const cur = parseInt($('vppPopularityVal').textContent) || 0;
      $('vppPopularityVal').textContent = cur + popGain;
    }
    if ($('vppGiftCount')) {
      const cur = parseInt($('vppGiftCount').textContent) || 0;
      $('vppGiftCount').textContent = cur + popGain;
    }
    if (isRose && $('vppRoseCountVal')) {
      const cur = parseInt($('vppRoseCountVal').textContent) || 0;
      $('vppRoseCountVal').textContent = cur + 1;
    }
    if (isRocket && $('vppRocketCountVal')) {
      const cur = parseInt($('vppRocketCountVal').textContent) || 0;
      $('vppRocketCountVal').textContent = cur + 1;
    }
    if (isTrophy && $('vppTrophyCountVal')) {
      const cur = parseInt($('vppTrophyCountVal').textContent) || 0;
      $('vppTrophyCountVal').textContent = cur + 1;
    }

    // Refresh carousel
    if (window.currentViewedUser) {
      const rVal = window.currentViewedUser.roseCount || 0;
      const rkVal = window.currentViewedUser.rocketCount || 0;
      const trVal = window.currentViewedUser.trophyCount || 0;
      const types = [];
      if (rVal > 0) types.push('rose');
      if (rkVal > 0) types.push('rocket');
      if (trVal > 0) types.push('trophy');
      if (typeof window.startVppCarousel === 'function') {
        window.startVppCarousel(types);
      }
    }

    // 3. Log transaction in deposit_requests collection
    const txnId = 'POP-' + Math.floor(100000 + Math.random() * 900000);
    const recipientName = window.currentViewingPlayerName || (window.currentViewedUser && (window.currentViewedUser.name || window.currentViewedUser.userName)) || 'Player';
    await addDoc(collection(db, 'deposit_requests'), {
      userId: currentSender.uid,
      userName: currentSender.name || currentSender.userName || 'Player',
      userHandle: currentSender.handle || '',
      amountPKR: 0,
      amountAX: price,
      method: `Popularity ${itemName} Sent to ${recipientName}`,
      txnId: txnId,
      status: 'approved',
      type: 'withdrawal',
      submittedAt: serverTimestamp()
    });

    // Display success msg
    const successMsg = $('popSuccessMsg');
    if (successMsg) {
      successMsg.textContent = `You sent a ${itemName} to ${recipientName}! +${popGain} Popularity! ${emoji}`;
      successMsg.classList.remove('hidden');
    }

    // Close bottom sheet
    window.closeGiftBottomSheet();

    // 4. Play Lottie splash overlay (Fully transparent overlay)
    const splashId = isRose ? 'rose-popularity-splash' : (isRocket ? 'rocket-popularity-splash' : 'trophy-popularity-splash');
    const lottieId = isRose ? 'roseSplashLottie' : (isRocket ? 'rocketSplashLottie' : 'trophySplashLottie');
    const splash = $(splashId);
    const player = document.getElementById(lottieId);
    
    if (player && typeof player.stop === 'function') {
      player.stop();
      player.play();
    }
    
    if (splash) {
      splash.classList.remove('hidden');
      splash.offsetHeight;
      splash.style.opacity = '1';
      setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => {
          splash.classList.add('hidden');
        }, 300);
      }, isRose ? 2000 : (isRocket ? 3000 : 3500));
    }

    if (typeof showToastNotification === 'function') {
      showToastNotification(`${itemName} Sent ${emoji}`, `+${popGain} Popularity sent to ${recipientName}! (-${price} AX Coins)`);
    }

  } catch (error) {
    console.error("Error sending popularity:", error);
    alert("Failed to send popularity: " + (error.message || error));
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      if (origText) submitBtn.innerHTML = origText;
    }
  }
};

window.submitGiftSendFromBottomSheet = function() {
  window.sendPopularityGiftItem(window.selectedGiftItemType);
};

// ── TOGGLE POPULARITY TRAY EVENT HANDLER ──
if ($('btnTogglePopularity')) {
  $('btnTogglePopularity').addEventListener('click', () => {
    window.openGiftBottomSheet();
  });
}

// ── SEND ROSE POPULARITY EVENT HANDLER ──
if ($('btnSendRose')) {
  $('btnSendRose').addEventListener('click', () => {
    window.sendPopularityGiftItem('rose');
  });
}

// ── SEND ROCKET POPULARITY EVENT HANDLER ──
if ($('btnSendRocket')) {
  $('btnSendRocket').addEventListener('click', () => {
    window.sendPopularityGiftItem('rocket');
  });
}



// Global Window Attachments
window.openPopularityHistoryModal = window.openPopularityHistoryModal;
window.closePopularityHistoryModal = window.closePopularityHistoryModal;
window.openGiftBottomSheet = window.openGiftBottomSheet;
window.closeGiftBottomSheet = window.closeGiftBottomSheet;
window.selectGiftItem = window.selectGiftItem;
window.sendPopularityGiftItem = window.sendPopularityGiftItem;
window.submitGiftSendFromBottomSheet = window.submitGiftSendFromBottomSheet;
window.triggerFloatingGiftAnimation = window.triggerFloatingGiftAnimation;
