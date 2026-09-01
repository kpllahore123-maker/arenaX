// ==========================================
// ARENAX TEAMS, SQUADS & GUILDS SYSTEM
// ==========================================

// Module variables
let selectedTeamData = null;
let teamsView = 'list';
let customTeamLogoDataUrl = null;
let unsubGuilds = null;
let allGuilds = [];
let userGuild = null;
let currentGuildTab = 'myGuild';
let showGuildBrowser = false;
let unsubGuildChat = null;
let activeGuildIdForChat = null;
let selectedGuild = null;
let launchFestTimersInitialized = false;
let topPlayersList = [];
let referralCount = 0;
let isWheelSpinning = false;
let teamsSearchQuery = '';
let activeSquadChatUnsub = null;
let activeSquadTypingUnsub = null;
let activeSquadWarsUnsub = null;
let userSquadsUnsub = null;
let allSquadsUnsub = null;
let squadMembersUnsub = null;
let guildMembersUnsub = null;
let guildChatUnsub = null;
let guildTypingUnsub = null;
let userGuildUnsub = null;
let allGuildsUnsub = null;
let allMembersUnsub = null;

window.showTeamGuide = function() {
  const modal = $('mTeamGuideModal');
  if (modal) modal.classList.remove('hidden');
};

window.openTeamsModal = function() {
  if (guestProfile) {
    alert("Please log in or register a profile to access Teams!");
    return;
  }
  const modal = $('mGuildSystemModal');
  if (modal) modal.classList.remove('hidden');
  
  if (userGuild) {
    selectedTeamData = userGuild;
    teamsView = 'profile';
  } else {
    teamsView = 'list';
  }
  
  if (typeof listenToGuilds === 'function') listenToGuilds();
  window.renderGuildSystemModalContent();
};

window.openGuildsModal = window.openTeamsModal;

window.handleTeamLogoUpload = function(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    customTeamLogoDataUrl = evt.target.result;
    const imgEl = $('ctLogoPreviewImg');
    const icoEl = $('ctLogoPreviewIco');
    if (imgEl && icoEl) {
      imgEl.src = customTeamLogoDataUrl;
      imgEl.classList.remove('hidden');
      icoEl.classList.add('hidden');
    }
  };
  reader.readAsDataURL(file);
};

function listenToGuilds() {
  if (unsubGuilds) unsubGuilds();
  
  const q = query(collection(db, 'teams'), orderBy('createdAt', 'desc'));
  unsubGuilds = onSnapshot(q, (snapshot) => {
    allGuilds = [];
    userGuild = null;
    snapshot.forEach(docSnap => {
      const g = { id: docSnap.id, ...docSnap.data() };
      allGuilds.push(g);
      
      if (userProfile) {
        const isLeader = g.leaderId === userProfile.uid;
        const isMember = g.members && g.members.includes(userProfile.uid);
        if (isLeader || isMember) {
          userGuild = g;
        }
      }
    });
    
    if (!selectedTeamData && allGuilds.length > 0) {
      selectedTeamData = userGuild || allGuilds[0];
    } else if (selectedTeamData) {
      const updated = allGuilds.find(g => g.id === selectedTeamData.id);
      if (updated) selectedTeamData = updated;
    }
    
    // Sync state variables to window for global inline handlers
    window.allGuilds = allGuilds;
    window.userGuild = userGuild;
    window.selectedTeamData = selectedTeamData;
    window.selectedGuild = selectedGuild;
    
    window.renderGuildSystemModalContent();
  }, (err) => {
    console.error("Error listening to teams:", err);
  });
}

window.openDonateModal = function() {
  if (!userProfile) return;
  const balSpan = $('dtUserBalance');
  if (balSpan) balSpan.textContent = userProfile.balance || 0;
  $('mDonateTreasuryModal').classList.remove('hidden');
};

window.confirmTreasuryDonation = async function() {
  if (!userProfile) return;
  const input = $('dtAmountInput');
  const amount = parseInt(input ? input.value : 0, 10);
  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid donation amount (minimum 10 AX).");
    return;
  }
  
  const currentBalance = userProfile.balance || 0;
  if (currentBalance < amount) {
    alert(`Insufficient AX Coins balance! You have ${currentBalance} AX, but tried to donate ${amount} AX.`);
    return;
  }
  
  const activeTeam = selectedTeamData || userGuild;
  if (!activeTeam) {
    alert("No active team selected.");
    return;
  }
  
  try {
    await updateDoc(doc(db, 'users', userProfile.uid), {
      balance: increment(-amount)
    });
    userProfile.balance = Math.max(0, currentBalance - amount);
    
    const expGain = Math.floor(amount / 10);
    await updateDoc(doc(db, 'teams', activeTeam.id), {
      treasury: increment(amount),
      exp: increment(expGain)
    });
    
    await addDoc(collection(db, 'deposit_requests'), {
      userId: userProfile.uid,
      userName: userProfile.name,
      amountAX: amount,
      method: 'Team Treasury Donation',
      status: 'approved',
      type: 'payment',
      message: `Donated ${amount} AX Coins to Team Treasury (${activeTeam.name})`,
      createdAt: serverTimestamp()
    });
    
    alert(`🎉 Thank you! Successfully donated ${amount} AX Coins to ${activeTeam.name}'s Treasury!\n+${expGain} Team EXP gained!`);
    $('mDonateTreasuryModal').classList.add('hidden');
    if (input) input.value = '';
    window.renderGuildSystemModalContent();
  } catch (err) {
    alert("Failed to process donation: " + err.message);
  }
};

window.openEditAnnouncementModal = function() {
  const activeTeam = selectedTeamData || userGuild;
  if (!activeTeam) return;
  const input = $('eaAnnouncementInput');
  if (input) input.value = activeTeam.announcement || activeTeam.description || '';
  $('mEditAnnouncementModal').classList.remove('hidden');
};

window.saveTeamAnnouncement = async function() {
  const activeTeam = selectedTeamData || userGuild;
  if (!activeTeam) return;
  const input = $('eaAnnouncementInput');
  const txt = input ? input.value.trim() : '';
  if (!txt) return;
  
  try {
    await updateDoc(doc(db, 'teams', activeTeam.id), {
      announcement: txt,
      description: txt
    });
    activeTeam.announcement = txt;
    activeTeam.description = txt;
    alert("✅ Team Announcement updated successfully!");
    $('mEditAnnouncementModal').classList.add('hidden');
    window.renderGuildSystemModalContent();
  } catch (err) {
    alert("Failed to update announcement: " + err.message);
  }
};

window.promoteToGuard = async function(targetUid, name) {
  const team = selectedTeamData || userGuild;
  if (!team) return;
  if (team.leaderId !== userProfile.uid) {
    alert("Only the Leader can promote members to Guard!");
    return;
  }
  const currentGuards = team.guards || [];
  if (currentGuards.length >= 2) {
    alert("Maximum 2 Guards allowed per team! Demote an existing Guard first.");
    return;
  }
  try {
    await updateDoc(doc(db, 'teams', team.id), {
      guards: arrayUnion(targetUid)
    });
    alert(`🛡️ Successfully promoted ${name} to Guard!`);
    window.renderGuildSystemModalContent();
  } catch (err) {
    alert("Failed to promote Guard: " + err.message);
  }
};

window.demoteGuard = async function(targetUid, name) {
  const team = selectedTeamData || userGuild;
  if (!team) return;
  if (team.leaderId !== userProfile.uid) {
    alert("Only the Leader can demote Guards!");
    return;
  }
  try {
    await updateDoc(doc(db, 'teams', team.id), {
      guards: arrayRemove(targetUid)
    });
    alert(`Successfully demoted ${name} to regular Member.`);
    window.renderGuildSystemModalContent();
  } catch (err) {
    alert("Failed to demote Guard: " + err.message);
  }
};

window.joinTeamDirect = async function(teamId) {
  if (!userProfile) {
    alert("Please log in to join a team!");
    return;
  }
  if (userGuild) {
    alert("You are already in a team! Leave your current team first to join another.");
    return;
  }
  try {
    const teamRef = doc(db, 'teams', teamId);
    const snap = await getDoc(teamRef);
    if (!snap.exists()) {
      alert("Team no longer exists.");
      return;
    }
    const tData = snap.data();
    const members = tData.members || [];
    if (members.length >= (tData.maxMembers || 8)) {
      alert("This team is already full (maximum 8 members)!");
      return;
    }
    await updateDoc(teamRef, {
      members: arrayUnion(userProfile.uid),
      memberCount: increment(1)
    });
    alert(`🎉 Successfully joined "${tData.name}"!`);
    if (typeof listenToGuilds === 'function') listenToGuilds();
  } catch (err) {
    alert("Failed to join team: " + err.message);
  }
};

window.applyToTeam = function(teamId) {
  if (!userProfile) {
    alert("Please log in to apply!");
    return;
  }
  if (userGuild) {
    alert("You are already in a team!");
    return;
  }
  window.selectedTeamIdForApplication = teamId;
  openJoinRequestMessageModal();
};

window.registerForTeamFight = async function(tourName, tourId) {
  const team = selectedTeamData || userGuild;
  if (!team) {
    alert("You must be in a team to register for Team Fight tournaments!");
    return;
  }
  const isLeader = team.leaderId === userProfile.uid;
  const isGuard = team.guards && team.guards.includes(userProfile.uid);
  if (!isLeader && !isGuard) {
    alert("Only the Leader or Guards can register the team for Team Fights!");
    return;
  }
  
  const randomExp = Math.floor(Math.random() * 151) + 50;
  
  try {
    await updateDoc(doc(db, 'teams', team.id), {
      exp: increment(randomExp),
      registeredFights: arrayUnion(tourId || tourName)
    });
    
    await addDoc(collection(db, 'teamFights'), {
      teamId: team.id,
      teamName: team.name,
      tournamentName: tourName,
      registeredBy: userProfile.name,
      expGained: randomExp,
      createdAt: serverTimestamp()
    });
    
    alert(`🏆 TOURNEY REGISTRATION SUCCESSFUL!\n\nYour team "${team.name}" is officially registered for "${tourName}"!\n\n✨ Team Bonus Earned: +${randomExp} Team EXP! 🔥`);
    window.renderGuildSystemModalContent();
  } catch (err) {
    alert("Failed to register for Team Fight: " + err.message);
  }
};

window.createNewTeamSubmit = async function() {
  if (!userProfile) {
    alert("Please log in first!");
    return;
  }
  if (userGuild) {
    alert("You are already a member/leader of a team! Leave your current team first.");
    return;
  }
  const nameInput = $('ctNameInput');
  const tagSelect = $('ctTagSelect');
  const descInput = $('ctDescInput');
  const joinTypeRadio = document.querySelector('input[name="ctJoinType"]:checked');
  
  const name = nameInput ? nameInput.value.trim() : '';
  const tag = tagSelect ? tagSelect.value : 'PRO';
  const desc = descInput ? descInput.value.trim() : '';
  const joinType = joinTypeRadio ? joinTypeRadio.value : 'free';
  const logo = customTeamLogoDataUrl || '🦁';
  
  if (!name) {
    alert("Please enter a Team Name!");
    return;
  }
  
  try {
    const docRef = await addDoc(collection(db, 'teams'), {
      name: name,
      tag: tag,
      description: desc || `Welcome to ${name}! Participate in Team Fights & donate to Treasury to rank up!`,
      announcement: desc || `Welcome to ${name}! Participate in Team Fights & donate to Treasury to rank up!`,
      logoUrl: logo,
      joinType: joinType,
      leaderId: userProfile.uid,
      leaderName: userProfile.name || 'Leader',
      members: [userProfile.uid],
      guards: [],
      memberCount: 1,
      maxMembers: 8,
      treasury: 0,
      exp: 0,
      level: 1,
      rank: 1,
      registeredFights: [],
      createdAt: serverTimestamp()
    });
    
    alert(`🎉 TEAM CREATED SUCCESSFULLY!\n\nYour team "${name}" [${tag}] is established!`);
    customTeamLogoDataUrl = '';
    selectedTeamData = {
      id: docRef.id,
      name, tag, description: desc, logoUrl: logo, joinType,
      leaderId: userProfile.uid, leaderName: userProfile.name,
      members: [userProfile.uid], guards: [], memberCount: 1, maxMembers: 8,
      treasury: 0, exp: 0, level: 1, rank: 1
    };
    userGuild = selectedTeamData;
    teamsView = 'profile';
    currentGuildTab = 'profile';
    window.renderGuildSystemModalContent();
  } catch (err) {
    alert("Failed to create team: " + err.message);
  }
};

window.disbandTeamSubmit = async function() {
  const team = selectedTeamData || userGuild;
  if (!team) return;
  if (team.leaderId !== userProfile.uid) {
    alert("Only the Leader can disband the team!");
    return;
  }
  if (confirm(`⚠️ Are you sure you want to DISBAND "${team.name}" permanently?\nThis action cannot be undone.`)) {
    try {
      await deleteDoc(doc(db, 'teams', team.id));
      alert(`Team "${team.name}" disbanded.`);
      userGuild = null;
      selectedTeamData = null;
      teamsView = 'list';
      window.renderGuildSystemModalContent();
    } catch (err) {
      alert("Failed to disband team: " + err.message);
    }
  }
};

window.leaveTeamSubmit = async function() {
  const team = selectedTeamData || userGuild;
  if (!team) return;
  if (team.leaderId === userProfile.uid) {
    alert("Leader cannot leave. You must disband the team or promote someone else!");
    return;
  }
  if (confirm(`Are you sure you want to leave "${team.name}"?`)) {
    try {
      await updateDoc(doc(db, 'teams', team.id), {
        members: arrayRemove(userProfile.uid),
        guards: arrayRemove(userProfile.uid),
        memberCount: increment(-1)
      });
      alert(`You left "${team.name}".`);
      userGuild = null;
      selectedTeamData = null;
      teamsView = 'list';
      window.renderGuildSystemModalContent();
    } catch (err) {
      alert("Failed to leave team: " + err.message);
    }
  }
};

window.kickMemberSubmit = async function(targetUid, name) {
  const team = selectedTeamData || userGuild;
  if (!team) return;
  const isLeader = team.leaderId === userProfile.uid;
  const isGuard = team.guards && team.guards.includes(userProfile.uid);
  if (!isLeader && !isGuard) {
    alert("Only Leader or Guards can kick members!");
    return;
  }
  if (confirm(`Kick "${name}" from the team?`)) {
    try {
      await updateDoc(doc(db, 'teams', team.id), {
        members: arrayRemove(targetUid),
        guards: arrayRemove(targetUid),
        memberCount: increment(-1)
      });
      alert(`Kicked "${name}".`);
      window.renderGuildSystemModalContent();
    } catch (err) {
      alert("Failed to kick member: " + err.message);
    }
  }
};

// ==================== MAIN TEAMS MODAL RENDERER ====================
window.renderGuildSystemModalContent = async function() {
  const container = $('mGuildSystemModal');
  const innerContent = $('guildSystemModalContent');
  if (!container || !innerContent) return;
  if (container.classList.contains('hidden')) return;
  
  if (teamsView === 'list') {
    // ----------------------------------------------------
    // 1) TEAMS LIST PAGE
    // ----------------------------------------------------
    const filtered = allGuilds.filter(t => {
      if (!teamsSearchQuery) return true;
      return t.name.toLowerCase().includes(teamsSearchQuery) ||
             (t.tag && t.tag.toLowerCase().includes(teamsSearchQuery)) ||
             (t.leaderName && t.leaderName.toLowerCase().includes(teamsSearchQuery));
    });
    
    let teamCardsHtml = '';
    if (filtered.length === 0) {
      teamCardsHtml = `
        <div class="col-span-full text-center py-12 text-t3 bg-card/20 border border-bdr/20 rounded-2xl">
          <i class="fas fa-shield-alt text-3xl mb-2 text-gold/30"></i>
          <p class="text-xs font-bold uppercase">No Teams Found</p>
          <p class="text-[10px] mt-1">Be the first to establish a team for your squad!</p>
        </div>
      `;
    } else {
      filtered.forEach((t, index) => {
        const memberCount = (t.members || []).length;
        const isUserMember = userGuild && userGuild.id === t.id;
        const rankNum = index + 1;
        
        let actionBtnHtml = '';
        if (isUserMember) {
          actionBtnHtml = `<button onclick="window.viewTeamById('${t.id}')" class="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase rounded-xl hover:bg-emerald-500/25 transition">My Team</button>`;
        } else if (userGuild) {
          actionBtnHtml = `<button onclick="window.viewTeamById('${t.id}')" class="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-bdr text-white text-[10px] font-black uppercase rounded-xl transition">View</button>`;
        } else if (t.joinType === 'application') {
          actionBtnHtml = `<button onclick="window.applyToTeam('${t.id}')" class="px-3 py-1.5 bg-gold/15 hover:bg-gold/30 border border-gold/40 text-gold text-[10px] font-black uppercase rounded-xl transition">Apply</button>`;
        } else {
          actionBtnHtml = `<button onclick="window.joinTeamDirect('${t.id}')" class="px-3 py-1.5 bg-gradient-to-r from-gold to-yellow-500 text-bg text-[10px] font-black uppercase rounded-xl transition shadow-md">Join</button>`;
        }
        
        teamCardsHtml += `
          <div class="bg-card/40 hover:bg-card/70 border border-bdr/30 hover:border-gold/40 rounded-2xl p-4 transition flex flex-col justify-between space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-12 h-12 rounded-full bg-[#0e101f] border-2 border-gold/40 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg">
                  ${t.logoUrl && t.logoUrl.startsWith('data:') 
                    ? `<img src="${t.logoUrl}" class="w-full h-full object-cover" />`
                    : `<span class="text-2xl">${t.logoUrl || '🦁'}</span>`}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <h4 class="font-display text-sm font-black text-white uppercase tracking-wider truncate">${t.name}</h4>
                    <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-gold/10 text-gold border border-gold/25">[${t.tag || 'PRO'}]</span>
                  </div>
                  <p class="text-[10px] text-t3 font-mono mt-0.5">Leader: <strong class="text-white">${t.leaderName || 'Admin'}</strong></p>
                </div>
              </div>
              <span class="text-xs font-black font-mono text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-lg flex-shrink-0">#${t.rank || rankNum}</span>
            </div>

            <p class="text-[10px] text-t2 line-clamp-2 italic leading-relaxed">"${t.description || 'Ready for squad battles & tournaments!'}"</p>

            <div class="flex items-center justify-between pt-2 border-t border-bdr/20">
              <span class="text-[10px] font-mono text-t3 flex items-center gap-1">
                <i class="fas fa-users text-gold"></i> <strong class="text-white">${memberCount}</strong> / 8 Members
              </span>
              ${actionBtnHtml}
            </div>
          </div>
        `;
      });
    }

    innerContent.innerHTML = `
      <!-- TEAMS LIST HEADER -->
      <div class="p-4 border-b border-bdr/40 flex items-center justify-between bg-[#0b0c16] flex-shrink-0">
        <div class="flex items-center gap-3">
          <button onclick="window.closeGuildsModal()" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-t2 hover:text-white flex items-center justify-center transition cursor-pointer">
            <i class="fas fa-arrow-left text-xs"></i>
          </button>
          <h3 class="font-display text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <i class="fas fa-users text-gold"></i> Teams
          </h3>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="window.setTeamsView('rankings')" class="w-9 h-9 rounded-xl bg-gold/10 border border-gold/30 text-gold hover:bg-gold hover:text-bg transition flex items-center justify-center cursor-pointer" title="Team Rankings">
            <i class="fas fa-trophy text-sm"></i>
          </button>
          <button onclick="window.toggleTeamsSearch()" class="w-9 h-9 rounded-xl bg-white/5 border border-bdr text-t2 hover:text-white transition flex items-center justify-center cursor-pointer" title="Search Teams">
            <i class="fas fa-search text-sm"></i>
          </button>
          <button onclick="window.setTeamsView('create')" class="px-3 py-2 bg-gradient-to-r from-gold via-yellow-400 to-amber-500 text-bg text-[10px] font-black uppercase rounded-xl transition shadow-lg flex items-center gap-1.5 cursor-pointer">
            <i class="fas fa-plus"></i> Create Team
          </button>
          <button onclick="window.showTeamGuide()" class="w-9 h-9 rounded-xl bg-white/5 border border-bdr text-t2 hover:text-white transition flex items-center justify-center cursor-pointer" title="Team Guide">
            <i class="fas fa-book text-sm"></i>
          </button>
        </div>
      </div>

      <!-- INLINE SEARCH INPUT CONTAINER -->
      <div id="teamsSearchInputContainer" class="px-4 pt-3 hidden">
        <div class="relative">
          <i class="fas fa-search absolute left-3 top-2.5 text-t3 text-xs"></i>
          <input oninput="window.updateTeamsSearch(this.value)" type="text" placeholder="Search by team name, tag, or leader..." class="w-full bg-card border border-bdr rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-gold transition" />
        </div>
      </div>

      <!-- USER TEAM BANNER IF MEMBER -->
      ${userGuild ? `
        <div class="mx-4 mt-3 p-3.5 bg-gradient-to-r from-gold/15 via-yellow-500/10 to-amber-500/15 border border-gold/40 rounded-2xl flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gold/20 border border-gold flex items-center justify-center text-xl">
              ${userGuild.logoUrl && userGuild.logoUrl.startsWith('data:') ? `<img src="${userGuild.logoUrl}" class="w-full h-full object-cover rounded-full" />` : (userGuild.logoUrl || '🦁')}
            </div>
            <div>
              <p class="text-[9px] text-gold uppercase font-mono font-bold">YOUR ACTIVE TEAM</p>
              <h4 class="font-display text-xs font-black text-white uppercase">${userGuild.name} <span class="text-gold">[${userGuild.tag || 'PRO'}]</span></h4>
            </div>
          </div>
          <button onclick="window.viewMyTeamProfile()" class="px-3.5 py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-[10px] font-black uppercase rounded-xl transition shadow-md cursor-pointer">
            My Team Profile 🚀
          </button>
        </div>
      ` : ''}

      <!-- TEAMS SCROLLABLE LIST -->
      <div class="flex-1 p-4 overflow-y-auto min-h-0 scrollbar-thin">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${teamCardsHtml}
        </div>
      </div>

      <!-- BOTTOM REFRESH BAR -->
      <div class="p-3 bg-[#080911] border-t border-bdr/20 flex items-center justify-between flex-shrink-0">
        <span class="text-[10px] text-t3 font-mono">Total Teams: <strong class="text-white">${allGuilds.length}</strong></span>
        <button onclick="listenToGuilds()" class="px-3 py-1 bg-white/5 hover:bg-white/10 border border-bdr/30 text-t2 hover:text-white text-[10px] font-bold uppercase rounded-lg transition cursor-pointer flex items-center gap-1.5">
          <i class="fas fa-sync-alt"></i> Refresh List
        </button>
      </div>
    `;

  } else if (teamsView === 'create') {
    // ----------------------------------------------------
    // 2) CREATE TEAM PAGE
    // ----------------------------------------------------
    innerContent.innerHTML = `
      <div class="p-4 border-b border-bdr/40 flex items-center justify-between bg-[#0b0c16] flex-shrink-0">
        <div class="flex items-center gap-3">
          <button onclick="window.setTeamsView('list')" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-t2 hover:text-white flex items-center justify-center transition cursor-pointer">
            <i class="fas fa-arrow-left text-xs"></i>
          </button>
          <h3 class="font-display text-base font-black text-white uppercase tracking-wider">Create Team</h3>
        </div>
      </div>

      <div class="flex-1 p-6 overflow-y-auto max-w-2xl mx-auto w-full space-y-5 scrollbar-thin">
        <!-- Image Upload Section -->
        <div class="flex flex-col items-center justify-center space-y-3">
          <label class="block text-[10px] text-gold uppercase font-bold tracking-wider">Team Logo (Upload Image or Pick Crest)</label>
          
          <div class="relative group cursor-pointer" onclick="$('ctLogoFileInput').click()">
            <div class="w-24 h-24 rounded-full bg-[#0e101f] border-2 border-gold flex items-center justify-center shadow-2xl overflow-hidden relative">
              <span id="ctLogoPreviewIco" class="text-4xl text-gold">🦁</span>
              <img id="ctLogoPreviewImg" class="w-full h-full object-cover hidden" />
              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-[9px] font-bold">
                <i class="fas fa-camera text-base mb-1"></i> Upload
              </div>
            </div>
          </div>

          <input id="ctLogoFileInput" type="file" accept="image/*" onchange="window.handleTeamLogoUpload(event)" class="hidden" />

          <!-- Preset Crests -->
          <div class="flex items-center gap-2 pt-1">
            ${['🦁', '🐺', '🐯', '👑', '🐉', '⚔️', '💀', '⚡'].map(crest => `
              <button onclick="customTeamLogoDataUrl = '${crest}'; $('ctLogoPreviewImg').classList.add('hidden'); $('ctLogoPreviewIco').classList.remove('hidden'); $('ctLogoPreviewIco').textContent = '${crest}';" class="w-8 h-8 rounded-lg bg-card border border-bdr hover:border-gold text-lg flex items-center justify-center transition cursor-pointer">${crest}</button>
            `).join('')}
          </div>
        </div>

        <!-- Name Input -->
        <div>
          <label class="block text-[10px] text-t3 uppercase font-bold tracking-wider mb-1.5">Team Name</label>
          <input id="ctNameInput" type="text" placeholder="e.g. Apex Predators" class="w-full bg-card border border-bdr rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-gold transition" />
        </div>

        <!-- Tag Selector -->
        <div>
          <label class="block text-[10px] text-t3 uppercase font-bold tracking-wider mb-1.5">Team Tag / Category</label>
          <select id="ctTagSelect" class="w-full bg-card border border-bdr rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-gold transition">
            <option value="PRO">PRO</option>
            <option value="COMPETITIVE">COMPETITIVE</option>
            <option value="CASUAL">CASUAL</option>
            <option value="ESPORTS">ESPORTS</option>
          </select>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-[10px] text-t3 uppercase font-bold tracking-wider mb-1.5">Team Description / Slogan</label>
          <textarea id="ctDescInput" rows="3" placeholder="Describe your squad goals and playstyle..." class="w-full bg-card border border-bdr rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-gold transition scrollbar-thin"></textarea>
        </div>

        <!-- Join Requirement Toggle -->
        <div>
          <label class="block text-[10px] text-t3 uppercase font-bold tracking-wider mb-2">Join Requirement</label>
          <div class="grid grid-cols-2 gap-3">
            <label class="p-3 bg-card border border-bdr rounded-xl flex items-center gap-2.5 cursor-pointer hover:border-gold transition">
              <input type="radio" name="ctJoinType" value="free" checked class="accent-gold" />
              <div>
                <span class="text-xs font-bold text-white block">Free to Join</span>
                <span class="text-[9px] text-t3">Anyone can join instantly</span>
              </div>
            </label>
            <label class="p-3 bg-card border border-bdr rounded-xl flex items-center gap-2.5 cursor-pointer hover:border-gold transition">
              <input type="radio" name="ctJoinType" value="application" class="accent-gold" />
              <div>
                <span class="text-xs font-bold text-white block">Application Required</span>
                <span class="text-[9px] text-t3">Leader / Guard must approve</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Submit Button -->
        <button onclick="window.createNewTeamSubmit()" class="w-full py-3.5 bg-gradient-to-r from-gold via-yellow-400 to-amber-500 text-bg text-xs font-black uppercase tracking-wider rounded-xl transition shadow-xl active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2">
          <i class="fas fa-shield-alt"></i> Create Team
        </button>
      </div>
    `;

  } else if (teamsView === 'profile') {
    // ----------------------------------------------------
    // 3) TEAM PROFILE PAGE
    // ----------------------------------------------------
    const team = selectedTeamData || userGuild || allGuilds[0];
    if (!team) {
      teamsView = 'list';
      window.renderGuildSystemModalContent();
      return;
    }
    
    const isLeader = team.leaderId === (userProfile && userProfile.uid);
    const isGuard = team.guards && team.guards.includes(userProfile && userProfile.uid);
    const members = team.members || [team.leaderId];
    const guards = team.guards || [];

    let mainTabHtml = '';

    if (currentGuildTab === 'profile') {
      mainTabHtml = `
        <div class="space-y-4">
          <!-- Activeness / EXP Progress Bar -->
          <div class="bg-card/25 border border-bdr/20 rounded-2xl p-4 space-y-3">
            <div class="flex items-center justify-between text-xs">
              <span class="text-gold font-black uppercase tracking-wider flex items-center gap-1.5">
                <i class="fas fa-fire text-amber-500"></i> Activeness & EXP
              </span>
              <span class="font-mono text-white font-bold">${team.exp || 0} / 5,000 EXP</span>
            </div>
            <div class="w-full bg-bg border border-bdr/30 rounded-full h-3 overflow-hidden p-[2px]">
              <div class="bg-gradient-to-r from-gold via-yellow-400 to-amber-500 h-full rounded-full shadow-[0_0_10px_rgba(240,192,64,0.4)]" style="width: ${Math.min(100, ((team.exp || 0) / 5000) * 100)}%"></div>
            </div>

            <!-- Milestone Rewards Chests -->
            <div class="grid grid-cols-4 gap-2 pt-2">
              <div class="bg-card/40 border border-bdr/20 p-2 rounded-xl text-center">
                <i class="fas fa-box text-gold text-base"></i>
                <span class="block text-[8px] font-bold text-t3 mt-1 font-mono">800 EXP</span>
              </div>
              <div class="bg-card/40 border border-bdr/20 p-2 rounded-xl text-center">
                <i class="fas fa-gift text-amber-400 text-base"></i>
                <span class="block text-[8px] font-bold text-t3 mt-1 font-mono">2,000 EXP</span>
              </div>
              <div class="bg-card/40 border border-bdr/20 p-2 rounded-xl text-center">
                <i class="fas fa-gem text-yellow-300 text-base"></i>
                <span class="block text-[8px] font-bold text-t3 mt-1 font-mono">5,000 EXP</span>
              </div>
              <div class="bg-card/40 border border-bdr/20 p-2 rounded-xl text-center">
                <i class="fas fa-crown text-gold text-base"></i>
                <span class="block text-[8px] font-bold text-t3 mt-1 font-mono">10,000 EXP</span>
              </div>
            </div>
          </div>

          <!-- Team Treasury Section -->
          <div class="bg-gradient-to-br from-[#121425] to-[#0a0b14] border border-gold/30 rounded-2xl p-5 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[9px] text-gold uppercase font-mono font-bold">TEAM TREASURY</span>
                <h4 class="text-sm font-black text-white uppercase flex items-center gap-2 mt-0.5">
                  <i class="fas fa-vault text-gold"></i> Treasury Funds
                </h4>
              </div>
              <button onclick="window.openDonateModal()" class="px-4 py-2 bg-gradient-to-r from-gold via-yellow-400 to-amber-500 text-bg text-[10px] font-black uppercase rounded-xl transition shadow-lg cursor-pointer flex items-center gap-1.5">
                <i class="fas fa-plus-circle"></i> Donate AX Coins
              </button>
            </div>

            <div class="bg-card/40 border border-bdr/20 p-4 rounded-xl flex items-center justify-between">
              <span class="text-xs text-t3 uppercase font-bold">Total Treasury Balance</span>
              <span class="text-lg font-black text-gold font-mono flex items-center gap-1.5">
                <i class="fas fa-coins"></i> ${team.treasury || 0} AX
              </span>
            </div>
          </div>

          <!-- Announcement Section -->
          <div class="bg-card/25 border border-bdr/20 rounded-2xl p-4 space-y-2">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <i class="fas fa-bullhorn text-gold"></i> Team Announcement
              </h4>
              ${isLeader || isGuard ? `
                <button onclick="window.openEditAnnouncementModal()" class="text-gold text-[10px] font-bold hover:underline cursor-pointer">
                  <i class="fas fa-edit"></i> Edit
                </button>
              ` : ''}
            </div>
            <p class="text-xs text-t2 italic leading-relaxed bg-black/30 p-3 rounded-xl border border-bdr/10">
              "${team.announcement || team.description || 'Welcome to the team! Participate in Team Fights & donate to Treasury to rank up!'}"
            </p>
          </div>
        </div>
      `;

    } else if (currentGuildTab === 'members') {
      mainTabHtml = `
        <div class="space-y-4">
          <div class="flex items-center justify-between bg-card/25 border border-bdr/20 p-3.5 rounded-2xl">
            <div>
              <h4 class="text-xs font-black uppercase text-white">Roster Ranks</h4>
              <p class="text-[9px] text-t3 font-mono">Members: ${members.length}/8 | Guards: ${guards.length}/2</p>
            </div>
          </div>

          <div class="bg-card/20 border border-bdr/20 rounded-2xl p-4 overflow-x-auto scrollbar-thin">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-bdr/20 text-[9px] text-t3 font-bold uppercase tracking-wider">
                  <th class="pb-2 pl-2">Member</th>
                  <th class="pb-2 text-center">Role</th>
                  <th class="pb-2 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody id="teamMembersListTbody" class="text-xs">
                <tr><td colspan="3" class="py-6 text-center text-t3"><i class="fas fa-spinner animate-spin text-gold mr-1"></i> Loading member roster...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;

      setTimeout(async () => {
        const membersData = await window.fetchGuildMembers(members);
        const tbody = $('teamMembersListTbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        membersData.forEach(m => {
          const isMemberLeader = m.uid === team.leaderId;
          const isMemberGuard = guards.includes(m.uid);
          const isSelf = m.uid === (userProfile && userProfile.uid);

          let roleBadge = '<span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-card border border-bdr text-t2">👤 Member</span>';
          if (isMemberLeader) roleBadge = '<span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-gold/15 text-gold border border-gold/30">👑 Leader</span>';
          else if (isMemberGuard) roleBadge = '<span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">🛡️ Guard</span>';

          let actionsHtml = '-';
          if (isLeader && !isSelf) {
            actionsHtml = `
              <div class="flex items-center justify-end gap-1">
                ${!isMemberGuard ? `<button onclick="window.promoteToGuard('${m.uid}', '${m.name}')" class="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-bg text-[9px] font-bold uppercase rounded-md transition cursor-pointer">Promote Guard</button>` : `<button onclick="window.demoteGuard('${m.uid}', '${m.name}')" class="px-2 py-1 bg-white/5 border border-bdr text-t2 text-[9px] font-bold uppercase rounded-md transition cursor-pointer">Demote</button>`}
                <button onclick="window.kickMemberSubmit('${m.uid}', '${m.name}')" class="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-[9px] font-bold uppercase rounded-md transition cursor-pointer">Kick</button>
              </div>
            `;
          } else if (isGuard && !isMemberLeader && !isMemberGuard && !isSelf) {
            actionsHtml = `<button onclick="window.kickMemberSubmit('${m.uid}', '${m.name}')" class="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-[9px] font-bold uppercase rounded-md transition cursor-pointer">Kick</button>`;
          } else if (isSelf && !isMemberLeader) {
            actionsHtml = `<button onclick="window.leaveTeamSubmit()" class="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-[9px] font-bold uppercase rounded-md transition cursor-pointer">Leave Team</button>`;
          }

          const tr = document.createElement('tr');
          tr.className = 'border-b border-bdr/10 hover:bg-white/[0.02] transition';
          tr.innerHTML = `
            <td class="py-3 pl-2 flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center text-xs font-bold text-gold uppercase">
                ${m.name ? m.name.substring(0, 2) : 'PL'}
              </div>
              <div>
                <p class="font-bold text-white flex items-center gap-1">${m.name || 'Player'} ${isSelf ? '<span class="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1 py-0.2 rounded">Me</span>' : ''}</p>
                <p class="text-[9px] text-t3 font-mono">@${m.handle || 'player'}</p>
              </div>
            </td>
            <td class="py-3 text-center">${roleBadge}</td>
            <td class="py-3 text-right pr-2">${actionsHtml}</td>
          `;
          tbody.appendChild(tr);
        });
      }, 50);

    } else if (currentGuildTab === 'tasks') {
      mainTabHtml = `
        <div class="space-y-3">
          <div class="p-3 bg-card/30 border border-bdr/20 rounded-xl flex items-center justify-between">
            <div>
              <h5 class="text-xs font-black text-white uppercase">Daily Treasury Contribution</h5>
              <p class="text-[10px] text-t3">Donate 50 AX Coins to Treasury</p>
            </div>
            <span class="px-2.5 py-1 bg-gold/15 border border-gold/30 text-gold text-[9px] font-bold uppercase rounded-lg">+100 EXP</span>
          </div>
          <div class="p-3 bg-card/30 border border-bdr/20 rounded-xl flex items-center justify-between">
            <div>
              <h5 class="text-xs font-black text-white uppercase">Participate in 1 Team Fight</h5>
              <p class="text-[10px] text-t3">Register for active squad tournaments</p>
            </div>
            <span class="px-2.5 py-1 bg-gold/15 border border-gold/30 text-gold text-[9px] font-bold uppercase rounded-lg">+150 EXP</span>
          </div>
        </div>
      `;

    } else if (currentGuildTab === 'team_fight') {
      const registeredFights = team.registeredFights || [];

      mainTabHtml = `
        <div class="space-y-4">
          <div class="bg-gradient-to-r from-red-500/15 via-gold/15 to-amber-500/15 border border-gold/30 rounded-2xl p-4">
            <h4 class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <i class="fas fa-swords text-gold"></i> Team vs Team Tournaments
            </h4>
            <p class="text-[10px] text-t3 mt-1 leading-relaxed">
              Register your team for 4v4 / 5v5 tournaments! Participating earns random <strong>50–200 Team EXP</strong> & AX prize pools.
            </p>
          </div>

          <div class="space-y-3">
            <!-- Fight 1 -->
            <div class="bg-card/30 border border-bdr/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div class="space-y-1 text-center md:text-left">
                <span class="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-black uppercase rounded">🔥 5v5 SQUAD MATCH</span>
                <h5 class="font-display text-sm font-black text-white uppercase">Cyber Clash Premier</h5>
                <p class="text-[10px] text-gold font-mono font-bold"><i class="fas fa-coins"></i> Prize Pool: 10,000 AX Coins</p>
              </div>
              ${registeredFights.includes('cyber_clash') ? `
                <span class="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase rounded-xl">Registered ✅</span>
              ` : `
                <button onclick="window.registerForTeamFight('Cyber Clash Premier', 'cyber_clash')" class="px-5 py-2.5 bg-gradient-to-r from-gold via-yellow-400 to-amber-500 text-bg text-[10px] font-black uppercase rounded-xl transition shadow-lg cursor-pointer">
                  Register Team (+50-200 EXP)
                </button>
              `}
            </div>

            <!-- Fight 2 -->
            <div class="bg-card/30 border border-bdr/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div class="space-y-1 text-center md:text-left">
                <span class="px-2 py-0.5 bg-gold/10 border border-gold/20 text-gold text-[8px] font-black uppercase rounded">🏆 ESPORTS SHOWDOWN</span>
                <h5 class="font-display text-sm font-black text-white uppercase">Apex Squad Showdown</h5>
                <p class="text-[10px] text-gold font-mono font-bold"><i class="fas fa-coins"></i> Prize Pool: 25,000 AX Coins</p>
              </div>
              ${registeredFights.includes('apex_showdown') ? `
                <span class="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase rounded-xl">Registered ✅</span>
              ` : `
                <button onclick="window.registerForTeamFight('Apex Squad Showdown', 'apex_showdown')" class="px-5 py-2.5 bg-gradient-to-r from-gold via-yellow-400 to-amber-500 text-bg text-[10px] font-black uppercase rounded-xl transition shadow-lg cursor-pointer">
                  Register Team (+50-200 EXP)
                </button>
              `}
            </div>
          </div>
        </div>
      `;

    } else if (currentGuildTab === 'manage') {
      mainTabHtml = `
        <div class="space-y-4">
          <div class="bg-card/25 border border-bdr/20 p-4 rounded-2xl space-y-3">
            <h4 class="text-xs font-black uppercase text-white tracking-wider">Team Management</h4>
            ${isLeader ? `
              <button onclick="window.disbandTeamSubmit()" class="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-[10px] font-black uppercase rounded-xl transition cursor-pointer">
                Disband Team Permanently
              </button>
            ` : `
              <button onclick="window.leaveTeamSubmit()" class="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-[10px] font-black uppercase rounded-xl transition cursor-pointer">
                Leave Team
              </button>
            `}
          </div>
        </div>
      `;
    }

    innerContent.innerHTML = `
      <!-- PROFILE HEADER CARD -->
      <div class="p-5 border-b border-bdr/40 bg-[#0b0c16] flex flex-col md:flex-row items-center justify-between gap-4 flex-shrink-0">
        <div class="flex items-center gap-3.5">
          <button onclick="window.setTeamsView('list')" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-t2 hover:text-white flex items-center justify-center transition cursor-pointer">
            <i class="fas fa-arrow-left text-xs"></i>
          </button>
          
          <div class="w-14 h-14 rounded-full bg-[#0e101f] border-2 border-gold flex items-center justify-center shadow-xl overflow-hidden flex-shrink-0">
            ${team.logoUrl && team.logoUrl.startsWith('data:') 
              ? `<img src="${team.logoUrl}" class="w-full h-full object-cover" />`
              : `<span class="text-2xl">${team.logoUrl || '🦁'}</span>`}
          </div>

          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-display text-lg font-black text-white uppercase tracking-wider">${team.name}</h3>
              <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-gold/15 text-gold border border-gold/30">[${team.tag || 'PRO'}]</span>
            </div>
            <p class="text-[10px] text-t3 font-mono mt-0.5">ID: <span class="text-white">AX-${team.id.substring(0, 6).toUpperCase()}</span> | Weekly Rank: <strong class="text-gold">#${team.rank || 1}</strong></p>
          </div>
        </div>

        <!-- TABS NAV -->
        <div class="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-bdr/20">
          ${[
            { id: 'profile', label: 'Profile', icon: 'fa-id-card' },
            { id: 'members', label: 'Members', icon: 'fa-users' },
            { id: 'tasks', label: 'Tasks', icon: 'fa-tasks' },
            { id: 'team_fight', label: 'Team Fight', icon: 'fa-swords' },
            ...(isLeader || isGuard ? [{ id: 'manage', label: 'Manage', icon: 'fa-cog' }] : [])
          ].map(tb => `
            <button onclick="window.setTeamsTab('${tb.id}')" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition flex items-center gap-1.5 cursor-pointer ${
              currentGuildTab === tb.id ? 'bg-gold text-bg shadow-md' : 'text-t3 hover:text-white hover:bg-white/5'
            }">
              <i class="fas ${tb.icon}"></i> ${tb.label}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- MAIN TAB CONTENT -->
      <div class="flex-1 p-5 overflow-y-auto min-h-0 scrollbar-thin">
        ${mainTabHtml}
      </div>
    `;
  }
};


// Global actions for switching tabs and screens
window.switchGuildTab = function(tab) {
  currentGuildTab = tab;
  showGuildBrowser = false;
  window.renderGuildSystemModalContent();
};

window.openSquadStore = function() {
  if (typeof guestProfile !== 'undefined' && guestProfile) {
    alert("Please log in or register a profile to access the Squad Store!");
    return;
  }
  showGuildBrowser = false;
  currentGuildTab = 'crates';
  const modal = $('mGuildSystemModal');
  if (modal) modal.classList.remove('hidden');
  if (typeof listenToGuilds === 'function') listenToGuilds();
  window.renderGuildSystemModalContent();
};

window.toggleGuildBrowser = function(show) {
  showGuildBrowser = show;
  window.renderGuildSystemModalContent();
};

window.openCreateGuildModal = function() {
  $('mCreateGuild').classList.remove('hidden');
};

window.closeGuildsModal = function() {
  $('mGuildSystemModal').classList.add('hidden');
  if (unsubGuildChat) {
    unsubGuildChat();
    unsubGuildChat = null;
  }
};

// Fetch profile details for members array
window.fetchGuildMembers = async function(memberIds) {
  if (!memberIds || memberIds.length === 0) return [];
  try {
    const q = query(collection(db, 'users'), where('uid', 'in', memberIds));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach(d => {
      list.push(d.data());
    });
    return list;
  } catch (err) {
    console.error("Error fetching guild members:", err);
    return [];
  }
};

// Functional Real-Time Guild Chat Listeners
window.listenToGuildChat = function(teamId) {
  if (unsubGuildChat) {
    unsubGuildChat();
    unsubGuildChat = null;
  }
  
  activeGuildIdForChat = teamId;
  const q = query(
    collection(db, 'teams', teamId, 'chat'),
    orderBy('createdAt', 'desc'),
    limit(30)
  );
  
  unsubGuildChat = onSnapshot(q, (snapshot) => {
    if (activeGuildIdForChat !== teamId) return;
    const list = [];
    snapshot.forEach(docSnap => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    // Sort ascending
    list.reverse();
    window.renderGuildChatMessages(list);
  }, (err) => {
    console.error("Error listening to guild chat:", err);
  });
};

window.renderGuildChatMessages = function(messages) {
  const container = $('guildChatLogsContainer');
  if (!container) return;
  container.innerHTML = '';
  
  if (messages.length === 0) {
    container.innerHTML = `
      <div class="text-center text-t3 py-8 flex flex-col items-center justify-center gap-1">
        <i class="far fa-comments text-lg opacity-40"></i>
        <span>No messages in Guild feed yet. Say hello to your squad!</span>
      </div>
    `;
    return;
  }
  
  messages.forEach(msg => {
    const isSelf = msg.senderId === userProfile.uid;
    const isLeader = msg.senderRole === 'Leader';
    
    const div = document.createElement('div');
    div.className = `flex flex-col max-w-[85%] rounded-xl p-2.5 text-xs ${
      isSelf 
        ? 'ml-auto bg-gold/10 border border-gold/25 text-white' 
        : 'bg-card border border-bdr/30 text-t2'
    }`;
    
    div.innerHTML = `
      <div class="flex items-center gap-1.5 mb-1 text-[9px] font-mono text-t3">
        <span class="font-bold text-white">${msg.senderName || 'Squad Player'}</span>
        ${isLeader ? '<span class="text-gold font-bold bg-gold/5 border border-gold/20 px-1 rounded">Leader</span>' : ''}
      </div>
      <p class="leading-relaxed whitespace-pre-wrap">${msg.text}</p>
    `;
    container.appendChild(div);
  });
  
  container.scrollTop = container.scrollHeight;
};

window.sendGuildChatMessage = async function() {
  const input = $('guildChatInput');
  if (!input) return;
  const txt = input.value.trim();
  if (!txt) return;
  
  input.value = '';
  
  try {
    await addDoc(collection(db, 'teams', userGuild.id, 'chat'), {
      senderId: userProfile.uid,
      senderName: userProfile.name,
      senderRole: userGuild.leaderId === userProfile.uid ? 'Leader' : 'Member',
      text: txt,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Error sending guild chat:", err);
  }
};

// ==================== SQUAD CRATE & SHOP ENGINE ====================
window.pendingCrateReward = null;

window.startSquadCrateOpening = async function() {
  if (!userProfile) {
    alert("Please log in to open mystery crates!");
    return;
  }
  
  const currentBalance = userProfile.balance || 0;
  if (currentBalance < 50) {
    alert("⚠️ Insufficient AX Coins! Opening a Mystery Crate requires 50 AX Coins. Please top up your wallet.");
    return;
  }

  // Deduct 50 AX Coins cost
  try {
    await updateDoc(doc(db, 'users', userProfile.uid), {
      balance: increment(-50)
    });
    userProfile.balance = Math.max(0, currentBalance - 50);
  } catch(e) {
    console.error("Deduct error:", e);
  }

  // Roll weighted random item
  const crateItems = [
    {
      id: 'xp_24h',
      title: 'XP Booster (24h)',
      type: 'xp_booster',
      durationHours: 24,
      icon: 'fa-bolt-lightning',
      icoClass: 'text-yellow-300',
      rarity: 'LEGENDARY DROP',
      rarityBg: 'bg-yellow-400/20 border-yellow-400/40 text-yellow-300',
      desc: 'You unlocked 2x XP Multiplier active across all matches & lobbies for a full 24 hours!',
      weight: 12
    },
    {
      id: 'xp_1h',
      title: 'XP Booster (1h)',
      type: 'xp_booster',
      durationHours: 1,
      icon: 'fa-bolt',
      icoClass: 'text-amber-400',
      rarity: 'RARE DROP',
      rarityBg: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
      desc: 'You unlocked 2x XP Multiplier active across all matches & lobbies for 1 hour!',
      weight: 25
    },
    {
      id: 'squad_boost',
      title: 'Squad Boost (+25%)',
      type: 'squad_boost',
      durationHours: 48,
      icon: 'fa-shield-halved',
      icoClass: 'text-emerald-400',
      rarity: 'EPIC DROP',
      rarityBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
      desc: 'You unlocked +25% Squad Activity points & tournament XP multiplier for 48 hours!',
      weight: 20
    },
    {
      id: 'ax_500',
      title: 'AX Coin Pack (500 AX)',
      type: 'ax_coins',
      amount: 500,
      icon: 'fa-coins',
      icoClass: 'text-gold',
      rarity: 'EPIC DROP',
      rarityBg: 'bg-gold/20 border-gold/40 text-gold',
      desc: 'Jackpot! 500 AX Coins directly credited into your profile wallet balance!',
      weight: 8
    },
    {
      id: 'ax_150',
      title: 'AX Coin Pack (150 AX)',
      type: 'ax_coins',
      amount: 150,
      icon: 'fa-coins',
      icoClass: 'text-gold',
      rarity: 'RARE DROP',
      rarityBg: 'bg-gold/20 border-gold/40 text-gold',
      desc: 'Lucky spin! 150 AX Coins directly credited into your profile wallet balance!',
      weight: 15
    },
    {
      id: 'ax_50',
      title: 'AX Coin Pack (50 AX)',
      type: 'ax_coins',
      amount: 50,
      icon: 'fa-coins',
      icoClass: 'text-amber-200',
      rarity: 'COMMON DROP',
      rarityBg: 'bg-white/10 border-white/20 text-t2',
      desc: '50 AX Coins credited into your profile wallet balance (Refund Spin)!',
      weight: 20
    }
  ];

  const totalWeight = crateItems.reduce((acc, i) => acc + i.weight, 0);
  let randomVal = Math.random() * totalWeight;
  let wonItem = crateItems[0];
  for (const item of crateItems) {
    if (randomVal < item.weight) {
      wonItem = item;
      break;
    }
    randomVal -= item.weight;
  }

  window.pendingCrateReward = wonItem;

  // Show Crate Opening Video Modal
  const modal = $('mCrateVideoModal');
  const overlay = $('crateRevealOverlay');
  const fallback = $('crateFallbackAnim');
  const video = $('vCrateVideo');

  if (overlay) overlay.classList.add('hidden');
  if (modal) modal.classList.remove('hidden');

  let videoPlayed = false;

  if (video) {
    video.currentTime = 0;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        videoPlayed = true;
        if (fallback) fallback.classList.add('hidden');
      }).catch(err => {
        console.warn("Video play error / crate.mp4 not found:", err);
        if (fallback) fallback.classList.remove('hidden');
        setTimeout(() => {
          window.triggerCrateReveal();
        }, 2200);
      });
    }

    video.onended = function() {
      window.triggerCrateReveal();
    };
  } else {
    if (fallback) fallback.classList.remove('hidden');
    setTimeout(() => {
      window.triggerCrateReveal();
    }, 2200);
  }
};

window.skipCrateVideo = function() {
  const video = $('vCrateVideo');
  if (video) {
    try { video.pause(); } catch(e){}
  }
  window.triggerCrateReveal();
};

window.triggerCrateReveal = function() {
  const overlay = $('crateRevealOverlay');
  const item = window.pendingCrateReward;
  if (!item) return;

  const rRarityTag = $('rRarityTag');
  const rRarityText = $('rRarityText');
  const rIcoContainer = $('rIcoContainer');
  const rIco = $('rIco');
  const rTitle = $('rTitle');
  const rDesc = $('rDesc');

  if (rRarityTag) rRarityTag.className = `relative inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.rarityBg}`;
  if (rRarityText) rRarityText.textContent = item.rarity;
  if (rIco) rIco.className = `fas ${item.icon} ${item.icoClass}`;
  if (rTitle) rTitle.textContent = item.title;
  if (rDesc) rDesc.textContent = item.desc;

  if (overlay) overlay.classList.remove('hidden');
};

window.claimCrateReward = async function() {
  const item = window.pendingCrateReward;
  if (!item || !userProfile) {
    if ($('mCrateVideoModal')) $('mCrateVideoModal').classList.add('hidden');
    return;
  }

  try {
    if (item.type === 'ax_coins') {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        balance: increment(item.amount)
      });
      userProfile.balance = (userProfile.balance || 0) + item.amount;
    } else if (item.type === 'xp_booster') {
      const expiresAt = Date.now() + (item.durationHours * 3600 * 1000);
      const activeXpBooster = {
        type: item.id,
        title: item.title,
        expiresAt: expiresAt,
        multiplier: 2
      };
      await updateDoc(doc(db, 'users', userProfile.uid), {
        activeXpBooster: activeXpBooster
      });
      userProfile.activeXpBooster = activeXpBooster;
    } else if (item.type === 'squad_boost') {
      const expiresAt = Date.now() + (item.durationHours * 3600 * 1000);
      const activeSquadBoost = {
        active: true,
        expiresAt: expiresAt,
        boostPct: 25
      };
      await updateDoc(doc(db, 'users', userProfile.uid), {
        activeSquadBoost: activeSquadBoost
      });
      userProfile.activeSquadBoost = activeSquadBoost;
    }

    window.pendingCrateReward = null;
    if ($('mCrateVideoModal')) $('mCrateVideoModal').classList.add('hidden');
    if ($('crateRevealOverlay')) $('crateRevealOverlay').classList.add('hidden');

    alert(`🎉 Successfully equipped & claimed ${item.title}!`);
    window.renderGuildSystemModalContent();
  } catch (err) {
    alert("Error claiming item: " + err.message);
  }
};

window.buySquadItem = async function(itemKey, cost) {
  if (!userProfile) {
    alert("Please log in first!");
    return;
  }
  
  if ((userProfile.balance || 0) < cost) {
    alert(`⚠️ Insufficient AX Coins! You need ${cost} AX Coins to purchase this item. Top up your wallet to proceed.`);
    return;
  }

  let title = '';
  let durationHours = 24;
  if (itemKey === 'squad_boost') {
    title = 'Squad Boost (+25%)';
    durationHours = 48;
  } else if (itemKey === 'xp_1h') {
    title = 'XP Booster (1h)';
    durationHours = 1;
  } else if (itemKey === 'xp_24h') {
    title = 'XP Booster (24h)';
    durationHours = 24;
  }

  if (!confirm(`Confirm purchase of ${title} for ${cost} AX Coins?`)) return;

  try {
    await updateDoc(doc(db, 'users', userProfile.uid), {
      balance: increment(-cost)
    });
    userProfile.balance = Math.max(0, (userProfile.balance || 0) - cost);

    const expiresAt = Date.now() + (durationHours * 3600 * 1000);

    if (itemKey === 'squad_boost') {
      const boostObj = { active: true, expiresAt: expiresAt, boostPct: 25 };
      await updateDoc(doc(db, 'users', userProfile.uid), { activeSquadBoost: boostObj });
      userProfile.activeSquadBoost = boostObj;
    } else {
      const xpObj = { type: itemKey, title: title, expiresAt: expiresAt, multiplier: 2 };
      await updateDoc(doc(db, 'users', userProfile.uid), { activeXpBooster: xpObj });
      userProfile.activeXpBooster = xpObj;
    }

    alert(`⚡ Item acquired! ${title} is now active on your profile.`);
    window.renderGuildSystemModalContent();
  } catch (err) {
    alert("Purchase error: " + err.message);
  }
};

// Claims Weekly Milestone Vouchers / Coins
window.claimGuildMilestone = async function(milestoneId, rewardAmount) {
  if (!userGuild) return;
  
  const claimed = userProfile.claimedGuildRewards || [];
  if (claimed.includes(milestoneId)) {
    alert("You have already claimed this weekly activity reward! 📦");
    return;
  }
  
  try {
    await updateDoc(doc(db, 'users', userProfile.uid), {
      balance: increment(rewardAmount),
      claimedGuildRewards: arrayUnion(milestoneId)
    });
    
    await addDoc(collection(db, 'deposit_requests'), {
      userId: userProfile.uid,
      userName: userProfile.name,
      userEmail: userProfile.email || '',
      type: 'deposit',
      method: 'Guild Reward',
      message: `Claimed Weekly Guild Activity Reward (+${rewardAmount} AX Coins)`,
      amountPKR: 0,
      amountAX: rewardAmount,
      txnId: 'RWD-' + Math.floor(100000 + Math.random() * 900000),
      status: 'approved',
      timestamp: 'Just now',
      createdAt: serverTimestamp()
    });
    
    alert(`🎉 Success! Claimed weekly activity reward of ${rewardAmount} AX Coins successfully!`);
    
    if (userProfile) {
      userProfile.balance = (userProfile.balance || 0) + rewardAmount;
      if (!userProfile.claimedGuildRewards) userProfile.claimedGuildRewards = [];
      userProfile.claimedGuildRewards.push(milestoneId);
    }
    
    window.renderGuildSystemModalContent();
  } catch (err) {
    alert("Failed to claim reward: " + err.message);
  }
};

// Guild Management Actions (Disband, Leave, Kick)
window.disbandGuild = async function() {
  if (!userGuild) return;
  if (userGuild.leaderId !== userProfile.uid) {
    alert("Only the Leader can disband the Guild!");
    return;
  }
  
  if (confirm(`⚠️ WARNING: Are you sure you want to DISBAND your Guild "${userGuild.name}" permanently?\nThis action is irreversible and will remove all members.`)) {
    try {
      await deleteDoc(doc(db, 'teams', userGuild.id));
      alert(`Guild "${userGuild.name}" has been disbanded successfully.`);
      userGuild = null;
      window.renderGuildSystemModalContent();
    } catch (err) {
      alert("Failed to disband Guild: " + err.message);
    }
  }
};

window.leaveGuild = async function() {
  if (!userGuild) return;
  if (userGuild.leaderId === userProfile.uid) {
    alert("As the Leader, you cannot leave. You must disband the Guild or promote someone else!");
    return;
  }
  
  if (confirm(`Are you sure you want to leave the Guild "${userGuild.name}"?`)) {
    try {
      await updateDoc(doc(db, 'teams', userGuild.id), {
        members: arrayRemove(userProfile.uid)
      });
      alert(`You successfully left the Guild "${userGuild.name}".`);
      userGuild = null;
      window.renderGuildSystemModalContent();
    } catch (err) {
      alert("Failed to leave Guild: " + err.message);
    }
  }
};

window.kickGuildMember = async function(targetUid, name) {
  if (!userGuild) return;
  if (userGuild.leaderId !== userProfile.uid) {
    alert("Only the Leader can kick members!");
    return;
  }
  
  if (confirm(`Are you sure you want to kick "${name}" from the Guild?`)) {
    try {
      await updateDoc(doc(db, 'teams', userGuild.id), {
        members: arrayRemove(targetUid)
      });
      alert(`Successfully kicked "${name}" from the Guild.`);
      window.renderGuildSystemModalContent();
    } catch (err) {
      alert("Failed to kick member: " + err.message);
    }
  }
};

// Dynamic Guild modal rendering engine (Legacy function - disabled)
window.legacyRenderGuildSystemModalContent = async function() {
  const container = $('mGuildSystemModal');
  const innerContent = $('guildSystemModalContent');
  if (!container || !innerContent) return;
  
  if (container.classList.contains('hidden')) return;
  
  const profile = userProfile;
  if (!profile) return;
  
  if ((userGuild || currentGuildTab === 'crates') && !showGuildBrowser) {
    // ----------------------------------------------------
    // ACTIVE SQUAD DASHBOARD & STORE STATE (Free Fire Layout!)
    // ----------------------------------------------------
    let sidebarTabs = userGuild ? `
      <button onclick="window.switchGuildTab('overview')" class="w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all duration-200 ${
        currentGuildTab === 'overview' 
          ? 'bg-gradient-to-r from-gold to-yellow-600 text-bg shadow-[0_4px_12px_rgba(240,192,64,0.25)]' 
          : 'text-t3 hover:text-white hover:bg-white/5'
      }">
        <i class="fas fa-eye text-sm"></i> Overview
      </button>
      <button onclick="window.switchGuildTab('members')" class="w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all duration-200 ${
        currentGuildTab === 'members' 
          ? 'bg-gradient-to-r from-gold to-yellow-600 text-bg shadow-[0_4px_12px_rgba(240,192,64,0.25)]' 
          : 'text-t3 hover:text-white hover:bg-white/5'
      }">
        <i class="fas fa-users-cog text-sm"></i> Members Online
      </button>
      <button onclick="window.switchGuildTab('rewards')" class="w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all duration-200 ${
        currentGuildTab === 'rewards' 
          ? 'bg-gradient-to-r from-gold to-yellow-600 text-bg shadow-[0_4px_12px_rgba(240,192,64,0.25)]' 
          : 'text-t3 hover:text-white hover:bg-white/5'
      }">
        <i class="fas fa-trophy text-sm"></i> Activity Rewards
      </button>
      <button onclick="window.switchGuildTab('events')" class="w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all duration-200 ${
        currentGuildTab === 'events' 
          ? 'bg-gradient-to-r from-gold to-yellow-600 text-bg shadow-[0_4px_12px_rgba(240,192,64,0.25)]' 
          : 'text-t3 hover:text-white hover:bg-white/5'
      }">
        <i class="fas fa-shield-halved text-sm"></i> Team Wars
      </button>
      <button onclick="window.switchGuildTab('crates')" class="w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all duration-200 ${
        currentGuildTab === 'crates' 
          ? 'bg-gradient-to-r from-gold to-yellow-600 text-bg shadow-[0_4px_12px_rgba(240,192,64,0.25)]' 
          : 'text-t3 hover:text-white hover:bg-white/5'
      }">
        <i class="fas fa-box-open text-sm ${currentGuildTab === 'crates' ? 'text-bg' : 'text-yellow-400 animate-pulse'}"></i> Squad Crates & Boosts
      </button>
    ` : `
      <button onclick="window.toggleGuildBrowser(true)" class="w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all duration-200 text-t3 hover:text-white hover:bg-white/5">
        <i class="fas fa-users text-sm"></i> Find / Join Squad
      </button>
      <button onclick="window.openCreateGuildModal()" class="w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all duration-200 text-t3 hover:text-white hover:bg-white/5">
        <i class="fas fa-plus text-sm"></i> Establish Squad
      </button>
      <button onclick="window.switchGuildTab('crates')" class="w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all duration-200 bg-gradient-to-r from-gold to-yellow-600 text-bg shadow-[0_4px_12px_rgba(240,192,64,0.25)]">
        <i class="fas fa-box-open text-sm text-bg"></i> Squad Store & Crates
      </button>
    `;

    let mainTabContentHtml = '';
    
    if (currentGuildTab === 'overview') {
      mainTabContentHtml = `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-hidden min-h-0">
          <!-- CENTER OVERVIEW: Crest logo & general level progress -->
          <div class="lg:col-span-7 flex flex-col justify-between bg-card/15 border border-bdr/20 rounded-2xl p-6 relative overflow-hidden min-h-0">
            <div class="absolute inset-0 bg-radial-gradient from-gold/5 via-transparent to-transparent pointer-events-none"></div>
            
            <div class="flex flex-col items-center text-center space-y-4 my-auto">
              <div class="relative group">
                <div class="absolute -inset-4 bg-gradient-to-r from-gold/30 via-yellow-500/20 to-orange-500/30 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
                <div class="relative w-36 h-36 bg-[#0e101f] border-2 border-gold rounded-full flex items-center justify-center shadow-2xl">
                  <span class="text-7xl filter drop-shadow-[0_4px_10px_rgba(240,192,64,0.4)] select-none">${userGuild.logoUrl || '🦁'}</span>
                </div>
              </div>
              
              <div class="space-y-1">
                <h2 class="font-display text-2xl font-black text-white uppercase tracking-widest flex items-center justify-center gap-2">
                  ${userGuild.name}
                  <span class="text-xs font-black bg-gold/10 border border-gold/30 text-gold px-2.5 py-1 rounded-lg">[${userGuild.tag || 'TEAM'}]</span>
                </h2>
                <div class="flex items-center justify-center gap-1.5 text-t3 text-[10px] font-mono">
                  <span>SQUAD ID: <strong class="text-white select-all font-bold">${userGuild.id}</strong></span>
                  <button onclick="navigator.clipboard.writeText('${userGuild.id}'); alert('Squad ID copied to clipboard! ✅')" class="hover:text-white transition cursor-pointer" title="Copy ID">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
              </div>

              <div class="flex items-center gap-4 bg-bg/80 border border-bdr/30 px-6 py-2.5 rounded-2xl shadow-lg">
                <div class="text-center px-4 border-r border-bdr/40">
                  <p class="text-[9px] text-t3 uppercase font-bold tracking-wider">Members</p>
                  <p class="font-black text-sm text-white mt-0.5 flex items-center gap-1">
                    <i class="fas fa-users text-gold text-xs"></i>
                    ${userGuild.members ? userGuild.members.length : 1} / 4
                  </p>
                </div>
                <div class="text-center px-4">
                  <p class="text-[9px] text-t3 uppercase font-bold tracking-wider">Lobby Voice</p>
                  <p class="font-black text-sm text-green-400 mt-0.5 flex items-center gap-1">
                    <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Active
                  </p>
                </div>
              </div>

              <div class="w-full max-w-sm space-y-2 pt-2">
                <div class="flex items-center justify-between text-xs font-bold">
                  <span class="text-gold uppercase tracking-wider flex items-center gap-1.5">
                    <i class="fas fa-medal"></i> Squad Level ${userGuild.level || 1}
                  </span>
                  <span class="text-t2 font-mono">${userGuild.xp || 0} / 4200 XP</span>
                </div>
                <div class="w-full bg-bg border border-bdr/30 rounded-full h-3 overflow-hidden p-[2px]">
                  <div class="bg-gradient-to-r from-gold via-yellow-400 to-amber-500 h-full rounded-full shadow-[0_0_10px_rgba(240,192,64,0.4)]" style="width: ${Math.min(100, ((userGuild.xp || 0) / 4200) * 100)}%"></div>
                </div>
              </div>
            </div>

            <div class="bg-[#0e101d]/60 border border-bdr/20 p-3 rounded-xl flex items-center justify-between mt-2 flex-shrink-0">
              <div class="min-w-0">
                <p class="text-[8px] text-t3 uppercase font-bold tracking-widest">Squad Slogan</p>
                <p class="text-xs text-t2 font-medium truncate italic mt-0.5">"${userGuild.description || 'Play together, win together!'}"</p>
              </div>
              <button onclick="window.switchGuildTab('members')" class="text-[10px] font-bold text-gold hover:underline shrink-0 pl-3">
                Manage <i class="fas fa-arrow-right ml-1"></i>
              </button>
            </div>
          </div>

          <!-- RIGHT COLUMN: Mini Leaderboard / Weekly Rewards / Functional Feed -->
          <div class="lg:col-span-5 flex flex-col justify-between h-full space-y-4 overflow-hidden min-h-0">
            <div class="grid grid-cols-2 gap-3 flex-shrink-0">
              <button onclick="alert('🏆 Squad Activity Leaderboard:\\n\\nOur Squad is currently ranked #1 among active weekend challengers! Keep earning points to secure top tier weekly badges! 🥇')" class="py-2.5 bg-gradient-to-r from-[#181a30] to-[#121324] hover:from-[#212442] hover:to-[#171930] border border-gold/15 hover:border-gold/30 rounded-xl text-[10px] font-black uppercase tracking-wider text-white flex items-center justify-center gap-2 transition duration-200">
                <i class="fas fa-chart-line text-gold"></i> Activity Leaderboard
              </button>
              <button onclick="window.switchGuildTab('crates')" class="py-2.5 bg-gradient-to-r from-[#181a30] to-[#121324] hover:from-[#212442] hover:to-[#171930] border border-gold/15 hover:border-gold/30 rounded-xl text-[10px] font-black uppercase tracking-wider text-white flex items-center justify-center gap-2 transition duration-200">
                <i class="fas fa-shopping-bag text-gold"></i> Squad Store
              </button>
            </div>

            <!-- WEEKLY PROGRESS MILESTONES -->
            <div class="bg-card/25 border border-bdr/20 rounded-2xl p-4 space-y-3.5 flex-shrink-0">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                  <i class="fas fa-gift text-gold"></i> Squad Weekly Activity Rewards
                </h4>
                <span class="text-[9px] bg-gold/10 text-gold font-bold px-2 py-0.5 rounded border border-gold/20 font-mono">0 Points</span>
              </div>
              
              <div class="relative py-2 px-1">
                <div class="absolute left-0 right-0 top-1/2 h-1 bg-[#101222] border border-bdr/20 -translate-y-1/2 rounded-full"></div>
                <div class="relative flex justify-between">
                  <div class="flex flex-col items-center">
                    <button onclick="window.claimGuildMilestone('m500', 50)" class="relative z-10 w-11 h-11 rounded-lg bg-bg border border-gold/20 flex flex-col items-center justify-center hover:border-gold/60 transition cursor-pointer">
                      <i class="fas fa-ticket text-amber-500 text-sm"></i>
                      <span class="text-[8px] font-bold text-t2 mt-0.5">x15</span>
                    </button>
                    <span class="text-[9px] font-mono text-t3 mt-1.5 font-bold">500 pts</span>
                  </div>
                  <div class="flex flex-col items-center">
                    <button onclick="window.claimGuildMilestone('m1500', 100)" class="relative z-10 w-11 h-11 rounded-lg bg-bg border border-gold/20 flex flex-col items-center justify-center hover:border-gold/60 transition cursor-pointer">
                      <i class="fas fa-ticket text-amber-500 text-sm"></i>
                      <span class="text-[8px] font-bold text-t2 mt-0.5">x20</span>
                    </button>
                    <span class="text-[9px] font-mono text-t3 mt-1.5 font-bold">1500 pts</span>
                  </div>
                  <div class="flex flex-col items-center">
                    <button onclick="window.claimGuildMilestone('m2000', 150)" class="relative z-10 w-11 h-11 rounded-lg bg-bg border border-gold/20 flex flex-col items-center justify-center hover:border-gold/60 transition cursor-pointer">
                      <i class="fas fa-ticket text-amber-500 text-sm"></i>
                      <span class="text-[8px] font-bold text-t2 mt-0.5">x30</span>
                    </button>
                    <span class="text-[9px] font-mono text-t3 mt-1.5 font-bold">2000 pts</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- CHAT FEED PANEL -->
            <div class="flex-1 bg-[#0b0c16] border border-bdr/20 rounded-2xl flex flex-col overflow-hidden min-h-[160px]">
              <div class="px-4 py-2 bg-card/10 border-b border-bdr/20 flex items-center justify-between flex-shrink-0">
                <div class="flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span class="text-[10px] font-bold uppercase tracking-wider text-t2">Guild Feed & Chat</span>
                </div>
                <span class="text-[8px] font-mono text-t3">Real-Time Sync</span>
              </div>
              
              <div id="guildChatLogsContainer" class="flex-1 p-3 overflow-y-auto space-y-2.5 text-[11px] scrollbar-thin">
                <div class="text-center text-t3 py-4">
                  <i class="fas fa-spinner animate-spin text-gold mr-1"></i> Loading Guild Feed...
                </div>
              </div>
              
              <div class="p-2 border-t border-bdr/20 bg-card/15 flex items-center gap-2 flex-shrink-0">
                <div class="relative flex-1">
                  <i class="far fa-comments absolute left-3 top-2.5 text-t3"></i>
                  <input id="guildChatInput" type="text" placeholder="Message your squad..." class="w-full bg-[#07080e] border border-bdr rounded-full pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-gold/40 transition" />
                </div>
                <button id="btnSendGuildChat" class="w-8 h-8 rounded-full bg-gold hover:bg-[#e8b830] text-bg flex items-center justify-center transition active:scale-95 cursor-pointer flex-shrink-0">
                  <i class="fas fa-paper-plane text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (currentGuildTab === 'members') {
      mainTabContentHtml = `
        <div class="flex flex-col h-full bg-card/10 border border-bdr/20 rounded-2xl p-4 overflow-hidden min-h-0">
          <div class="flex items-center justify-between pb-3 border-b border-bdr/20 flex-shrink-0">
            <div>
              <h4 class="text-xs font-black uppercase text-white tracking-wider">Guild Members List</h4>
              <p class="text-[9px] text-t3 mt-0.5">Manage squad rosters and invitation roles</p>
            </div>
            <div class="flex items-center gap-2">
              ${userGuild.leaderId === userProfile.uid ? `
                <button onclick="window.closeGuildsModal(); window.switchTab('Chat'); alert('Share your Guild ID to invite friends in the Global Feed! 🏆')" class="px-3 py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-[10px] font-black uppercase rounded-lg transition cursor-pointer">
                  <i class="fas fa-plus"></i> Recruit Members
                </button>
                <button onclick="window.disbandGuild()" class="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 border border-red-500/30 text-red hover:text-white text-[10px] font-black uppercase rounded-lg transition cursor-pointer">
                  <i class="fas fa-trash"></i> Disband Guild
                </button>
              ` : `
                <button onclick="window.leaveGuild()" class="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 border border-red-500/30 text-red hover:text-white text-[10px] font-black uppercase rounded-lg transition cursor-pointer">
                  <i class="fas fa-sign-out-alt"></i> Leave Guild
                </button>
              `}
            </div>
          </div>

          <div class="flex-1 overflow-y-auto mt-3 pr-1 scrollbar-thin">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-bdr/10 text-[9px] text-t3 font-bold uppercase tracking-wider">
                  <th class="py-2.5 pl-3">Player</th>
                  <th class="py-2.5 text-center">Role</th>
                  <th class="py-2.5 text-center">Status</th>
                  <th class="py-2.5 text-right pr-3">Actions</th>
                </tr>
              </thead>
              <tbody id="guildMembersTableBody" class="text-xs">
                <tr>
                  <td colspan="4" class="py-8 text-center text-t3">
                    <i class="fas fa-spinner animate-spin text-gold mr-1"></i> Fetching roster details...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
      setTimeout(async () => {
        const membersData = await window.fetchGuildMembers(userGuild.members || [userGuild.leaderId]);
        const tbody = $('guildMembersTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (membersData.length === 0) {
          tbody.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-t3">No member details retrieved.</td></tr>`;
          return;
        }

        membersData.forEach(m => {
          const isLeader = m.uid === userGuild.leaderId;
          const isSelf = m.uid === userProfile.uid;
          
          const tr = document.createElement('tr');
          tr.className = 'border-b border-bdr/10 hover:bg-white/[0.02] transition';
          
          tr.innerHTML = `
            <td class="py-3 pl-3 flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center text-sm font-bold text-gold flex-shrink-0 uppercase font-display">
                ${m.name ? m.name.substring(0, 2) : 'PL'}
              </div>
              <div class="min-w-0">
                <p class="font-bold text-white truncate flex items-center gap-1">
                  ${m.name || 'Anonymous Player'}
                  ${isSelf ? '<span class="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1 py-0.2 rounded">Me</span>' : ''}
                </p>
                <p class="text-[9px] text-t3 font-mono">@${m.handle || 'player'}</p>
              </div>
            </td>
            <td class="py-3 text-center">
              <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                isLeader 
                  ? 'bg-gold/10 text-gold border border-gold/20' 
                  : 'bg-card border border-bdr/50 text-t2'
              }">
                ${isLeader ? '👑 Leader' : '⚔️ Member'}
              </span>
            </td>
            <td class="py-3 text-center">
              <span class="inline-flex items-center gap-1.5 text-[10px] text-green-400 font-bold">
                <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
              </span>
            </td>
            <td class="py-3 text-right pr-3">
              ${isLeader || isSelf ? '-' : `
                ${userGuild.leaderId === userProfile.uid ? `
                  <button onclick="window.kickGuildMember('${m.uid}', '${m.name}')" class="px-2 py-1 bg-red-500/10 hover:bg-red text-red hover:text-white border border-red-500/20 text-[9px] font-black uppercase rounded-md transition cursor-pointer">
                    Kick
                  </button>
                ` : '-'}
              `}
            </td>
          `;
          tbody.appendChild(tr);
        });
      }, 50);
    } else if (currentGuildTab === 'rewards') {
      mainTabContentHtml = `
        <div class="flex flex-col h-full space-y-4 overflow-y-auto scrollbar-thin">
          <div class="bg-card/15 border border-bdr/20 rounded-2xl p-4 space-y-2">
            <h4 class="text-xs font-black uppercase text-white tracking-wider">How to Earn Guild Activity Points</h4>
            <p class="text-[11px] text-t3 leading-relaxed">
              Your Guild earns XP and activity points through active participation of its roster members across the ArenaX platform:
            </p>
            <ul class="space-y-1.5 text-[11px] text-t2 list-disc list-inside">
              <li><strong class="text-white">Daily Login:</strong> Earn +10 Points automatically for checking into your dashboard daily.</li>
              <li><strong class="text-white">Squad Tournaments:</strong> Earn +50 Points for every team registration submitted for active slots.</li>
              <li><strong class="text-white">Voice Lobbies:</strong> Earn +25 Points per 10 minutes spent coordinating in team voice rooms.</li>
              <li><strong class="text-white">Tournament Wins:</strong> Earn +200 Points for securing 1st place in official tournaments!</li>
            </ul>
          </div>

          <div class="bg-[#0b0c16] border border-bdr/20 rounded-2xl p-4 space-y-4">
            <h4 class="text-xs font-black uppercase text-gold tracking-wider flex items-center gap-1.5">
              <i class="fas fa-ticket-alt"></i> Available Claims & Vouchers
            </h4>
            
            <div class="space-y-3">
              <div class="p-3 bg-card/25 border border-bdr/20 rounded-xl flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-gold/5 border border-gold/15 flex items-center justify-center text-gold text-lg">
                    <i class="fas fa-award"></i>
                  </div>
                  <div>
                    <h5 class="text-xs font-black text-white uppercase">Milestone 1 Vouchers (500 pts)</h5>
                    <p class="text-[10px] text-t3">Instant reward of 50 AX Coins directly to your active profile!</p>
                  </div>
                </div>
                <button onclick="window.claimGuildMilestone('m500', 50)" class="px-4 py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-[10px] font-black uppercase rounded-lg transition cursor-pointer">
                  Claim 50 AX
                </button>
              </div>

              <div class="p-3 bg-card/25 border border-bdr/20 rounded-xl flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-gold/5 border border-gold/15 flex items-center justify-center text-gold text-lg">
                    <i class="fas fa-star"></i>
                  </div>
                  <div>
                    <h5 class="text-xs font-black text-white uppercase">Milestone 2 Vouchers (1500 pts)</h5>
                    <p class="text-[10px] text-t3">Instant reward of 100 AX Coins directly to your active profile!</p>
                  </div>
                </div>
                <button onclick="window.claimGuildMilestone('m1500', 100)" class="px-4 py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-[10px] font-black uppercase rounded-lg transition cursor-pointer">
                  Claim 100 AX
                </button>
              </div>

              <div class="p-3 bg-card/25 border border-bdr/20 rounded-xl flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-gold/5 border border-gold/15 flex items-center justify-center text-gold text-lg">
                    <i class="fas fa-trophy"></i>
                  </div>
                  <div>
                    <h5 class="text-xs font-black text-white uppercase">Milestone 3 Vouchers (2000 pts)</h5>
                    <p class="text-[10px] text-t3">Instant reward of 150 AX Coins directly to your active profile!</p>
                  </div>
                </div>
                <button onclick="window.claimGuildMilestone('m2000', 150)" class="px-4 py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-[10px] font-black uppercase rounded-lg transition cursor-pointer">
                  Claim 150 AX
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (currentGuildTab === 'events') {
      const teamWarTours = (toursData || []).filter(t => t.teamType === 'Team War');
      let tourCardsHtml = '';
      
      if (teamWarTours.length === 0) {
        tourCardsHtml = `
          <div class="col-span-full flex flex-col items-center justify-center text-center p-8 border border-bdr/20 bg-card/10 rounded-xl space-y-2">
            <i class="fas fa-skull text-3xl text-t3/40 animate-pulse"></i>
            <h5 class="text-xs font-bold text-white uppercase">No Team War Tournaments Active</h5>
            <p class="text-[10px] text-t3 max-w-sm">Administration has not posted any active Team War tournaments. Check back soon for the ultimate clash of squads!</p>
          </div>
        `;
      } else {
        teamWarTours.forEach(t => {
          const reg = userRegs[t.id];
          const isRegApproved = reg && reg.status === 'approved';
          const isRegPending = reg && reg.status === 'pending';
          
          const statusLabels = {
            upcoming: 'Upcoming Match',
            live: '🔴 LIVE NOW',
            ended: 'Ended',
            cancelled: '❌ Cancelled'
          };
          
          tourCardsHtml += `
            <div class="bg-card/30 border border-bdr/30 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-gold/30 transition">
              <div class="flex justify-between items-start">
                <div>
                  <span class="text-[8px] bg-red/10 border border-red-500/20 text-red px-1.5 py-0.5 rounded font-black uppercase tracking-widest">🔥 TEAM WAR MATCH</span>
                  <h4 class="font-display text-sm font-black text-white uppercase mt-1 leading-tight">${t.name}</h4>
                  <p class="text-[9px] font-mono text-t3 mt-0.5"><i class="fas fa-award text-gold"></i> Prize: <strong class="text-gold">${t.prize || 'TBD'}</strong></p>
                </div>
                <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${t.status === 'live' ? 'bg-red text-white animate-pulse' : 'bg-gold/10 text-gold border border-gold/25'}">
                  ${statusLabels[t.status] || t.status}
                </span>
              </div>
              
              <!-- Mini stats grid -->
              <div class="grid grid-cols-2 gap-2 bg-black/40 p-2.5 rounded-lg text-[10px] font-mono text-t2 border border-bdr/10">
                <div>Slots filled: <strong class="text-white">${t.registered || 0}/${t.maxPlayers || 32}</strong></div>
                <div>Entry Fee: <strong class="text-white">${t.entryFee || 'Free'}</strong></div>
                <div>Date: <strong class="text-white">${t.date || 'TBD'}</strong></div>
                <div>Time: <strong class="text-white">${t.time || 'TBD'}</strong></div>
              </div>
              
              <div class="bg-gold/5 border border-gold/10 p-2 rounded-lg text-[9px] text-gold font-medium leading-relaxed">
                🛡️ <strong class="text-white">+100 Squad XP Awarded</strong> to your Squad roster upon filled registration & slot confirmation!
              </div>
              
              <div class="flex items-center gap-2 pt-1">
                <button onclick="window.closeGuildsModal(); window.openTournamentParticipationById('${t.id}')" class="flex-1 py-1.5 bg-[#181a30] hover:bg-[#212442] border border-bdr/40 text-t2 hover:text-white text-[10px] font-bold uppercase rounded-lg transition">
                  <i class="fas fa-users mr-1"></i> Slots
                </button>
                
                ${t.status === 'upcoming' ? `
                  <button onclick="window.closeGuildsModal(); window.openTournamentRegisterById('${t.id}')" class="flex-1 py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-[10px] font-black uppercase rounded-lg transition">
                    <i class="fas fa-gamepad mr-1"></i> Participate
                  </button>
                ` : ''}
                
                ${t.status === 'ended' ? `
                  <button onclick="window.closeGuildsModal(); window.openTournamentLeaderboardById('${t.id}')" class="flex-1 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-[10px] font-bold uppercase rounded-lg transition">
                    <i class="fas fa-poll mr-1"></i> Result
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        });
      }
      
      mainTabContentHtml = `
        <div class="flex flex-col h-full bg-card/10 border border-bdr/20 rounded-2xl p-4 overflow-hidden min-h-0">
          <div class="flex items-center justify-between pb-3 border-b border-bdr/20 flex-shrink-0">
            <div>
              <h4 class="text-xs font-black uppercase text-white tracking-wider">🔥 Elite Team War Matches</h4>
              <p class="text-[9px] text-t3 mt-0.5">Admin-posted squad vs squad battles. Earn extra EXP & climb the rankings!</p>
            </div>
            <span class="text-[10px] bg-red/10 border border-red-500/25 text-red px-2.5 py-0.5 rounded font-black uppercase tracking-widest animate-pulse">Exclusive Mode</span>
          </div>
          
          <div class="flex-1 overflow-y-auto mt-4 pr-1 scrollbar-thin">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${tourCardsHtml}
            </div>
          </div>
        </div>
      `;
    } else if (currentGuildTab === 'crates') {
      const activeXp = userProfile ? userProfile.activeXpBooster : null;
      const isXpActive = activeXp && activeXp.expiresAt > Date.now();
      const xpTimeLeft = isXpActive ? Math.ceil((activeXp.expiresAt - Date.now()) / (3600 * 1000)) : 0;
      
      const activeSquad = userProfile ? userProfile.activeSquadBoost : null;
      const isSquadActive = activeSquad && activeSquad.expiresAt > Date.now();
      const squadTimeLeft = isSquadActive ? Math.ceil((activeSquad.expiresAt - Date.now()) / (3600 * 1000)) : 0;

      mainTabContentHtml = `
        <div class="flex flex-col h-full space-y-4 overflow-y-auto pr-1 scrollbar-thin">
          <!-- Active Boosters Status Bar -->
          <div class="bg-gradient-to-r from-[#121324] via-[#0d0e1c] to-[#121324] border border-gold/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div>
              <span class="text-[9px] text-gold font-mono uppercase font-bold tracking-widest">Active Equipment Status</span>
              <h4 class="text-xs font-black text-white uppercase mt-0.5">My Active Squad & XP Boosters</h4>
            </div>
            <div class="flex items-center gap-3">
              <div class="px-3 py-1.5 bg-black/40 border border-bdr/20 rounded-xl flex items-center gap-2">
                <i class="fas fa-bolt text-yellow-400 text-sm"></i>
                <div class="text-[10px]">
                  <span class="text-t3 block text-[8px] uppercase">XP Booster</span>
                  <strong class="${isXpActive ? 'text-emerald-400' : 'text-t3'} font-bold">
                    ${isXpActive ? `2x Active (${xpTimeLeft}h left)` : 'Inactive'}
                  </strong>
                </div>
              </div>
              <div class="px-3 py-1.5 bg-black/40 border border-bdr/20 rounded-xl flex items-center gap-2">
                <i class="fas fa-shield-halved text-emerald-400 text-sm"></i>
                <div class="text-[10px]">
                  <span class="text-t3 block text-[8px] uppercase">Squad Boost</span>
                  <strong class="${isSquadActive ? 'text-emerald-400' : 'text-t3'} font-bold">
                    ${isSquadActive ? `+25% Active (${squadTimeLeft}h left)` : 'Inactive'}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Hero Mystery Crate Opening Box -->
          <div class="bg-gradient-to-br from-[#1b1d36] via-[#111222] to-[#0a0b14] border-2 border-gold/40 rounded-2xl p-5 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_40px_rgba(240,192,64,0.15)]">
            <div class="space-y-2 text-center md:text-left z-10">
              <span class="px-2.5 py-0.5 bg-gold/15 border border-gold/30 text-gold text-[9px] font-black uppercase rounded-full tracking-widest">
                <i class="fas fa-gem"></i> MYSTERY GACHA CRATE
              </span>
              <h3 class="font-display text-xl font-black text-white uppercase tracking-wider">
                Squad Mystery Crate
              </h3>
              <p class="text-[11px] text-t3 max-w-md leading-relaxed">
                Test your luck! Click below to trigger the crate opening video (<strong class="text-gold">crate.mp4</strong>) and win <strong class="text-white">Squad Boosts</strong>, <strong class="text-white">AX Coin Packs</strong>, or <strong class="text-white">24h XP Boosters</strong>!
              </p>
              <div class="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <button onclick="window.startSquadCrateOpening()" class="px-6 py-3 bg-gradient-to-r from-gold via-yellow-400 to-amber-500 hover:from-yellow-400 hover:to-amber-600 text-bg text-xs font-black uppercase tracking-widest rounded-xl shadow-[0_4px_20px_rgba(240,192,64,0.4)] transition cursor-pointer flex items-center gap-2">
                  <i class="fas fa-box-open text-sm"></i> OPEN CRATE (50 AX)
                </button>
                <span class="text-[10px] text-t3 font-mono">Cost: 50 AX Coins per spin</span>
              </div>
            </div>

            <div class="relative group shrink-0 my-2 z-10">
              <div class="absolute -inset-4 bg-gold/25 rounded-full blur-xl group-hover:bg-gold/40 transition"></div>
              <div class="relative w-32 h-32 bg-card/60 border-2 border-gold rounded-2xl flex flex-col items-center justify-center text-gold shadow-2xl cursor-pointer hover:scale-105 transition" onclick="window.startSquadCrateOpening()">
                <i class="fas fa-box-open text-5xl drop-shadow-[0_0_15px_rgba(240,192,64,0.8)] animate-pulse"></i>
                <span class="text-[9px] font-black uppercase tracking-widest text-white mt-2">CLICK TO OPEN</span>
              </div>
            </div>
          </div>

          <!-- Items Showcase Grid -->
          <div class="space-y-3">
            <h4 class="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <i class="fas fa-store text-gold"></i> Crate Drop Items & Direct Boost Shop
            </h4>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- Item 1: Squad Boost -->
              <div class="p-4 bg-card/20 border border-bdr/30 rounded-xl flex items-center justify-between hover:border-emerald-500/40 transition">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl shrink-0">
                    <i class="fas fa-shield-halved"></i>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h5 class="text-xs font-black text-white uppercase">Squad Boost (+25%)</h5>
                      <span class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 uppercase">EPIC DROP</span>
                    </div>
                    <p class="text-[10px] text-t3 mt-0.5 leading-tight">+25% Squad activity points & team tournament XP multiplier for 48h.</p>
                  </div>
                </div>
                <button onclick="window.buySquadItem('squad_boost', 100)" class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg transition shrink-0 ml-2 cursor-pointer">
                  100 AX
                </button>
              </div>

              <!-- Item 2: AX Coin Pack -->
              <div class="p-4 bg-card/20 border border-bdr/30 rounded-xl flex items-center justify-between hover:border-gold/40 transition">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold text-2xl shrink-0">
                    <i class="fas fa-coins"></i>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h5 class="text-xs font-black text-white uppercase">AX Coin Pack</h5>
                      <span class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-gold/15 border border-gold/30 text-gold uppercase">WIN 50 - 500 AX</span>
                    </div>
                    <p class="text-[10px] text-t3 mt-0.5 leading-tight">Win up to 500 AX Coins instantly deposited into your balance!</p>
                  </div>
                </div>
                <button onclick="window.startSquadCrateOpening()" class="px-3 py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-[10px] font-black uppercase rounded-lg transition shrink-0 ml-2 cursor-pointer">
                  Win Crate
                </button>
              </div>

              <!-- Item 3: XP Booster (1h) -->
              <div class="p-4 bg-card/20 border border-bdr/30 rounded-xl flex items-center justify-between hover:border-amber-500/40 transition">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl shrink-0">
                    <i class="fas fa-bolt"></i>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h5 class="text-xs font-black text-white uppercase">XP Booster (1h)</h5>
                      <span class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 uppercase">RARE DROP</span>
                    </div>
                    <p class="text-[10px] text-t3 mt-0.5 leading-tight">2x XP Multiplier active across all matches & lobbies for 1 hour.</p>
                  </div>
                </div>
                <button onclick="window.buySquadItem('xp_1h', 30)" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-bg text-[10px] font-black uppercase rounded-lg transition shrink-0 ml-2 cursor-pointer">
                  30 AX
                </button>
              </div>

              <!-- Item 4: XP Booster (24h) -->
              <div class="p-4 bg-card/20 border border-bdr/30 rounded-xl flex items-center justify-between hover:border-yellow-400/50 transition">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-300 text-2xl shrink-0">
                    <i class="fas fa-bolt-lightning"></i>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h5 class="text-xs font-black text-white uppercase">XP Booster (24h)</h5>
                      <span class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 uppercase">LEGENDARY</span>
                    </div>
                    <p class="text-[10px] text-t3 mt-0.5 leading-tight">2x XP Multiplier active across all matches & lobbies for a full 24 hours.</p>
                  </div>
                </div>
                <button onclick="window.buySquadItem('xp_24h', 120)" class="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-bg text-[10px] font-black uppercase rounded-lg transition shrink-0 ml-2 cursor-pointer">
                  120 AX
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    innerContent.innerHTML = `
      <!-- Dashboard Header -->
      <div class="p-4 border-b border-bdr/40 flex items-center justify-between bg-card/60 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gold/10 text-gold border border-gold/25 flex items-center justify-center text-lg font-black font-mono">
            ${userGuild ? (userGuild.logoUrl || '🦁') : '🎁'}
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              ${userGuild ? `<span class="text-[9px] bg-gold/10 text-gold font-bold px-1.5 py-0.5 rounded border border-gold/20 font-mono">Lv. ${userGuild.level || 1}</span>` : ''}
              <h3 class="font-display text-sm font-black text-white uppercase tracking-wider">${userGuild ? userGuild.name : 'Squad Store & Mystery Crates'}</h3>
            </div>
            <p class="text-[9px] text-t3 font-mono">${userGuild ? 'My Active Tournament Squad' : 'Exclusive Boosts & Crate Drops'}</p>
          </div>
        </div>
        
        <div class="flex items-center gap-2 bg-[#090a12] border border-bdr/30 px-3 py-1.5 rounded-full shrink-0">
          <i class="fas fa-coins text-gold text-xs"></i>
          <span class="text-xs font-black text-white font-mono">${(profile.balance || 0).toLocaleString()} AX</span>
          <button onclick="window.closeGuildsModal(); window.switchTab('Wallet')" class="text-gold hover:text-white text-[10px] ml-1 cursor-pointer" title="Recharge wallet">
            <i class="fas fa-plus-circle"></i>
          </button>
        </div>

        <div class="flex items-center gap-3">
          <button onclick="window.toggleGuildBrowser(true)" class="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-bdr/40 text-t2 hover:text-white text-[9px] font-black uppercase rounded-lg transition flex items-center gap-1.5 cursor-pointer">
            <i class="fas fa-globe"></i> Squad List >>
          </button>
          <button onclick="alert('❓ Squad & Teams FAQ:\\n- Team creation costs 500 AX.\\n- Max limit is 4 players.\\n- Complete tournament participations to level up!')" class="text-t3 hover:text-white transition cursor-pointer text-xs flex items-center gap-1">
            <i class="fas fa-question-circle"></i> SQUAD
          </button>
          <button onclick="window.closeGuildsModal()" class="text-t3 hover:text-white transition cursor-pointer text-sm w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <!-- Dashboard Body Layout -->
      <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden min-h-0">
        <div class="lg:col-span-3 flex flex-col gap-2.5 pr-2 border-r border-bdr/10 overflow-y-auto scrollbar-none">
          ${sidebarTabs}
        </div>
        
        <div class="lg:col-span-9 h-full overflow-hidden min-h-0">
          ${mainTabContentHtml}
        </div>
      </div>
    `;

    if (currentGuildTab === 'overview' && userGuild) {
      window.listenToGuildChat(userGuild.id);
      
      setTimeout(() => {
        const btnSend = $('btnSendGuildChat');
        const inputChat = $('guildChatInput');
        if (btnSend && inputChat) {
          btnSend.addEventListener('click', window.sendGuildChatMessage);
          inputChat.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') window.sendGuildChatMessage();
          });
        }
      }, 50);
    }

  } else {
    // ----------------------------------------------------
    // GUILD LOBBY / BROWSER / SEARCH & CREATE STATE
    // ----------------------------------------------------
    innerContent.innerHTML = `
      <div class="p-4 border-b border-bdr/40 flex items-center justify-between bg-card/60 flex-shrink-0">
        <div class="flex items-center gap-2">
          <i class="fas fa-users text-gold text-lg"></i>
          <h3 class="font-display text-sm font-black text-white uppercase tracking-wider">🛡️ Guild & Teams Hub</h3>
        </div>
        
        <div class="flex items-center gap-3">
          ${userGuild ? `
            <button onclick="window.toggleGuildBrowser(false)" class="px-2.5 py-1.5 bg-gold/10 hover:bg-gold/20 border border-gold/30 text-gold text-[9px] font-black uppercase rounded-lg transition flex items-center gap-1.5 cursor-pointer">
              << My Guild Dashboard
            </button>
          ` : ''}
          <button onclick="window.closeGuildsModal()" class="text-t3 hover:text-white transition cursor-pointer text-sm w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden min-h-0">
        <div class="lg:col-span-7 flex flex-col h-full min-h-0 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2.5">
            <button id="btnCreateGuildTrigger" onclick="window.openCreateGuildModal()" class="px-3 py-2 bg-gold hover:bg-[#e8b830] text-bg text-[11px] font-black uppercase rounded-lg transition active:scale-[0.98] cursor-pointer flex items-center gap-1.5">
              <i class="fas fa-plus"></i> Create Guild <span class="bg-black/10 text-black px-1.5 py-0.2 rounded text-[9px]">500 AX</span>
            </button>
            
            <div class="flex items-center gap-2 flex-1 max-w-sm ml-auto">
              <div class="relative flex-1">
                <i class="fas fa-search absolute left-3 top-2.5 text-t3 text-xs"></i>
                <input id="guildSearchInput" oninput="window.renderGuildsListUI()" type="text" placeholder="Search by name, tag, or leader..." class="w-full bg-card border border-bdr rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-gold/50 transition" />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-12 px-3 py-1.5 bg-card/20 rounded-lg text-[10px] text-t3 font-bold uppercase tracking-wider border border-bdr/20">
            <div class="col-span-5 flex items-center">Guild Info</div>
            <div class="col-span-2 text-center">Level</div>
            <div class="col-span-2 text-center">Members</div>
            <div class="col-span-3 text-right">Slogan Type</div>
          </div>

          <div id="guildsRowsContainer" class="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
            <!-- Populated dynamically -->
          </div>
        </div>

        <div id="guildDetailsPanel" class="lg:col-span-5 flex flex-col h-full bg-[#111322] border border-bdr/60 rounded-xl p-4 overflow-y-auto space-y-4">
          <!-- Populated dynamically -->
        </div>
      </div>
    `;
    
    // Defer populating details and rows
    setTimeout(() => {
      window.renderGuildsListUI();
      window.renderSelectedGuildDetailsUI();
    }, 10);
  }
};

function renderGuildsListUI() {
  const container = $('guildsRowsContainer');
  if (!container) return;
  container.innerHTML = '';
  
  const searchInput = $('guildSearchInput');
  const searchWord = searchInput ? searchInput.value.trim().toLowerCase() : '';
  
  const filtered = allGuilds.filter(g => {
    if (!searchWord) return true;
    return g.name.toLowerCase().includes(searchWord) || 
           (g.tag && g.tag.toLowerCase().includes(searchWord)) || 
           (g.leaderName && g.leaderName.toLowerCase().includes(searchWord)) ||
           g.id.toLowerCase().includes(searchWord);
  });
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-t3 text-xs bg-card/10 border border-bdr/20 rounded-xl mt-4">
        <i class="fas fa-shield-alt text-lg text-t3/40 mb-2 block animate-pulse"></i>
        No guilds found matching your search.
      </div>
    `;
    return;
  }
  
  filtered.forEach(g => {
    const isSelected = selectedGuild && selectedGuild.id === g.id;
    const isUserGuild = userGuild && userGuild.id === g.id;
    const memberCount = (g.members || []).length;
    
    const row = document.createElement('div');
    row.className = `grid grid-cols-12 px-3 py-3 rounded-xl border items-center transition cursor-pointer hover:scale-[1.01] ${
      isSelected 
        ? 'bg-[#1b1e32] border-gold/40 shadow-[0_0_15px_rgba(192,160,48,0.08)] text-white' 
        : 'bg-card/40 hover:bg-card/75 border-bdr/30 text-t2 hover:text-white'
    }`;
    
    const infoCol = document.createElement('div');
    infoCol.className = 'col-span-5 flex items-center gap-3 min-w-0';
    
    const shieldLogo = document.createElement('div');
    shieldLogo.className = 'w-9 h-9 rounded-lg bg-gold/10 text-gold border border-gold/20 flex items-center justify-center text-base flex-shrink-0';
    shieldLogo.textContent = g.logoUrl || '🔥';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'min-w-0';
    
    const nameP = document.createElement('p');
    nameP.className = 'font-bold text-xs truncate flex items-center gap-1.5 text-white';
    nameP.innerHTML = `${g.name} <span class="text-[9px] bg-gold/10 text-gold px-1 py-0.5 rounded border border-gold/20 font-mono">[${g.tag || 'TEAM'}]</span>`;
    
    const sloganP = document.createElement('p');
    sloganP.className = 'text-[10px] text-t3 truncate mt-0.5';
    sloganP.textContent = `Leader: ${g.leaderName || 'Admin'}`;
    
    textDiv.appendChild(nameP);
    textDiv.appendChild(sloganP);
    infoCol.appendChild(shieldLogo);
    infoCol.appendChild(textDiv);
    row.appendChild(infoCol);
    
    const lvlCol = document.createElement('div');
    lvlCol.className = 'col-span-2 text-center text-xs font-bold font-mono';
    lvlCol.innerHTML = `<span class="text-gold">Lv.</span> ${g.level || 1}`;
    row.appendChild(lvlCol);
    
    const memCol = document.createElement('div');
    memCol.className = 'col-span-2 text-center text-xs font-medium font-mono text-t2';
    memCol.innerHTML = `<i class="fas fa-user text-[10px] text-t3 mr-1"></i>${memberCount}`;
    row.appendChild(memCol);
    
    const appCol = document.createElement('div');
    appCol.className = 'col-span-3 text-right text-[10px] font-bold uppercase tracking-wider text-t3';
    if (isUserGuild) {
      appCol.innerHTML = `<span class="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px]">My Guild</span>`;
    } else {
      appCol.textContent = g.type || 'CASUAL';
    }
    row.appendChild(appCol);
    
    row.addEventListener('click', () => {
      selectedGuild = g;
      renderGuildsListUI();
      renderSelectedGuildDetailsUI();
    });
    
    container.appendChild(row);
  });
}

function renderSelectedGuildDetailsUI() {
  const panel = $('guildDetailsPanel');
  if (!panel) return;
  panel.innerHTML = '';
  
  let g = selectedGuild;
  if (!g && allGuilds.length > 0) {
    g = allGuilds[0];
    selectedGuild = g;
  }
  
  if (!g) {
    panel.innerHTML = `
      <div class="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 h-full">
        <div class="w-14 h-14 rounded-full bg-gold/5 border border-gold/15 flex items-center justify-center text-gold/40 text-2xl animate-pulse">
          <i class="fas fa-shield-alt"></i>
        </div>
        <div class="space-y-1">
          <h4 class="font-display text-xs font-black text-white uppercase tracking-wider">No Guild Selected</h4>
          <p class="text-[10px] text-t3 leading-relaxed max-w-[240px] mx-auto">
            Select a team from the list to view its active details, requirements, level progression, and rosters! Or click "Create Guild" to establish your own.
          </p>
        </div>
      </div>
    `;
    return;
  }
  
  const isLeader = g.leaderId === (userProfile && userProfile.uid);
  const isMember = g.members && g.members.includes(userProfile && userProfile.uid);
  const isUserGuild = isLeader || isMember;
  
  const currentLevel = g.level || 1;
  const currentXp = g.xp || 0;
  const nextLevelXp = currentLevel * 100;
  const prevLevelXp = (currentLevel - 1) * 100;
  const xpNeededForThisLevel = nextLevelXp - prevLevelXp;
  const xpInThisLevel = currentXp - prevLevelXp;
  const xpProgressPercent = Math.min(100, Math.max(0, (xpInThisLevel / xpNeededForThisLevel) * 100));
  
  panel.innerHTML = `
    <!-- Top Details Card -->
    <div class="flex items-center gap-3 bg-card/25 border border-bdr/20 p-3.5 rounded-xl">
      <div class="w-12 h-12 bg-gold/10 text-gold border border-gold/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
        ${g.logoUrl || '🔥'}
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-2">
          <h3 class="font-display text-sm font-black text-white uppercase tracking-wider truncate flex-1">${g.name}</h3>
          <span class="text-[9px] font-bold font-mono text-gold bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded uppercase">[${g.tag || 'TEAM'}]</span>
        </div>
        <p class="text-[10px] text-t3 font-mono mt-0.5">ID: <span class="text-t2">${g.id}</span></p>
      </div>
    </div>

    <!-- Stats Panel -->
    <div class="grid grid-cols-2 gap-3.5">
      <div class="bg-card/25 border border-bdr/20 p-3 rounded-xl flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-gold/5 text-gold flex items-center justify-center text-sm border border-gold/15">
          <i class="fas fa-crown"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-[9px] text-t3 uppercase font-bold tracking-wider">Leader</p>
          <p class="font-bold text-xs text-white truncate mt-0.5">${g.leaderName || 'Admin'}</p>
        </div>
      </div>

      <div class="bg-card/25 border border-bdr/20 p-3 rounded-xl flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-blue-500/5 text-blue-400 flex items-center justify-center text-sm border border-blue-500/15">
          <i class="fas fa-user-friends"></i>
        </div>
        <div>
          <p class="text-[9px] text-t3 uppercase font-bold tracking-wider">Members</p>
          <p class="font-bold text-xs text-white mt-0.5">${(g.members || []).length} / 30</p>
        </div>
      </div>
    </div>

    <!-- XP / Level Progress -->
    <div class="bg-card/20 border border-bdr/20 p-3.5 rounded-xl space-y-2">
      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-1.5 font-bold">
          <i class="fas fa-star text-gold"></i>
          <span class="text-white">GUILD LEVEL:</span>
          <span class="text-gold font-mono">${currentLevel}</span>
        </div>
        <span class="text-[10px] font-mono text-t3">${currentXp} / ${nextLevelXp} XP</span>
      </div>
      <div class="w-full bg-bg border border-bdr/40 rounded-full h-2.5 overflow-hidden">
        <div class="bg-gradient-to-r from-gold to-[#f0c040] h-full rounded-full shadow-[0_0_8px_rgba(240,192,64,0.3)]" style="width: ${xpProgressPercent}%"></div>
      </div>
      <p class="text-[9px] text-t3 leading-relaxed mt-1">Earn 50 XP per filled tournament registration squad. Next level increases squad capabilities!</p>
    </div>

    <!-- Description Slogan -->
    <div class="bg-card/15 border border-bdr/10 p-3.5 rounded-xl space-y-1.5 relative">
      <div class="flex items-center justify-between">
        <label class="text-[9px] text-t3 uppercase font-bold tracking-wider">Guild Slogan / Motto</label>
        ${isLeader ? `
          <button id="btnEditSlogan" class="text-gold hover:text-white text-[10px] flex items-center gap-1 cursor-pointer">
            <i class="fas fa-edit"></i> Edit
          </button>
        ` : ''}
      </div>
      <p id="sloganTextContainer" class="text-xs text-t2 italic font-medium leading-relaxed">"${g.description || 'No slogan set.'}"</p>
    </div>

    <!-- Joining Requirements -->
    <div class="bg-card/15 border border-bdr/10 p-3.5 rounded-xl space-y-1.5 relative flex-1 flex flex-col min-h-[120px]">
      <div class="flex items-center justify-between flex-shrink-0">
        <label class="text-[9px] text-t3 uppercase font-bold tracking-wider">Joining Requirements</label>
        ${isLeader ? `
          <button id="btnEditRequirements" class="text-gold hover:text-white text-[10px] flex items-center gap-1 cursor-pointer">
            <i class="fas fa-edit"></i> Edit
          </button>
        ` : ''}
      </div>
      <div class="flex-1 overflow-y-auto max-h-[120px] scrollbar-thin text-xs text-t2 leading-relaxed">
        <p id="requirementsTextContainer" class="whitespace-pre-line">${g.requirements || 'No special requirements specified. Anyone is welcome to apply!'}</p>
      </div>
    </div>

    <!-- CTA Join Request Buttons -->
    <div class="pt-2 border-t border-bdr/30 flex-shrink-0">
      ${isUserGuild ? `
        ${isLeader ? `
          <p class="text-[10px] text-center text-gold font-bold uppercase tracking-wider py-2 border border-gold/10 rounded-xl bg-gold/5">
            👑 You are the Leader of this Guild
          </p>
        ` : `
          <div class="flex flex-col gap-2">
            <p class="text-[10px] text-center text-emerald-400 font-bold uppercase tracking-wider py-1 border border-emerald-500/10 rounded-xl bg-emerald-500/5">
              🛡️ Active Guild Member
            </p>
            <button id="btnLeaveGuild" class="w-full py-2 bg-red/10 hover:bg-red/20 border border-red/20 hover:border-red/40 text-red text-xs font-bold uppercase rounded-xl transition cursor-pointer">
              Leave Guild
            </button>
          </div>
        `}
      ` : `
        ${userGuild ? `
          <p class="text-[10px] text-center text-t3 leading-relaxed px-4 py-2 bg-card/15 border border-bdr/20 rounded-xl">
            You are already a member of <strong class="text-white">[${userGuild.tag}] ${userGuild.name}</strong>. Please leave your current guild to join another.
          </p>
        ` : `
          <button id="btnRequestToJoinGuild" class="w-full py-3 bg-gold hover:bg-[#e8b830] text-bg text-xs font-black uppercase rounded-xl transition active:scale-[0.98] cursor-pointer shadow-[0_4px_15px_rgba(240,192,64,0.15)] flex items-center justify-center gap-2">
            <i class="fas fa-door-open"></i> Request to Join Guild
          </button>
        `}
      `}
    </div>
  `;
  
  if (!isUserGuild && !userGuild) {
    const btnJoin = $('btnRequestToJoinGuild');
    if (btnJoin) {
      btnJoin.addEventListener('click', () => {
        openJoinRequestMessageModal();
      });
    }
  }
  
  if (isLeader) {
    $('btnEditSlogan').addEventListener('click', async () => {
      const newSlogan = prompt("Enter new Guild slogan/motto:", g.description || '');
      if (newSlogan === null) return;
      if (!newSlogan.trim()) {
        alert("Slogan cannot be empty.");
        return;
      }
      try {
        await updateDoc(doc(db, 'teams', g.id), {
          description: newSlogan.trim()
        });
        alert("Guild slogan updated! 🛡️");
      } catch (err) {
        alert("Failed to update slogan: " + err.message);
      }
    });
    
    $('btnEditRequirements').addEventListener('click', async () => {
      const newReq = prompt("Enter new Guild joining requirements:", g.requirements || '');
      if (newReq === null) return;
      if (!newReq.trim()) {
        alert("Requirements cannot be empty.");
        return;
      }
      try {
        await updateDoc(doc(db, 'teams', g.id), {
          requirements: newReq.trim()
        });
        alert("Guild joining requirements updated! 🛡️");
      } catch (err) {
        alert("Failed to update requirements: " + err.message);
      }
    });
  }
  
  if (!isLeader && isMember) {
    $('btnLeaveGuild').addEventListener('click', async () => {
      if (!confirm(`Are you sure you want to leave the guild "${g.name}"?`)) return;
      try {
        await updateDoc(doc(db, 'teams', g.id), {
          members: arrayRemove(userProfile.uid)
        });
        alert(`You successfully left the guild "${g.name}".`);
      } catch (err) {
        alert("Failed to leave guild: " + err.message);
      }
    });
  }
}

function openGuildsModal() {
  if (guestProfile) {
    alert("Please log in or register a profile to access the Guilds & Teams Hub!");
    return;
  }
  $('mGuildSystemModal').classList.remove('hidden');
  listenToGuilds();
}

function openJoinRequestMessageModal() {
  $('joinRequestOptionalMsg').value = '';
  $('mTeamJoinRequestMsgModal').classList.remove('hidden');
}

// Global actions for Mail UI to invoke
window.acceptTeamJoinRequest = async function(mailId, fromUserId, teamId, teamName, buttonEl) {
  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = 'Accepting...';
  }
  try {
    const teamDocRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamDocRef);
    if (!teamSnap.exists()) {
      alert("This team/guild no longer exists.");
      return;
    }
    const teamData = teamSnap.data();
    if (teamData.members && teamData.members.length >= 4) {
      alert("This squad is already full (4 members max)!");
      return;
    }
    
    await updateDoc(teamDocRef, {
      members: arrayUnion(fromUserId)
    });
    
    const mailDocRef = doc(db, 'users', userProfile.uid, 'mails', mailId);
    await updateDoc(mailDocRef, {
      status: "accepted",
      read: true
    });
    
    const fromUserMailsRef = collection(db, 'users', fromUserId, 'mails');
    await addDoc(fromUserMailsRef, {
      type: "team_join_confirm",
      sender: "Guild Admin",
      title: "Guild Request Accepted! 🎉",
      body: `Congratulations! Your request to join the Guild "${teamName}" has been accepted by the Guild Leader.`,
      teamId: teamId,
      teamName: teamName,
      createdAt: serverTimestamp()
    });
    
    alert(`🎉 Successfully accepted! User has been added to "${teamName}".`);
    if (typeof window.renderInboxUI === 'function') window.renderInboxUI();
  } catch (err) {
    alert("Failed to accept join request: " + err.message);
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.textContent = 'Accept';
    }
  }
};

window.declineTeamJoinRequest = async function(mailId, fromUserId, teamId, teamName, buttonEl) {
  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = 'Declining...';
  }
  try {
    const mailDocRef = doc(db, 'users', userProfile.uid, 'mails', mailId);
    await updateDoc(mailDocRef, {
      status: "declined",
      read: true
    });
    
    const fromUserMailsRef = collection(db, 'users', fromUserId, 'mails');
    await addDoc(fromUserMailsRef, {
      type: "team_join_decline",
      sender: "Guild Admin",
      title: "Guild Request Declined",
      body: `We regret to inform you that your request to join the Guild "${teamName}" was declined by the Guild Leader.`,
      teamId: teamId,
      teamName: teamName,
      createdAt: serverTimestamp()
    });
    
    alert("Request declined successfully.");
    if (typeof window.renderInboxUI === 'function') window.renderInboxUI();
  } catch (err) {
    alert("Failed to decline request: " + err.message);
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.textContent = 'Decline';
    }
  }
};

window.joinTournamentViaInvite = async function(mailId, teamId, tournamentId, tournamentName, buttonEl) {
  if (!userProfile) return;
  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = 'Joining...';
  }
  
  try {
    const memberDocRef = doc(db, 'tournament_registrations', tournamentId, 'teamMembers', userProfile.uid);
    await setDoc(memberDocRef, {
      userId: userProfile.uid,
      userName: userProfile.name,
      joinedAt: serverTimestamp()
    });
    
    const mailDocRef = doc(db, 'users', userProfile.uid, 'mails', mailId);
    await updateDoc(mailDocRef, {
      status: "joined",
      read: true
    });
    
    await window.checkAndAwardTeamXP(teamId, tournamentId, userProfile.uid);
    
    alert(`🎉 Successfully joined your Guild squad for the tournament "${tournamentName}"!`);
    if (typeof window.renderInboxUI === 'function') window.renderInboxUI();
  } catch (err) {
    alert("Failed to join tournament: " + err.message);
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.textContent = 'Join Tournament';
    }
  }
};

window.checkAndAwardTeamXP = async function(teamId, tournamentId, joinedUid) {
  const participationRef = doc(db, 'teams', teamId, 'tournamentParticipations', tournamentId);
  const teamRef = doc(db, 'teams', teamId);
  
  try {
    await runTransaction(db, async (transaction) => {
      const partSnap = await transaction.get(participationRef);
      if (!partSnap.exists()) return;
      
      const partData = partSnap.data();
      if (partData.xpAwarded) return;
      
      const joinedList = partData.joinedMembers || [];
      if (!joinedList.includes(joinedUid)) {
        joinedList.push(joinedUid);
      }
      
      const invitedList = partData.invitedMembers || [];
      const allJoined = invitedList.every(uid => joinedList.includes(uid));
      const minSquadMet = (joinedList.length + 1) >= 4;
      
      if ((allJoined || minSquadMet) && !partData.xpAwarded) {
        const teamSnap = await transaction.get(teamRef);
        if (teamSnap.exists()) {
          const teamData = teamSnap.data();
          const currentXp = teamData.xp || 0;
          
          // Determine XP Awarded - Team War gives 100 XP, others give 50 XP
          let xpAwardAmount = 50;
          const tourObj = (toursData || []).find(x => x.id === tournamentId);
          if (tourObj && tourObj.teamType === 'Team War') {
            xpAwardAmount = 100;
          }
          
          const newXp = currentXp + xpAwardAmount;
          const newLevel = Math.floor(newXp / 100) + 1;
          
          transaction.update(teamRef, {
            xp: newXp,
            level: newLevel
          });
          
          transaction.update(participationRef, {
            joinedMembers: joinedList,
            xpAwarded: true
          });
        }
      } else {
        transaction.update(participationRef, {
          joinedMembers: joinedList
        });
      }
    });
  } catch (err) {
    console.error("Error in checkAndAwardTeamXP transaction: ", err);
    throw err;
  }
};

window.openTournamentParticipationById = function(id) {
  const t = toursData.find(x => x.id === id);
  if (t) openTournamentParticipation(t);
};
window.openTournamentRegisterById = function(id) {
  const t = toursData.find(x => x.id === id);
  if (t) handleTourCardClick(t);
};
window.openTournamentLeaderboardById = function(id) {
  const t = toursData.find(x => x.id === id);
  if (t) openTournamentLeaderboard(t);
};

// Bind Guild Event Listeners
const btnHubGuildsEl = $('btnHubGuilds');
if (btnHubGuildsEl) {
  btnHubGuildsEl.addEventListener('click', () => {
    if (typeof window.closeRedReportHubDrawer === 'function') {
      window.closeRedReportHubDrawer();
    }
    openGuildsModal();
  });
}

const bCloseGuildsSystemEl = $('bCloseGuildsSystem');
if (bCloseGuildsSystemEl) {
  bCloseGuildsSystemEl.addEventListener('click', () => {
    if ($('mGuildSystemModal')) $('mGuildSystemModal').classList.add('hidden');
    if (unsubGuilds) {
      unsubGuilds();
      unsubGuilds = null;
    }
  });
}

const guildSearchInputEl = $('guildSearchInput');
if (guildSearchInputEl) {
  guildSearchInputEl.addEventListener('input', () => {
    renderGuildsListUI();
  });
}

const btnCreateGuildTriggerEl = $('btnCreateGuildTrigger');
if (btnCreateGuildTriggerEl) {
  btnCreateGuildTriggerEl.addEventListener('click', () => {
    if (userGuild) {
      alert("You are already in a guild! You must leave your current guild to create a new one.");
      return;
    }
    if ($('cgName')) $('cgName').value = '';
    if ($('cgTag')) $('cgTag').value = '';
    if ($('cgDesc')) $('cgDesc').value = '';
    if ($('cgRequirements')) $('cgRequirements').value = '';
    if ($('mCreateGuild')) $('mCreateGuild').classList.remove('hidden');
  });
}

const bCloseCreateGuildEl = $('bCloseCreateGuild');
if (bCloseCreateGuildEl) {
  bCloseCreateGuildEl.addEventListener('click', () => {
    if ($('mCreateGuild')) $('mCreateGuild').classList.add('hidden');
  });
}

const btnSubmitCreateGuildEl = $('btnSubmitCreateGuild');
if (btnSubmitCreateGuildEl) {
  btnSubmitCreateGuildEl.addEventListener('click', async () => {
    if (!userProfile) {
      alert("You must be logged in to establish a Guild!");
      return;
    }

    if (userGuild) {
      alert("You are already in a guild!");
      return;
    }
    
    const cost = 500;
    const currentBalance = userProfile.balance || 0;
    if (currentBalance < cost) {
      alert(`Insufficient AX Coins! Establishing a Guild costs 500 AX. You currently have ${currentBalance} AX.`);
      return;
    }

    const name = $('cgName') ? $('cgName').value.trim() : '';
    const tag = $('cgTag') ? $('cgTag').value.trim().toUpperCase() : '';
    const logo = $('cgLogo') ? $('cgLogo').value : '';
    const type = $('cgType') ? $('cgType').value : '';
    const desc = $('cgDesc') ? $('cgDesc').value.trim() : '';
    const req = $('cgRequirements') ? $('cgRequirements').value.trim() : '';
    
    if (!name || !tag || !desc || !req) {
      alert("Please fill out all required fields to establish your Guild!");
      return;
    }
    
    if (tag.length > 5) {
      alert("Guild Tag must be maximum 5 characters.");
      return;
    }
    
    btnSubmitCreateGuildEl.disabled = true;
    btnSubmitCreateGuildEl.textContent = 'Establishing...';
    
    try {
      // 1. Create the Guild
      const teamDocRef = await addDoc(collection(db, 'teams'), {
        name,
        tag,
        logoUrl: logo,
        type,
        description: desc,
        requirements: req,
        leaderId: userProfile.uid,
        leaderName: userProfile.name,
        members: [userProfile.uid],
        xp: 0,
        level: 1,
        createdAt: serverTimestamp()
      });

      // 2. Deduct 500 AX coins from profile
      const userDocRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userDocRef, {
        balance: increment(-cost)
      });

      // 3. Log transaction under deposit_requests (ledger)
      const txnId = `GLD-${Math.floor(100000 + Math.random() * 900000)}`;
      await addDoc(collection(db, 'deposit_requests'), {
        userId: userProfile.uid,
        userName: userProfile.name,
        userHandle: userProfile.handle || '',
        userEmail: userProfile.email || '',
        amountPKR: 0,
        amountAX: cost,
        method: 'Guild Establishment',
        txnId: txnId,
        status: 'approved',
        type: 'payment',
        message: `Established Guild "${name}" (-500 AX)`,
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      
      alert(`🎉 Congratulations! Your new Guild "${name}" has been established successfully!\n-500 AX Coins deducted from your wallet.`);
      if ($('mCreateGuild')) $('mCreateGuild').classList.add('hidden');
    } catch (err) {
      alert("Failed to create Guild: " + err.message);
    } finally {
      btnSubmitCreateGuildEl.disabled = false;
      btnSubmitCreateGuildEl.textContent = 'Establish Guild (500 AX)';
    }
  });
}

const btnCancelJoinRequestEl = $('btnCancelJoinRequest');
if (btnCancelJoinRequestEl) {
  btnCancelJoinRequestEl.addEventListener('click', () => {
    if ($('mTeamJoinRequestMsgModal')) $('mTeamJoinRequestMsgModal').classList.add('hidden');
  });
}

const btnSendJoinRequestEl = $('btnSendJoinRequest');
if (btnSendJoinRequestEl) {
  btnSendJoinRequestEl.addEventListener('click', async () => {
    if (!selectedGuild) return;
    const msg = $('joinRequestOptionalMsg') ? $('joinRequestOptionalMsg').value.trim() : '';
    const leaderId = selectedGuild.leaderId;
    if (!leaderId) {
      alert("This guild does not have an active leader.");
      return;
    }
    
    btnSendJoinRequestEl.disabled = true;
    btnSendJoinRequestEl.textContent = 'Sending...';
    
    try {
      const mailsRef = collection(db, 'users', leaderId, 'mails');
      await addDoc(mailsRef, {
        type: "team_join_request",
        sender: "Guild Application",
        title: "New Join Request",
        body: `User @${userProfile.handle} requested to join your Guild "${selectedGuild.name}". Message: "${msg || 'No message'}"`,
        fromUserId: userProfile.uid,
        fromUserName: userProfile.name,
        fromUserHandle: userProfile.handle,
        teamId: selectedGuild.id,
        teamName: selectedGuild.name,
        message: msg,
        status: "pending",
        createdAt: serverTimestamp()
      });
      
      alert("Join request sent to the Guild Leader's Inbox successfully! 🛡️");
      if ($('mTeamJoinRequestMsgModal')) $('mTeamJoinRequestMsgModal').classList.add('hidden');
    } catch (err) {
      alert("Failed to send request: " + err.message);
    } finally {
      btnSendJoinRequestEl.disabled = false;
      btnSendJoinRequestEl.textContent = 'Send Request';
    }
  });
}

const btnSquadInviteNoEl = $('btnSquadInviteNo');
if (btnSquadInviteNoEl) {
  btnSquadInviteNoEl.addEventListener('click', () => {
    if ($('mSquadInvitePromptModal')) $('mSquadInvitePromptModal').classList.add('hidden');
  });
}

const btnSquadInviteYesEl = $('btnSquadInviteYes');
if (btnSquadInviteYesEl) {
  btnSquadInviteYesEl.addEventListener('click', async () => {
    const team = window.activeSquadInviteTeam;
    const tour = window.activeSquadInviteTour;
    if (!team || !tour) return;
    
    btnSquadInviteYesEl.disabled = true;
    btnSquadInviteYesEl.textContent = 'Inviting...';
    
    try {
      const membersToInvite = (team.members || []).filter(uid => uid !== userProfile.uid);
      if (membersToInvite.length === 0) {
        alert("Your guild does not have any other members to invite yet.");
        if ($('mSquadInvitePromptModal')) $('mSquadInvitePromptModal').classList.add('hidden');
        return;
      }
      
      const participationRef = doc(db, 'teams', team.id, 'tournamentParticipations', tour.id);
      await setDoc(participationRef, {
        invitedMembers: membersToInvite,
        joinedMembers: [],
        xpAwarded: false,
        createdAt: serverTimestamp()
      });
      
      for (const memberId of membersToInvite) {
        const mailRef = collection(db, 'users', memberId, 'mails');
        await addDoc(mailRef, {
          type: "tournament_invite",
          sender: "Guild Tournament Squad",
          title: "Squad Tournament Invitation! 🏆",
          body: `Your Guild leader ${userProfile.name} has registered the team for the tournament "${tour.name}". Click the button below to join the squad slot!`,
          tournamentId: tour.id,
          tournamentName: tour.name,
          teamId: team.id,
          status: "pending",
          createdAt: serverTimestamp()
        });
      }
      
      alert(`🎉 Invites successfully sent to your ${membersToInvite.length} Guild members!`);
      if ($('mSquadInvitePromptModal')) $('mSquadInvitePromptModal').classList.add('hidden');
    } catch (err) {
      alert("Failed to send invites: " + err.message);
    } finally {
      btnSquadInviteYesEl.disabled = false;
      btnSquadInviteYesEl.textContent = 'Yes, Invite All!';
    }
  });
}

// ==========================================
// ── ARENAX LAUNCH FEST LOGIC & RENDERING ──
// ==========================================

window.renderLaunchFestUI = function() {};
window.switchEventsSubTab = function() {};

function startLaunchFestTimers() {
  if (launchFestTimersInitialized) return;
  launchFestTimersInitialized = true;

  setInterval(() => {
    // 1. Hero Countdown (Until August 1, 2026 UTC)
    const targetHero = new Date('2026-08-01T00:00:00Z').getTime();
    const now = Date.now();
    const diffHero = targetHero - now;

    if (diffHero > 0) {
      const days = Math.floor(diffHero / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffHero % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diffHero % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffHero % (1000 * 60)) / 1000);

      if ($('cdDays')) $('cdDays').textContent = days.toString().padStart(2, '0');
      if ($('cdHours')) $('cdHours').textContent = hours.toString().padStart(2, '0');
      if ($('cdMinutes')) $('cdMinutes').textContent = mins.toString().padStart(2, '0');
      if ($('cdSeconds')) $('cdSeconds').textContent = secs.toString().padStart(2, '0');
    }

    // 2. Daily Quests Reset Countdown (Until next PKT midnight)
    const pktNow = new Date(Date.now() + (5 * 60 * 60 * 1000));
    const pktMidnight = new Date(pktNow);
    pktMidnight.setUTCHours(24, 0, 0, 0); // next PKT midnight
    const pktDiff = pktMidnight.getTime() - pktNow.getTime();

    if (pktDiff > 0) {
      const h = Math.floor(pktDiff / (1000 * 60 * 60));
      const m = Math.floor((pktDiff % (1000 * 60 * 60)) / (1000 * 60));
      const timerEl = $('dailyTasksResetTimer');
      if (timerEl) {
        timerEl.innerHTML = `<i class="fas fa-clock"></i> Reset in ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
      }
    }

    // 3. Weekly Tournament Countdown (dynamic date/time from the database)
    const getNextSunday8PM_PKT = () => {
      const pktNow = new Date(Date.now() + (5 * 60 * 60 * 1000));
      const nextSunday = new Date(pktNow);
      nextSunday.setUTCDate(pktNow.getUTCDate() + (7 - pktNow.getUTCDay()) % 7);
      nextSunday.setUTCHours(20, 0, 0, 0); // 8:00 PM PKT
      if (nextSunday.getTime() <= pktNow.getTime()) {
        nextSunday.setUTCDate(nextSunday.getUTCDate() + 7);
      }
      return new Date(nextSunday.getTime() - (5 * 60 * 60 * 1000));
    };

    const targetSunday = getNextSunday8PM_PKT().getTime();
    const diffSunday = targetSunday - Date.now();

    if (diffSunday > 0) {
      const days = Math.floor(diffSunday / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffSunday % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diffSunday % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffSunday % (1000 * 60)) / 1000);

      const cdText = `${days > 0 ? days + 'd ' : ''}${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
      if ($('weeklyTourCountdown')) {
        $('weeklyTourCountdown').innerHTML = `<i class="fas fa-hourglass-half"></i> ${cdText}`;
      }
    } else {
      if ($('weeklyTourCountdown')) {
        $('weeklyTourCountdown').innerHTML = `<i class="fas fa-play text-green animate-pulse"></i> Live Now`;
      }
    }
  }, 1000);
}

function listenToLaunchFestLeaderboard() {
  if (window.unsubLaunchFestLeaderboard) return;
  const qLeaders = query(collection(db, 'users'), orderBy('balance', 'desc'), limit(3));
  window.unsubLaunchFestLeaderboard = onSnapshot(qLeaders, (snapshot) => {
    topPlayersList = [];
    snapshot.forEach(doc => {
      topPlayersList.push({ uid: doc.id, ...doc.data() });
    });
    renderLeaderboardPodium();
  }, (err) => {
    console.error("Error reading leaders:", err);
  });
}

function listenToReferralsCount() {
  const currentUser = auth.currentUser;
  const uid = currentUser ? currentUser.uid : (userProfile ? (userProfile.uid || userProfile.id) : null);
  if (!uid) return;
  
  if (window.unsubReferrals) return;
  const qRefs = query(collection(db, 'referrals'), where('referredBy', '==', uid));
  window.unsubReferrals = onSnapshot(qRefs, (snapshot) => {
    referralCount = snapshot.size;
    renderReferralsSection();
  }, (err) => {
    console.error("Error reading referrals:", err);
  });
}

function renderLeaderboardPodium() {
  const players = topPlayersList || [];
  if (players.length >= 1) {
    const p1 = players[0];
    if ($('podium1Av')) {
      $('podium1Av').src = p1.av || 'https://api.dicebear.com/7.x/bottts/svg?seed=ax1';
      if (p1.uid || p1.id) {
        $('podium1Av').onclick = () => window.openPlayerProfileCard(p1.uid || p1.id);
        $('podium1Av').style.cursor = 'pointer';
      }
    }
    if ($('podium1Name')) {
      $('podium1Name').innerHTML = `${p1.name || 'Player 1'}${window.getBlueTickBadgeHtml(p1)}`;
      if (p1.uid || p1.id) {
        $('podium1Name').onclick = () => window.openPlayerProfileCard(p1.uid || p1.id);
        $('podium1Name').style.cursor = 'pointer';
      }
    }
    if ($('podium1Bal')) $('podium1Bal').textContent = (p1.balance || 0).toLocaleString() + ' AX';
  }
  if (players.length >= 2) {
    const p2 = players[1];
    if ($('podium2Av')) {
      $('podium2Av').src = p2.av || 'https://api.dicebear.com/7.x/bottts/svg?seed=ax2';
      if (p2.uid || p2.id) {
        $('podium2Av').onclick = () => window.openPlayerProfileCard(p2.uid || p2.id);
        $('podium2Av').style.cursor = 'pointer';
      }
    }
    if ($('podium2Name')) {
      $('podium2Name').innerHTML = `${p2.name || 'Player 2'}${window.getBlueTickBadgeHtml(p2)}`;
      if (p2.uid || p2.id) {
        $('podium2Name').onclick = () => window.openPlayerProfileCard(p2.uid || p2.id);
        $('podium2Name').style.cursor = 'pointer';
      }
    }
    if ($('podium2Bal')) $('podium2Bal').textContent = (p2.balance || 0).toLocaleString() + ' AX';
  }
  if (players.length >= 3) {
    const p3 = players[2];
    if ($('podium3Av')) {
      $('podium3Av').src = p3.av || 'https://api.dicebear.com/7.x/bottts/svg?seed=ax3';
      if (p3.uid || p3.id) {
        $('podium3Av').onclick = () => window.openPlayerProfileCard(p3.uid || p3.id);
        $('podium3Av').style.cursor = 'pointer';
      }
    }
    if ($('podium3Name')) {
      $('podium3Name').innerHTML = `${p3.name || 'Player 3'}${window.getBlueTickBadgeHtml(p3)}`;
      if (p3.uid || p3.id) {
        $('podium3Name').onclick = () => window.openPlayerProfileCard(p3.uid || p3.id);
        $('podium3Name').style.cursor = 'pointer';
      }
    }
    if ($('podium3Bal')) $('podium3Bal').textContent = (p3.balance || 0).toLocaleString() + ' AX';
  }
}

function renderReferralsSection() {
  if (!userProfile) return;
  
  if ($('refCodeText')) {
    $('refCodeText').textContent = userProfile.uid.slice(0, 8).toUpperCase();
  }
  
  if ($('referralStatsText')) {
    $('referralStatsText').textContent = `Referred ${referralCount} friend${referralCount !== 1 ? 's' : ''}`;
  }
  
  if ($('refEarnedAX')) {
    $('refEarnedAX').textContent = (referralCount * 20).toLocaleString() + ' AX';
  }
}

async function renderLaunchFestUI() {
  if (!userProfile) return;

  // Swap skeleton for real content
  if ($('festSkeleton')) $('festSkeleton').classList.add('hidden');
  if ($('festContent')) $('festContent').classList.remove('hidden');

  // Load countdown timers, listeners
  startLaunchFestTimers();
  listenToReferralsCount();
  listenToLaunchFestLeaderboard();

  // 1. Daily Login Streak section
  const todayStr = new Date(Date.now() + (5 * 60 * 60 * 1000)).toISOString().split('T')[0];
  const lastClaim = userProfile.lastClaimDate || '';
  let streak = userProfile.loginStreak || 0;
  
  // Verify if streak has been broken
  if (lastClaim) {
    const lastClaimDateObj = new Date(lastClaim);
    const todayDateObj = new Date(todayStr);
    const diffTime = Math.abs(todayDateObj - lastClaimDateObj);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 1 && lastClaim !== todayStr) {
      streak = 0;
    }
  }

  const isTodayClaimed = (lastClaim === todayStr);
  const currentDayIndex = isTodayClaimed ? (streak - 1) % 7 : streak % 7;

  if ($('currentStreakBadge')) {
    $('currentStreakBadge').textContent = `Streak: ${streak} Day${streak !== 1 ? 's' : ''}`;
  }

  const streakDaysContainer = $('festStreakDays');
  if (streakDaysContainer) {
    streakDaysContainer.innerHTML = '';
    const rewards = [10, 15, 20, 25, 30, 35, 50];

    for (let i = 0; i < 7; i++) {
      let cardClass = 'flex-shrink-0 w-16 p-2 bg-card border rounded-xl flex flex-col items-center justify-center text-center space-y-1 snap-center transition duration-250';
      let iconHtml = `<i class="fas fa-coins text-gold/80 text-xs"></i>`;
      let statusHtml = `<span class="text-[7px] text-t3 uppercase font-black font-mono">Day ${i + 1}</span>`;

      if (i < currentDayIndex || (i === currentDayIndex && isTodayClaimed)) {
        // Claimed Day
        cardClass += ' border-green/30 bg-green-500/5 text-green-400';
        iconHtml = `<i class="fas fa-check-circle text-green text-sm"></i>`;
        statusHtml = `<span class="text-[7px] text-green uppercase font-black font-mono">Claimed</span>`;
      } else if (i === currentDayIndex && !isTodayClaimed) {
        // Today Active Unclaimed
        cardClass += ' border-gold bg-gold/10 text-white shadow-[0_0_12px_rgba(240,192,64,0.1)] ring-1 ring-gold/20 scale-[1.03]';
        iconHtml = `<i class="fas fa-gift text-gold text-sm animate-bounce"></i>`;
        statusHtml = `<span class="text-[7px] text-gold uppercase font-black font-mono">Claim Today</span>`;
      } else {
        // Locked / Upcoming Day
        cardClass += ' border-bdr/35 opacity-45 text-t3';
        statusHtml = `<span class="text-[7px] text-t3 uppercase font-black font-mono">Day ${i + 1}</span>`;
      }

      if (i === 6) {
        // Day 7 Special Badge reward icon
        iconHtml = `<i class="fas fa-award text-red text-sm animate-pulse"></i>`;
      }

      const dayCard = document.createElement('div');
      dayCard.className = cardClass;
      dayCard.innerHTML = `
        ${statusHtml}
        <div class="h-6 flex items-center justify-center">
          ${iconHtml}
        </div>
        <div class="text-[9px] font-black text-white font-mono leading-none">${rewards[i]} AX</div>
        ${i === 6 ? '<span class="text-[6px] text-red uppercase font-black block leading-none">BADGE</span>' : ''}
      `;
      streakDaysContainer.appendChild(dayCard);
    }
  }

  const btnClaimDaily = $('btnClaimDailyLogin');
  if (btnClaimDaily) {
    if (isTodayClaimed) {
      btnClaimDaily.disabled = true;
      btnClaimDaily.className = "w-full py-2.5 bg-bdr/20 text-t3 text-xs font-black uppercase tracking-wide rounded-xl opacity-65 flex items-center justify-center gap-1.5 cursor-not-allowed";
      btnClaimDaily.innerHTML = `<i class="fas fa-check-circle text-green-500"></i> Already Claimed Today`;
    } else {
      btnClaimDaily.disabled = false;
      btnClaimDaily.className = "w-full py-2.5 bg-gold hover:bg-[#e8b830] text-bg text-xs font-black uppercase tracking-wide rounded-xl transition-all duration-200 transform hover:scale-[1.01] active:scale-95 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer";
      btnClaimDaily.innerHTML = `<i class="fas fa-gift animate-pulse"></i> Claim Today's Reward`;
    }
  }

  // 2. Welcome Pack section (30 days since registration limit)
  const joinedDate = userProfile.createdAt ? new Date(userProfile.createdAt) : new Date();
  const daysDiff = (new Date() - joinedDate) / (1000 * 60 * 60 * 24);
  const showWelcomeBonus = daysDiff <= 30;

  const secWelcome = $('secWelcomeBonus');
  if (secWelcome) {
    if (showWelcomeBonus) {
      secWelcome.classList.remove('hidden');
      
      const welcomeBonus = userProfile.welcomeBonus || {};
      const welcomeClaims = userProfile.welcomeBonusClaims || {};

      // Check tasks logic
      const isProfileDone = !!(
        (userProfile.name && userProfile.name !== (userProfile.email ? userProfile.email.split('@')[0] : 'ArenaX Player')) ||
        userProfile.bio ||
        userProfile.country ||
        userProfile.favoriteGame ||
        (userProfile.av && !userProfile.av.includes(userProfile.uid))
      );

      const hasJoinedTour = !!(userProfile.hasSubmittedRegistration || (userRegs && Object.keys(userRegs).length > 0));
      const isTourDone = hasJoinedTour;
      const isChatDone = !!welcomeBonus.chat;

      // Automatically update completion flags in Firestore if true and not set
      if (isProfileDone && !welcomeBonus.profile) {
        updateDoc(doc(db, 'users', userProfile.uid), { 'welcomeBonus.profile': true }).catch(e => console.warn(e));
      }
      if (isTourDone && !welcomeBonus.tournament) {
        updateDoc(doc(db, 'users', userProfile.uid), { 'welcomeBonus.tournament': true }).catch(e => console.warn(e));
      }

      const tasks = [
        { id: 'profile', name: "Complete profile credentials", reward: 20, done: isProfileDone, claimed: !!welcomeClaims.profile, desc: "Add Country, Favorite Game, Bio, or customize your Display Name." },
        { id: 'tournament', name: "Join any dynamic tournament", reward: 30, done: isTourDone, claimed: !!welcomeClaims.tournament, desc: "Submit dynamic registration hold on any active league." },
        { id: 'chat', name: "Send message in Global Chat", reward: 10, done: isChatDone, claimed: !!welcomeClaims.chat, desc: "Drop a friendly hello message to the global feed tab." }
      ];

      let completedCount = 0;
      tasks.forEach(t => { if (t.done) completedCount++; });

      const pct = Math.round((completedCount / 3) * 100);
      if ($('welcomeBonusProgressText')) $('welcomeBonusProgressText').textContent = `${completedCount}/3 Completed`;
      if ($('welcomeBonusProgressBar')) $('welcomeBonusProgressBar').style.width = `${pct}%`;

      const tContainer = $('welcomeBonusTasksContainer');
      if (tContainer) {
        tContainer.innerHTML = '';
        tasks.forEach(t => {
          const item = document.createElement('div');
          item.className = "flex items-center justify-between p-3 bg-card/60 border border-bdr/40 rounded-xl relative overflow-hidden";
          
          let btnClass = "";
          let btnText = "";
          let btnDisabled = false;

          if (t.claimed) {
            btnClass = "px-2.5 py-1 bg-green-500/10 border border-green-500/15 text-green text-[9px] font-black uppercase rounded-lg cursor-not-allowed";
            btnText = "Claimed ✓";
            btnDisabled = true;
          } else if (t.done) {
            btnClass = "px-3 py-1 bg-purple text-white text-[9px] font-black uppercase rounded-lg hover:scale-[1.02] active:scale-95 transition cursor-pointer";
            btnText = `Claim ${t.reward} AX`;
          } else {
            btnClass = "px-2.5 py-1 bg-bdr/20 text-t3 text-[9px] font-black uppercase rounded-lg cursor-not-allowed";
            btnText = "Incomplete";
            btnDisabled = true;
          }

          item.innerHTML = `
            <div class="space-y-0.5 flex-1 pr-3">
              <div class="flex items-center gap-1.5">
                <span class="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${t.done ? 'bg-green-500/20 text-green-400' : 'bg-purple/10 text-purple'}">
                  <i class="fas ${t.done ? 'fa-check-circle' : 'fa-circle-notch animate-spin'}"></i>
                </span>
                <span class="text-[10px] font-black text-white leading-none">${t.name}</span>
                <span class="text-[8px] font-bold text-gold font-mono leading-none">+${t.reward} AX</span>
              </div>
              <p class="text-[8px] text-t3 pl-5 max-w-xs leading-normal">${t.desc}</p>
            </div>
            <button id="btnWelcomeClaim-${t.id}" class="${btnClass}" ${btnDisabled ? 'disabled' : ''}>${btnText}</button>
          `;

          tContainer.appendChild(item);

          if (t.done && !t.claimed) {
            $(`btnWelcomeClaim-${t.id}`).addEventListener('click', async () => {
              try {
                $(`btnWelcomeClaim-${t.id}`).disabled = true;
                await updateDoc(doc(db, 'users', userProfile.uid), {
                  balance: increment(t.reward),
                  [`welcomeBonusClaims.${t.id}`]: true
                });
                spawnConfetti(['#a855f7', '#ec4899', '#f0c040']);
                showToastNotification("Reward Claimed! 🎁", `You received +${t.reward} AX Coins for completing task!`);
              } catch (e) {
                alert("Claim failed: " + e.message);
              }
            });
          }
        });
      }

      // Pioneer Grand Prize Claim
      const grandClaim = $('welcomeAllClaimContainer');
      if (grandClaim) {
        const allTasksClaimed = tasks.every(t => t.claimed);
        const grandClaimed = !!welcomeClaims.all;

        if (allTasksClaimed) {
          grandClaim.classList.remove('hidden');
          const btnGrand = $('btnClaimPioneer');
          if (btnGrand) {
            if (grandClaimed) {
              btnGrand.disabled = true;
              btnGrand.className = "w-full py-3 bg-bdr/20 text-t3 text-xs font-black uppercase tracking-wider rounded-xl cursor-not-allowed opacity-65 flex items-center justify-center gap-2";
              btnGrand.innerHTML = `<i class="fas fa-check-circle text-green-500"></i> Pioneer Welcome Pack Claimed`;
            } else {
              btnGrand.disabled = false;
              btnGrand.className = "w-full py-3 bg-gradient-to-r from-purple via-[#d946ef] to-[#ec4899] hover:opacity-90 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 shadow-xl flex items-center justify-center gap-2 cursor-pointer";
              btnGrand.innerHTML = `<i class="fas fa-rocket animate-pulse"></i> Claim Pioneer Pack (+20 AX & Pioneer Badge)`;
            }
          }
        } else {
          grandClaim.classList.add('hidden');
        }
      }
    } else {
      secWelcome.classList.add('hidden');
    }
  }

  // 3. Daily Quests Section
  const dailyTasks = userProfile.dailyTasks || {};
  if (dailyTasks.date !== todayStr) {
    // Force immediate daily tasks reset for new day
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        balance: increment(10), // auto claim login
        dailyTasks: {
          date: todayStr,
          chat: false,
          visit: true, // currently on tournaments page
          game: false,
          login: true,
          chatClaimed: false,
          visitClaimed: false,
          gameClaimed: false,
          loginClaimed: true
        }
      });
      showToastNotification("Daily Tasks Reset! ⚡", "A new day has arrived. Your quests have reset & login task auto-claimed (+10 AX)!");
      spawnConfetti(['#3ddc84', '#f0c040']);
    } catch(e) {
      console.warn("Daily quests auto-reset failed:", e);
    }
    return;
  }

  const quests = [
    { id: 'login', name: "Check-in & Login today", reward: 10, done: !!dailyTasks.login, claimed: !!dailyTasks.loginClaimed, actionLabel: "Logged In", triggerAction: null },
    { id: 'chat', name: "Send message in Global Chat", reward: 10, done: !!dailyTasks.chat, claimed: !!dailyTasks.chatClaimed, actionLabel: "Go to Chat", triggerAction: () => switchTab('Chat') },
    { id: 'visit', name: "Visit Live Tournaments tab", reward: 10, done: !!dailyTasks.visit, claimed: !!dailyTasks.visitClaimed, actionLabel: "Go to Tours", triggerAction: () => switchTab('Tour') },
    { id: 'game', name: "Play AX Lucky Mini Game", reward: 20, done: !!dailyTasks.game, claimed: !!dailyTasks.gameClaimed, actionLabel: "Play Wheel", triggerAction: () => $('miniGameCard').classList.remove('hidden') }
  ];

  const qContainer = $('dailyTasksContainer');
  if (qContainer) {
    qContainer.innerHTML = '';
    quests.forEach(q => {
      const el = document.createElement('div');
      el.className = "flex items-center justify-between p-3 bg-card/60 border border-bdr/45 rounded-xl";
      
      let btnClass = "";
      let btnText = "";
      let btnDisabled = false;

      if (q.claimed) {
        btnClass = "px-2.5 py-1 bg-green-500/10 border border-green-500/15 text-green text-[9px] font-black uppercase rounded-lg cursor-not-allowed";
        btnText = "Claimed ✓";
        btnDisabled = true;
      } else if (q.done) {
        btnClass = "px-3 py-1 bg-green text-bg text-[9px] font-black uppercase rounded-lg hover:scale-[1.02] active:scale-95 transition cursor-pointer";
        btnText = `Claim ${q.reward} AX`;
      } else {
        btnClass = "px-2.5 py-1 bg-gold/10 border border-gold/20 text-gold text-[9px] font-black uppercase rounded-lg hover:bg-gold/15 transition cursor-pointer";
        btnText = q.actionLabel;
      }

      el.innerHTML = `
        <div class="space-y-0.5">
          <div class="flex items-center gap-1.5">
            <span class="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${q.done ? 'bg-green-500/20 text-green-400' : 'bg-green-500/5 text-t3'}">
              <i class="fas ${q.done ? 'fa-check-circle' : 'fa-clock'}"></i>
            </span>
            <span class="text-[10px] font-black text-white leading-none">${q.name}</span>
          </div>
          <span class="text-[8px] font-bold text-gold font-mono leading-none pl-5">+${q.reward} AX Rewards</span>
        </div>
        <button id="btnDailyQuest-${q.id}" class="${btnClass}" ${btnDisabled ? 'disabled' : ''}>${btnText}</button>
      `;
      qContainer.appendChild(el);

      const btnQ = $(`btnDailyQuest-${q.id}`);
      if (btnQ) {
        if (q.done && !q.claimed) {
          btnQ.addEventListener('click', async () => {
            try {
              btnQ.disabled = true;
              await updateDoc(doc(db, 'users', userProfile.uid), {
                balance: increment(q.reward),
                [`dailyTasks.${q.id}Claimed`]: true
              });
              spawnConfetti(['#3ddc84', '#f0c040']);
              showToastNotification("Quest Reward! ⚡", `You claimed +${q.reward} AX Coins!`);
            } catch(e) {
              alert("Quest claim error: " + e.message);
            }
          });
        } else if (!q.done && q.triggerAction) {
          btnQ.addEventListener('click', q.triggerAction);
        }
      }
    });
  }

  // 4. Weekly Tournament Registration
  const btnWeekly = $('btnRegisterWeeklyTour');
  const weeklyFreeTour = (toursData || []).find(t => t.isWeeklyFree === true);

  if (weeklyFreeTour) {
    if ($('secWeeklyTour')) {
      $('secWeeklyTour').classList.remove('hidden');
    }
    if ($('festWeeklyTourSlots')) {
      $('festWeeklyTourSlots').textContent = `${weeklyFreeTour.registered || 0}/${weeklyFreeTour.maxPlayers || 32} Players`;
    }
    if ($('festWeeklyTourName')) {
      $('festWeeklyTourName').innerHTML = `<i class="fas fa-trophy text-gold"></i> ${weeklyFreeTour.name}`;
    }
    if ($('festWeeklyTourTime')) {
      $('festWeeklyTourTime').textContent = `${weeklyFreeTour.date} @ ${weeklyFreeTour.time} — Entry: ${weeklyFreeTour.entryFee || 'Free'}`;
    }

    if (btnWeekly) {
      const reg = userRegs && userRegs[weeklyFreeTour.id];
      if (reg) {
        if (reg.status === 'approved') {
          btnWeekly.disabled = true;
          btnWeekly.className = "w-full py-2.5 bg-green-500/10 border border-green-500/20 text-green text-xs font-black uppercase tracking-wide rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5";
          btnWeekly.innerHTML = `<i class="fas fa-check-circle"></i> Registered ✓`;
        } else if (reg.status === 'pending') {
          btnWeekly.disabled = true;
          btnWeekly.className = "w-full py-2.5 bg-gold/10 border border-gold/20 text-gold text-xs font-black uppercase tracking-wide rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5";
          btnWeekly.innerHTML = `<i class="fas fa-hourglass-half"></i> Verification Pending...`;
        } else if (reg.status === 'rejected') {
          btnWeekly.disabled = false;
          btnWeekly.className = "w-full py-2.5 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white text-xs font-black uppercase tracking-wide rounded-xl transition shadow-lg shadow-pink-500/10 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-95";
          btnWeekly.innerHTML = `<i class="fas fa-exclamation-circle"></i> Registration Rejected (Re-apply)`;
        }
      } else {
        btnWeekly.disabled = false;
        btnWeekly.className = "w-full py-2.5 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white text-xs font-black uppercase tracking-wide rounded-xl transition shadow-lg shadow-pink-500/10 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-95";
        btnWeekly.innerHTML = `<i class="fas fa-check-circle"></i> Register Now`;
      }
    }
  } else {
    if ($('secWeeklyTour')) {
      $('secWeeklyTour').classList.add('hidden');
    }
  }
}

// Bind Daily Login Claims
if ($('btnClaimDailyLogin')) {
  $('btnClaimDailyLogin').addEventListener('click', async () => {
    if (!userProfile) return;
    const btn = $('btnClaimDailyLogin');
    btn.disabled = true;

    try {
      const todayStr = new Date(Date.now() + (5 * 60 * 60 * 1000)).toISOString().split('T')[0];
      const rewards = [10, 15, 20, 25, 30, 35, 50];
      
      let streak = userProfile.loginStreak || 0;
      const lastClaim = userProfile.lastClaimDate || '';

      // Check if missed days
      if (lastClaim) {
        const lastClaimDateObj = new Date(lastClaim);
        const todayDateObj = new Date(todayStr);
        const diffTime = Math.abs(todayDateObj - lastClaimDateObj);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 1 && lastClaim !== todayStr) {
          streak = 0;
        }
      }

      if (lastClaim === todayStr) {
        alert("You have already claimed today's login reward!");
        return;
      }

      const currentDayIndex = streak % 7;
      const currentReward = rewards[currentDayIndex];
      const newStreak = streak + 1;

      const updates = {
        balance: increment(currentReward),
        loginStreak: newStreak,
        lastClaimDate: todayStr
      };

      // Add badge if completed 7-day streak
      if (newStreak % 7 === 0) {
        updates.badges = arrayUnion('launch_fest_badge');
      }

      await updateDoc(doc(db, 'users', userProfile.uid), updates);
      
      spawnConfetti(['#f0c040', '#e8404a', '#3ddc84']);
      showToastNotification("Reward Claimed! 🏆", `streak: +${currentReward} AX Coins credited to wallet!`);
      
      if (newStreak % 7 === 0) {
        showToastNotification("Badge Earned! 🎖️", "You received the 'Launch Fest Badge' for completing 7 day login streak!");
      }

    } catch (e) {
      alert("Daily login claim failed: " + e.message);
      btn.disabled = false;
    }
  });
}

// Bind Grand Pioneer Pack Claim
if ($('btnClaimPioneer')) {
  $('btnClaimPioneer').addEventListener('click', async () => {
    if (!userProfile) return;
    const btn = $('btnClaimPioneer');
    btn.disabled = true;

    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        balance: increment(20),
        badges: arrayUnion('pioneer_badge'),
        'welcomeBonusClaims.all': true
      });
      spawnConfetti(['#a855f7', '#ec4899', '#f0c040']);
      showToastNotification("Grand Prize Unlocked! 🚀", "You received +20 AX and the prestigious 'Pioneer Badge'!");
    } catch(e) {
      alert("Claim failed: " + e.message);
      btn.disabled = false;
    }
  });
}

// Bind Weekly Tournament Registration Button
if ($('btnRegisterWeeklyTour')) {
  $('btnRegisterWeeklyTour').addEventListener('click', async () => {
    if (!userProfile) return;
    const btn = $('btnRegisterWeeklyTour');

    const weeklyFreeTour = (toursData || []).find(t => t.isWeeklyFree === true);
    if (weeklyFreeTour) {
      handleTourCardClick(weeklyFreeTour);
    } else {
      btn.disabled = true;
      try {
        await updateDoc(doc(db, 'users', userProfile.uid), {
          weeklyTourRegistered: true
        });
        spawnConfetti(['#e8404a', '#f0c040']);
        showToastNotification("Successfully Registered! 🏆", "You're in! Join Weekly Free Tournament this Sunday at 8:00 PM PKT!");
      } catch (e) {
        alert("Failed to register: " + e.message);
        btn.disabled = false;
      }
    }
  });
}

// Interactive Spin Mini Game Buttons & Spins
if ($('btnSpinFree')) {
  $('btnSpinFree').addEventListener('click', () => triggerLuckySpin(true));
}
if ($('btnSpinPaid')) {
  $('btnSpinPaid').addEventListener('click', () => triggerLuckySpin(false));
}
if ($('btnCloseMiniGame')) {
  $('btnCloseMiniGame').addEventListener('click', () => {
    $('miniGameCard').classList.add('hidden');
  });
}

async function triggerLuckySpin(isFree) {
  if (isWheelSpinning || !userProfile) return;
  
  if (!isFree && (userProfile.balance || 0) < 10) {
    alert("Insufficient balance! You need 10 AX to spin the lucky wheel.");
    return;
  }

  isWheelSpinning = true;
  const btnFree = $('btnSpinFree');
  const btnPaid = $('btnSpinPaid');
  if (btnFree) btnFree.disabled = true;
  if (btnPaid) btnPaid.disabled = true;

  const prizes = [10, 15, 20, 25, 30, 50];
  const landingIndex = Math.floor(Math.random() * prizes.length);
  const selectedPrize = prizes[landingIndex];
  const landingAngle = (landingIndex * 60) + 30; // 6 slices

  const spinner = $('wheelSpinner');
  if (spinner) {
    spinner.style.transition = 'transform 3.5s cubic-bezier(0.25, 0.1, 0.1, 1)';
    spinner.style.transform = `rotate(${3600 + landingAngle}deg)`;
  }

  const pText = $('wheelPrizeText');
  if (pText) pText.textContent = "SPINNING...";

  setTimeout(async () => {
    try {
      if (pText) pText.textContent = `${selectedPrize} AX`;
      
      const userRef = doc(db, 'users', userProfile.uid);
      const todayStr = new Date(Date.now() + (5 * 60 * 60 * 1000)).toISOString().split('T')[0];
      
      const cost = isFree ? 0 : 10;
      const netGain = selectedPrize - cost;

      await updateDoc(userRef, {
        balance: increment(netGain),
        'dailyTasks.date': todayStr,
        'dailyTasks.game': true
      });

      spawnConfetti(['#f0c040', '#3ddc84', '#ff4500']);
      showToastNotification("You Won! 🎡", `Congratulations! You received +${selectedPrize} AX Coins from Lucky Wheel!`);
      
    } catch(e) {
      alert("Spin payout failed: " + e.message);
    } finally {
      isWheelSpinning = false;
      if (btnFree) btnFree.disabled = false;
      if (btnPaid) btnPaid.disabled = false;
    }
  }, 3600);
}

// Copy Referral Link & share
if ($('btnCopyRefLink')) {
  $('btnCopyRefLink').addEventListener('click', () => {
    if (!userProfile) return;
    const refLink = window.location.origin + window.location.pathname + '?ref=' + userProfile.uid.slice(0, 8).toUpperCase();
    navigator.clipboard.writeText(refLink)
      .then(() => {
        showToastNotification("Copied! 📋", "Your referral invite link has been copied to your clipboard!");
      })
      .catch(() => {
        alert("Referral Link: " + refLink);
      });
  });
}

if ($('btnShareWhatsApp')) {
  $('btnShareWhatsApp').addEventListener('click', () => {
    if (!userProfile) return;
    const refLink = window.location.origin + window.location.pathname + '?ref=' + userProfile.uid.slice(0, 8).toUpperCase();
    const msg = encodeURIComponent(`🎮 Join ArenaX Gaming platform & play free tournaments to win real coin rewards! Sign up now using my referral link to get 50 AX Coins: ${refLink}`);
    window.open(`https://api.whatsapp.com/send?text=${msg}`);
  });
}

if ($('btnViewFullLeaderboard')) {
  $('btnViewFullLeaderboard').addEventListener('click', () => {
    showToastNotification("Full Leaderboard 👑", "The full leaderboard will be revealed after Launch Fest ends on August 1st!");
  });
}

window.renderLaunchFestUI = function() {};

