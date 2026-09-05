/**
 * ArenaX Account Standing & Security Guardian Module
 * Handles 3-stage standing evaluation (ALL GOOD, LIMITED, AT RISK),
 * transparent factor scoring, real-time disciplinary/violation display,
 * AI-powered personalized recommendations, progression rules, and admin synchronization.
 */

(function() {
  const STANDING_LEVELS = {
    ALL_GOOD: 'ALL_GOOD',
    LIMITED: 'LIMITED',
    AT_RISK: 'AT_RISK'
  };

  let currentStandingState = null;
  let cachedAiRecommendations = null;
  let standingUnsubscribe = null;
  let punishmentsUnsubscribe = null;
  let userDocUnsubscribe = null;

  let latestStandingDoc = null;
  let latestPunishments = [];
  let latestReports = [];

  function formatDateTime(val) {
    if (!val) return 'Recent';
    try {
      if (typeof val.toDate === 'function') {
        return val.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch (e) {
      // ignore
    }
    return String(val);
  }

  /**
   * Extracts all active violations, warnings, and restrictions from real user and punishment signals
   */
  function extractActiveViolations(profile = {}, docData = {}, punishments = []) {
    const violations = [];
    const seenKeys = new Set();

    // 1. Process structured punishment documents (from users/{uid}/punishments)
    if (Array.isArray(punishments)) {
      punishments.forEach((p, idx) => {
        if (!p) return;
        const actionType = p.actionType || p.type || 'warning';
        if (actionType === 'unblock' || p.revoked === true || p.expired === true) return;

        // Check if duration expired
        if (p.endsAt) {
          try {
            const endDate = p.endsAt.toDate ? p.endsAt.toDate() : new Date(p.endsAt);
            if (Date.now() > endDate.getTime()) return; // expired
          } catch (e) {}
        }

        const reason = p.reason || (actionType === 'warning' ? 'Community Conduct Infraction' : 'Disciplinary Restriction');
        const key = `${actionType}_${reason}_${p.dateTime || p.timestamp || idx}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        let status = 'Active Warning';
        let action = 'Official Warning Notice';
        let expiry = p.duration ? `${p.duration} Cooldown` : 'Expires in 14 days (Clean play cooldown)';

        if (actionType === 'restriction') {
          status = 'Temporary Restriction';
          action = 'Gameplay & Chat Restricted';
          expiry = p.duration ? `${p.duration} (Dispute-free period)` : 'Expires upon compliance completion';
        } else if (actionType === 'temporary_block') {
          status = 'Temporary Suspension';
          action = 'Account Access Suspended';
          expiry = p.duration ? `Suspension duration: ${p.duration}` : 'Temporary suspension active';
        } else if (actionType === 'permanent_block') {
          status = 'Permanent Suspension';
          action = 'Account Permanently Suspended';
          expiry = 'No automatic expiration';
        }

        violations.push({
          id: p.id || `punishment-${idx}`,
          type: actionType,
          reason,
          status,
          date: formatDateTime(p.dateTime || p.timestamp || p.createdAt),
          action,
          expiry
        });
      });
    }

    // 2. Process profile-level warnings if not already captured
    const profileWarningCount = Number(profile.warningCount) || 0;
    const hasProfileWarning = profileWarningCount > 0 || profile.accountStatus === 'warned' || Boolean(profile.lastWarning);

    if (hasProfileWarning && violations.filter(v => v.type === 'warning').length === 0) {
      const reason = profile.lastWarning || (profile.warningReason || 'Fair-Play & Community Conduct Warning');
      const key = `profile_warning_${reason}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        violations.push({
          id: 'profile-warning-1',
          type: 'warning',
          reason,
          status: 'Active Warning',
          date: formatDateTime(profile.lastWarningAt || profile.updatedAt || Date.now()),
          action: 'Official Warning Notice on Record',
          expiry: '14-day dispute-free clean play required'
        });
      }
    }

    // 3. Process profile-level restriction
    const isProfileRestricted = Boolean(profile.restricted === true || profile.isRestricted === true || profile.accountStatus === 'restricted');
    if (isProfileRestricted && violations.filter(v => v.type === 'restriction').length === 0) {
      const reason = profile.restrictionReason || 'Competitive Integrity Violation';
      const key = `profile_restriction_${reason}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        let expiry = 'Subject to 14-day compliance';
        if (profile.restrictedUntil) {
          expiry = `Expires: ${formatDateTime(profile.restrictedUntil)}`;
        }
        violations.push({
          id: 'profile-restriction-1',
          type: 'restriction',
          reason,
          status: 'Temporary Restriction',
          date: formatDateTime(profile.restrictedAt || profile.updatedAt || Date.now()),
          action: 'Matchmaking & Lobby Feature Restriction',
          expiry
        });
      }
    }

    // 4. Process profile-level ban
    const isProfileBanned = Boolean(
      profile.banned === true || 
      profile.isBanned === true || 
      profile.accountStatus === 'temporarily_blocked' || 
      profile.accountStatus === 'permanently_blocked'
    );
    if (isProfileBanned && violations.filter(v => v.type.includes('block') || v.type === 'suspension').length === 0) {
      const isFull = profile.banType === 'full' || profile.accountStatus === 'permanently_blocked';
      const reason = profile.banReason || 'Major Terms of Service Violation';
      const key = `profile_ban_${reason}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        violations.push({
          id: 'profile-ban-1',
          type: isFull ? 'permanent_block' : 'temporary_block',
          reason,
          status: isFull ? 'Permanent Suspension' : 'Temporary Suspension',
          date: formatDateTime(profile.bannedAt || profile.updatedAt || Date.now()),
          action: 'Matchmaking & ArenaX Access Suspended',
          expiry: isFull ? 'Permanent' : (profile.banUntil || profile.blockedUntil ? `Expires: ${formatDateTime(profile.banUntil || profile.blockedUntil)}` : 'Temporary Cooldown')
        });
      }
    }

    // 5. Merge standingDoc.violations if present
    if (Array.isArray(docData.violations)) {
      docData.violations.forEach((v, idx) => {
        if (!v || !v.reason) return;
        const key = `doc_violation_${v.reason}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          violations.push({
            id: v.id || `doc-violation-${idx}`,
            type: v.type || 'warning',
            reason: v.reason,
            status: v.status || 'Active Warning',
            date: formatDateTime(v.date || v.createdAt),
            action: v.action || 'Disciplinary Action Recorded',
            expiry: v.expiry || null
          });
        }
      });
    }

    return violations;
  }

  /**
   * Evaluates user account signals and computes mathematical score, standing level, and violations
   */
  function computeAccountStanding(user, standingDoc = null, reports = [], punishments = [], moderationHistory = []) {
    const profile = user || {};
    const docData = standingDoc || {};

    // 1. Extract all active violations from real signals
    const activeViolations = extractActiveViolations(profile, docData, punishments);

    // 2. Check for active manual admin override
    const hasOverride = Boolean(
      (docData.isOverridden === true || docData.overrideActive === true) &&
      (docData.overrideLevel || docData.level) &&
      STANDING_LEVELS[docData.overrideLevel || docData.level]
    );

    if (hasOverride) {
      const overrideLevel = docData.overrideLevel || docData.level;
      const baseScore = overrideLevel === STANDING_LEVELS.ALL_GOOD ? 95 : overrideLevel === STANDING_LEVELS.LIMITED ? 65 : 30;
      return {
        standing: overrideLevel,
        level: overrideLevel, // for complete backward & forward compatibility
        score: typeof docData.score === 'number' ? docData.score : baseScore,
        isOverridden: true,
        overrideReason: docData.overrideReason || 'Administrative decision',
        overrideBy: docData.updatedBy || docData.overrideBy || 'Admin',
        overrideAt: docData.updatedAt || docData.overrideAt || null,
        factors: extractFactors(profile, docData, reports, activeViolations, overrideLevel),
        violations: activeViolations
      };
    }

    // 3. Extract verified moderation signals
    const isBanned = Boolean(
      profile.banned === true ||
      profile.isBanned === true ||
      profile.accountStatus === 'permanently_blocked' ||
      profile.accountStatus === 'temporarily_blocked' ||
      docData.isBanned === true ||
      activeViolations.some(v => v.type.includes('block') || v.type === 'suspension')
    );

    const isRestricted = Boolean(
      profile.restricted === true ||
      profile.isRestricted === true ||
      profile.accountStatus === 'restricted' ||
      docData.isRestricted === true ||
      activeViolations.some(v => v.type === 'restriction')
    );

    // Active warnings count: comprehensive aggregation across all real sources
    const warningViolationsCount = activeViolations.filter(v => v.type === 'warning').length;
    const profileWarningsCount = Number(profile.warningCount) || 0;
    const docWarningsCount = Number(docData.activeWarnings) || (docData.factors && Number(docData.factors.activeWarnings)) || 0;
    const arrayWarningsCount = Array.isArray(profile.warnings) ? profile.warnings.filter(w => !w.resolved && !w.expired).length : 0;

    let activeWarnings = Math.max(warningViolationsCount, profileWarningsCount, docWarningsCount, arrayWarningsCount);
    if (profile.accountStatus === 'warned' && activeWarnings === 0) {
      activeWarnings = 1;
    }

    // Verification signals
    const isDiscordVerified = Boolean(
      profile.discordVerified === true ||
      docData.discordVerified === true ||
      (docData.factors && docData.factors.discordVerified === true)
    );
    const isEmailVerified = Boolean(profile.emailVerified !== false); // Default true for active accounts

    // Reports: ArenaX principle: Raw reports NEVER automatically penalize without verified evidence
    const rawReportsCount = Array.isArray(reports) ? reports.length : (Number(docData.rawReportsCount) || 0);
    const verifiedReportsCount = Array.isArray(reports) 
      ? reports.filter(r => r.verified === true || r.status === 'resolved_punished' || r.outcome === 'violation_confirmed').length 
      : (Number(docData.verifiedReportsCount) || 0);

    // Fair play streak & activity
    const tournamentsPlayed = Number(profile.tournamentsPlayed) || Number(docData.tournamentsPlayed) || 1;
    const cleanStreakDays = Number(docData.cleanStreakDays) || (activeWarnings === 0 && !isRestricted && !isBanned ? 30 : 7);

    // 4. Mathematical Scoring (Base: 80 points)
    let score = 80;

    // Positive trust bonuses
    if (isDiscordVerified) score += 15; // +15 for verified Discord identity
    if (isEmailVerified) score += 5;   // +5 for verified email
    if (tournamentsPlayed >= 3) score += 5; // +5 for established match history

    // Deductions
    if (isBanned) {
      score = 15;
    } else if (activeWarnings >= 2) {
      score -= 60; // Puts score in AT RISK range (25-40)
    } else if (activeWarnings === 1) {
      score -= 35; // Puts score in LIMITED range (50-65)
    }

    if (isRestricted && !isBanned) {
      score -= 30; // Drops into LIMITED / AT RISK
    }

    if (verifiedReportsCount > 0 && !isBanned) {
      score -= (verifiedReportsCount * 15);
    }

    // Clamp score 5 - 100
    score = Math.max(5, Math.min(100, score));

    // 5. Determine Standing Level
    let standing = STANDING_LEVELS.ALL_GOOD;

    if (isBanned || activeWarnings >= 2 || score < 45) {
      standing = STANDING_LEVELS.AT_RISK;
    } else if (activeWarnings === 1 || isRestricted || score < 80) {
      standing = STANDING_LEVELS.LIMITED;
    } else {
      standing = STANDING_LEVELS.ALL_GOOD;
    }

    return {
      standing,
      level: standing, // backward & forward compatible with admin panel
      score,
      isOverridden: false,
      factors: {
        activeWarnings,
        isBanned,
        isRestricted,
        discordVerified: isDiscordVerified,
        emailVerified: isEmailVerified,
        rawReportsCount,
        verifiedReportsCount,
        tournamentsPlayed,
        cleanStreakDays,
        reportsProtected: true
      },
      violations: activeViolations
    };
  }

  function extractFactors(profile, docData, reports, violations, currentStanding) {
    const isDiscordVerified = Boolean(profile.discordVerified || docData.discordVerified || (docData.factors && docData.factors.discordVerified));
    const activeWarnings = violations.filter(v => v.type === 'warning').length || Number(profile.warningCount || docData.activeWarnings || 0);
    const isBanned = Boolean(profile.banned || docData.isBanned || violations.some(v => v.type.includes('block')));
    const isRestricted = Boolean(profile.restricted || docData.isRestricted || violations.some(v => v.type === 'restriction'));

    return {
      activeWarnings,
      isBanned,
      isRestricted,
      discordVerified: isDiscordVerified,
      emailVerified: Boolean(profile.emailVerified !== false),
      rawReportsCount: Array.isArray(reports) ? reports.length : (Number(docData.rawReportsCount) || 0),
      verifiedReportsCount: Number(docData.verifiedReportsCount || 0),
      tournamentsPlayed: Number(profile.tournamentsPlayed || 1),
      cleanStreakDays: Number(docData.cleanStreakDays || (activeWarnings === 0 ? 30 : 14)),
      reportsProtected: true
    };
  }

  /**
   * Renders the Active Violations & Disciplinary Notices Card
   */
  function renderViolationsDisplay(violations, standing) {
    const container = document.getElementById('axViolationsContainer');
    if (!container) return;

    if (!violations || violations.length === 0) {
      container.innerHTML = `
        <div class="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-start gap-3">
          <div class="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
            <i class="fas fa-shield-check"></i>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-emerald-300">No Active Violations</span>
                <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ALL CLEAR</span>
              </div>
              <span class="text-[10px] text-emerald-400/80 font-mono">Status: Healthy</span>
            </div>
            <p class="text-[11px] text-slate-300 mt-1 leading-relaxed">
              Your account currently has zero active warnings, disciplinary restrictions, or confirmed fair-play infractions on record.
            </p>
          </div>
        </div>
      `;
      return;
    }

    // Render active violations list
    const isAtRisk = standing === STANDING_LEVELS.AT_RISK;
    container.innerHTML = `
      <div class="space-y-2">
        <div class="flex items-center justify-between px-0.5">
          <span class="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <i class="fas fa-gavel ${isAtRisk ? 'text-rose-400' : 'text-amber-400'}"></i>
            <span>Active Disciplinary Records (${violations.length})</span>
          </span>
          <span class="text-[10px] font-mono ${isAtRisk ? 'text-rose-400' : 'text-amber-400'} font-bold">Action Required</span>
        </div>
        ${violations.map((v, i) => {
          const isWarning = v.type === 'warning';
          const isBan = v.type.includes('block') || v.type === 'suspension';
          const badgeClass = isBan ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                             isWarning ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                             'bg-orange-500/20 text-orange-300 border-orange-500/40';
          const cardBorder = isBan ? 'border-rose-500/30 bg-rose-950/10' :
                             isWarning ? 'border-amber-500/30 bg-amber-950/10' :
                             'border-orange-500/30 bg-orange-950/10';
          const icon = isBan ? 'fa-ban text-rose-400' :
                       isWarning ? 'fa-triangle-exclamation text-amber-400' :
                       'fa-user-slash text-orange-400';

          return `
            <div class="p-3 rounded-xl border ${cardBorder} space-y-2">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <i class="fas ${icon} text-xs flex-shrink-0"></i>
                  <span class="text-xs font-bold text-white truncate">${escapeHtml(v.reason || 'Community Guideline Infraction')}</span>
                </div>
                <span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded border flex-shrink-0 ${badgeClass}">
                  ${escapeHtml(v.status || 'Active Warning')}
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1.5 border-t border-white/5">
                <div class="flex items-center gap-1.5">
                  <span class="text-slate-500 text-[10px] uppercase font-mono">Date:</span>
                  <span class="font-medium text-slate-200">${escapeHtml(v.date || 'Recent')}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-slate-500 text-[10px] uppercase font-mono">Action:</span>
                  <span class="font-medium text-amber-300">${escapeHtml(v.action || 'Disciplinary Notice')}</span>
                </div>
                ${v.expiry ? `
                  <div class="sm:col-span-2 flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg">
                    <span class="text-indigo-400 text-[10px] uppercase font-mono">Resolution:</span>
                    <span class="font-medium text-indigo-200 text-[10px]">${escapeHtml(v.expiry)}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Renders the Account Standing UI inside mAxSecurityModal and settings button
   */
  function renderAccountStandingUI(standingData, userProfile) {
    if (!standingData) return;
    const { standing, score, isOverridden, overrideReason, factors, violations } = standingData;
    currentStandingState = standingData;

    // 1. Update Profile Settings Row (btnAxSecurity)
    const badge = document.getElementById('badgeAxSecurityStatus');
    const subtitle = document.getElementById('lblAxSecuritySubtitle');
    if (badge) {
      if (standing === STANDING_LEVELS.ALL_GOOD) {
        badge.textContent = 'All Good ✓';
        badge.className = 'text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase';
      } else if (standing === STANDING_LEVELS.LIMITED) {
        badge.textContent = 'Limited !';
        badge.className = 'text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase';
      } else {
        badge.textContent = 'At Risk ✕';
        badge.className = 'text-[9px] bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold uppercase';
      }
    }
    if (subtitle && factors) {
      const discordText = factors.discordVerified ? 'Discord Linked' : 'Discord Unlinked';
      const warningText = factors.activeWarnings > 0 ? ` • ${factors.activeWarnings} Warning(s)` : '';
      subtitle.textContent = `Standing: ${standing.replace('_', ' ')} • ${discordText}${warningText}`;
    }

    // 2. Update Header Overview inside mAxSecurityModal
    const userAv = document.getElementById('axStandingUserAv');
    if (userAv && userProfile) {
      userAv.src = userProfile.avatar || userProfile.av || userProfile.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${userProfile.uid || 'user'}`;
    }

    const dot = document.getElementById('axStandingStatusBadgeDot');
    const levelLabel = document.getElementById('axStandingLevelLabel');
    const contextMsg = document.getElementById('axStandingContextMessage');
    const scoreBadge = document.getElementById('axStandingScoreBadge');

    if (levelLabel) {
      if (standing === STANDING_LEVELS.ALL_GOOD) {
        levelLabel.textContent = 'all good';
        levelLabel.className = 'text-emerald-400 font-extrabold capitalize';
      } else if (standing === STANDING_LEVELS.LIMITED) {
        levelLabel.textContent = 'limited';
        levelLabel.className = 'text-amber-400 font-extrabold capitalize';
      } else {
        levelLabel.textContent = 'at risk';
        levelLabel.className = 'text-rose-500 font-extrabold capitalize';
      }
    }

    if (contextMsg) {
      if (standing === STANDING_LEVELS.ALL_GOOD) {
        contextMsg.textContent = "Thank you for upholding ArenaX's Terms of Service and Community Guidelines. Your standing is in optimal standing with zero active infractions.";
      } else if (standing === STANDING_LEVELS.LIMITED) {
        contextMsg.textContent = isOverridden 
          ? `Administrative Override: ${overrideReason || 'Account placed in limited standing'}. Complete requested actions to restore status.`
          : (factors && factors.activeWarnings > 0)
          ? `Your account has 1 active warning recorded. Complete 14 days of sustained dispute-free gameplay to automatically restore All Good status.`
          : `Your account has active restrictions or warnings. Complete the cooldown period with dispute-free participation to restore All Good status.`;
      } else {
        contextMsg.textContent = isOverridden
          ? `Administrative Override: ${overrideReason || 'Account marked at risk by moderation council'}. Submit an appeal for review.`
          : (factors && factors.activeWarnings >= 2)
          ? `Your account has ${factors.activeWarnings} active warnings on record. A 30-day compliance period is required to progress your standing.`
          : `Your account has critical violations or verified disciplinary actions. Continued infractions may result in permanent suspension.`;
      }
    }

    if (dot) {
      if (standing === STANDING_LEVELS.ALL_GOOD) {
        dot.className = 'absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#151722] flex items-center justify-center text-[8px] text-white';
        dot.innerHTML = '<i class="fas fa-check"></i>';
      } else if (standing === STANDING_LEVELS.LIMITED) {
        dot.className = 'absolute bottom-0 right-0 w-4 h-4 rounded-full bg-amber-500 border-2 border-[#151722] flex items-center justify-center text-[8px] text-slate-950 font-bold';
        dot.innerHTML = '<i class="fas fa-exclamation"></i>';
      } else {
        dot.className = 'absolute bottom-0 right-0 w-4 h-4 rounded-full bg-rose-600 border-2 border-[#151722] flex items-center justify-center text-[8px] text-white';
        dot.innerHTML = '<i class="fas fa-triangle-exclamation"></i>';
      }
    }

    if (scoreBadge) {
      scoreBadge.textContent = `Score: ${score}/100`;
      if (standing === STANDING_LEVELS.ALL_GOOD) {
        scoreBadge.className = 'text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full';
      } else if (standing === STANDING_LEVELS.LIMITED) {
        scoreBadge.className = 'text-[10px] font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full';
      } else {
        scoreBadge.className = 'text-[10px] font-mono font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full';
      }
    }

    // 3. Update 3-Stage Indicator Stepper Track
    updateStepperTrack(standing);

    // 4. Update "Why is my account at this level?" violations and factors
    renderViolationsDisplay(violations || [], standing);
    updateFactorsList(standingData);

    // 5. Trigger Real-Time AI Recommendations
    fetchAiStandingRecommendations(false);
  }

  /**
   * Updates the visual 3-stage stepper nodes and connecting progress line
   */
  function updateStepperTrack(standing) {
    const node1 = document.getElementById('axStageNode-1');
    const label1 = document.getElementById('axStageLabel-1');
    const node2 = document.getElementById('axStageNode-2');
    const label2 = document.getElementById('axStageLabel-2');
    const node3 = document.getElementById('axStageNode-3');
    const label3 = document.getElementById('axStageLabel-3');
    const progressLine = document.getElementById('axStandingProgressLine');

    if (!node1 || !node2 || !node3) return;

    if (standing === STANDING_LEVELS.ALL_GOOD) {
      if (progressLine) {
        progressLine.style.width = '0%';
        progressLine.className = 'absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 rounded-full z-0 transition-all duration-500';
      }

      node1.className = 'w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-emerald-950/60 ring-4 ring-emerald-500/20 transition-all';
      node1.innerHTML = '<i class="fas fa-check"></i>';
      if (label1) label1.className = 'text-[11px] font-bold text-emerald-400 mt-2 whitespace-nowrap';

      node2.className = 'w-8 h-8 rounded-full bg-slate-800 text-slate-500 border border-slate-700 flex items-center justify-center text-xs font-black ring-4 ring-[#151722] transition-all';
      node2.innerHTML = '<i class="fas fa-circle text-[6px]"></i>';
      if (label2) label2.className = 'text-[11px] font-medium text-slate-500 mt-2 whitespace-nowrap';

      node3.className = 'w-8 h-8 rounded-full bg-slate-800 text-slate-500 border border-slate-700 flex items-center justify-center text-xs font-black ring-4 ring-[#151722] transition-all';
      node3.innerHTML = '<i class="fas fa-circle text-[6px]"></i>';
      if (label3) label3.className = 'text-[11px] font-medium text-slate-500 mt-2 whitespace-nowrap';
    } else if (standing === STANDING_LEVELS.LIMITED) {
      if (progressLine) {
        progressLine.style.width = '50%';
        progressLine.className = 'absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-amber-500 rounded-full z-0 transition-all duration-500';
      }

      node1.className = 'w-8 h-8 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-xs font-bold ring-4 ring-[#151722] transition-all';
      node1.innerHTML = '<i class="fas fa-check text-[10px]"></i>';
      if (label1) label1.className = 'text-[11px] font-medium text-slate-400 mt-2 whitespace-nowrap';

      node2.className = 'w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black shadow-lg shadow-amber-950/60 ring-4 ring-amber-500/30 transition-all';
      node2.innerHTML = '<i class="fas fa-exclamation font-black"></i>';
      if (label2) label2.className = 'text-[11px] font-bold text-amber-400 mt-2 whitespace-nowrap';

      node3.className = 'w-8 h-8 rounded-full bg-slate-800 text-slate-500 border border-slate-700 flex items-center justify-center text-xs font-black ring-4 ring-[#151722] transition-all';
      node3.innerHTML = '<i class="fas fa-circle text-[6px]"></i>';
      if (label3) label3.className = 'text-[11px] font-medium text-slate-500 mt-2 whitespace-nowrap';
    } else {
      // AT RISK
      if (progressLine) {
        progressLine.style.width = '100%';
        progressLine.className = 'absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-rose-600 rounded-full z-0 transition-all duration-500';
      }

      node1.className = 'w-8 h-8 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center text-xs font-bold ring-4 ring-[#151722] transition-all';
      node1.innerHTML = '<i class="fas fa-check text-[10px]"></i>';
      if (label1) label1.className = 'text-[11px] font-medium text-slate-400 mt-2 whitespace-nowrap';

      node2.className = 'w-8 h-8 rounded-full bg-slate-800 text-amber-500/60 border border-amber-500/30 flex items-center justify-center text-xs font-bold ring-4 ring-[#151722] transition-all';
      node2.innerHTML = '<i class="fas fa-exclamation text-[10px]"></i>';
      if (label2) label2.className = 'text-[11px] font-medium text-slate-400 mt-2 whitespace-nowrap';

      node3.className = 'w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-rose-950/60 ring-4 ring-rose-500/30 transition-all';
      node3.innerHTML = '<i class="fas fa-triangle-exclamation"></i>';
      if (label3) label3.className = 'text-[11px] font-bold text-rose-500 mt-2 whitespace-nowrap';
    }
  }

  /**
   * Updates detailed factor breakdown in "Why is my account at this level?"
   */
  function updateFactorsList(standingData) {
    const { standing, factors, isOverridden, overrideReason, violations } = standingData;
    const f = factors || {};

    // 1. Disciplinary Factor
    const discVal = document.getElementById('axFactorValDisciplinary');
    const discDesc = document.getElementById('axFactorDescDisciplinary');
    const discIcon = document.getElementById('axFactorIconDisciplinary');
    if (discVal && discDesc) {
      if (f.isBanned) {
        discVal.textContent = 'Account Suspended';
        discVal.className = 'text-[10px] font-bold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded';
        discDesc.textContent = 'Active disciplinary suspension applied by moderation team.';
        if (discIcon) discIcon.className = 'w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-xs flex-shrink-0 mt-0.5';
      } else if (f.activeWarnings >= 2) {
        discVal.textContent = `${f.activeWarnings} Active Warnings`;
        discVal.className = 'text-[10px] font-bold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded';
        discDesc.textContent = `Multiple active warnings received. Requires 30-day compliance period to resolve.`;
        if (discIcon) discIcon.className = 'w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-xs flex-shrink-0 mt-0.5';
      } else if (f.activeWarnings === 1) {
        discVal.textContent = '1 Active Warning';
        discVal.className = 'text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded';
        discDesc.textContent = '1 active disciplinary warning. 14 days of clean match play will automatically restore status.';
        if (discIcon) discIcon.className = 'w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs flex-shrink-0 mt-0.5';
      } else if (f.isRestricted) {
        discVal.textContent = 'Active Restriction';
        discVal.className = 'text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded';
        discDesc.textContent = 'Temporary feature restriction active. Complete assignment duration with fair play.';
        if (discIcon) discIcon.className = 'w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs flex-shrink-0 mt-0.5';
      } else {
        discVal.textContent = '0 Active Warnings';
        discVal.className = 'text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded';
        discDesc.textContent = 'No active warnings or disciplinary restrictions on record.';
        if (discIcon) discIcon.className = 'w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs flex-shrink-0 mt-0.5';
      }
    }

    // 2. Reports & Credibility Factor (Evidence protection)
    const repVal = document.getElementById('axFactorValReports');
    const repDesc = document.getElementById('axFactorDescReports');
    if (repVal && repDesc) {
      if (f.rawReportsCount > 0 && f.verifiedReportsCount === 0) {
        repVal.textContent = `${f.rawReportsCount} Under Review (Protected)`;
        repVal.className = 'text-[10px] font-bold text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded';
        repDesc.textContent = 'Reports are strictly verified with evidence before action is taken. Unsubstantiated claims do not lower your standing.';
      } else if (f.verifiedReportsCount > 0) {
        repVal.textContent = `${f.verifiedReportsCount} Verified Infraction(s)`;
        repVal.className = 'text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded';
        repDesc.textContent = 'Moderators verified evidence of misconduct in recent matches.';
      } else {
        repVal.textContent = 'Clean Record ✓';
        repVal.className = 'text-[10px] font-bold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded';
        repDesc.textContent = 'No verified community infractions or fair-play violations.';
      }
    }

    // 3. Security & Verification Factor
    const secVal = document.getElementById('axFactorValSecurity');
    const secDesc = document.getElementById('axFactorDescSecurity');
    if (secVal && secDesc) {
      if (f.discordVerified) {
        secVal.textContent = 'Discord Linked (+15)';
        secVal.className = 'text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded';
        secDesc.textContent = 'Official Discord identity linked. Maximum trust resilience enabled.';
      } else {
        secVal.textContent = 'Discord Unlinked';
        secVal.className = 'text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded';
        secDesc.textContent = 'Link your Discord identity to gain +15 security points and unlock tournament verified tier.';
      }
    }
  }

  /**
   * Fetches real-time personalized AI recommendations from server
   */
  async function fetchAiStandingRecommendations(forceRefresh = false) {
    const container = document.getElementById('axAiRecsContainer');
    const timelineEl = document.getElementById('axAiRecoveryTimeline');
    const sourceBadge = document.getElementById('axAiSourceBadge');
    const refreshIcon = document.getElementById('iconRefreshAi');

    if (!container || !currentStandingState) return;

    if (cachedAiRecommendations && !forceRefresh && cachedAiRecommendations.standing === currentStandingState.standing) {
      renderAiRecommendations(cachedAiRecommendations);
      return;
    }

    if (refreshIcon) refreshIcon.classList.add('animate-spin');

    container.innerHTML = `
      <div class="p-4 text-center text-slate-400 text-xs space-y-2">
        <i class="fas fa-circle-notch animate-spin text-indigo-400 text-base"></i>
        <p class="animate-pulse">ArenaX AI analyzing your live account signals & moderation history...</p>
      </div>
    `;

    try {
      const user = window.userProfile || window.guestProfile || {};
      const res = await fetch('/api/account-standing/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standing: currentStandingState.standing,
          standingLevel: currentStandingState.level,
          score: currentStandingState.score,
          factors: currentStandingState.factors,
          violations: currentStandingState.violations || [],
          userName: user.displayName || user.name || 'Player'
        })
      });

      if (!res.ok) throw new Error('AI service response error');
      const data = await res.json();
      cachedAiRecommendations = data;
      renderAiRecommendations(data);
    } catch (err) {
      console.warn("AI recommendation fetch error, generating local advice:", err);
      const fallback = generateClientFallbackAdvice(currentStandingState);
      renderAiRecommendations(fallback);
    } finally {
      if (refreshIcon) refreshIcon.classList.remove('animate-spin');
    }
  }

  function renderAiRecommendations(data) {
    const container = document.getElementById('axAiRecsContainer');
    const timelineEl = document.getElementById('axAiRecoveryTimeline');
    const sourceBadge = document.getElementById('axAiSourceBadge');
    if (!container) return;

    if (timelineEl && data.recoveryTimeline) {
      timelineEl.textContent = data.recoveryTimeline;
    }

    if (sourceBadge) {
      sourceBadge.textContent = data.source === 'gemini_ai' ? 'ArenaX AI' : 'Guardian AI';
      sourceBadge.className = data.source === 'gemini_ai' 
        ? 'text-[9px] text-amber-300 font-mono bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30'
        : 'text-[9px] text-indigo-300 font-mono bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/30';
    }

    const recs = data.recommendations || [];
    if (recs.length === 0) {
      container.innerHTML = `<div class="p-3 text-center text-xs text-slate-400">All account parameters are optimal. No action required!</div>`;
      return;
    }

    container.innerHTML = recs.map((rec) => {
      let icon = 'fa-shield-alt';
      let iconColor = 'text-indigo-400';
      if (rec.severity === 'high') { icon = 'fa-triangle-exclamation'; iconColor = 'text-rose-400'; }
      else if (rec.severity === 'medium') { icon = 'fa-exclamation-circle'; iconColor = 'text-amber-400'; }
      else if (rec.severity === 'positive') { icon = 'fa-circle-check'; iconColor = 'text-emerald-400'; }

      return `
        <div class="p-3 bg-[#111424] border border-white/5 rounded-xl space-y-2 hover:border-indigo-500/30 transition">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <i class="fas ${icon} ${iconColor} text-xs"></i>
              <span class="text-xs font-bold text-white">${escapeHtml(rec.title)}</span>
            </div>
            <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
              rec.severity === 'high' ? 'bg-rose-500/20 text-rose-300' :
              rec.severity === 'medium' ? 'bg-amber-500/20 text-amber-300' :
              'bg-emerald-500/20 text-emerald-300'
            }">${escapeHtml(rec.impact || 'Action Required')}</span>
          </div>
          <p class="text-[11px] text-slate-300 leading-relaxed">${escapeHtml(rec.description)}</p>
          <div class="pt-1 flex items-center justify-between">
            <span class="text-[9px] text-slate-500 uppercase font-mono tracking-wider">${escapeHtml(rec.category || 'Security')}</span>
            <button onclick="window.handleAxAiAction('${rec.actionTarget || 'view_guidelines'}')" class="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer">
              <span>${escapeHtml(rec.actionLabel || 'Take Action')}</span>
              <i class="fas fa-chevron-right text-[8px]"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function generateClientFallbackAdvice(standingState) {
    const { standing, factors, score, violations } = standingState;
    const f = factors || {};
    const recs = [];
    let recoveryTimeline = "";
    const activeViolations = violations || [];
    const primaryViolation = activeViolations[0];
    const violationSnippet = primaryViolation?.reason ? ` "${primaryViolation.reason}"` : '';

    if (standing === STANDING_LEVELS.AT_RISK) {
      recoveryTimeline = "30-day compliance period required. Complete clean participation to recover.";
      recs.push({
        id: 'fallback-warn',
        title: 'Active Disciplinary Cooldown',
        category: 'moderation',
        severity: 'high',
        description: `Maintain 30 consecutive days of dispute-free matchmaking${violationSnippet}. Zero chat flags will automatically progress your standing to LIMITED.`,
        actionLabel: 'Review Rules',
        actionTarget: 'view_guidelines',
        impact: 'Recovers to LIMITED'
      });
      if (f.isRestricted) {
        recs.push({
          id: 'fallback-appeal',
          title: 'Disciplinary Case Review',
          category: 'moderation',
          severity: 'high',
          description: `Your account is restricted${violationSnippet}. If you believe this action was applied in error, submit an appeal.`,
          actionLabel: 'Contact Support',
          actionTarget: 'support_appeal',
          impact: 'Formal Review'
        });
      }
      if (!f.discordVerified) {
        recs.push({
          id: 'fallback-disc',
          title: 'Link Discord Identity',
          category: 'verification',
          severity: 'medium',
          description: 'Link your authentic Discord profile to substantiate your player identity.',
          actionLabel: 'Link Discord',
          actionTarget: 'link_discord',
          impact: '+15 Security Pts'
        });
      }
    } else if (standing === STANDING_LEVELS.LIMITED) {
      recoveryTimeline = "14 days of sustained dispute-free gameplay will restore ALL GOOD standing.";
      if (f.activeWarnings > 0 || primaryViolation) {
        recs.push({
          id: 'fallback-warn-clear',
          title: '14-Day Clean Play Cooldown',
          category: 'moderation',
          severity: 'medium',
          description: `Active warning recorded${violationSnippet}. Avoid tournament disputes and chat warnings for 14 days. The warning will automatically expire upon completion.`,
          actionLabel: 'Fair Play Rules',
          actionTarget: 'view_guidelines',
          impact: 'Restores ALL GOOD'
        });
      }
      if (f.isRestricted) {
        recs.push({
          id: 'fallback-restr-clear',
          title: 'Feature Restriction Cooldown',
          category: 'moderation',
          severity: 'medium',
          description: 'Complete the designated restriction period without further violations to restore full permissions.',
          actionLabel: 'View Guidelines',
          actionTarget: 'view_guidelines',
          impact: 'Restores Permissions'
        });
      }
      if (!f.discordVerified) {
        recs.push({
          id: 'fallback-disc-link',
          title: 'Verify Discord Account',
          category: 'verification',
          severity: 'medium',
          description: 'Unlock verified tournament brackets and instantly boost your standing score by +15 points.',
          actionLabel: 'Link Discord',
          actionTarget: 'link_discord',
          impact: '+15 Score Points'
        });
      }
    } else {
      recoveryTimeline = `Optimal standing (${score}/100). Maintain regular sportsmanship to keep verified status.`;
      if (!f.discordVerified) {
        recs.push({
          id: 'fallback-disc-opt',
          title: 'Add Discord Verification',
          category: 'security',
          severity: 'low',
          description: 'Solidify maximum account trust and qualify for instant prize pool withdrawals by linking Discord.',
          actionLabel: 'Link Discord',
          actionTarget: 'link_discord',
          impact: '+15 Points'
        });
      }
      recs.push({
        id: 'fallback-clean-streak',
        title: 'Maintain Clean Match Record',
        category: 'fairplay',
        severity: 'positive',
        description: 'You are in full compliance with community rules. Keep up positive sportsmanship in tournament lobbies.',
        actionLabel: 'View Tournaments',
        actionTarget: 'tournaments',
        impact: 'Max Trust'
      });
    }

    return {
      standing,
      score,
      recoveryTimeline,
      recommendations: recs,
      source: 'guardian_ai'
    };
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, (m) => {
      switch (m) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return m;
      }
    });
  }

  function reevaluateAndRender() {
    const user = window.userProfile || window.guestProfile || {};
    const computed = computeAccountStanding(user, latestStandingDoc, latestReports, latestPunishments);
    renderAccountStandingUI(computed, user);
  }

  /**
   * Real-time listeners for current user's standing, profile, and punishment signals
   */
  function initUserStandingListener(uid) {
    if (!uid) return;
    const db = window.fbDb || window.db;
    const fs = window.fsTools || window;
    if (!db || !fs || typeof fs.doc !== 'function') return;

    if (standingUnsubscribe) { standingUnsubscribe(); standingUnsubscribe = null; }
    if (punishmentsUnsubscribe) { punishmentsUnsubscribe(); punishmentsUnsubscribe = null; }

    try {
      const { doc, collection, onSnapshot } = fs;

      // 1. Listen to account_standings/{uid}
      const standingDocRef = doc(db, 'account_standings', uid);
      standingUnsubscribe = onSnapshot(standingDocRef, (snap) => {
        latestStandingDoc = snap.exists() ? snap.data() : null;
        reevaluateAndRender();
      }, (err) => {
        console.warn("Standing listener note:", err);
      });

      // 2. Listen to users/{uid}/punishments subcollection
      try {
        const punishmentsRef = collection(db, 'users', uid, 'punishments');
        punishmentsUnsubscribe = onSnapshot(punishmentsRef, (snap) => {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          latestPunishments = list;
          reevaluateAndRender();
        }, (err) => {
          console.warn("Punishments listener note:", err);
        });
      } catch (pe) {
        console.warn("Could not listen to punishments subcollection:", pe);
      }

      // Initial immediate evaluation
      reevaluateAndRender();
    } catch (e) {
      console.warn("Could not attach standing listeners:", e);
      reevaluateAndRender();
    }
  }

  /**
   * Reads fresh Firestore documents directly and updates UI
   */
  async function refreshUserStanding(uid) {
    if (!uid) {
      reevaluateAndRender();
      return;
    }
    const db = window.fbDb || window.db;
    const fs = window.fsTools || window;
    if (!db || !fs || typeof fs.getDoc !== 'function') {
      reevaluateAndRender();
      return;
    }

    try {
      const { doc, getDoc, collection, getDocs } = fs;
      
      // Fetch standing doc
      try {
        const sSnap = await getDoc(doc(db, 'account_standings', uid));
        if (sSnap.exists()) latestStandingDoc = sSnap.data();
      } catch (e) {}

      // Fetch punishments subcollection
      try {
        const pSnap = await getDocs(collection(db, 'users', uid, 'punishments'));
        const list = [];
        pSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
        latestPunishments = list;
      } catch (e) {}

      // Fetch user doc directly if needed
      try {
        const uSnap = await getDoc(doc(db, 'users', uid));
        if (uSnap.exists()) {
          window.userProfile = { ...uSnap.data(), id: uid, uid };
        }
      } catch (e) {}

      reevaluateAndRender();
    } catch (err) {
      console.warn("Error in refreshUserStanding:", err);
      reevaluateAndRender();
    }
  }

  // ── Global Window Interface ──
  window.accountStanding = {
    STANDING_LEVELS,
    computeAccountStanding,
    renderAccountStandingUI,
    fetchAiStandingRecommendations,
    initUserStandingListener,
    refreshUserStanding,
    getCurrentState: () => currentStandingState
  };

  window.toggleAxProgressionRules = function() {
    const wrap = document.getElementById('axProgressionRulesWrap');
    const icon = document.getElementById('axProgressionRulesIcon');
    if (!wrap) return;
    const isHidden = wrap.classList.contains('hidden');
    if (isHidden) {
      wrap.classList.remove('hidden');
      if (icon) icon.className = 'fas fa-chevron-up text-[10px] transition-transform';
    } else {
      wrap.classList.add('hidden');
      if (icon) icon.className = 'fas fa-chevron-down text-[10px] transition-transform';
    }
  };

  window.explainStandingStage = function(stage) {
    if (stage === 'ALL_GOOD') {
      alert("🟢 ALL GOOD: Your account is in full compliance with ArenaX Terms of Service. All tournament registrations, team creation, and instant payouts are active.");
    } else if (stage === 'LIMITED') {
      alert("🟡 LIMITED: Your account has 1 active warning or temporary restriction. Maintain clean behavior for 14 days to automatically restore ALL GOOD.");
    } else if (stage === 'AT_RISK') {
      alert("🔴 AT RISK: Your account has multiple active warnings or verified disciplinary sanctions. 30-day clean compliance is required to progress to LIMITED.");
    }
  };

  window.handleAxAiAction = function(target) {
    if (target === 'link_discord') {
      const widget = document.getElementById('discordSettingsWidget');
      if (widget) {
        widget.scrollIntoView({ behavior: 'smooth' });
        widget.classList.add('ring-2', 'ring-indigo-500');
        setTimeout(() => widget.classList.remove('ring-2', 'ring-indigo-500'), 2000);
      }
    } else if (target === 'view_guidelines') {
      alert("ArenaX Community Guidelines:\n1. Treat all players with respect in voice and text lobbies.\n2. Exploits, third-party macros, and smurfing are strictly prohibited.\n3. Honor scheduled tournament matches and submit honest dispute proofs.\n4. Reports are thoroughly evaluated for evidence; fair-play players are protected.");
    } else if (target === 'tournaments') {
      const modal = document.getElementById('mAxSecurityModal');
      if (modal) modal.classList.add('hidden');
      if (typeof window.switchTab === 'function') window.switchTab('tournaments');
    } else if (target === 'support_appeal') {
      alert("Disciplinary Appeal:\nTo submit a formal dispute or appeal a warning, open the Support Hub in profile settings or email support@arenax.gg with your match UID and evidence.");
    }
  };

})();
