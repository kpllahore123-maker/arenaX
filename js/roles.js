// ==========================================
// ARENAX ESPORTS ROLE SYSTEM & RECRUITMENT
// ==========================================

export const ROLES_DATA = {
  rusher: {
    id: 'rusher',
    name: 'Rusher',
    icon: 'fas fa-bolt',
    emoji: '⚡',
    desc: 'Aggressive frontline attacker',
    accentColor: '#f0c040',
    borderClass: 'border-amber-500/40 hover:border-gold',
    bgClass: 'bg-amber-500/10 hover:bg-amber-500/20',
    tagClass: 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper',
    icon: 'fas fa-crosshairs',
    emoji: '🎯',
    desc: 'Long-range precision player',
    accentColor: '#38bdf8',
    borderClass: 'border-sky-500/40 hover:border-sky-400',
    bgClass: 'bg-sky-500/10 hover:bg-sky-500/20',
    tagClass: 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
  },
  boomer: {
    id: 'boomer',
    name: 'Boomer',
    icon: 'fas fa-bomb',
    emoji: '💣',
    desc: 'Explosive area damage specialist',
    accentColor: '#f97316',
    borderClass: 'border-orange-500/40 hover:border-orange-400',
    bgClass: 'bg-orange-500/10 hover:bg-orange-500/20',
    tagClass: 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
  },
  supporter: {
    id: 'supporter',
    name: 'Supporter',
    icon: 'fas fa-shield-heart',
    emoji: '🛡️',
    desc: 'Team healer/buffer',
    accentColor: '#10b981',
    borderClass: 'border-emerald-500/40 hover:border-emerald-400',
    bgClass: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    tagClass: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
  }
};

export const ALL_ROLE_KEYS = ['rusher', 'sniper', 'boomer', 'supporter'];

let roleSelectionFromSettings = false;
let pendingRoleKey = null;
let currentRecruitTeamId = null;
let currentRecruitMissingRoles = [];
let recruitPlayersCache = [];

// Helper to get element
const $ = (id) => document.getElementById(id);

// Get role object safely
window.getRoleInfo = function(roleKey) {
  if (!roleKey) return null;
  const key = String(roleKey).toLowerCase().trim();
  return ROLES_DATA[key] || null;
};

// Generate high-contrast ArenaX Gold badge HTML for a given role
window.getRoleBadgeHtml = function(roleKey, extraClasses = '') {
  const role = window.getRoleInfo(roleKey);
  if (!role) return '';
  return `
    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gold/15 text-gold border border-gold/40 shadow-sm ${extraClasses}">
      <i class="${role.icon} text-[10px] text-gold"></i>
      <span>${role.name}</span>
    </span>
  `;
};

// Update profile role badges across the UI
window.updateProfileRoleBadges = function(profile) {
  const user = profile || window.userProfile;
  if (!user) return;
  const roleKey = user.playerRole;
  const role = window.getRoleInfo(roleKey);

  // Profile Card Role Badge (next to name or in badges row)
  const pRoleBadge = $('pRoleBadge');
  if (pRoleBadge) {
    if (role) {
      pRoleBadge.innerHTML = `<i class="${role.icon} text-gold mr-1 text-[9px]"></i>${role.name}`;
      pRoleBadge.className = 'px-2 py-0.5 text-[9px] font-black bg-gold/15 text-gold rounded-full border border-gold/40 uppercase inline-flex items-center gap-1 shadow-sm';
      pRoleBadge.classList.remove('hidden');
    } else {
      pRoleBadge.classList.add('hidden');
    }
  }

  // Profile Card AX Creator Badge
  const pAXCreatorBadge = $('pAXCreatorBadge');
  if (pAXCreatorBadge) {
    if (user.isAXCreator === true) {
      pAXCreatorBadge.classList.remove('hidden');
      pAXCreatorBadge.classList.add('inline-flex');
    } else {
      pAXCreatorBadge.classList.add('hidden');
      pAXCreatorBadge.classList.remove('inline-flex');
    }
  }

  // Settings Menu Role Indicator
  const badgeSettingsRole = $('badgeSettingsRole');
  const icoSettingsRole = $('icoSettingsRole');
  const lblSettingsRoleSubtitle = $('lblSettingsRoleSubtitle');
  if (badgeSettingsRole) {
    if (role) {
      badgeSettingsRole.textContent = role.name;
      badgeSettingsRole.className = 'text-[9px] bg-gold/20 text-gold border border-gold/30 px-2 py-0.5 rounded-full font-bold uppercase';
    } else {
      badgeSettingsRole.textContent = 'Not Set';
      badgeSettingsRole.className = 'text-[9px] bg-white/10 text-t3 border border-white/10 px-2 py-0.5 rounded-full font-bold uppercase';
    }
  }
  if (icoSettingsRole && role) {
    icoSettingsRole.className = role.icon;
  }
  if (lblSettingsRoleSubtitle && role) {
    lblSettingsRoleSubtitle.textContent = `${role.name} • ${role.desc}`;
  }
};

// Calculate team role composition & missing roles
window.calculateTeamRoles = function(membersData) {
  const filledRoles = [];
  const counts = { rusher: 0, sniper: 0, boomer: 0, supporter: 0 };

  if (Array.isArray(membersData)) {
    membersData.forEach(m => {
      if (m && m.playerRole) {
        const rKey = String(m.playerRole).toLowerCase().trim();
        if (ALL_ROLE_KEYS.includes(rKey)) {
          if (!filledRoles.includes(rKey)) filledRoles.push(rKey);
          counts[rKey] = (counts[rKey] || 0) + 1;
        }
      }
    });
  }

  const missingRoles = ALL_ROLE_KEYS.filter(r => !filledRoles.includes(r));
  return { filledRoles, missingRoles, counts };
};

// Open Role Selection Screen
window.openRoleSelectionModal = function(fromSettings = false) {
  roleSelectionFromSettings = !!fromSettings;
  const modal = $('mRoleSelectionModal');
  if (!modal) return;

  const currentRole = window.userProfile?.playerRole || '';

  // Render role selection screen content
  const gridContainer = $('roleSelectionGrid');
  if (gridContainer) {
    gridContainer.innerHTML = ALL_ROLE_KEYS.map(key => {
      const role = ROLES_DATA[key];
      const isSelected = currentRole === key;
      return `
        <div onclick="window.selectRoleForConfirm('${key}')" 
             class="aspect-square flex flex-col items-center justify-center p-3.5 sm:p-5 text-center rounded-2xl transition-all duration-300 cursor-pointer group active:scale-95 select-none relative overflow-hidden ${
               isSelected 
                 ? 'bg-gradient-to-b from-[#1c1a12] to-[#121422] border-2 border-gold shadow-[0_0_30px_rgba(240,192,64,0.3)] ring-2 ring-gold/40' 
                 : 'bg-[#121422] border-2 border-[#1e2338] hover:border-gold/60 hover:bg-[#16192a] hover:shadow-[0_0_20px_rgba(240,192,64,0.15)]'
             }">
          
          <!-- Ambient Glow Background -->
          <div class="absolute -top-10 -right-10 w-24 h-24 bg-gold/5 rounded-full blur-xl pointer-events-none group-hover:bg-gold/15 transition-all duration-500"></div>

          ${isSelected ? `
            <div class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-gold text-bg text-[8px] font-black uppercase tracking-wider shadow">
              Current
            </div>
          ` : ''}

          <!-- Icon Box -->
          <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl transition-all duration-300 shadow-md ${
            isSelected 
              ? 'bg-gold text-bg shadow-gold/30' 
              : 'bg-gold/10 border border-gold/30 text-gold group-hover:scale-110 group-hover:bg-gold group-hover:text-bg group-hover:shadow-[0_0_15px_rgba(240,192,64,0.3)]'
          }">
            <i class="${role.icon}"></i>
          </div>

          <!-- Role Name -->
          <h3 class="text-base sm:text-lg font-black uppercase tracking-wider mt-3 sm:mt-3.5 transition group-hover:text-gold ${isSelected ? 'text-gold' : 'text-white'}">
            ${role.name}
          </h3>

          <!-- Role Description -->
          <p class="text-[10px] sm:text-[11px] text-t3 leading-tight mt-1 px-1 font-medium line-clamp-2">
            ${role.desc}
          </p>

          <span class="mt-2 text-[9px] font-bold uppercase tracking-wider text-gold/80 opacity-0 group-hover:opacity-100 transition duration-200">
            Select Role →
          </span>
        </div>
      `;
    }).join('');
  }

  // Adjust Back/Close button visibility depending on origin
  const btnClose = $('btnCloseRoleSelection');
  if (btnClose) {
    btnClose.onclick = window.closeRoleSelectionModal;
  }

  modal.classList.remove('hidden');
};

// Close Role Selection Screen
window.closeRoleSelectionModal = function() {
  const modal = $('mRoleSelectionModal');
  if (modal) modal.classList.add('hidden');
  if (roleSelectionFromSettings && $('mSettings')) {
    $('mSettings').classList.remove('hidden');
  }
};

// Tap any role box -> trigger confirmation dialog
window.selectRoleForConfirm = function(roleKey) {
  const role = window.getRoleInfo(roleKey);
  if (!role) return;
  pendingRoleKey = roleKey;

  const modal = $('mRoleConfirmModal');
  const rolePreview = $('roleConfirmPreview');
  const roleText = $('roleConfirmText');

  if (rolePreview) {
    rolePreview.innerHTML = `
      <div class="w-16 h-16 rounded-2xl bg-gold/15 border border-gold/40 text-gold flex items-center justify-center text-3xl mx-auto shadow-lg shadow-gold/10">
        <i class="${role.icon}"></i>
      </div>
      <h4 class="text-lg font-black text-white uppercase tracking-wider mt-2.5">${role.name}</h4>
      <p class="text-xs text-t3 mt-0.5">${role.desc}</p>
    `;
  }

  if (roleText) {
    roleText.innerHTML = `Select <strong class="text-gold font-bold">${role.name}</strong> as your role?<br><span class="text-t3 text-xs">You can change this later in settings.</span>`;
  }

  if (modal) modal.classList.remove('hidden');
};

// Cancel confirmation modal
window.cancelRoleConfirm = function() {
  pendingRoleKey = null;
  const modal = $('mRoleConfirmModal');
  if (modal) modal.classList.add('hidden');
};

// Confirm role choice: save to Firestore and update state
window.confirmRoleSelection = async function() {
  if (!pendingRoleKey) return;
  const roleKey = pendingRoleKey;
  const role = window.getRoleInfo(roleKey);
  if (!role) return;

  const profile = window.userProfile;
  if (!profile || !profile.uid) {
    alert("Please log in to choose a role!");
    return;
  }

  const btnConfirm = $('btnRoleConfirmYes');
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.textContent = 'Saving...';
  }

  try {
    const fs = window.fsTools || window;
    const dbInstance = window.db || window.fbDb;
    const userRef = fs.doc(dbInstance, 'users', profile.uid);

    // Save to user Firestore doc
    await fs.updateDoc(userRef, {
      playerRole: roleKey
    });

    // Update local reactive user state
    window.userProfile.playerRole = roleKey;
    if (typeof userProfile !== 'undefined') {
      userProfile.playerRole = roleKey;
    }

    // If user is already in a team, also synchronize to team doc
    const currentTeam = window.userGuild || window.selectedTeamData;
    if (currentTeam && currentTeam.id) {
      try {
        const teamRef = fs.doc(dbInstance, 'teams', currentTeam.id);
        await fs.updateDoc(teamRef, {
          [`memberRoles.${profile.uid}`]: roleKey
        });
      } catch (tErr) {
        console.warn("Could not sync role to team doc:", tErr);
      }
    }

    // Refresh UI badges across the app
    window.updateProfileRoleBadges(window.userProfile);

    // Close confirmation dialog & selection screen
    const confirmModal = $('mRoleConfirmModal');
    if (confirmModal) confirmModal.classList.add('hidden');

    const selectionModal = $('mRoleSelectionModal');
    if (selectionModal) selectionModal.classList.add('hidden');

    if (!roleSelectionFromSettings) {
      // First-time or clicked from Team: proceed to open Teams modal!
      if (typeof window.openTeamsModal === 'function') {
        window.openTeamsModal();
      }
    } else {
      // Opened from Settings: return to settings with confirmation
      if (typeof window.showToastNotification === 'function') {
        window.showToastNotification('Esports Role Updated!', `You are now a certified ${role.name}. 🏆`);
      } else {
        alert(`🎉 Role updated to ${role.name}!`);
      }
      if ($('mSettings')) $('mSettings').classList.remove('hidden');
    }

    // Re-render team roster if currently open
    if (typeof window.renderGuildSystemModalContent === 'function') {
      window.renderGuildSystemModalContent();
    }
  } catch (err) {
    console.error("Failed to save player role:", err);
    alert("Failed to save role: " + err.message);
  } finally {
    if (btnConfirm) {
      btnConfirm.disabled = false;
      btnConfirm.textContent = 'Yes';
    }
    pendingRoleKey = null;
  }
};

// ==========================================
// SMART ROLE RECRUITMENT SYSTEM (TEAM LEADER)
// ==========================================

window.openTeamRecruitmentModal = async function(teamId) {
  const team = window.selectedTeamData || window.userGuild;
  if (!team) return;
  currentRecruitTeamId = team.id || teamId;

  const modal = $('mTeamRecruitmentModal');
  if (!modal) return;
  modal.classList.remove('hidden');

  // Enforce 4-member maximum
  const currentMembers = team.members || [];
  if (currentMembers.length >= 4) {
    const container = $('recruitPlayerListContainer');
    if (container) {
      container.innerHTML = `
        <div class="p-8 text-center space-y-2">
          <div class="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl mx-auto">
            <i class="fas fa-check-circle"></i>
          </div>
          <h4 class="text-sm font-black text-white uppercase tracking-wide">Roster is Complete (4/4)</h4>
          <p class="text-xs text-t3 max-w-xs mx-auto">Your esports squad has reached the maximum tournament roster limit of 4 players.</p>
        </div>
      `;
    }
    return;
  }

  // Fetch full details of current team members to calculate missing roles
  let membersData = [];
  if (typeof window.fetchGuildMembers === 'function') {
    membersData = await window.fetchGuildMembers(currentMembers);
  }
  const { missingRoles } = window.calculateTeamRoles(membersData);
  currentRecruitMissingRoles = missingRoles;

  // Render Missing Roles Header
  const missingHeaderEl = $('recruitMissingRolesDisplay');
  if (missingHeaderEl) {
    if (missingRoles.length > 0) {
      missingHeaderEl.innerHTML = `
        <span class="text-xs font-bold text-t3 uppercase">Team Needs:</span>
        <div class="flex items-center gap-1.5 flex-wrap">
          ${missingRoles.map(rKey => window.getRoleBadgeHtml(rKey)).join('')}
        </div>
      `;
    } else {
      missingHeaderEl.innerHTML = `
        <span class="text-xs text-emerald-400 font-bold flex items-center gap-1">
          <i class="fas fa-check-circle"></i> All standard roles currently filled in squad!
        </span>
      `;
    }
  }

  // Load and render candidates
  await window.loadRecruitCandidates();
};

window.closeTeamRecruitmentModal = function() {
  const modal = $('mTeamRecruitmentModal');
  if (modal) modal.classList.add('hidden');
};

// Fetch candidate players from Firestore users
window.loadRecruitCandidates = async function() {
  const container = $('recruitPlayerListContainer');
  if (!container) return;
  container.innerHTML = `
    <div class="p-8 text-center text-t3">
      <i class="fas fa-spinner animate-spin text-gold mr-2"></i> Scouting players in the Arena...
    </div>
  `;

  try {
    const fs = window.fsTools || window;
    const dbInstance = window.db || window.fbDb;
    const usersRef = fs.collection(dbInstance, 'users');
    const q = fs.query(usersRef, fs.limit(50));
    const snap = await fs.getDocs(q);

    const team = window.selectedTeamData || window.userGuild;
    const currentMemberUids = team?.members || [];
    const myUid = window.userProfile?.uid;

    const players = [];
    snap.forEach(d => {
      const u = d.data();
      const uid = d.id;
      // Skip users already in team or self
      if (uid === myUid || currentMemberUids.includes(uid)) return;
      players.push({ uid, ...u });
    });

    recruitPlayersCache = players;
    window.renderRecruitCandidatesUI();
  } catch (err) {
    console.error("Failed to load recruit candidates:", err);
    container.innerHTML = `
      <div class="p-6 text-center text-red-400 text-xs">
        <i class="fas fa-exclamation-triangle mr-1"></i> Failed to load candidates: ${err.message}
      </div>
    `;
  }
};

// Filter, prioritize, and render candidate players
window.renderRecruitCandidatesUI = function() {
  const container = $('recruitPlayerListContainer');
  if (!container) return;

  const searchInput = $('recruitPlayerSearchInput');
  const queryText = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const prioritizeCheckbox = $('chkPrioritizeNeededRoles');
  const shouldPrioritize = prioritizeCheckbox ? prioritizeCheckbox.checked : true;

  let candidates = recruitPlayersCache.filter(p => {
    if (!queryText) return true;
    const name = (p.name || '').toLowerCase();
    const handle = (p.handle || '').toLowerCase();
    const role = (p.playerRole || '').toLowerCase();
    return name.includes(queryText) || handle.includes(queryText) || role.includes(queryText);
  });

  // Sort: matching missing roles first if prioritized
  if (shouldPrioritize && currentRecruitMissingRoles.length > 0) {
    candidates.sort((a, b) => {
      const aMatches = a.playerRole && currentRecruitMissingRoles.includes(a.playerRole);
      const bMatches = b.playerRole && currentRecruitMissingRoles.includes(b.playerRole);
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });
  }

  if (candidates.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-t3 text-xs space-y-1">
        <i class="fas fa-user-slash text-2xl text-t3/50 block mb-2"></i>
        <p class="font-bold text-white">No players found</p>
        <p class="text-[11px]">Try adjusting your search terms or unchecking role filters.</p>
      </div>
    `;
    return;
  }

  const team = window.selectedTeamData || window.userGuild;
  const teamName = team?.name || 'our team';

  container.innerHTML = candidates.map(player => {
    const role = window.getRoleInfo(player.playerRole);
    const isRoleMatch = role && currentRecruitMissingRoles.includes(player.playerRole);

    return `
      <div class="p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
        isRoleMatch 
          ? 'bg-gradient-to-r from-gold/10 via-[#121422] to-[#0a0c14] border-gold/40 shadow-[0_0_15px_rgba(240,192,64,0.1)]' 
          : 'bg-[#0f111d] border-[#1c2033] hover:border-bdr'
      }">
        <div class="flex items-center gap-3 min-w-0">
          <div class="relative flex-shrink-0">
            <img src="${player.av || player.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.uid}`}" 
                 class="w-10 h-10 rounded-full object-cover bg-slate-900 border ${isRoleMatch ? 'border-gold' : 'border-bdr'}" 
                 alt="${player.name || 'Player'}" />
            ${isRoleMatch ? `
              <span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold text-bg text-[8px] flex items-center justify-center font-bold shadow" title="Matches Squad Missing Role">
                <i class="fas fa-check"></i>
              </span>
            ` : ''}
          </div>

          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-xs text-white truncate">${player.name || 'Arena Player'}</span>
              ${role ? `
                <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider ${
                  isRoleMatch ? 'bg-gold/20 text-gold border border-gold/40' : 'bg-white/5 text-t2 border border-white/10'
                }">
                  <i class="${role.icon} text-[8px]"></i> ${role.name}
                </span>
              ` : '<span class="text-[8px] text-t3 uppercase font-mono">No Role</span>'}
            </div>
            <p class="text-[10px] text-t3 font-mono truncate">@${player.handle || 'player'}</p>
            ${isRoleMatch ? `
              <p class="text-[9px] text-gold font-bold flex items-center gap-1 mt-0.5">
                <i class="fas fa-sparkles text-[8px]"></i> Perfect Fit for your squad!
              </p>
            ` : ''}
          </div>
        </div>

        <button onclick="window.sendTeamRecruitInvite('${player.uid}', '${(player.name || 'Player').replace(/'/g, "\\'")}', '${team?.id}', '${teamName.replace(/'/g, "\\'")}', '${role ? role.name : ''}', this)" 
                class="px-3.5 py-1.5 rounded-xl bg-gold/15 hover:bg-gold text-gold hover:text-bg border border-gold/40 text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex-shrink-0 active:scale-95">
          <i class="fas fa-paper-plane mr-1"></i> Invite
        </button>
      </div>
    `;
  }).join('');
};

// Send recruitment invitation mail to candidate
window.sendTeamRecruitInvite = async function(targetUid, targetName, teamId, teamName, matchedRole, btnEl) {
  if (!targetUid || !teamId) return;

  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = `<i class="fas fa-spinner animate-spin"></i>`;
  }

  try {
    const fs = window.fsTools || window;
    const dbInstance = window.db || window.fbDb;
    const myProfile = window.userProfile;
    const mailRef = fs.collection(dbInstance, 'users', targetUid, 'mails');

    const roleMsg = matchedRole ? ` as our team's ${matchedRole}` : '';

    await fs.addDoc(mailRef, {
      type: "team_invite",
      sender: teamName,
      title: `Team Invitation: ${teamName}! ⚔️`,
      body: `${myProfile?.name || 'The Team Leader'} has invited you to join their Esports squad "${teamName}"${roleMsg}! Tap below to accept or decline.`,
      teamId: teamId,
      teamName: teamName,
      fromUserId: myProfile?.uid || '',
      fromUserName: myProfile?.name || 'Team Leader',
      status: "pending",
      createdAt: fs.serverTimestamp()
    });

    if (btnEl) {
      btnEl.className = 'px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase cursor-default';
      btnEl.innerHTML = `<i class="fas fa-check mr-1"></i> Invited`;
    }

    if (typeof window.showToastNotification === 'function') {
      window.showToastNotification('Invitation Sent! ✉️', `Invited ${targetName} to join ${teamName}.`);
    } else {
      alert(`🎉 Invitation sent to ${targetName}!`);
    }
  } catch (err) {
    console.error("Failed to send team invite:", err);
    alert("Failed to send invite: " + err.message);
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = `<i class="fas fa-paper-plane mr-1"></i> Invite`;
    }
  }
};
