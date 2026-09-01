// ==========================================
// ARENAX MOMENTS SYSTEM MODULE
// ==========================================


// ── MOMENTS SYSTEM MODULE ──
let allMomentsList = [];
let selectedMomentFile = null;
let selectedMomentFileType = 'image';
let momentsSubscribed = false;

function safeMomentTxt(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let allMomentReactionsMap = {};
let reactionsSubscribed = false;

function initMomentsListener() {
  if (momentsSubscribed) return;
  momentsSubscribed = true;
  try {
    const qMoments = query(collection(db, 'moments'), orderBy('createdAt', 'desc'));
    onSnapshot(qMoments, (snap) => {
      allMomentsList = [];
      snap.forEach((docSnap) => {
        allMomentsList.push({ id: docSnap.id, ...docSnap.data() });
      });
      renderProfileMomentsSection();
      if ($('mMomentsProfileModal') && !$('mMomentsProfileModal').classList.contains('hidden')) {
        renderFullMomentsProfilePage();
      }
      if ($('mMomentsFeedModal') && !$('mMomentsFeedModal').classList.contains('hidden')) {
        renderMomentsFeedPage();
      }
    }, (err) => {
      console.warn("Error listening to moments:", err);
    });
  } catch(e) {
    console.warn("Failed to subscribe to moments:", e);
  }

  // Also subscribe to all premiumReactions
  if (!reactionsSubscribed) {
    reactionsSubscribed = true;
    try {
      const qReactions = query(collectionGroup(db, 'premiumReactions'));
      onSnapshot(qReactions, (snap) => {
        const map = {};
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const pMomentId = data.momentId || docSnap.ref.parent?.parent?.id;
          if (pMomentId) {
            if (!map[pMomentId]) map[pMomentId] = [];
            map[pMomentId].push({
              id: docSnap.id,
              ...data,
              momentId: pMomentId
            });
          }
        });
        allMomentReactionsMap = map;
        if ($('mMomentsFeedModal') && !$('mMomentsFeedModal').classList.contains('hidden')) {
          renderMomentsFeedPage();
        }
      }, (err) => {
        console.warn("Error listening to reactions:", err);
      });
    } catch(e) {
      console.warn("Failed to subscribe to reactions:", e);
    }
  }
}

// 1. Render Moments section inside Profile Tab
function renderProfileMomentsSection() {
  const profile = userProfile || guestProfile || window.currentUser;
  const myMoments = allMomentsList.filter(m => profile && m.userId === profile.uid);
  
  if ($('myMomentsCount')) $('myMomentsCount').textContent = myMoments.length;
  
  const actionArea = $('profileMomentsActionArea');
  if (!actionArea) return;

  if (myMoments.length === 0) {
    actionArea.innerHTML = `
      <button
        id="btnShareMomentsProfile"
        type="button"
        onclick="openUploadMomentModal()"
        class="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer tracking-wide uppercase"
      >
        <i class="fas fa-camera text-sm"></i> Share your moments!
      </button>
    `;
  } else {
    actionArea.innerHTML = `
      <div class="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
        <button
          type="button"
          onclick="openUploadMomentModal()"
          class="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 flex flex-col items-center justify-center shrink-0 font-black shadow-md hover:scale-105 transition cursor-pointer"
          title="Share new moment"
        >
          <i class="fas fa-plus text-base"></i>
          <span class="text-[9px] uppercase font-extrabold mt-0.5">Add</span>
        </button>
        ${myMoments.map(m => `
          <div onclick="openViewMomentModal('${m.id}')" class="relative w-16 h-16 rounded-xl overflow-hidden border border-amber-500/30 shrink-0 cursor-pointer group shadow-sm bg-black">
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

// 2. Render Full User Moments Page Modal
function renderFullMomentsProfilePage() {
  const profile = userProfile || guestProfile || window.currentUser;
  const myMoments = allMomentsList.filter(m => profile && m.userId === profile.uid);
  const container = $('momentsProfilePageContent');
  if (!container) return;

  if (myMoments.length === 0) {
    container.innerHTML = `
      <div class="py-12 px-4 text-center space-y-6">
        <div class="w-24 h-24 mx-auto rounded-full bg-[#1b1e2e] border-2 border-[#f0c040]/30 flex items-center justify-center shadow-2xl text-[#f0c040] text-4xl">
          <i class="fas fa-camera"></i>
        </div>
        <div class="space-y-1">
          <h3 class="text-lg font-extrabold text-white">Share Your Moments!</h3>
          <p class="text-xs text-gray-400 max-w-xs mx-auto">
            No moments uploaded yet. Post your videos (up to 30s) or photos to display them on your profile!
          </p>
        </div>
        <button onclick="openUploadMomentModal()" class="w-full max-w-xs mx-auto py-3.5 bg-gradient-to-r from-[#f0c040] via-amber-400 to-yellow-500 hover:brightness-110 text-slate-950 font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition cursor-pointer tracking-wider uppercase">
          <i class="fas fa-camera text-base"></i> Share Your Moments!
        </button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between px-1">
          <span class="text-xs font-bold text-gray-400">Your Highlights (${myMoments.length})</span>
          <button onclick="openUploadMomentModal()" class="px-3 py-1.5 bg-gradient-to-r from-[#f0c040] to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer">
            <i class="fas fa-plus"></i> Add New
          </button>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          ${myMoments.map(m => `
            <div onclick="openViewMomentModal('${m.id}')" class="relative rounded-xl overflow-hidden border border-[#252a45] bg-[#141724] group cursor-pointer shadow-md hover:border-[#f0c040]/60 transition">
              <div class="w-full h-36 relative bg-black">
                ${m.mediaType === 'video' ? `
                  <video src="${m.mediaUrl}" class="w-full h-full object-cover"></video>
                  <div class="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition">
                    <i class="fas fa-play text-white text-lg drop-shadow"></i>
                  </div>
                  <span class="absolute bottom-2 right-2 bg-black/70 text-[9px] text-amber-400 px-1.5 py-0.5 rounded font-bold border border-amber-400/30">
                    <i class="fas fa-video mr-1"></i>30s
                  </span>
                ` : `
                  <img src="${m.mediaUrl}" alt="Moment" class="w-full h-full object-cover group-hover:scale-105 transition" />
                `}
                <button
                  onclick="event.stopPropagation(); deleteMoment('${m.id}')"
                  class="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center text-xs transition z-10"
                  title="Delete moment"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
              ${m.caption ? `<div class="p-2 text-[11px] font-medium text-gray-200 truncate">${safeMomentTxt(m.caption)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

// 3. Render Community Moments Feed Modal (Explore section)
window.momentsFeedFilterUserId = null;
window.momentsFeedFilterUserName = null;

function openMomentsFeedModalFiltered(userId, userName) {
  window.momentsFeedFilterUserId = userId;
  window.momentsFeedFilterUserName = userName;
  openMomentsFeedModal();
}

function renderMomentsFeedPage() {
  const container = $('momentsFeedPageContent');
  if (!container) return;
  const profile = userProfile || guestProfile || window.currentUser;
  const isPremUser = !!(profile && (profile.premium || profile.isPremium || profile.isVIP));

  // Header Title Update if element exists
  if ($('momentsFeedTitle')) {
    $('momentsFeedTitle').innerHTML = `<i class="fas fa-camera text-[#f0c040] mr-2"></i>${window.momentsFeedFilterUserName ? safeMomentTxt(window.momentsFeedFilterUserName) + "'s Moments" : 'Community Moments'}`;
  }

  const listToRender = window.momentsFeedFilterUserId 
    ? allMomentsList.filter(m => m.userId === window.momentsFeedFilterUserId)
    : allMomentsList;

  if (listToRender.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center space-y-3">
        <i class="fas fa-photo-video text-4xl text-[#f0c040]/40"></i>
        <p class="text-sm font-semibold text-gray-400">No moments found.</p>
        ${window.momentsFeedFilterUserId ? `
          <button onclick="window.momentsFeedFilterUserId = null; window.momentsFeedFilterUserName = null; renderMomentsFeedPage();" class="px-4 py-2 bg-[#f0c040] text-slate-950 font-bold text-xs rounded-xl cursor-pointer">
            View All Community Moments
          </button>
        ` : `
          <button onclick="openUploadMomentModal()" class="px-4 py-2 bg-[#f0c040] text-slate-950 font-bold text-xs rounded-xl cursor-pointer">
            Post First Moment
          </button>
        `}
      </div>
    `;
  } else {
    container.innerHTML = listToRender.map(m => {
      const isLiked = profile && m.likes && m.likes.includes(profile.uid);
      const isMine = profile && m.userId === profile.uid;
      const dateStr = m.createdAt && m.createdAt.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleDateString() : 'Just now';
      const userHtml = window.formatPlayerNameHtml(m, 'text-xs font-bold');

      // Reactions calculations
      const reactions = allMomentReactionsMap[m.id] || [];
      const catCount = reactions.filter(r => r.reactionType === 'cat').length;
      const teasingCount = reactions.filter(r => r.reactionType === 'teasing').length;
      const myReac = profile ? reactions.find(r => r.userId === profile.uid) : null;

      return `
        <div class="bg-[#141726] border border-[#252a45] rounded-2xl overflow-hidden shadow-xl space-y-3 p-3.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <img src="${m.userAv || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + m.userId}" class="w-10 h-10 rounded-full object-cover border border-[#f0c040]/30 bg-[#111420]" />
              <div>
                <div class="flex items-center gap-1">${userHtml}</div>
                <span class="text-[10px] text-gray-400">${dateStr}</span>
              </div>
            </div>
            ${isMine ? `
              <button onclick="deleteMoment('${m.id}')" class="text-gray-400 hover:text-red-400 text-xs p-1.5 transition cursor-pointer" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            ` : ''}
          </div>

          <div class="rounded-xl overflow-hidden bg-black border border-white/5 relative">
            ${m.mediaType === 'video' ? `
              <video src="${m.mediaUrl}" controls playsinline class="w-full max-h-[450px] object-contain mx-auto bg-black"></video>
            ` : `
              <img src="${m.mediaUrl}" class="w-full max-h-[450px] object-cover mx-auto" />
            `}
          </div>

          ${m.caption ? `<p class="text-xs text-gray-200 font-medium px-1 leading-relaxed">${safeMomentTxt(m.caption)}</p>` : ''}

          <div class="flex items-center justify-between pt-1 border-t border-[#22273f]">
            <div class="flex items-center gap-2">
              <div class="heart-container" title="Like">
                <input 
                  type="checkbox" 
                  class="checkbox" 
                  id="like-html-${m.id}" 
                  ${isLiked ? 'checked' : ''} 
                  onchange="toggleLikeMoment('${m.id}')"
                />
                <div class="svg-container">
                  <svg viewBox="0 0 24 24" class="svg-outline" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Zm-3.585,18.4a2.973,2.973,0,0,1-3.83,0C4.947,16.006,2,11.87,2,8.967a4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,11,8.967a1,1,0,0,0,2,0,4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,22,8.967C22,11.87,19.053,16.006,13.915,20.313Z">
                    </path>
                  </svg>
                  <svg viewBox="0 0 24 24" class="svg-filled" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Z">
                    </path>
                  </svg>
                  <svg class="svg-celebrate" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="10,10 20,20"></polygon>
                    <polygon points="10,50 20,50"></polygon>
                    <polygon points="20,80 30,70"></polygon>
                    <polygon points="90,10 80,20"></polygon>
                    <polygon points="90,50 80,50"></polygon>
                    <polygon points="80,80 70,70"></polygon>
                  </svg>
                </div>
              </div>
              <span class="text-xs font-bold text-gray-300">
                ${m.likeCount || (m.likes ? m.likes.length : 0)}
              </span>
            </div>

            <!-- Right Area: Premium Reactions UI -->
            <div class="flex items-center gap-2">
              ${reactions.length > 0 ? `
                <button
                  type="button"
                  onclick="openWhoReactedModal('${m.id}')"
                  class="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#1b1f35] hover:bg-[#252c4a] border border-amber-400/30 text-amber-300 active:scale-95 transition cursor-pointer shadow-xs"
                  title="View who reacted"
                >
                  ${catCount > 0 ? `
                    <span class="flex items-center gap-1">
                      <img src="/cat.gif" alt="Cat" class="w-5 h-5 object-contain" />
                      <span class="text-[11px] font-extrabold text-amber-300">${catCount}</span>
                    </span>
                  ` : ''}
                  ${teasingCount > 0 ? `
                    <span class="flex items-center gap-1">
                      <img src="/teasing.gif" alt="Teasing" class="w-5 h-5 object-contain" />
                      <span class="text-[11px] font-extrabold text-amber-300">${teasingCount}</span>
                    </span>
                  ` : ''}
                </button>
              ` : ''}

              ${isPremUser ? `
                <button
                  type="button"
                  onclick="openPremiumReactionPicker('${m.id}')"
                  class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition active:scale-95 cursor-pointer shadow-xs ${
                    myReac
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(240,192,64,0.2)]'
                      : 'bg-gradient-to-r from-purple-500/15 via-[#1b1e32] to-amber-500/15 hover:from-purple-500/25 hover:to-amber-500/25 border-amber-400/40 hover:border-amber-400 text-amber-300'
                  }"
                  title="Premium Reaction"
                >
                  <i class="fas fa-crown text-[10px] text-amber-400"></i>
                  <span>${myReac ? 'Reacted' : 'React'}</span>
                  ${myReac ? `
                    <img src="${myReac.reactionType === 'cat' ? '/cat.gif' : '/teasing.gif'}" alt="Reaction" class="w-4 h-4 object-contain inline-block ml-0.5" />
                  ` : ''}
                </button>
              ` : ''}

              ${!isPremUser && reactions.length === 0 ? `
                <span class="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">ArenaX Moments</span>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Premium Reaction Picker & Details Handlers
let activeReactionPickerMomentId = null;

function openPremiumReactionPicker(momentId) {
  activeReactionPickerMomentId = momentId;
  const profile = userProfile || guestProfile || window.currentUser;
  if (!profile) {
    alert('Please sign in to react.');
    return;
  }
  const isPrem = !!(profile.premium || profile.isPremium || profile.isVIP);
  if (!isPrem) {
    alert('👑 Premium Reactions are exclusive to ArenaX Premium members!');
    return;
  }

  const reactions = allMomentReactionsMap[momentId] || [];
  const myReac = reactions.find(r => r.userId === profile.uid);

  const container = $('premiumReactionPickerOptions');
  if (container) {
    container.innerHTML = `
      <button
        onclick="submitPremiumReaction('${momentId}', 'cat')"
        class="p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition cursor-pointer active:scale-95 group ${
          myReac && myReac.reactionType === 'cat'
            ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_15px_rgba(240,192,64,0.25)]'
            : 'bg-[#1a1e33] border-[#292f50] hover:border-amber-400/50 hover:bg-[#20253e]'
        }"
      >
        <div class="w-20 h-20 rounded-xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center p-1 group-hover:scale-105 transition">
          <img src="/cat.gif" alt="Cat Reaction" class="w-full h-full object-contain" />
        </div>
        <div class="text-center">
          <span class="text-xs font-bold text-white block">Cat Wink</span>
          <span class="text-[10px] text-amber-400/80 font-semibold">${myReac && myReac.reactionType === 'cat' ? '✓ Selected' : 'Tap to React'}</span>
        </div>
      </button>

      <button
        onclick="submitPremiumReaction('${momentId}', 'teasing')"
        class="p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition cursor-pointer active:scale-95 group ${
          myReac && myReac.reactionType === 'teasing'
            ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_15px_rgba(240,192,64,0.25)]'
            : 'bg-[#1a1e33] border-[#292f50] hover:border-amber-400/50 hover:bg-[#20253e]'
        }"
      >
        <div class="w-20 h-20 rounded-xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center p-1 group-hover:scale-105 transition">
          <img src="/teasing.gif" alt="Teasing Reaction" class="w-full h-full object-contain" />
        </div>
        <div class="text-center">
          <span class="text-xs font-bold text-white block">Teasing Wink</span>
          <span class="text-[10px] text-amber-400/80 font-semibold">${myReac && myReac.reactionType === 'teasing' ? '✓ Selected' : 'Tap to React'}</span>
        </div>
      </button>
    `;
  }

  const removeArea = $('premiumReactionPickerRemoveArea');
  if (removeArea) {
    if (myReac) {
      removeArea.classList.remove('hidden');
      removeArea.innerHTML = `
        <button
          onclick="removePremiumReaction('${momentId}')"
          class="text-xs text-red-400 hover:text-red-300 font-semibold py-1 px-3 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
        >
          <i class="fas fa-trash-alt mr-1"></i> Remove My Reaction
        </button>
      `;
    } else {
      removeArea.classList.add('hidden');
    }
  }

  if ($('mPremiumReactionPickerModal')) {
    $('mPremiumReactionPickerModal').classList.remove('hidden');
  }
}

function closePremiumReactionPicker() {
  activeReactionPickerMomentId = null;
  if ($('mPremiumReactionPickerModal')) {
    $('mPremiumReactionPickerModal').classList.add('hidden');
  }
}

async function submitPremiumReaction(momentId, reactionType) {
  const profile = userProfile || guestProfile || window.currentUser;
  if (!profile) return;
  const reactions = allMomentReactionsMap[momentId] || [];
  const myReac = reactions.find(r => r.userId === profile.uid);

  try {
    const docRef = doc(db, 'moments', momentId, 'premiumReactions', profile.uid);
    if (myReac && myReac.reactionType === reactionType) {
      await deleteDoc(docRef);
    } else {
      await setDoc(docRef, {
        momentId,
        userId: profile.uid,
        username: profile.name || 'Player',
        profilePhoto: profile.av || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.uid}`,
        reactionType,
        createdAt: serverTimestamp()
      }, { merge: true });
    }
    closePremiumReactionPicker();
  } catch(e) {
    console.error("Failed to submit reaction:", e);
    alert('Failed to save reaction: ' + (e.message || 'Error'));
  }
}

async function removePremiumReaction(momentId) {
  const profile = userProfile || guestProfile || window.currentUser;
  if (!profile) return;
  try {
    const docRef = doc(db, 'moments', momentId, 'premiumReactions', profile.uid);
    await deleteDoc(docRef);
    closePremiumReactionPicker();
  } catch(e) {
    console.error("Failed to delete reaction:", e);
  }
}

function openWhoReactedModal(momentId) {
  const reactions = allMomentReactionsMap[momentId] || [];
  if ($('whoReactedSubtitle')) {
    $('whoReactedSubtitle').textContent = `${reactions.length} total reaction${reactions.length === 1 ? '' : 's'}`;
  }
  const listEl = $('whoReactedList');
  if (listEl) {
    if (reactions.length === 0) {
      listEl.innerHTML = '<div class="py-8 text-center text-gray-400 text-xs">No reactions yet.</div>';
    } else {
      listEl.innerHTML = reactions.map(r => {
        const isCat = r.reactionType === 'cat';
        const gif = isCat ? '/cat.gif' : '/teasing.gif';
        const label = isCat ? 'Cat Wink' : 'Teasing Wink';
        return `
          <div class="flex items-center justify-between p-2.5 rounded-xl bg-[#1b1f35] border border-[#262c4c]">
            <div class="flex items-center gap-2.5">
              <img
                src="${r.profilePhoto || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + r.userId}"
                alt="${safeMomentTxt(r.username)}"
                class="w-9 h-9 rounded-full object-cover border border-amber-400/40 bg-[#101320]"
              />
              <div>
                <h5 class="text-xs font-bold text-white flex items-center gap-1">
                  <span class="golden-name-shimmer text-amber-300 font-extrabold">${safeMomentTxt(r.username)}</span>
                  <i class="fas fa-crown text-amber-400 text-[10px]" title="Premium"></i>
                </h5>
                <span class="text-[10px] text-gray-400">
                  ${r.createdAt && r.createdAt.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 border border-white/10">
              <img src="${gif}" alt="${label}" class="w-6 h-6 object-contain" />
              <span class="text-[10px] font-bold text-amber-300 hidden xs:inline">${label}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  if ($('mWhoReactedModal')) {
    $('mWhoReactedModal').classList.remove('hidden');
  }
}

function closeWhoReactedModal() {
  if ($('mWhoReactedModal')) {
    $('mWhoReactedModal').classList.add('hidden');
  }
}

window.openPremiumReactionPicker = openPremiumReactionPicker;
window.closePremiumReactionPicker = closePremiumReactionPicker;
window.submitPremiumReaction = submitPremiumReaction;
window.removePremiumReaction = removePremiumReaction;
window.openWhoReactedModal = openWhoReactedModal;
window.closeWhoReactedModal = closeWhoReactedModal;

// 4. Modal Visibility Toggles
function openMomentsProfileModal() {
  initMomentsListener();
  renderFullMomentsProfilePage();
  if ($('mMomentsProfileModal')) $('mMomentsProfileModal').classList.remove('hidden');
}
function closeMomentsProfileModal() {
  if ($('mMomentsProfileModal')) $('mMomentsProfileModal').classList.add('hidden');
}

function openMomentsFeedModal() {
  initMomentsListener();
  renderMomentsFeedPage();
  if ($('mMomentsFeedModal')) $('mMomentsFeedModal').classList.remove('hidden');
}
function closeMomentsFeedModal() {
  window.momentsFeedFilterUserId = null;
  window.momentsFeedFilterUserName = null;
  if ($('mMomentsFeedModal')) $('mMomentsFeedModal').classList.add('hidden');
}

function openUploadMomentModal() {
  initMomentsListener();
  resetMomentFileSelection();
  if ($('txtMomentCaption')) $('txtMomentCaption').value = '';
  if ($('momentUploadErrorBanner')) $('momentUploadErrorBanner').classList.add('hidden');
  if ($('mUploadMomentModal')) $('mUploadMomentModal').classList.remove('hidden');
}
function closeUploadMomentModal() {
  if ($('mUploadMomentModal')) $('mUploadMomentModal').classList.add('hidden');
}

function openViewMomentModal(momentId) {
  const m = allMomentsList.find(x => x.id === momentId);
  if (!m) return;
  const container = $('viewMomentModalContainer');
  if (!container) return;
  const profile = userProfile || guestProfile || window.currentUser;
  const isLiked = profile && m.likes && m.likes.includes(profile.uid);
  const isMine = profile && m.userId === profile.uid;
  const dateStr = m.createdAt && m.createdAt.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleDateString() : 'Just now';
  const userHtml = window.formatPlayerNameHtml(m, 'text-xs font-bold');

  container.innerHTML = `
    <button onclick="closeViewMomentModal()" class="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black flex items-center justify-center text-xs transition cursor-pointer">
      <i class="fas fa-times"></i>
    </button>
    <div class="flex items-center gap-2.5">
      <img src="${m.userAv || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + m.userId}" class="w-10 h-10 rounded-full object-cover border border-[#f0c040]/30" />
      <div>
        <div class="flex items-center gap-1">${userHtml}</div>
        <span class="text-[10px] text-gray-400">${dateStr}</span>
      </div>
    </div>
    <div class="rounded-xl overflow-hidden bg-black max-h-[480px] flex items-center justify-center">
      ${m.mediaType === 'video' ? `
        <video src="${m.mediaUrl}" controls autoplay class="w-full max-h-[480px] object-contain"></video>
      ` : `
        <img src="${m.mediaUrl}" class="w-full max-h-[480px] object-contain" />
      `}
    </div>
    ${m.caption ? `<p class="text-xs text-gray-200 font-medium px-1">${safeMomentTxt(m.caption)}</p>` : ''}
    <div class="flex items-center justify-between pt-2 border-t border-[#22273f]">
      <div class="flex items-center gap-2">
        <div class="heart-container" title="Like">
          <input 
            type="checkbox" 
            class="checkbox" 
            id="like-modal-${m.id}" 
            ${isLiked ? 'checked' : ''} 
            onchange="toggleLikeMoment('${m.id}')"
          />
          <div class="svg-container">
            <svg viewBox="0 0 24 24" class="svg-outline" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Zm-3.585,18.4a2.973,2.973,0,0,1-3.83,0C4.947,16.006,2,11.87,2,8.967a4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,11,8.967a1,1,0,0,0,2,0,4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,22,8.967C22,11.87,19.053,16.006,13.915,20.313Z">
              </path>
            </svg>
            <svg viewBox="0 0 24 24" class="svg-filled" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Z">
              </path>
            </svg>
            <svg class="svg-celebrate" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
              <polygon points="10,10 20,20"></polygon>
              <polygon points="10,50 20,50"></polygon>
              <polygon points="20,80 30,70"></polygon>
              <polygon points="90,10 80,20"></polygon>
              <polygon points="90,50 80,50"></polygon>
              <polygon points="80,80 70,70"></polygon>
            </svg>
          </div>
        </div>
        <span class="text-xs font-bold text-gray-300">
          ${m.likeCount || (m.likes ? m.likes.length : 0)}
        </span>
      </div>
      ${isMine ? `
        <button onclick="deleteMoment('${m.id}')" class="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer">
          <i class="fas fa-trash"></i> Delete
        </button>
      ` : ''}
    </div>
  `;
  if ($('mViewMomentModal')) $('mViewMomentModal').classList.remove('hidden');
}

function closeViewMomentModal() {
  if ($('mViewMomentModal')) $('mViewMomentModal').classList.add('hidden');
}

// 5. File Selection and 30-sec Video Duration Check
function handleMomentFileSelected(e) {
  const file = e.target.files && e.target.files[0];
  const errBanner = $('momentUploadErrorBanner');
  if (errBanner) errBanner.classList.add('hidden');
  if (!file) return;

  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');

  if (!isVideo && !isImage) {
    if (errBanner) {
      errBanner.textContent = 'Please select a valid image or video file.';
      errBanner.classList.remove('hidden');
    }
    return;
  }

  if (isVideo) {
    const v = document.createElement('video');
    v.preload = 'metadata';
    const objUrl = URL.createObjectURL(file);
    v.src = objUrl;
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(objUrl);
      if (v.duration > 30.5) {
        if (errBanner) {
          errBanner.textContent = '⚠️ Video length exceeds 30 seconds limit! Please pick a video under 30 seconds.';
          errBanner.classList.remove('hidden');
        }
        resetMomentFileSelection();
      } else {
        selectedMomentFile = file;
        selectedMomentFileType = 'video';
        showMomentPreview(URL.createObjectURL(file), 'video');
      }
    };
    v.onerror = () => {
      if (errBanner) {
        errBanner.textContent = 'Failed to load video file preview.';
        errBanner.classList.remove('hidden');
      }
    };
  } else {
    selectedMomentFile = file;
    selectedMomentFileType = 'image';
    showMomentPreview(URL.createObjectURL(file), 'image');
  }
}

function showMomentPreview(url, type) {
  const previewArea = $('momentFilePreviewArea');
  const selectorArea = $('momentFileSelectorArea');
  const previewContent = $('momentPreviewContent');
  if (!previewArea || !selectorArea || !previewContent) return;

  if (type === 'video') {
    previewContent.innerHTML = `<video src="${url}" controls class="max-h-52 w-full object-contain"></video>`;
  } else {
    previewContent.innerHTML = `<img src="${url}" class="max-h-52 w-full object-contain" />`;
  }
  selectorArea.classList.add('hidden');
  previewArea.classList.remove('hidden');
}

function resetMomentFileSelection() {
  selectedMomentFile = null;
  selectedMomentFileType = 'image';
  if ($('fileInputMoment')) $('fileInputMoment').value = '';
  if ($('momentFilePreviewArea')) $('momentFilePreviewArea').classList.add('hidden');
  if ($('momentFileSelectorArea')) $('momentFileSelectorArea').classList.remove('hidden');
}

// 6. Publish Moment
function compressImageToDataUrl(file, maxWidth = 1080, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl || e.target.result);
        } catch (err) {
          resolve(e.target.result);
        }
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

async function publishMoment() {
  const errBanner = $('momentUploadErrorBanner');
  if (errBanner) errBanner.classList.add('hidden');

  if (!selectedMomentFile) {
    if (errBanner) {
      errBanner.textContent = 'Please select a photo or video to post.';
      errBanner.classList.remove('hidden');
    } else {
      alert('Please select a photo or video to post.');
    }
    return;
  }

  const profile = userProfile || guestProfile || window.currentUser;
  if (!profile || !profile.uid) {
    alert('Please log in to post a moment.');
    return;
  }

  // Max size check: 20MB
  const MAX_SIZE = 20 * 1024 * 1024;
  if (selectedMomentFile.size > MAX_SIZE) {
    const msg = 'File size exceeds 20MB limit. Please pick a smaller file.';
    if (errBanner) {
      errBanner.textContent = msg;
      errBanner.classList.remove('hidden');
    } else {
      alert(msg);
    }
    return;
  }

  const btnSubmit = $('btnPublishMomentSubmit');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i class="fas fa-spinner animate-spin mr-1"></i> Uploading...`;
  }

  try {
    const cloudName = (import.meta && import.meta.env && import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) || (typeof window !== 'undefined' && window.VITE_CLOUDINARY_CLOUD_NAME);
    const uploadPreset = (import.meta && import.meta.env && import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET) || (typeof window !== 'undefined' && window.VITE_CLOUDINARY_UPLOAD_PRESET);

    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary configuration missing. Please ensure VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET are set.');
    }

    const formData = new FormData();
    formData.append('file', selectedMomentFile);
    formData.append('upload_preset', uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Cloudinary upload failed with status ${response.status}`);
    }

    const cloudData = await response.json();
    const mediaUrl = cloudData.secure_url;

    if (!mediaUrl) {
      throw new Error('Cloudinary upload succeeded but no secure_url was returned.');
    }

    const captionText = ($('txtMomentCaption') ? $('txtMomentCaption').value : '').trim();

    await addDoc(collection(db, 'moments'), {
      userId: profile.uid,
      userName: profile.name || profile.userName || 'Player',
      userAv: profile.av || profile.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.uid}`,
      isPremium: !!(profile.premium || profile.isPremium || profile.isVIP),
      isVerified: !!(profile.isVerified || profile.hasBlueTick || profile.blueTick || profile.verified),
      mediaUrl: mediaUrl,
      mediaType: selectedMomentFileType,
      caption: captionText,
      createdAt: serverTimestamp(),
      likes: [],
      likeCount: 0
    });

    closeUploadMomentModal();
    if (typeof showToastNotification === 'function') {
      showToastNotification("🎉 Moment Posted!", "Your moment is live!");
    } else {
      alert('🎉 Moment posted successfully!');
    }
  } catch(err) {
    console.error("Error publishing moment:", err);
    if (errBanner) {
      errBanner.textContent = err.message || 'Failed to publish moment.';
      errBanner.classList.remove('hidden');
    } else {
      alert(err.message || 'Failed to publish moment.');
    }
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<i class="fas fa-paper-plane mr-1"></i> Publish Moment`;
    }
  }
}

// 7. Delete Moment
async function deleteMoment(momentId) {
  if (!momentId) return;
  if (!confirm('Are you sure you want to delete this moment?')) return;
  try {
    await deleteDoc(doc(db, 'moments', momentId));
    closeViewMomentModal();
  } catch(err) {
    console.error("Failed to delete moment:", err);
    alert('Failed to delete moment.');
  }
}

// 8. Toggle Like
async function toggleLikeMoment(momentId) {
  const profile = userProfile || guestProfile || window.currentUser;
  if (!profile || !profile.uid) {
    alert("Please log in to like moments.");
    return;
  }
  const m = allMomentsList.find(x => x.id === momentId);
  if (!m) return;
  const isLiked = m.likes && m.likes.includes(profile.uid);
  const mRef = doc(db, 'moments', momentId);

  // Optimistic UI update
  if (!m.likes) m.likes = [];
  if (isLiked) {
    m.likes = m.likes.filter(id => id !== profile.uid);
    m.likeCount = Math.max(0, (m.likeCount || 1) - 1);
  } else {
    m.likes.push(profile.uid);
    m.likeCount = (m.likeCount || 0) + 1;
  }
  renderMomentsFeedPage();

  try {
    if (isLiked) {
      await updateDoc(mRef, {
        likes: arrayRemove(profile.uid),
        likeCount: increment(-1)
      });
    } else {
      await updateDoc(mRef, {
        likes: arrayUnion(profile.uid),
        likeCount: increment(1)
      });
    }
  } catch(err) {
    console.error("Error toggling like:", err);
  }
}

// Expose to window for inline onclicks
window.renderMomentsFeed = renderMomentsFeedPage;
window.renderMomentsFeedPage = renderMomentsFeedPage;
window.openMomentsProfileModal = openMomentsProfileModal;
window.closeMomentsProfileModal = closeMomentsProfileModal;
window.openMomentsFeedModal = openMomentsFeedModal;
window.openMomentsFeedModalFiltered = openMomentsFeedModalFiltered;
window.closeMomentsFeedModal = closeMomentsFeedModal;
window.openUploadMomentModal = openUploadMomentModal;
window.closeUploadMomentModal = closeUploadMomentModal;
window.openViewMomentModal = openViewMomentModal;
window.closeViewMomentModal = closeViewMomentModal;
window.handleMomentFileSelected = handleMomentFileSelected;
window.resetMomentFileSelection = resetMomentFileSelection;
window.publishMoment = publishMoment;
window.deleteMoment = deleteMoment;
window.toggleLikeMoment = toggleLikeMoment;

// ── 3D PLAYER SHOW VIEWER LOGIC ──
let playerShow3DAnimFrame = null;
let playerShow3DRenderer = null;
let playerShow3DScene = null;
let playerShow3DCamera = null;
let playerShow3DControls = null;
let playerShow3DModel = null;
let playerShow3DAutoRotateTimer = null;
let playerShowCoinGroup = null;

function createProceduralCharacter3D(THREE) {
  const group = new THREE.Group();

  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x181c2b, roughness: 0.3, metalness: 0.8 });
  const goldMetal = new THREE.MeshStandardMaterial({ color: 0xf0c040, roughness: 0.2, metalness: 0.9 });
  const glowingVisor = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const glowingCore = new THREE.MeshBasicMaterial({ color: 0xf0c040 });

  // Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 0.7, 8), darkMetal);
  group.add(torso);

  // Chest Armor Plate
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.2), goldMetal);
  chest.position.set(0, 0.1, 0.12);
  group.add(chest);

  // Core
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), glowingCore);
  core.position.set(0, 0.1, 0.23);
  group.add(core);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), darkMetal);
  head.position.y = 0.55;
  group.add(head);

  // Visor
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.08), glowingVisor);
  visor.position.set(0, 0.58, 0.14);
  group.add(visor);

  // Ears
  const earL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), goldMetal);
  earL.position.set(0.18, 0.55, 0);
  const earR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), goldMetal);
  earR.position.set(-0.18, 0.55, 0);
  group.add(earL); group.add(earR);

  // Shoulders & Arms
  const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), goldMetal);
  shoulderL.position.set(0.42, 0.25, 0);
  const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), goldMetal);
  shoulderR.position.set(-0.42, 0.25, 0);
  group.add(shoulderL); group.add(shoulderR);

  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.5), darkMetal);
  armL.position.set(0.42, -0.05, 0);
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.5), darkMetal);
  armR.position.set(-0.42, -0.05, 0);
  group.add(armL); group.add(armR);

  // Legs
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.6), darkMetal);
  legL.position.set(0.18, -0.65, 0);
  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.6), darkMetal);
  legR.position.set(-0.18, -0.65, 0);
  group.add(legL); group.add(legR);

  // Floating AX Coin above head
  const coinGroup = new THREE.Group();
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 24), goldMetal);
  coin.rotation.x = Math.PI / 2;
  coinGroup.add(coin);
  coinGroup.position.set(0, 0.92, 0);
  group.add(coinGroup);

  // Pedestal Stand
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.08, 32), new THREE.MeshStandardMaterial({ color: 0x121626, roughness: 0.4, metalness: 0.8 }));
  pedestal.position.y = -0.98;
  group.add(pedestal);

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.68, 0.74, 32), new THREE.MeshBasicMaterial({ color: 0xf0c040, side: THREE.DoubleSide }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.93;
  group.add(ring);

  group.position.y = -0.1;
  return { group, coinGroup };
}

// ── 3D MODELS DEFINITION ──


// Global Window Attachments

// Auto initialize moments listener
try {
  initMomentsListener();
} catch (e) {
  console.warn('initMomentsListener deferred:', e);
}
