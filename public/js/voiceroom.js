// ==========================================
// ARENAX VOICE ROOMS SYSTEM & AUDIO STREAMING
// ==========================================


// ==================== ARENAX VOICE ROOMS SYSTEM ====================
let currentVoiceRoomId = null;
let voiceRoomsList = [];
let voiceRoomsUnsub = null;
let userSubmissionsUnsub = null;
let activeRoomMembersUnsub = null;
let activeRoomChatUnsub = null;
let activeRoomSignalingUnsub = null;
let activeRoomDocUnsub = null;

// Alone host inactivity warning countdown timer
let aloneCountdownInterval = null;
let aloneSecondsLeft = 30;
let wasIInRoomPreviously = false;

// Web Audio API boosted audio nodes
let remoteAudioContexts = {}; // peerId -> AudioContext
let remoteAudioGainNodes = {}; // peerId -> GainNode

// WebRTC State
let localStream = null;
let peerConnections = {}; // uid -> RTCPeerConnection
let makingOffer = {}; // peerId -> boolean
let ignoreOffer = {}; // peerId -> boolean
let lastProcessedOfferSdp = {}; // peerId -> string
let processedSignalIds = new Set(); // Set of processed signal message IDs
const iceServers = {
  iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "716b790d0c0f402d3c231ddc",
      credential: "t3yPYOapJ5VoWN13",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "716b790d0c0f402d3c231ddc",
      credential: "t3yPYOapJ5VoWN13",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "716b790d0c0f402d3c231ddc",
      credential: "t3yPYOapJ5VoWN13",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "716b790d0c0f402d3c231ddc",
      credential: "t3yPYOapJ5VoWN13",
    },
  ]
};

// User's voice state and feedback loopback controllers
let isMicMuted = false;
let isSpeakerMuted = false;
let pttActive = false;
let pttEnabled = false;

// Safe Military/Tactical Mic Loopback and audio test variables
let localLoopbackCtx = null;
let localLoopbackSource = null;
let localLoopbackGain = null;

function toggleLocalMicLoopback(enable) {
  // Clean up any existing loopback
  if (localLoopbackSource) {
    try { localLoopbackSource.disconnect(); } catch(e){}
    localLoopbackSource = null;
  }
  if (localLoopbackCtx) {
    try { localLoopbackCtx.close(); } catch(e){}
    localLoopbackCtx = null;
  }

  if (!enable || !localStream || isMicMuted || isSpeakerMuted) {
    return;
  }

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    localLoopbackCtx = new AudioCtx();
    localLoopbackSource = localLoopbackCtx.createMediaStreamSource(localStream);

    // Apply feedback-safe tactical radio filtering (bandpass)
    const filter = localLoopbackCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, localLoopbackCtx.currentTime); // standard 1kHz walkie-talkie bandpass
    filter.Q.setValueAtTime(1.2, localLoopbackCtx.currentTime);

    // Apply 220ms military-radio latency delay to eliminate raw howling loopback feedback
    const delay = localLoopbackCtx.createDelay(1.0);
    delay.delayTime.setValueAtTime(0.22, localLoopbackCtx.currentTime);

    // Set comfortable spatial loopback gain (comfortable feedback-safe volume)
    localLoopbackGain = localLoopbackCtx.createGain();
    localLoopbackGain.gain.setValueAtTime(0.25, localLoopbackCtx.currentTime);

    // Pipe stream: Source -> Bandpass filter -> Radio latency Delay -> Gain -> Speakers
    localLoopbackSource.connect(filter);
    filter.connect(delay);
    delay.connect(localLoopbackGain);
    localLoopbackGain.connect(localLoopbackCtx.destination);

    console.log("[Audio Engine] Active tactical squad loopback initialized (feedback-safe bandpass + 220ms radio delay).");
  } catch(err) {
    console.warn("Could not start local mic loopback:", err);
  }
}

// Procedural Military Radio static squelch noise burst generator!
function playRadioSquelchClick(isRelease) {
  if (isSpeakerMuted) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    
    // Generate white noise buffer
    const bufferSize = ctx.sampleRate * (isRelease ? 0.15 : 0.08); // 80ms-150ms noise burst
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;
    
    // Bandpass filter to sound exactly like a walkie-talkie speaker click
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isRelease ? 700 : 1200, ctx.currentTime);
    filter.Q.setValueAtTime(1.8, ctx.currentTime);
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(isRelease ? 0.04 : 0.06, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isRelease ? 0.15 : 0.08));
    
    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    noiseNode.start();
  } catch(e){}
}

// Initialize Voice Room Subsystem
function initVoiceRoomsSystem() {
  const btnCreate = $('btnCreateVoiceRoom');
  const btnCloseCreate = $('bCloseCreateVoiceRoom');
  const modalCreate = $('mCreateVoiceRoom');
  const formCreate = $('createVoiceRoomForm');
  const selectType = $('cvType');
  const selectGameFilter = document.querySelectorAll('.game-filter-pill');
  const voiceSearch = $('voiceSearchInput');
  const btnRefresh = $('btnRefreshVoiceLobby');

  // Custom Cover Picker logic in Create Modal
  let selectedCoverFile = null;
  const coverInput = $('cvCoverInput');
  const coverBox = $('cvCoverBox');
  const coverPreview = $('cvCoverPreview');
  const coverPlaceholder = $('cvCoverPlaceholder');

  if (coverBox && coverInput) {
    coverBox.addEventListener('click', () => coverInput.click());
    coverInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        selectedCoverFile = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          coverPreview.src = ev.target.result;
          coverPreview.classList.remove('hidden');
          coverPlaceholder.classList.add('hidden');
        };
        reader.readAsDataURL(selectedCoverFile);
      }
    });
  }

  // Tag Selection Pills
  let selectedTag = "Talk";
  const tagPills = document.querySelectorAll('.cv-tag-pill');
  tagPills.forEach(pill => {
    pill.addEventListener('click', () => {
      tagPills.forEach(p => {
        p.classList.remove('bg-emerald-500/20', 'text-emerald-300', 'border-emerald-500/50');
        p.classList.add('bg-card', 'text-t2', 'border-bdr');
      });
      pill.classList.remove('bg-card', 'text-t2', 'border-bdr');
      pill.classList.add('bg-emerald-500/20', 'text-emerald-300', 'border-emerald-500/50');
      selectedTag = pill.dataset.tag || "Talk";
    });
  });

  // Seat Selection Pills
  let selectedSeatsCount = 8;
  const seatPills = document.querySelectorAll('.cv-seat-pill');
  seatPills.forEach(pill => {
    pill.addEventListener('click', () => {
      seatPills.forEach(p => {
        p.classList.remove('bg-emerald-500/20', 'text-emerald-300', 'border-emerald-500/50');
        p.classList.add('bg-card', 'text-t2', 'border-bdr');
      });
      pill.classList.remove('bg-card', 'text-t2', 'border-bdr');
      pill.classList.add('bg-emerald-500/20', 'text-emerald-300', 'border-emerald-500/50');
      selectedSeatsCount = parseInt(pill.dataset.seats) || 8;
    });
  });

  // Helper function to upload cover to Cloudinary
  async function uploadCoverToCloudinary(file) {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'drxzyeghf';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'unsigned_preset';
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Cloudinary upload failed');
    const data = await res.json();
    return data.secure_url;
  }
  
  // Navigation hook
  const voiceNavBtn = document.querySelector('.ni[data-t="Voice"]');
  if (voiceNavBtn) {
    voiceNavBtn.addEventListener('click', () => {
      listenToVoiceRooms();
    });
  }

  // Create Room modal trigger
  if (btnCreate) {
    btnCreate.addEventListener('click', () => {
      if (!userProfile) {
        showToastNotification("Authentication Required", "Please sign in to create a voice room!");
        return;
      }
      modalCreate.classList.remove('hidden');
    });
  }

  if (btnCloseCreate) {
    btnCloseCreate.addEventListener('click', () => {
      modalCreate.classList.add('hidden');
    });
  }

  // Toggle password field on room type change
  if (selectType) {
    selectType.addEventListener('change', (e) => {
      if (e.target.value === 'private') {
        $('cvPasswordWrap').classList.remove('hidden');
      } else {
        $('cvPasswordWrap').classList.add('hidden');
      }
    });
  }

  // Form submission
  if (formCreate) {
    formCreate.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const name = $('cvName').value.trim();
        const type = $('cvType').value;
        const password = type === 'private' ? $('cvPassword').value.trim() : "";
        const region = $('cvRegion').value;

        if (!name) return;

        let coverUrl = "";
        if (selectedCoverFile) {
          showToastNotification("Uploading Cover... 📸", "Preparing your room background...");
          try {
            coverUrl = await uploadCoverToCloudinary(selectedCoverFile);
          } catch (err) {
            console.warn("Cover upload fallback:", err);
          }
        }

        // Generate guaranteed unique document reference for new room
        const newRoomRef = doc(collection(db, 'voice_rooms'));
        await setDoc(newRoomRef, {
          name,
          roomTitle: name,
          tag: selectedTag,
          game: selectedTag,
          roomTag: selectedTag,
          maxPlayers: selectedSeatsCount,
          seats: selectedSeatsCount,
          maxSeats: selectedSeatsCount,
          coverUrl: coverUrl,
          coverImageUrl: coverUrl,
          type,
          isPrivate: type === 'private',
          password,
          region,
          hostId: userProfile.uid,
          hostName: userProfile.name,
          hostAvatar: userProfile.av || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + userProfile.uid,
          memberCount: 0,
          locked: false,
          createdAt: serverTimestamp()
        }, { merge: true });

        modalCreate.classList.add('hidden');
        formCreate.reset();
        $('cvPasswordWrap').classList.add('hidden');
        if (coverPreview) coverPreview.classList.add('hidden');
        if (coverPlaceholder) coverPlaceholder.classList.remove('hidden');
        selectedCoverFile = null;

        // Join the newly created room
        await joinVoiceRoom(newRoomRef.id);
        showToastNotification("Voice Room Live 🚀", `"${name}" is now ready!`);
      } catch (err) {
        console.error("Error creating room:", err);
        showToastNotification("Creation Failed ❌", "Could not deploy voice room. Try again.");
      }
    });
  }

  // Refresh Lobby button
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      listenToVoiceRooms();
      showToastNotification("Lobby Refreshed 🔄", "Fetched latest active voice rooms.");
    });
  }

  // Search input filter
  if (voiceSearch) {
    voiceSearch.addEventListener('input', () => {
      filterAndRenderVoiceRooms();
    });
  }

  // Category filter pills
  selectGameFilter.forEach(pill => {
    pill.addEventListener('click', () => {
      selectGameFilter.forEach(p => {
        p.classList.remove('bg-emerald-500/20', 'border-emerald-500/50', 'text-emerald-300');
        p.classList.add('bg-card', 'border-bdr', 'text-t2');
      });
      pill.classList.remove('bg-card', 'border-bdr', 'text-t2');
      pill.classList.add('bg-emerald-500/20', 'border-emerald-500/50', 'text-emerald-300');
      
      const game = pill.dataset.game;
      filterAndRenderVoiceRooms(game);
    });
  });

  // Setup invitation listener for current user
  onAuthStateChanged(auth, (fireUser) => {
    if (fireUser) {
      listenToInvitations(fireUser.uid);
    }
  });

  // Audio Toggle Mute
  const btnMute = $('btnVoiceToggleMute');
  if (btnMute) {
    btnMute.addEventListener('click', () => {
      toggleMyMicrophone();
    });
  }

  // Audio Toggle Deafen
  const btnDeafen = $('btnVoiceToggleDeafen');
  if (btnDeafen) {
    btnDeafen.addEventListener('click', () => {
      toggleMySpeakers();
    });
  }

  // Host Tools Modal Trigger & Events
  const btnHostTools = $('btnHostTools');
  const modalHostTools = $('mHostToolsModal');
  const btnCloseHostTools = $('bCloseHostTools');

  if (btnHostTools && modalHostTools) {
    btnHostTools.addEventListener('click', () => {
      modalHostTools.classList.remove('hidden');
    });
  }
  if (btnCloseHostTools && modalHostTools) {
    btnCloseHostTools.addEventListener('click', () => {
      modalHostTools.classList.add('hidden');
    });
  }

  // Host Tools Buttons
  $('btnToolWipeScreen')?.addEventListener('click', async () => {
    if (!currentVoiceRoomId) return;
    try {
      const chatSnap = await getDocs(collection(db, 'voice_rooms', currentVoiceRoomId, 'chats'));
      chatSnap.forEach(d => deleteDoc(d.ref));
      showToastNotification("Screen Wiped 🧹", "Cleared all messages in current room.");
      modalHostTools.classList.add('hidden');
    } catch (e) { console.error(e); }
  });

  const toolChangeBgBtn = $('btnToolChangeBg');
  const toolBgInput = $('cvCoverInputChange');
  if (toolChangeBgBtn && toolBgInput) {
    toolChangeBgBtn.addEventListener('click', () => toolBgInput.click());
    toolBgInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0] && currentVoiceRoomId) {
        showToastNotification("Updating Cover... 🖼️", "Uploading new cover background...");
        try {
          const newUrl = await uploadCoverToCloudinary(e.target.files[0]);
          await updateDoc(doc(db, 'voice_rooms', currentVoiceRoomId), { coverUrl: newUrl });
          showToastNotification("Cover Updated 🖼️", "Room background updated successfully.");
          modalHostTools.classList.add('hidden');
        } catch (err) {
          showToastNotification("Upload Error", "Could not update cover.");
        }
      }
    });
  }

  $('btnToolDeleteChat')?.addEventListener('click', async () => {
    if (!currentVoiceRoomId) return;
    try {
      const chatSnap = await getDocs(collection(db, 'voice_rooms', currentVoiceRoomId, 'chats'));
      chatSnap.forEach(d => deleteDoc(d.ref));
      showToastNotification("Chat Cleared 🗑️", "Deleted all messages.");
      modalHostTools.classList.add('hidden');
    } catch (e) {}
  });

  $('btnToolShare')?.addEventListener('click', () => {
    if (!currentVoiceRoomId) return;
    const roomUrl = window.location.origin + window.location.pathname + '?vroom=' + currentVoiceRoomId;
    navigator.clipboard?.writeText(roomUrl);
    showToastNotification("Link Copied 🔗", "Share link copied to clipboard!");
    modalHostTools.classList.add('hidden');
  });

  $('btnToolLockSeats')?.addEventListener('click', () => {
    toggleRoomLockState();
    modalHostTools.classList.add('hidden');
  });

  $('btnToolPKMode')?.addEventListener('click', () => {
    const pkBanner = $('activeRoomPkBanner');
    if (pkBanner) {
      pkBanner.classList.toggle('hidden');
      showToastNotification("PK Battle Mode ⚔️", pkBanner.classList.contains('hidden') ? "PK Battle hidden." : "PK Battle Mode Active!");
      modalHostTools.classList.add('hidden');
    }
  });

  // Room Atmosphere Theme Switcher
  const btnOpenVoiceTheme = $('btnOpenVoiceTheme');
  const modalVoiceTheme = $('mVoiceThemeModal');
  const btnCloseVoiceTheme = $('bCloseVoiceTheme');

  if (btnOpenVoiceTheme && modalVoiceTheme) {
    btnOpenVoiceTheme.addEventListener('click', () => {
      modalVoiceTheme.classList.remove('hidden');
    });
  }
  if (btnCloseVoiceTheme && modalVoiceTheme) {
    btnCloseVoiceTheme.addEventListener('click', () => {
      modalVoiceTheme.classList.add('hidden');
    });
  }

  $('btnToolOpenThemes')?.addEventListener('click', () => {
    if (modalHostTools) modalHostTools.classList.add('hidden');
    if (modalVoiceTheme) modalVoiceTheme.classList.remove('hidden');
  });

  function getVoiceThemeBgClass(theme) {
    switch (theme) {
      case 'cyber': return 'bg-gradient-to-b from-[#0e0b1f] via-[#160d2e] to-[#0a0c12]';
      case 'purple': return 'bg-gradient-to-b from-[#1a0b2e] via-[#120720] to-[#0a0c12]';
      case 'emerald': return 'bg-gradient-to-b from-[#061a14] via-[#04120e] to-[#0a0c12]';
      case 'sunset': return 'bg-gradient-to-b from-[#1f0a0e] via-[#140609] to-[#0a0c12]';
      case 'gold': return 'bg-gradient-to-b from-[#1f1a08] via-[#141004] to-[#0a0c12]';
      default: return 'bg-[#0a0c12]';
    }
  }

  document.querySelectorAll('.vr-theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme');
      const roomView = $('voiceActiveRoomView');
      if (roomView) {
        roomView.className = 'fixed inset-0 z-[100] flex flex-col overflow-hidden transition-all duration-500 ' + getVoiceThemeBgClass(theme);
      }
      document.querySelectorAll('.vr-theme-btn').forEach(b => {
        b.className = 'vr-theme-btn p-3 bg-[#171b2e] border border-[#252a45] hover:border-amber-500/40 text-gray-200 rounded-xl flex flex-col items-center justify-center gap-1.5 transition text-center cursor-pointer group';
      });
      btn.className = 'vr-theme-btn p-3 bg-[#1e2338] border border-amber-400 text-amber-300 rounded-xl flex flex-col items-center justify-center gap-1.5 transition text-center cursor-pointer group shadow-md ring-1 ring-amber-400/50';
      if (modalVoiceTheme) modalVoiceTheme.classList.add('hidden');
      showToastNotification("Theme Applied 🎨", "Switched room atmosphere theme!");
    });
  });

  // Gift Modal Open / Selection
  const btnOpenGiftModal = $('btnOpenVoiceGiftModal');
  const giftModal = $('mVoiceRoomGiftModal');
  const btnCloseGiftModal = $('bCloseVoiceGiftModal');
  const btnGiftDeposit = $('btnVrGiftDeposit');
  let selectedVrRecipientUid = null;
  let selectedVrGiftType = 'rose';

  if (btnGiftDeposit) {
    btnGiftDeposit.addEventListener('click', () => {
      if (giftModal) giftModal.classList.add('hidden');
      if (typeof window.openDepositModal === 'function') {
        window.openDepositModal();
      } else {
        alert("Opening wallet deposit...");
      }
    });
  }

  if (btnOpenGiftModal && giftModal) {
    btnOpenGiftModal.addEventListener('click', () => {
      openVoiceRoomGiftModal();
    });
  }
  if (btnCloseGiftModal && giftModal) {
    btnCloseGiftModal.addEventListener('click', () => {
      giftModal.classList.add('hidden');
    });
  }

  // Quick Gift Buttons on Bottom Bar
  document.querySelectorAll('.vr-quick-gift-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedVrGiftType = btn.dataset.type || 'rose';
      openVoiceRoomGiftModal();
    });
  });

  // Gift Item Selection inside Modal
  document.querySelectorAll('.vr-gift-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.vr-gift-card').forEach(c => {
        c.className = 'vr-gift-card relative p-2.5 sm:p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 sm:gap-1.5 cursor-pointer transition-all bg-[#141727] border-[#252b47] hover:border-pink-500/40';
        const chk = c.querySelector('[id^="vrGiftCheck"]');
        if (chk) {
          chk.classList.add('hidden');
          chk.classList.remove('flex');
        }
      });
      card.className = 'vr-gift-card relative p-2.5 sm:p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 sm:gap-1.5 cursor-pointer transition-all bg-gradient-to-b from-pink-500/15 via-[#1a1e34] to-[#121526] border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)] ring-1 ring-pink-500/50 scale-[1.02]';
      const chk = card.querySelector('[id^="vrGiftCheck"]');
      if (chk) {
        chk.classList.remove('hidden');
        chk.classList.add('flex');
      }

      selectedVrGiftType = card.dataset.type || 'rose';
      const helpEl = $('vrGiftHelpText');
      if (helpEl) {
        if (selectedVrGiftType === 'rose') {
          helpEl.textContent = "Receiver's Charm +1 • Gain popularity & status boost";
        } else if (selectedVrGiftType === 'rocket') {
          helpEl.textContent = "Receiver's Charm +10 • Supercharge popularity & status boost";
        } else {
          helpEl.textContent = "Receiver's Charm +20 • Ultimate popularity & prestige boost";
        }
      }
    });
  });

  // Submit Gift in Voice Room
  $('btnVrSendGiftSubmit')?.addEventListener('click', async () => {
    if (!currentVoiceRoomId || !userProfile) return;
    if (!selectedVrRecipientUid) {
      showToastNotification("Select Player", "Please select a participant to receive the gift!");
      return;
    }

    const giftConfig = {
      rose: { name: "Rose", cost: 10, pop: 1, anim: "rose" },
      rocket: { name: "Rocket", cost: 100, pop: 10, anim: "rocket" },
      trophy: { name: "Trophy", cost: 190, pop: 20, anim: "poptrophy" }
    }[selectedVrGiftType] || { name: "Rose", cost: 10, pop: 1, anim: "rose" };

    // Check user AX balance
    const currentAX = userProfile.balance !== undefined ? userProfile.balance : (userProfile.axCoins || 0);
    if (currentAX < giftConfig.cost) {
      showToastNotification("Insufficient AX Coins 🪙", `You need ${giftConfig.cost} AX Coins to send a ${giftConfig.name}!`);
      return;
    }

    try {
      // 1. Deduct sender AX coins
      const senderRef = doc(db, 'users', userProfile.uid);
      await updateDoc(senderRef, {
        balance: increment(-giftConfig.cost),
        axCoins: increment(-giftConfig.cost)
      });
      userProfile.balance = (userProfile.balance || userProfile.axCoins || 0) - giftConfig.cost;
      userProfile.axCoins = (userProfile.axCoins || 0) - giftConfig.cost;
      if ($('vrGiftUserCoinBal')) $('vrGiftUserCoinBal').textContent = (userProfile.balance || 0).toLocaleString();

      // 2. Add popularity to recipient
      const recipientRef = doc(db, 'users', selectedVrRecipientUid);
      await updateDoc(recipientRef, {
        popularity: increment(giftConfig.pop)
      });

      // 3. Add to recipient popularity history
      await addDoc(collection(db, 'users', selectedVrRecipientUid, 'popularityHistory'), {
        senderUid: userProfile.uid,
        senderName: userProfile.name,
        giftType: giftConfig.name,
        amount: giftConfig.pop,
        timestamp: serverTimestamp()
      });

      // Dispatch push notification to recipient
      if (typeof window.sendPersonalNotification === 'function') {
        const giftLabel = typeof window.formatGiftDisplayName === 'function' ? window.formatGiftDisplayName(giftConfig.name) : (giftConfig.name || 'Gift');
        window.sendPersonalNotification(selectedVrRecipientUid, {
          title: "New Gift! 🎁",
          body: `${userProfile.name || 'Player'} sent you a ${giftLabel}`,
          icon: 'rose.png',
          url: 'https://arenax.cyou/#profile',
          data: { type: 'gift', senderUid: userProfile.uid, giftType: giftConfig.name }
        }).catch(console.warn);
      }

      // 4. Send chat message announcement in Voice Room
      await addDoc(collection(db, 'voice_rooms', currentVoiceRoomId, 'chats'), {
        userId: userProfile.uid,
        userName: userProfile.name,
        userAvatar: userProfile.av || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + userProfile.uid,
        message: `🎁 Sent ${giftConfig.name} (+${giftConfig.pop} Pop) to participant!`,
        createdAt: serverTimestamp()
      });

      // 5. Play gift Lottie animation
      playVoiceRoomGiftAnimation(giftConfig.anim);

      giftModal.classList.add('hidden');
      showToastNotification("Gift Sent! 🎁", `Sent ${giftConfig.name}! Recipient gained +${giftConfig.pop} Popularity.`);
    } catch (err) {
      console.error("Error sending voice gift:", err);
      showToastNotification("Gift Failed ❌", "Could not send gift. Try again.");
    }
  });

  function openVoiceRoomGiftModal() {
    if (!currentVoiceRoomId) return;
    const recipientsContainer = $('vrGiftRecipientsRow');
    if (!recipientsContainer) return;

    // Update Coin Balance
    if ($('vrGiftUserCoinBal') && userProfile) {
      const bal = userProfile.balance !== undefined ? userProfile.balance : (userProfile.axCoins || 0);
      $('vrGiftUserCoinBal').textContent = bal.toLocaleString();
    }

    recipientsContainer.innerHTML = '';
    
    // Fetch members currently seated
    getDocs(collection(db, 'voice_rooms', currentVoiceRoomId, 'members')).then(snap => {
      if (snap.empty) {
        recipientsContainer.innerHTML = `<span class="text-xs text-gray-400 italic">No participants in room.</span>`;
        return;
      }

      let count = 0;
      const seenUids = new Set();
      snap.forEach(d => {
        const m = d.data();
        const memberUid = m.uid || d.id;
        if (!memberUid || memberUid === userProfile.uid || seenUids.has(memberUid)) return; // don't gift self or duplicate
        seenUids.add(memberUid);
        count++;

        const pBox = document.createElement('button');
        pBox.type = 'button';
        pBox.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition shrink-0 cursor-pointer border-[#293050] bg-[#141727] text-gray-400 hover:text-white';
        pBox.innerHTML = `
          <img src="${m.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + memberUid}" class="w-5 h-5 rounded-full object-cover shrink-0 border border-purple-500/30">
          ${window.formatPlayerNameHtml(m, 'truncate max-w-[80px] text-xs font-bold', 'w-3 h-3')}
        `;
        pBox.addEventListener('click', () => {
          recipientsContainer.querySelectorAll('button').forEach(b => {
            b.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition shrink-0 cursor-pointer border-[#293050] bg-[#141727] text-gray-400 hover:text-white';
          });
          pBox.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition shrink-0 cursor-pointer bg-gradient-to-r from-pink-500/20 to-rose-500/20 border-pink-500 text-white ring-1 ring-pink-500/50';
          selectedVrRecipientUid = memberUid;
        });

        recipientsContainer.appendChild(pBox);
      });

      if (count === 0) {
        recipientsContainer.innerHTML = `<span class="text-xs text-gray-400 italic">No other players seated.</span>`;
      } else {
        // Select first participant by default
        const first = recipientsContainer.querySelector('button');
        if (first) first.click();
      }

      giftModal.classList.remove('hidden');
    });
  }

  function playVoiceRoomGiftAnimation(animType) {
    let animEl = null;
    if (animType === 'rose') animEl = document.getElementById('rose-popularity-splash');
    else if (animType === 'rocket') animEl = document.getElementById('rocket-popularity-splash');
    else if (animType === 'poptrophy') animEl = document.getElementById('trophy-popularity-splash');

    if (animEl) {
      animEl.classList.remove('hidden');
      setTimeout(() => {
        animEl.classList.add('hidden');
      }, 3500);
    }
  }

  // Chat Form Inside Room
  const roomChatForm = $('roomChatForm');
  if (roomChatForm) {
    roomChatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentVoiceRoomId || !userProfile) return;
      const input = $('roomChatInput');
      const msg = input.value.trim();
      if (!msg) return;

      try {
        await addDoc(collection(db, 'voice_rooms', currentVoiceRoomId, 'chats'), {
          userId: userProfile.uid,
          userName: userProfile.name,
          userAvatar: userProfile.av || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + userProfile.uid,
          message: msg,
          createdAt: serverTimestamp()
        });
        input.value = '';
      } catch (err) {
        console.error("Error sending room chat:", err);
      }
    });
  }

  // Leave room button
  const btnLeave = $('btnLeaveVoiceRoom');
  if (btnLeave) {
    btnLeave.addEventListener('click', () => {
      leaveVoiceRoom();
    });
  }

  // Invite friends popup
  const btnInvite = $('btnInviteFriendToVoice');
  if (btnInvite) {
    btnInvite.addEventListener('click', () => {
      openVoiceInviteModal();
    });
  }

  const btnAloneInvite = $('aloneWarningBtnInvite');
  if (btnAloneInvite) {
    btnAloneInvite.addEventListener('click', () => {
      openVoiceInviteModal();
    });
  }
  
  const btnCloseInvite = $('bCloseInviteFriendToVoice');
  if (btnCloseInvite) {
    btnCloseInvite.addEventListener('click', () => {
      $('mInviteFriendToVoice').classList.add('hidden');
    });
  }

  // Toggle lock room (host-only)
  const btnToggleLock = $('btnToggleLockRoom');
  if (btnToggleLock) {
    btnToggleLock.addEventListener('click', () => {
      toggleRoomLockState();
    });
  }

  // Delete Room (host-only)
  const btnDeleteActiveRoom = $('btnDeleteRoom');
  if (btnDeleteActiveRoom) {
    btnDeleteActiveRoom.addEventListener('click', async () => {
      if (!currentVoiceRoomId) return;
      const confirmDel = confirm("Are you sure you want to end and delete this voice room?");
      if (!confirmDel) return;
      
      try {
        const roomId = currentVoiceRoomId;
        const roomRef = doc(db, 'voice_rooms', roomId);
        await deleteDoc(roomRef);
        showToastNotification("Room Deleted 🗑️", "The voice room has been permanently deleted.");
        await leaveVoiceRoom(true);
      } catch (err) {
        console.error("Error deleting room:", err);
      }
    });
  }
}

// Global active filter state
let selectedGameFilter = "All";

// Listen to voice rooms collection in Firestore
function listenToVoiceRooms() {
  if (voiceRoomsUnsub) voiceRoomsUnsub();

  const q = query(collection(db, 'voice_rooms'), orderBy('createdAt', 'desc'), limit(50));
  voiceRoomsUnsub = onSnapshot(q, (snap) => {
    voiceRoomsList = [];
    snap.forEach(d => {
      voiceRoomsList.push({ id: d.id, ...d.data() });
    });
    filterAndRenderVoiceRooms(selectedGameFilter);
  }, (err) => {
    console.error("Firestore Error reading voice_rooms:", err);
  });
}

// Filter and render voice rooms in the UI
function filterAndRenderVoiceRooms(gameFilter = "All") {
  selectedGameFilter = gameFilter;
  const searchVal = ($('voiceSearchInput')?.value || "").toLowerCase().trim();
  const container = $('voiceRoomsGrid');
  if (!container) return;

  const list = voiceRoomsList || [];
  const welcomeBanner = $('welcomeVoiceBanner');
  if (welcomeBanner) {
    if (list.length > 0) {
      welcomeBanner.classList.add('hidden');
    } else {
      welcomeBanner.classList.remove('hidden');
    }
  }

  const filtered = list.filter(room => {
    const matchesGame = gameFilter === "All" || (room.tag && room.tag === gameFilter) || room.game === gameFilter;
    const matchesSearch = !searchVal || 
      room.name.toLowerCase().includes(searchVal) || 
      (room.tag && room.tag.toLowerCase().includes(searchVal)) ||
      room.hostName.toLowerCase().includes(searchVal);
    return matchesGame && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-t3 text-center p-8 bg-card/20 border border-bdr/50 rounded-2xl">
        <i class="fas fa-search text-2xl text-emerald-500/25 mb-1.5 animate-pulse"></i>
        <p class="text-xs text-white font-semibold">No Voice Rooms Found</p>
        <p class="text-[10px] text-t3 max-w-[180px] mt-0.5">Try changing category or search terms. Or create your own room!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  filtered.forEach(room => {
    const card = document.createElement('div');
    card.className = 'p-3 bg-card/85 backdrop-blur-md border border-emerald-500/15 hover:border-emerald-500/40 rounded-2xl relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px] flex items-center justify-between gap-3 group shadow-xl';
    
    if (room.memberCount > 0) {
      card.classList.add('border-emerald-500/30');
    }

    const isPrivate = room.type === 'private' || room.isPrivate;
    const tagDisplay = room.tag || room.game || 'Talk';
    const coverUrl = room.coverUrl || room.coverImageUrl || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300';

    card.innerHTML = `
      <!-- Left: Thumbnail Cover Image -->
      <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#1a1e34] shrink-0 border border-white/10 relative shadow-inner">
        <img src="${coverUrl}" alt="Room Cover" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        <span class="absolute top-1 left-1 px-1.5 py-0.5 bg-black/75 backdrop-blur-md border border-emerald-500/40 text-[7px] font-extrabold uppercase text-emerald-300 rounded-md">${tagDisplay}</span>
      </div>

      <!-- Middle: Room Info -->
      <div class="space-y-1 flex-1 min-w-0 pr-1">
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse shrink-0"></span>
          <span class="text-xs font-black uppercase text-white tracking-wide truncate group-hover:text-emerald-300 transition">${room.name || room.roomTitle || 'Voice Room'}</span>
          ${isPrivate ? '<i class="fas fa-lock text-[9px] text-amber-400 shrink-0" title="Password Protected"></i>' : ''}
        </div>
        
        <div class="flex flex-wrap items-center gap-2 text-[9px] text-gray-300">
          <span class="text-t2 flex items-center gap-1"><i class="fas fa-user text-[8px] text-emerald-400"></i>Host: <span class="text-white font-bold truncate max-w-[90px]">${room.hostName || 'Host'}</span></span>
          <span class="text-t3">•</span>
          <span class="text-t3"><i class="fas fa-globe text-[8px] mr-0.5"></i>${room.region || 'Global'}</span>
        </div>
      </div>

      <!-- Right: Seats & Join -->
      <div class="flex flex-col items-end gap-1.5 shrink-0">
        <div class="text-right">
          <span class="text-xs font-black text-white">${room.memberCount || 0}</span><span class="text-[10px] text-t3 font-bold">/${room.seats || room.maxPlayers || room.maxSeats || 8}</span>
        </div>
        <button class="btn-join-voice px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider transition duration-150 cursor-pointer shadow-md" data-id="${room.id}">
          Join
        </button>
      </div>
    `;

    card.querySelector('.btn-join-voice')?.addEventListener('click', () => {
      if (isPrivate) {
        const pass = prompt("Enter room password:");
        if (pass !== room.password) {
          alert("Incorrect password!");
          return;
        }
      }
      joinVoiceRoom(room.id);
    });

    container.appendChild(card);
  });
}

// Listen to room document metadata & deletion in real-time
function listenToActiveRoomDoc(roomId) {
  if (activeRoomDocUnsub) activeRoomDocUnsub();

  activeRoomDocUnsub = onSnapshot(doc(db, 'voice_rooms', roomId), (snap) => {
    if (!snap.exists()) {
      if (currentVoiceRoomId === roomId) {
        showToastNotification("Room Closed ⏱️", "This voice channel has been closed or ended.");
        leaveVoiceRoom(true);
      }
    } else {
      const rData = snap.data();
      $('activeRoomName').textContent = rData.name || rData.roomTitle || 'Voice Room';
      if ($('activeRoomTagPill')) $('activeRoomTagPill').textContent = rData.tag || rData.roomTag || rData.game || 'Talk';
      $('activeRoomMax').textContent = rData.seats || rData.maxPlayers || rData.maxSeats || 8;
      if ($('activeSeatsTotalCount')) $('activeSeatsTotalCount').textContent = rData.seats || rData.maxPlayers || rData.maxSeats || 8;
      
      // Keep default dark theme background inside active room
      const bgOverlay = $('activeRoomBgOverlay');
      if (bgOverlay) {
        bgOverlay.style.backgroundImage = 'none';
      }

      // Show/Hide Host Tools
      const isHost = userProfile && rData.hostId === userProfile.uid;
      const hostToolsBtn = $('btnHostTools');
      if (hostToolsBtn) {
        if (isHost) hostToolsBtn.classList.remove('hidden');
        else hostToolsBtn.classList.add('hidden');
      }

      if (rData.locked) {
        $('activeRoomLockIcon').classList.remove('hidden');
      } else {
        $('activeRoomLockIcon').classList.add('hidden');
      }
    }
  }, (err) => {
    console.error("Error watching active room doc:", err);
  });
}

// Join voice room
async function joinVoiceRoom(roomId) {
  if (!userProfile) {
    showToastNotification("Access Denied", "Please sign in to join the voice arena.");
    return;
  }

  if (auth.currentUser) {
    try {
      await auth.currentUser.getIdToken(true);
    } catch (e) {}
  }

  if (currentVoiceRoomId) {
    await leaveVoiceRoom(false);
  }

  // Request Local Microphone Stream FIRST
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !isMicMuted;
    });
    
    toggleLocalMicLoopback(!isMicMuted);
    playRadioSquelchClick(false);
  } catch (micErr) {
    console.warn("Microphone access denied or unavailable:", micErr);
    showToastNotification("Microphone Blocked ⚠️", "Continuing in listen-only mode.");
  }

  try {
    wasIInRoomPreviously = false;
    currentVoiceRoomId = roomId;

    const roomSnap = await getDoc(doc(db, 'voice_rooms', roomId));
    if (!roomSnap.exists()) {
      showToastNotification("Error", "Room no longer exists.");
      currentVoiceRoomId = null;
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
      }
      return;
    }
    const roomData = roomSnap.data();

    // Show UI Transition
    $('voiceLobbyView').classList.add('hidden');
    $('voiceActiveRoomView').classList.remove('hidden');

    // Populate active room details
    $('activeRoomName').textContent = roomData.name;
    if ($('activeRoomTagPill')) $('activeRoomTagPill').textContent = roomData.tag || roomData.game || 'Talk';
    $('activeRoomMax').textContent = roomData.seats || roomData.maxPlayers || 8;
    
    const bgOverlay = $('activeRoomBgOverlay');
    if (bgOverlay) {
      if (roomData.coverUrl) {
        bgOverlay.style.backgroundImage = `url(${roomData.coverUrl})`;
        bgOverlay.style.opacity = '0.35';
      } else {
        bgOverlay.style.backgroundImage = 'none';
      }
    }

    if (roomData.locked) {
      $('activeRoomLockIcon').classList.remove('hidden');
    } else {
      $('activeRoomLockIcon').classList.add('hidden');
    }

    const myAvatar = userProfile.av || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + userProfile.uid;

    // Add local participant to Room Members
    const myMemberId = userProfile.uid;
    await setDoc(doc(db, 'voice_rooms', roomId, 'members', myMemberId), {
      uid: userProfile.uid,
      name: userProfile.name,
      handle: userProfile.handle || '@player',
      avatar: myAvatar,
      seatIndex: 1, // Default seat
      isPremium: !!(userProfile.premium || userProfile.isPremium || userProfile.isVIP || userProfile.vip),
      isVerified: !!(userProfile.isVerified || userProfile.hasBlueTick || userProfile.blueTick || userProfile.verified),
      muted: isMicMuted,
      deafened: isSpeakerMuted,
      speaking: false,
      handRaised: false,
      micStatus: !isMicMuted,
      joinedAt: serverTimestamp()
    }, { merge: true });

    await updateDoc(doc(db, 'voice_rooms', roomId), {
      memberCount: increment(1)
    }).catch(() => {});

    // Dispatch event to sync React state
    window.dispatchEvent(new CustomEvent('voice-room-joined', { detail: { roomId } }));

    // Start Real-time Listeners
    listenToRoomMembers(roomId);
    listenToRoomChats(roomId);
    listenToRoomSignaling(roomId);
    listenToActiveRoomDoc(roomId);

  } catch (err) {
    console.error("Error joining voice room:", err);
    showToastNotification("Join Failed", "Could not connect to voice room.");
    currentVoiceRoomId = null;
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
  }
}
window.joinVoiceRoom = joinVoiceRoom;

// Track speaking indicators locally using volume analyzer
let localAudioAnalyser = null;
let speakingInterval = null;

function setupVolumeAnalysis() {
  if (!localStream) return;
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(localStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    if (speakingInterval) clearInterval(speakingInterval);
    
    let wasSpeaking = false;

    speakingInterval = setInterval(() => {
      if (isMicMuted || (pttEnabled && !pttActive)) {
        if (wasSpeaking) {
          wasSpeaking = false;
          setSpeakingStateInFirestore(false);
        }
        return;
      }
      
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const averageVolume = sum / bufferLength;
      const isSpeakingNow = averageVolume > 20;

      if (isSpeakingNow !== wasSpeaking) {
        wasSpeaking = isSpeakingNow;
        setSpeakingStateInFirestore(isSpeakingNow);
      }
    }, 150);
  } catch(e) {
    console.warn("Could not setup voice analyser:", e);
  }
}

async function setSpeakingStateInFirestore(speaking) {
  if (!currentVoiceRoomId || !userProfile) return;
  try {
    await updateDoc(doc(db, 'voice_rooms', currentVoiceRoomId, 'members', userProfile.uid), {
      speaking: speaking
    });
  } catch(e){}
}

// Listen to room members inside a voice room and render circular seat grid
function listenToRoomMembers(roomId) {
  if (activeRoomMembersUnsub) activeRoomMembersUnsub();

  const membersRef = collection(db, 'voice_rooms', roomId, 'members');
  activeRoomMembersUnsub = onSnapshot(membersRef, async (snap) => {
    const seatsGrid = $('roomSeatsGrid');
    const topAvatarsRow = $('activeRoomTopAvatars');
    if (!seatsGrid) return;

    let membersList = [];
    snap.forEach(d => {
      membersList.push(d.data());
    });

    const membersCount = membersList.length;
    $('activeRoomCount').textContent = membersCount;
    if ($('activeSeatsOccupiedCount')) $('activeSeatsOccupiedCount').textContent = membersCount;

    // Fetch total seats configured for room
    let maxSeats = 8;
    try {
      const roomSnap = await getDoc(doc(db, 'voice_rooms', roomId));
      if (roomSnap.exists()) {
        maxSeats = roomSnap.data().seats || roomSnap.data().maxPlayers || 8;
      }
    } catch (e) {}

    // Update top header seated avatars preview
    if (topAvatarsRow) {
      topAvatarsRow.innerHTML = '';
      membersList.slice(0, 4).forEach(m => {
        const img = document.createElement('img');
        img.src = m.avatar;
        img.className = 'w-6 h-6 rounded-full border border-emerald-500 object-cover shadow-sm bg-card';
        topAvatarsRow.appendChild(img);
      });
    }

    // Render Seats Grid matching Reference Image 2 circular seat slots
    seatsGrid.innerHTML = '';

    for (let i = 1; i <= maxSeats; i++) {
      // Find occupant for seat i (by seatIndex or array order)
      const occupant = membersList.find(m => m.seatIndex === i) || (membersList[i - 1] && !membersList[i - 1].seatIndex ? membersList[i - 1] : null);

      const seatSlot = document.createElement('div');
      seatSlot.className = occupant
        ? 'p-2.5 rounded-2xl border flex flex-col items-center justify-center text-center transition cursor-pointer relative group bg-[#14182b]/80 border-[#282f50] hover:border-emerald-500/50 shadow-md backdrop-blur-sm'
        : 'p-2.5 rounded-2xl border flex flex-col items-center justify-center text-center transition cursor-pointer relative group bg-[#0f1222]/40 border-dashed border-[#222742] hover:border-emerald-500/30 backdrop-blur-sm';

      if (occupant) {
        // Occupied Seat Slot
        const isSpeaking = occupant.speaking;
        const isHost = occupant.uid === userProfile?.uid;

        seatSlot.innerHTML = `
          <div class="relative my-1 flex items-center justify-center">
            ${isSpeaking ? `
              <span class="absolute inline-flex h-12 w-12 rounded-full bg-emerald-500/30 animate-ping"></span>
              <span class="absolute inline-flex h-14 w-14 rounded-full bg-emerald-500/15 animate-pulse"></span>
            ` : ''}
            <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 relative z-10 ${isSpeaking ? 'border-emerald-400 shadow-[0_0_12px_#10b981]' : 'border-[#282f50]'}">
              <img src="${occupant.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${occupant.uid}`}" class="w-full h-full object-cover">
            </div>
            
            <!-- Mic Mute Icon Badge -->
            <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${occupant.muted ? 'bg-red-500' : 'bg-emerald-500'} border border-black flex items-center justify-center z-20 text-[8px] text-white">
              <i class="fas ${occupant.muted ? 'fa-microphone-slash' : 'fa-microphone'}"></i>
            </span>

            <!-- Seat Index Badge -->
            <span class="absolute -top-1 -left-1 px-1 bg-black/80 border border-white/20 text-[7px] font-black text-amber-400 rounded-full z-20">#${i}</span>
          </div>

          <span class="text-[10px] font-bold text-white truncate max-w-full mt-0.5 flex items-center justify-center gap-0.5">
            ${window.formatPlayerNameHtml(occupant, 'text-[10px] font-bold truncate', 'w-3 h-3')}
          </span>
          ${isHost ? '<span class="text-[8px] text-emerald-400 font-extrabold uppercase mt-0.5">Host / Me</span>' : '<span class="text-[8px] text-gray-400 uppercase mt-0.5">Seated</span>'}
        `;

        // Manage player if host
        if (userProfile && userProfile.uid !== occupant.uid) {
          seatSlot.addEventListener('click', () => {
            getDoc(doc(db, 'voice_rooms', roomId)).then(snapRoom => {
              if (snapRoom.exists() && snapRoom.data().hostId === userProfile.uid) {
                const act = confirm(`Manage ${occupant.name}:\nClick OK to kick player from seat/room.`);
                if (act) kickParticipant(occupant.uid);
              }
            });
          });
        }
      } else {
        // Empty Seat Slot
        seatSlot.innerHTML = `
          <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-dashed border-[#282f50] flex items-center justify-center text-[#8890b0] group-hover:text-emerald-400 group-hover:border-emerald-500/40 my-1 relative transition">
            <i class="fas fa-plus text-xs"></i>
            <span class="absolute -top-1 -left-1 px-1 bg-black/80 border border-white/20 text-[7px] font-black text-gray-400 rounded-full z-20">#${i}</span>
          </div>
          <span class="text-[9px] font-semibold text-[#8890b0]">Seat ${i}</span>
        `;

        // Join/Move to this seat
        seatSlot.addEventListener('click', async () => {
          if (!userProfile || !currentVoiceRoomId) return;
          try {
            await updateDoc(doc(db, 'voice_rooms', currentVoiceRoomId, 'members', userProfile.uid), {
              seatIndex: i
            });
            showToastNotification("Moved Seat 🛋️", `You moved to Seat ${i}`);
          } catch(e) {}
        });
      }

      seatsGrid.appendChild(seatSlot);
    }

    // Check if host alone in room
    if (currentVoiceRoomId && userProfile) {
      getDoc(doc(db, 'voice_rooms', currentVoiceRoomId)).then(roomSnap => {
        if (roomSnap.exists()) {
          const rData = roomSnap.data();
          const isMeHost = rData.hostId === userProfile.uid;
          const banner = $('aloneWarningBanner');
          
          if (isMeHost && membersCount === 1 && membersList[0] && membersList[0].uid === userProfile.uid) {
            if (banner && banner.classList.contains('hidden')) {
              banner.classList.remove('hidden');
              startAloneCountdownTimer();
            }
          } else {
            if (banner && !banner.classList.contains('hidden')) {
              banner.classList.add('hidden');
              stopAloneCountdownTimer();
            }
          }
        }
      }).catch(err => console.error("Error checking host status:", err));
    }

    // Check if local player was kicked
    const amIInMembers = membersList.some(m => m.uid === userProfile.uid);
    if (wasIInRoomPreviously && !amIInMembers && currentVoiceRoomId) {
      showToastNotification("Kicked from Room 🚫", "The host has removed you from the voice channel.");
      leaveVoiceRoom(false);
    }
    if (amIInMembers) {
      wasIInRoomPreviously = true;
    }

    // Trigger WebRTC Mesh Connections
    if (localStream) {
      establishWebRTCMesh(membersList);
    }
  }, (err) => {
    console.error("Firestore error watching members:", err);
  });
}

// Setup volume analysis after localStream gets initialized
setInterval(() => {
  if (localStream && !localAudioAnalyser) {
    setupVolumeAnalysis();
  }
}, 1000);

// Kick a participant
async function kickParticipant(uid) {
  if (!currentVoiceRoomId) return;
  try {
    await deleteDoc(doc(db, 'voice_rooms', currentVoiceRoomId, 'members', uid));
    showToastNotification("Player Removed 👞", "You kicked the player from the room.");
  } catch(e){
    console.error(e);
  }
}

// Force remote mute toggle
async function toggleParticipantMute(uid, muteState) {
  if (!currentVoiceRoomId) return;
  try {
    await updateDoc(doc(db, 'voice_rooms', currentVoiceRoomId, 'members', uid), {
      muted: muteState,
      micStatus: !muteState
    });
  } catch(e){
    console.error(e);
  }
}

// Establish WebRTC Full-Mesh connection
function establishWebRTCMesh(membersList) {
  if (!userProfile) return;

  // For every other member in the room:
  membersList.forEach(member => {
    if (member.uid === userProfile.uid) return;

    // To prevent duplicate connections, smaller UID initiates
    const isInitiator = userProfile.uid < member.uid;

    if (!peerConnections[member.uid]) {
      createPeerConnection(member.uid, isInitiator);
    }
  });

  // Clean up stale connections
  Object.keys(peerConnections).forEach(uid => {
    if (!membersList.some(m => m.uid === uid)) {
      closePeerConnection(uid);
    }
  });
}

// Create a peer connection with a specific user
function createPeerConnection(peerId, isInitiator) {
  console.log(`[WebRTC] Creating connection to ${peerId}, initiator: ${isInitiator}`);
  const pc = new RTCPeerConnection(iceServers);
  peerConnections[peerId] = pc;

  // Add local track
  if (localStream) {
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });
  }

  // Handle ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      const candObj = typeof event.candidate.toJSON === 'function' ? event.candidate.toJSON() : {
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex
      };
      sendSignal(peerId, "candidate", JSON.stringify(candObj));
    }
  };

  // Handle incoming stream track
  pc.ontrack = (event) => {
    console.log(`[WebRTC] Got remote audio track from ${peerId}`);
    const remoteStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
    playRemoteAudioStream(peerId, remoteStream);
  };

  // Handle state change
  pc.onconnectionstatechange = () => {
    console.log(`[WebRTC] Connection state to ${peerId}: ${pc.connectionState}`);
  };

  if (isInitiator) {
    // Generate offer
    makingOffer[peerId] = true;
    pc.createOffer().then(offer => {
      return pc.setLocalDescription(offer);
    }).then(() => {
      const descObj = typeof pc.localDescription.toJSON === 'function' ? pc.localDescription.toJSON() : {
        type: pc.localDescription.type,
        sdp: pc.localDescription.sdp
      };
      sendSignal(peerId, "offer", JSON.stringify(descObj));
    }).catch(err => {
      console.error("Error creating SDP offer:", err);
    }).finally(() => {
      makingOffer[peerId] = false;
    });
  }
}

// Send WebRTC signaling payload to Firestore
async function sendSignal(toId, type, payload) {
  if (!currentVoiceRoomId || !userProfile) return;
  try {
    await addDoc(collection(db, 'voice_rooms', currentVoiceRoomId, 'signaling'), {
      fromId: userProfile.uid,
      toId: toId,
      type: type,
      payload: payload,
      createdAt: serverTimestamp()
    });
  } catch(e){}
}

// Listen to room signaling messages
function listenToRoomSignaling(roomId) {
  if (activeRoomSignalingUnsub) activeRoomSignalingUnsub();

  const signalingRef = collection(db, 'voice_rooms', roomId, 'signaling');
  const q = query(signalingRef, where('toId', '==', userProfile.uid));

  activeRoomSignalingUnsub = onSnapshot(q, async (snap) => {
    if (!userProfile) return;

    for (const d of snap.docs) {
      const signal = d.data();

      // Delete the signaling doc immediately to keep collection clean and prevent duplicate reads
      await deleteDoc(doc(db, 'voice_rooms', roomId, 'signaling', d.id)).catch(()=>{});

      // Deduplication check using signal document ID
      if (processedSignalIds.has(d.id)) {
        continue;
      }
      processedSignalIds.add(d.id);

      let pc = peerConnections[signal.fromId];
      if (!pc) {
        console.log(`[WebRTC] On-demand peer connection creation for ${signal.fromId}`);
        createPeerConnection(signal.fromId, false);
        pc = peerConnections[signal.fromId];
      }

      if (!pc) continue;

      const parsedPayload = JSON.parse(signal.payload);

      // Helper to flush queued candidates
      const flushIceCandidates = () => {
        if (pc.iceCandidateQueue && pc.iceCandidateQueue.length > 0) {
          pc.iceCandidateQueue.forEach(cand => {
            pc.addIceCandidate(new RTCIceCandidate(cand))
              .catch(err => console.warn("Error flushing ICE candidate:", err));
          });
          pc.iceCandidateQueue = [];
        }
      };

      if (!pc.iceCandidateQueue) {
        pc.iceCandidateQueue = [];
      }

      if (signal.type === "offer") {
        // SDP-level deduplication
        if (lastProcessedOfferSdp[signal.fromId] === parsedPayload.sdp) {
          console.log(`[WebRTC] Ignoring duplicate SDP offer from ${signal.fromId}`);
          continue;
        }
        lastProcessedOfferSdp[signal.fromId] = parsedPayload.sdp;

        // Polite/Impolite role for perfect negotiation
        // Polite peer is the one with the lexicographically larger UID
        const polite = userProfile.uid > signal.fromId;
        const offerCollision = makingOffer[signal.fromId] || pc.signalingState !== "stable";

        if (offerCollision) {
          if (!polite) {
            console.log(`[WebRTC] Glare/collision detected and we are impolite. Ignoring offer from ${signal.fromId}`);
            continue;
          }
          console.log(`[WebRTC] Glare/collision detected and we are polite. Rolling back local offer to process remote offer from ${signal.fromId}`);
          try {
            await pc.setLocalDescription({ type: "rollback" });
          } catch (e) {
            console.warn("[WebRTC] Error during polite offer rollback (ignoring):", e);
          }
        }

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(parsedPayload));
          
          // Strict state check: createAnswer only in 'have-remote-offer' state
          if (pc.signalingState === "have-remote-offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            const answerDescObj = typeof pc.localDescription.toJSON === 'function' ? pc.localDescription.toJSON() : {
              type: pc.localDescription.type,
              sdp: pc.localDescription.sdp
            };
            await sendSignal(signal.fromId, "answer", JSON.stringify(answerDescObj));
            flushIceCandidates();
          } else {
            console.warn(`[WebRTC] Skipping createAnswer because signalingState is ${pc.signalingState} instead of have-remote-offer`);
          }
        } catch (err) {
          console.error("Error processing SDP offer:", err);
        }
      } else if (signal.type === "answer") {
        if (pc.signalingState !== "stable") {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(parsedPayload));
            flushIceCandidates();
          } catch (err) {
            console.error("Error processing SDP answer:", err);
          }
        }
      } else if (signal.type === "candidate") {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(parsedPayload));
          } catch (err) {
            console.warn("Error adding ICE candidate:", err);
          }
        } else {
          pc.iceCandidateQueue.push(parsedPayload);
        }
      }
    }
  });
}

// Play remote audio stream safely inside DOM with Web Audio API Gain boosting!
function playRemoteAudioStream(peerId, stream) {
  // Let's clean up existing audio context for this peer if exists
  if (remoteAudioContexts[peerId]) {
    try {
      remoteAudioContexts[peerId].close();
    } catch(e){}
    delete remoteAudioContexts[peerId];
  }
  if (remoteAudioGainNodes[peerId]) {
    delete remoteAudioGainNodes[peerId];
  }

  // 1. WebRTC Keep-Alive element (Muted)
  // This is required in Chrome to force the browser to keep decoding the WebRTC audio stream!
  let keepAliveEl = document.getElementById(`audio-remote-keepalive-${peerId}`);
  if (!keepAliveEl) {
    keepAliveEl = document.createElement('audio');
    keepAliveEl.id = `audio-remote-keepalive-${peerId}`;
    keepAliveEl.autoplay = true;
    keepAliveEl.muted = true;
    keepAliveEl.className = 'hidden';
    document.body.appendChild(keepAliveEl);
  }
  keepAliveEl.srcObject = stream;

  // 2. Primary Playback Element for amplified audio
  let audioEl = document.getElementById(`audio-remote-${peerId}`);
  if (!audioEl) {
    audioEl = document.createElement('audio');
    audioEl.id = `audio-remote-${peerId}`;
    audioEl.autoplay = true;
    audioEl.className = 'hidden';
    document.body.appendChild(audioEl);
  }

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const gainNode = audioCtx.createGain();
      
      // Amplification multiplier (4.5x volume boost)
      gainNode.gain.value = isSpeakerMuted ? 0.0 : 4.5; 
      
      // Connect source to gain, then gain to a new MediaStream destination
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(gainNode);
      gainNode.connect(dest);
      
      // Feed the boosted stream directly to the unmuted HTMLAudioElement!
      audioEl.srcObject = dest.stream;
      audioEl.muted = isSpeakerMuted;
      
      // Auto-resume if context suspended by browser autoplay policy
      if (audioCtx.state === 'suspended') {
        const resumeCtx = () => {
          audioCtx.resume();
          document.removeEventListener('click', resumeCtx);
        };
        document.addEventListener('click', resumeCtx);
        audioCtx.resume().catch(()=>{});
      }
      
      remoteAudioContexts[peerId] = audioCtx;
      remoteAudioGainNodes[peerId] = gainNode;
      console.log(`[WebRTC] Audio stream for peer ${peerId} boosted by 4.5x using Web Audio API MediaStreamDestination.`);
    } else {
      audioEl.srcObject = stream;
      audioEl.muted = isSpeakerMuted;
    }
  } catch (e) {
    console.warn("Could not boost remote stream with Web Audio API, falling back to standard audio element:", e);
    audioEl.srcObject = stream;
    audioEl.muted = isSpeakerMuted; // fallback to unmuted element
  }
}

// Close peer connection
function closePeerConnection(peerId) {
  const pc = peerConnections[peerId];
  if (pc) {
    pc.close();
    delete peerConnections[peerId];
  }
  const audioEl = document.getElementById(`audio-remote-${peerId}`);
  if (audioEl) audioEl.remove();

  const keepAliveEl = document.getElementById(`audio-remote-keepalive-${peerId}`);
  if (keepAliveEl) keepAliveEl.remove();

  // Clean up Web Audio nodes
  if (remoteAudioContexts[peerId]) {
    try {
      remoteAudioContexts[peerId].close();
    } catch(e){}
    delete remoteAudioContexts[peerId];
  }
  if (remoteAudioGainNodes[peerId]) {
    delete remoteAudioGainNodes[peerId];
  }
}

// Alone warning countdown timer helpers
function startAloneCountdownTimer() {
  if (aloneCountdownInterval) clearInterval(aloneCountdownInterval);
  aloneSecondsLeft = 30;
  const counterEl = $('aloneCountdown');
  if (counterEl) counterEl.textContent = aloneSecondsLeft;

  aloneCountdownInterval = setInterval(() => {
    aloneSecondsLeft--;
    const el = $('aloneCountdown');
    if (el) el.textContent = aloneSecondsLeft;

    if (aloneSecondsLeft <= 0) {
      clearInterval(aloneCountdownInterval);
      aloneCountdownInterval = null;
      // Auto leave the room and close it!
      leaveVoiceRoom(true);
      showToastNotification("Room Closed ⏱️", "The room was closed automatically because no one else joined.");
    }
  }, 1000);
}

function stopAloneCountdownTimer() {
  if (aloneCountdownInterval) {
    clearInterval(aloneCountdownInterval);
    aloneCountdownInterval = null;
  }
  const banner = $('aloneWarningBanner');
  if (banner) banner.classList.add('hidden');
}

// Cleanly leave voice room
async function leaveVoiceRoom(goToLobby = true) {
  if (!currentVoiceRoomId && !userProfile) return;
  const roomId = currentVoiceRoomId;
  currentVoiceRoomId = null;
  wasIInRoomPreviously = false;

  // Always notify listeners (including React PlayerApp) that room was exited
  window.dispatchEvent(new CustomEvent('voice-room-left', { detail: { roomId } }));

  // Stop alone host countdown timers
  stopAloneCountdownTimer();

  const doUINavigation = () => {
    if (goToLobby) {
      const activeRoomView = $('voiceActiveRoomView');
      if (activeRoomView) activeRoomView.classList.add('hidden');
      const lobbyView = $('voiceLobbyView');
      if (lobbyView) lobbyView.classList.remove('hidden');
      showToastNotification("Squad Voice Disconnected 👋", "You safely disconnected from voice communication.");
    }
  };

  try {
    // 1. Synthesize exit tone
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      osc.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.1); // C#5
      osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.2); // A4
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch(e){}

    // Stop speaking interval & analyzer
    if (speakingInterval) clearInterval(speakingInterval);
    speakingInterval = null;
    localAudioAnalyser = null;

    // 2. Stop local tracks & clean RTC Peer connections
    toggleLocalMicLoopback(false);
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
    Object.keys(peerConnections).forEach(closePeerConnection);
    makingOffer = {};
    ignoreOffer = {};
    lastProcessedOfferSdp = {};
    processedSignalIds.clear();

    // 3. Unsubscribe Snapshot Listeners
    if (activeRoomMembersUnsub) activeRoomMembersUnsub();
    if (activeRoomChatUnsub) activeRoomChatUnsub();
    if (activeRoomSignalingUnsub) activeRoomSignalingUnsub();
    if (activeRoomDocUnsub) {
      activeRoomDocUnsub();
      activeRoomDocUnsub = null;
    }

    if (roomId && userProfile) {
      // 4. Remove player doc from members
      await deleteDoc(doc(db, 'voice_rooms', roomId, 'members', userProfile.uid)).catch((e) => console.warn("Error deleting member on leave:", e));

      // Dynamic and robust check of remaining members to prevent stale rooms
      const membersRef = collection(db, 'voice_rooms', roomId, 'members');
      const remainingMembersSnap = await getDocs(membersRef).catch(() => ({ empty: true, size: 0 }));
      
      const roomRef = doc(db, 'voice_rooms', roomId);
      if (remainingMembersSnap.empty || remainingMembersSnap.size === 0) {
        // If no members left in the room, delete the room document
        try {
          await deleteDoc(roomRef);
          console.log("Empty room deleted completely:", roomId);
        } catch (delErr) {
          console.warn("Could not delete empty room:", delErr);
        }
      } else {
        // Otherwise update the memberCount to match the exact size
        try {
          await updateDoc(roomRef, {
            memberCount: remainingMembersSnap.size
          });
        } catch (updErr) {
          console.warn("Could not update room member count:", updErr);
        }
      }
    }

  } catch (err) {
    console.error("Error leaving voice room cleanly:", err);
  } finally {
    // ALWAYS perform UI navigation to ensure user is never stuck on voice room screen
    doUINavigation();
  }
}
window.leaveVoiceRoom = leaveVoiceRoom;

// Toggle room lock state (host-only)
async function toggleRoomLockState() {
  if (!currentVoiceRoomId) return;
  try {
    const roomRef = doc(db, 'voice_rooms', currentVoiceRoomId);
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      const isCurrentlyLocked = snap.data().locked || false;
      const newLockedState = !isCurrentlyLocked;
      await updateDoc(roomRef, {
        locked: newLockedState
      });
      $('btnToggleLockRoom').innerHTML = newLockedState ? `<i class="fas fa-unlock"></i> Unlock Room` : `<i class="fas fa-lock"></i> Lock Room`;
      if (newLockedState) {
        showToastNotification("Room Locked 🔒", "No new players can join the channel.");
        $('activeRoomLockIcon').classList.remove('hidden');
      } else {
        showToastNotification("Room Unlocked 🔓", "The voice channel is now open for joins.");
        $('activeRoomLockIcon').classList.add('hidden');
      }
    }
  } catch(e){}
}

// Toggle local microphone state
function toggleMyMicrophone() {
  isMicMuted = !isMicMuted;
  const icon = $('btnVoiceToggleMute').querySelector('i');
  
  if (isMicMuted) {
    icon.className = 'fas fa-microphone-slash text-red';
    $('btnVoiceToggleMute').classList.add('border-red-500/30', 'bg-red-500/10');
    showToastNotification("Microphone Muted 🔇", "Other players can't hear you.");
    muteLocalAudio(true);
    playRadioSquelchClick(true);
  } else {
    icon.className = 'fas fa-microphone text-emerald-400';
    $('btnVoiceToggleMute').classList.remove('border-red-500/30', 'bg-red-500/10');
    showToastNotification("Microphone Active 🎙️", "You are unmuted.");
    muteLocalAudio(false);
    playRadioSquelchClick(false);
  }

  updateMemberDocumentVoiceState();
}

function muteLocalAudio(mute) {
  if (localStream) {
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !mute;
    });
  }
  // Dynamic feedback loopback
  toggleLocalMicLoopback(!mute);
}

// Toggle local speaker state
function toggleMySpeakers() {
  isSpeakerMuted = !isSpeakerMuted;
  const icon = $('btnVoiceToggleDeafen').querySelector('i');

  if (isSpeakerMuted) {
    icon.className = 'fas fa-volume-mute text-red';
    $('btnVoiceToggleDeafen').classList.add('border-red-500/30', 'bg-red-500/10');
    showToastNotification("Speakers Deafened 🙉", "You won't hear other team players.");
    toggleLocalMicLoopback(false);
  } else {
    icon.className = 'fas fa-volume-up text-emerald-400';
    $('btnVoiceToggleDeafen').classList.remove('border-red-500/30', 'bg-red-500/10');
    showToastNotification("Speakers Active 🔊", "Listening to tactical audio...");
    toggleLocalMicLoopback(!isMicMuted);
  }

  // Adjust volume of all Web Audio API gain nodes
  Object.keys(remoteAudioGainNodes).forEach(peerId => {
    const gn = remoteAudioGainNodes[peerId];
    if (gn) {
      gn.gain.value = isSpeakerMuted ? 0.0 : 3.5;
    }
  });

  // Mute/unmute fallback standard audio elements
  Object.keys(peerConnections).forEach(peerId => {
    const el = document.getElementById(`audio-remote-${peerId}`);
    if (el) el.muted = isSpeakerMuted;
  });

  updateMemberDocumentVoiceState();
}

// Update voice states inside Firestore Member document
async function updateMemberDocumentVoiceState() {
  if (!currentVoiceRoomId || !userProfile) return;
  try {
    await updateDoc(doc(db, 'voice_rooms', currentVoiceRoomId, 'members', userProfile.uid), {
      muted: isMicMuted || (pttEnabled && !pttActive),
      deafened: isSpeakerMuted,
      micStatus: !isMicMuted && (!pttEnabled || pttActive)
    });
  } catch(e){}
}

// PTT speaking helpers
function startPTTSpeaking() {
  if (!pttEnabled || pttActive) return;
  pttActive = true;
  muteLocalAudio(false);
  updateMemberDocumentVoiceState();
  // mini tone
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch(e){}
}

// PTT speaking helpers end
function stopPTTSpeaking() {
  if (!pttEnabled || !pttActive) return;
  pttActive = false;
  muteLocalAudio(true);
  updateMemberDocumentVoiceState();
}

// Listen to room specific chat logs
function listenToRoomChats(roomId) {
  if (activeRoomChatUnsub) activeRoomChatUnsub();

  const chatRef = collection(db, 'voice_rooms', roomId, 'chats');
  const q = query(chatRef, orderBy('createdAt', 'asc'), limit(50));

  activeRoomChatUnsub = onSnapshot(q, (snap) => {
    const msgsContainer = $('roomChatMsgs');
    if (!msgsContainer) return;

    msgsContainer.innerHTML = '';
    
    if (snap.empty) {
      msgsContainer.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center text-t3 text-center p-4">
          <i class="far fa-comments text-xl text-emerald-500/20 mb-1"></i>
          <p class="text-[10px]">No messages in this squad room yet.</p>
        </div>
      `;
      return;
    }

    snap.forEach(d => {
      const chat = d.data();
      const row = document.createElement('div');
      row.className = 'flex items-start gap-2 text-[10px] leading-relaxed';
      row.innerHTML = `
        <img src="${chat.userAvatar}" class="w-6 h-6 rounded-full border border-bdr shrink-0 mt-0.5 bg-card/40"/>
        <div>
          ${window.formatPlayerNameHtml({ name: chat.userName, isPremium: chat.isPremium || chat.premium, isVerified: chat.isVerified || chat.hasBlueTick || chat.verified }, 'font-black mr-1 text-white', 'w-3 h-3')}
          <span class="text-t2 break-all font-medium">${chat.message}</span>
        </div>
      `;
      msgsContainer.appendChild(row);
    });

    // Auto scroll chat to bottom
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
  }, (err) => {
    console.error("Firestore error watching room chat:", err);
  });
}

// Invite friend panel handler
function openVoiceInviteModal() {
  const container = $('voiceInviteFriendsList');
  if (!container) return;

  container.innerHTML = '<div class="text-center p-4 animate-pulse text-t3">Loading squad list...</div>';
  $('mInviteFriendToVoice').classList.remove('hidden');

  // Load friends from local memory friendList
  if (!friendList || friendList.length === 0) {
    container.innerHTML = `
      <div class="text-center p-6 text-t3">
        <i class="fas fa-users-slash text-xl mb-1 text-emerald-500/30"></i>
        <p>No active online friends found. Add friends in the Chat tab first!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  friendList.forEach(friend => {
    const row = document.createElement('div');
    row.className = 'p-2.5 bg-card border border-bdr rounded-xl flex items-center justify-between text-xs font-semibold';
    row.innerHTML = `
      <div class="flex items-center gap-2.5 truncate flex-1 pr-2">
        <img src="${friend.av || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + friend.uid}" class="w-7 h-7 rounded-full border border-bdr shrink-0 bg-card/40"/>
        <div class="truncate">
          <div class="text-white truncate">${friend.name}</div>
          <div class="text-[9px] text-t3 truncate">${friend.handle}</div>
        </div>
      </div>
      <button class="btn-send-room-invite px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/25 hover:border-transparent rounded-lg text-[9px] font-bold uppercase tracking-wider transition cursor-pointer" data-uid="${friend.uid}">
        Invite
      </button>
    `;

    row.querySelector('.btn-send-room-invite')?.addEventListener('click', (e) => {
      sendVoiceRoomInvitation(friend.uid, friend.name, e.target);
    });

    container.appendChild(row);
  });
}

// Send Room invitation document to friend
async function sendVoiceRoomInvitation(friendId, friendName, btnEl) {
  if (!currentVoiceRoomId || !userProfile) return;

  try {
    btnEl.disabled = true;
    btnEl.textContent = "Sending...";
    btnEl.classList.add('opacity-50');

    // Create invite doc in friend's subcollection
    await addDoc(collection(db, 'users', friendId, 'invitations'), {
      roomId: currentVoiceRoomId,
      roomName: $('activeRoomName').textContent,
      hostName: userProfile.name,
      invitedBy: userProfile.uid,
      createdAt: serverTimestamp()
    });

    // Also post interactive invite message to DM history!
    try {
      const dmRoomId = [userProfile.uid, friendId].sort().join('_');
      await addDoc(collection(db, 'dms', dmRoomId, 'messages'), {
        text: `[Voice Invite to "${$('activeRoomName').textContent}"]`,
        sender: userProfile.uid,
        senderName: userProfile.name,
        isVoiceRoomInvite: true,
        voiceRoomId: currentVoiceRoomId,
        voiceRoomName: $('activeRoomName').textContent,
        voiceRoomGame: $('activeRoomGame').textContent,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Failed to post invite to DM chat history:", e);
    }

    btnEl.textContent = "Sent ✓";
    btnEl.classList.remove('bg-emerald-500/10', 'text-emerald-400');
    btnEl.classList.add('bg-emerald-600', 'text-white');
    showToastNotification("Invitation Dispatched 🎮", `Sent squad invite to ${friendName}!`);
  } catch (err) {
    console.error("Error sending voice invitation:", err);
    btnEl.disabled = false;
    btnEl.textContent = "Invite";
    btnEl.classList.remove('opacity-50');
  }
}

// Listen to invitations targeting me in real-time
let invitationsUnsub = null;
function listenToInvitations(myUid) {
  if (invitationsUnsub) invitationsUnsub();

  const invitationsRef = collection(db, 'users', myUid, 'invitations');
  const q = query(invitationsRef, orderBy('createdAt', 'desc'), limit(5));

  invitationsUnsub = onSnapshot(q, (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === "added") {
        const invite = change.doc.data();
        
        // Prevent showing stale invitations (older than 2 minutes)
        const ageSec = invite.createdAt ? (Date.now() - invite.createdAt.seconds * 1000) / 1000 : 0;
        if (ageSec > 120) {
          // Delete stale invitations directly
          deleteDoc(doc(db, 'users', myUid, 'invitations', change.doc.id)).catch(()=>{});
          return;
        }

        // Show a custom, gorgeous dual-button toast notification for the invite!
        showVoiceRoomInviteToast(change.doc.id, invite);
      }
    });
  });
}

// Show active squad invitation panel toast
function showVoiceRoomInviteToast(inviteId, invite) {
  let toast = document.createElement('div');
  toast.id = `invite-toast-${inviteId}`;
  toast.className = 'fixed top-16 right-4 p-4 bg-gradient-to-br from-[#0c0e17] to-[#121c21] border border-emerald-500/45 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.3)] z-[999] flex flex-col gap-3 max-w-[320px] w-full animate-bounce';
  
  toast.innerHTML = `
    <div class="flex items-start gap-3 text-xs">
      <div class="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
        <i class="fas fa-gamepad text-lg animate-pulse"></i>
      </div>
      <div>
        <div class="font-black text-white uppercase tracking-wider text-[11px]">SQUAD INVITATION</div>
        <p class="text-t2 text-[10px] mt-0.5"><strong class="text-white">${invite.hostName}</strong> wants you to join their voice channel: <strong class="text-emerald-400">"${invite.roomName}"</strong></p>
      </div>
    </div>
    <div class="flex gap-2">
      <button class="btn-accept-invite flex-1 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black uppercase rounded-lg text-[9px] border border-emerald-500/30 transition shadow-lg cursor-pointer">Join voice</button>
      <button class="btn-reject-invite px-3 py-1.5 bg-card/80 hover:bg-card border border-bdr hover:text-white text-t3 font-bold uppercase rounded-lg text-[9px] transition cursor-pointer">Decline</button>
    </div>
  `;

  // Join handler
  toast.querySelector('.btn-accept-invite')?.addEventListener('click', () => {
    switchTab("Voice");
    joinVoiceRoom(invite.roomId);
    toast.remove();
    // Delete invite doc
    if (userProfile) {
      deleteDoc(doc(db, 'users', userProfile.uid, 'invitations', inviteId)).catch(()=>{});
    }
  });

  // Decline handler
  toast.querySelector('.btn-reject-invite')?.addEventListener('click', () => {
    toast.remove();
    if (userProfile) {
      deleteDoc(doc(db, 'users', userProfile.uid, 'invitations', inviteId)).catch(()=>{});
    }
  });

  document.body.appendChild(toast);

  // Auto remove toast after 30 seconds
  setTimeout(() => {
    if (toast) toast.remove();
  }, 30000);
}

// Automatically leave voice room if tab/browser is closed or reloaded
window.addEventListener('beforeunload', () => {
  if (currentVoiceRoomId) {
    leaveVoiceRoom(false);
  }
});
window.addEventListener('pagehide', () => {
  if (currentVoiceRoomId) {
    leaveVoiceRoom(false);
  }
});

// ── VIDEO SUBMISSIONS EVENT SYSTEM ──
let userSubmissionsList = [];

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function hasSubmittedThisMonth(list) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  return list.some(sub => {
    let date;
    if (sub.submittedAt) {
      if (sub.submittedAt.seconds) {
        date = new Date(sub.submittedAt.seconds * 1000);
      } else {
        date = new Date(sub.submittedAt);
      }
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }
    return false;
  });
}

function startUserSubmissionsListener(userId) {
  if (window.userSubmissionsUnsub) {
    try { window.userSubmissionsUnsub(); } catch (e) {}
    window.userSubmissionsUnsub = null;
  }
  
  const q = query(
    collection(db, 'video_submissions'),
    where('userId', '==', userId)
  );
  
  window.userSubmissionsUnsub = onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach(docSnap => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    
    // Sort in JS to prevent index requirement failures
    list.sort((a, b) => {
      const timeA = a.submittedAt?.seconds ? a.submittedAt.seconds * 1000 : (a.submittedAt ? new Date(a.submittedAt).getTime() : 0);
      const timeB = b.submittedAt?.seconds ? b.submittedAt.seconds * 1000 : (b.submittedAt ? new Date(b.submittedAt).getTime() : 0);
      return timeB - timeA;
    });
    
    userSubmissionsList = list;
    renderUserSubmissions(list);
  }, (err) => {
    console.error("Submissions listener error: ", err);
  });
}

function loadUserSubmissions() {
  const profile = userProfile || guestProfile;
  if (profile) {
    startUserSubmissionsListener(profile.uid);
  }
}

function renderUserSubmissions(list) {
  const tbody = $('mySubmissionsList');
  if (!tbody) return;
  
  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="p-8 text-center text-t3">No video submissions recorded yet. Create your first promotional video and claim epic rewards! 🎬</td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = list.map(sub => {
    let dateStr = 'Unknown';
    if (sub.submittedAt) {
      const date = sub.submittedAt.seconds ? new Date(sub.submittedAt.seconds * 1000) : new Date(sub.submittedAt);
      dateStr = date.toLocaleString();
    }
    
    let statusClass = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    if (sub.status === 'approved') statusClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (sub.status === 'rejected') statusClass = 'bg-red/10 text-red border-red/20';
    
    const statusBadge = `<span class="px-2.5 py-1 text-[10px] font-bold rounded-md border uppercase tracking-wider ${statusClass}">${sub.status}</span>`;
    
    let rewardText = 'Pending Review';
    if (sub.status === 'approved') {
      rewardText = sub.reward ? `${sub.reward}` : 'Approved';
    } else if (sub.status === 'rejected') {
      rewardText = `<span class="text-red">Rejected (${sub.rejectReason || 'Does not meet requirements'})</span>`;
    }
    
    return `
      <tr class="hover:bg-white/[0.01] transition">
        <td class="p-3 font-semibold text-white">${sub.platform}</td>
        <td class="p-3 max-w-[200px] truncate"><a href="${sub.videoLink}" target="_blank" class="text-blue-400 hover:underline inline-flex items-center gap-1">${sub.videoLink} <i class="fas fa-external-link-alt text-[9px]"></i></a></td>
        <td class="p-3 text-[11px] text-t3 font-mono">${dateStr}</td>
        <td class="p-3">${statusBadge}</td>
        <td class="p-3 font-semibold text-gold text-[11px]">${rewardText}</td>
      </tr>
    `;
  }).join('');
}

// Bind button action
document.addEventListener('DOMContentLoaded', () => {
  const submitBtn = $('btnSubmitVideo');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const errDiv = $('subVideoErr');
      const successDiv = $('subVideoSuccess');
      const btn = $('btnSubmitVideo');
      
      errDiv.classList.add('hidden');
      successDiv.classList.add('hidden');
      
      const platform = $('subVideoPlatform').value;
      const link = $('subVideoLink').value.trim();
      
      const profile = userProfile || guestProfile;
      if (!profile) {
        errDiv.textContent = "Please sign in to submit a promo video. ❌";
        errDiv.classList.remove('hidden');
        return;
      }
      
      if (!link) {
        errDiv.textContent = "Please enter a valid video link. ❌";
        errDiv.classList.remove('hidden');
        return;
      }
      
      if (!isValidUrl(link)) {
        errDiv.textContent = "Invalid URL format. Please enter a complete website link. ❌";
        errDiv.classList.remove('hidden');
        return;
      }
      
      // Check if they already submitted this month
      if (hasSubmittedThisMonth(userSubmissionsList)) {
        errDiv.textContent = "You have already submitted a video this calendar month. Limits are 1 submission per user per month. ❌";
        errDiv.classList.remove('hidden');
        return;
      }
      
      try {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner animate-spin"></i> Submitting...`;
        
        await addDoc(collection(db, 'video_submissions'), {
          userId: profile.uid,
          username: profile.name,
          userEmail: profile.email || 'Guest Player',
          platform: platform,
          videoLink: link,
          status: 'pending',
          submittedAt: serverTimestamp(),
          reward: null
        });
        
        successDiv.textContent = "Your video has been submitted successfully! ArenaX Staff will review it and reward you shortly. 🍃 Scroll down to see history.";
        successDiv.classList.remove('hidden');
        $('subVideoLink').value = '';
        
      } catch (err) {
        console.error("Submission error: ", err);
        errDiv.textContent = "Failed to submit video: " + err.message;
        errDiv.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-scroll"></i> Submit Promo Jutsu`;
      }
    });
  }
});

// Bind methods to window scope for tab controller access
window.initVoiceRoomsSystem = initVoiceRoomsSystem;
window.listenToVoiceRooms = listenToVoiceRooms;
window.startUserSubmissionsListener = startUserSubmissionsListener;
window.loadUserSubmissions = loadUserSubmissions;
window.renderUserSubmissions = renderUserSubmissions;

// ── SPLASH SCREEN FOR PROMO SUBMISSIONS PAGE ──
function playSubmissionSplash() {
  // Check if overlay already exists to avoid duplication
  if (document.getElementById('submission-splash-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'submission-splash-overlay';
  overlay.className = 'fixed inset-0 bg-black flex flex-col items-center justify-center opacity-100 transition-opacity duration-[800ms] ease-out';
  overlay.style.zIndex = '999999';

  // Transparent-background video clip (made to loop)
  const video = document.createElement('video');
  video.src = '071702_1784293531987.mp4';
  video.className = 'max-w-[80%] max-h-[70%] object-contain pointer-events-none mb-6';
  video.playsInline = true;
  video.controls = false;
  video.loop = true;

  overlay.appendChild(video);

  let finished = false;
  const finishSplash = () => {
    if (finished) return;
    finished = true;
    overlay.classList.replace('opacity-100', 'opacity-0');
    setTimeout(() => {
      try {
        video.pause();
        video.src = '';
        video.load();
      } catch (err) {}
      overlay.remove();
    }, 850);
  };

  // Skip Button
  const skipBtn = document.createElement('button');
  skipBtn.className = 'px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-widest rounded-full border border-white/20 transition active:scale-95 cursor-pointer flex items-center gap-2';
  skipBtn.innerHTML = 'Skip <i class="fas fa-forward text-[10px]"></i>';
  skipBtn.addEventListener('click', finishSplash);
  overlay.appendChild(skipBtn);

  document.body.appendChild(overlay);

  // Try playing with audio enabled first
  video.play().then(() => {
    console.log("Splash promo video playing with sound successfully!");
  }).catch((err) => {
    // Fallback: If autoplay with sound is blocked by browser autoplay policy, play muted.
    console.log("Audio-enabled autoplay blocked. Falling back to muted playback.", err);
    video.muted = true;
    video.play().catch((e) => console.error("Muted playback failed:", e));
  });

  // Fade out smoothly after 10 seconds safety limit
  setTimeout(finishSplash, 10000);
}

// ── PROMO CODE REDEMPTION LOGIC ──
function initPromoCodeFeature() {
  const btn = $('btnRedeemPromo');
  const inp = $('inpPromoCode');
  const msgEl = $('promoMsg');

  if (!btn || !inp || !msgEl) return;

  const showMsg = (text, type) => {
    msgEl.textContent = text;
    msgEl.classList.remove('hidden');
    if (type === 'success') {
      msgEl.className = "text-green bg-green-500/10 border border-green-500/20 text-[10px] p-2.5 rounded-lg border leading-normal mt-2";
    } else if (type === 'error') {
      msgEl.className = "text-red bg-red-500/10 border border-red-500/20 text-[10px] p-2.5 rounded-lg border leading-normal mt-2";
    } else {
      msgEl.className = "text-gold bg-gold/10 border border-gold/20 text-[10px] p-2.5 rounded-lg border leading-normal mt-2";
    }
  };

  btn.addEventListener('click', async () => {
    msgEl.classList.add('hidden');
    
    if (!userProfile) {
      showMsg("Please sign in to redeem a promo code. ❌", "error");
      return;
    }

    const code = inp.value.trim().toUpperCase();
    if (!code) {
      showMsg("Please enter a promo code first! ⚠️", "warning");
      return;
    }

    // Supported promo codes map: code -> AX Coins reward
    const PROMO_CODES = {
      'WELCOME50': 50,
      'ARENAX100': 100,
      'NINJA150': 150,
      'HOKAGE500': 500,
      'GEMINI77': 77,
      'AXCOIN200': 200
    };

    if (!(code in PROMO_CODES)) {
      showMsg("Invalid promo code! Please check and try again. ❌", "error");
      return;
    }

    const rewardCoins = PROMO_CODES[code];

    // Check if user already redeemed this promo code
    const redeemedList = userProfile.redeemedPromoCodes || [];
    if (redeemedList.includes(code)) {
      showMsg(`This promo code (${code}) has already been redeemed on your account! ⚠️`, "warning");
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Applying...';

    try {
      // 1. Update user document: increment balance & record redeemed code
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        balance: increment(rewardCoins),
        redeemedPromoCodes: arrayUnion(code)
      });

      // 2. Insert successful transaction record in 'deposit_requests' to show up in history
      const txnId = 'PROMO-' + code + '-' + Math.floor(100000 + Math.random() * 900000);
      await addDoc(collection(db, 'deposit_requests'), {
        userId: userProfile.uid,
        userName: userProfile.name,
        userHandle: userProfile.handle,
        amountPKR: 0,
        amountAX: rewardCoins,
        method: `Promo Code (${code})`,
        txnId: txnId,
        status: 'approved',
        type: 'deposit',
        submittedAt: serverTimestamp()
      });

      inp.value = '';
      showMsg(`Success! Promo code ${code} applied. ${rewardCoins} AX Coins have been added to your wallet! 🎉🍃`, "success");
    } catch (err) {
      console.error("Error applying promo code:", err);
      showMsg("Failed to apply promo code. Please try again. Error: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = 'Apply';
    }
  });
}

// Call inside the module script block
initPromoCodeFeature();

window.playSubmissionSplash = playSubmissionSplash;

// Global Window Attachments
window.openVoiceRoomModal = function() {
  const modal = $('mCreateVoiceRoom');
  if (modal) modal.classList.remove('hidden');
};
window.closeVoiceRoomModal = function() {
  const modal = $('mCreateVoiceRoom');
  if (modal) modal.classList.add('hidden');
};
window.openVoiceRoomGiftModal = typeof openVoiceRoomGiftModal === 'function' ? openVoiceRoomGiftModal : function() {
  const modal = $('mVoiceRoomGiftModal');
  if (modal) modal.classList.remove('hidden');
};
window.closeVoiceRoomGiftModal = typeof closeVoiceRoomGiftModal === 'function' ? closeVoiceRoomGiftModal : function() {
  const modal = $('mVoiceRoomGiftModal');
  if (modal) modal.classList.add('hidden');
};
