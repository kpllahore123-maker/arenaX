/**
 * ArenaX Account Standing & Security Guardian Module
 * Handles 3-stage standing evaluation (ALL GOOD, LIMITED, AT RISK),
 * transparent factor scoring, AI-powered personalized recommendations,
 * automatic progression rules, and admin panel synchronization.
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

  /**
   * Evaluates user account signals and computes mathematical score and standing level
   */
  function computeAccountStanding(user, standingDoc = null, reports = []) {
    const profile = user || {};
    const docData = standingDoc || {};

    // 1. Check for active manual admin override
    if (docData.overrideActive && docData.overrideLevel && STANDING_LEVELS[docData.overrideLevel]) {
      const overrideLevel = docData.overrideLevel;
      const baseScore = overrideLevel === STANDING_LEVELS.ALL_GOOD ? 95 : overrideLevel === STANDING_LEVELS.LIMITED ? 65 : 30;
      return {
        standing: overrideLevel,
        score: baseScore,
        isOverridden: true,
        overrideReason: docData.overrideReason || 'Administrative decision',
        overrideBy: docData.overrideBy || 'Admin',
        overrideAt: docData.overrideAt || null,
        factors: extractFactors(profile, docData, reports, overrideLevel)
      };
    }

    // 2. Extract verified moderation signals
    const isBanned = Boolean(
      profile.banned === true ||
      profile.isBanned === true ||
      profile.accountStatus === 'permanently_blocked' ||
      profile.accountStatus === 'temporarily_blocked' ||
      docData.isBanned === true
    );

    const isRestricted = Boolean(
      profile.restricted === true ||
      profile.isRestricted === true ||
      profile.accountStatus === 'restricted' ||
      docData.isRestricted === true
    );

    // Warnings count: combine profile warningCount and docData activeWarnings
    const activeWarnings = Math.max(
      Number(profile.warningCount) || 0,
      Number(docData.activeWarnings) || 0,
      Array.isArray(docData.warnings) ? docData.warnings.filter(w => !w.resolved && !w.expired).length : 0
    );

    // Verification signals
    const isDiscordVerified = Boolean(profile.discordVerified === true || docData.discordVerified === true);
    const isEmailVerified = Boolean(profile.emailVerified !== false); // Default true for normal signed-in users

    // Reports: ArenaX principle: Raw reports NEVER automatically penalize without verified evidence
    const rawReportsCount = Array.isArray(reports) ? reports.length : (Number(docData.rawReportsCount) || 0);
    const verifiedReportsCount = Array.isArray(reports) 
      ? reports.filter(r => r.verified === true || r.status === 'resolved_punished').length 
      : (Number(docData.verifiedReportsCount) || 0);

    // Fair play streak & activity
    const tournamentsPlayed = Number(profile.tournamentsPlayed) || Number(docData.tournamentsPlayed) || 1;
    const cleanStreakDays = Number(docData.cleanStreakDays) || (activeWarnings === 0 ? 30 : 5);

    // 3. Mathematical Scoring (Base: 80 points)
    let score = 80;

    // Bonuses
    if (isDiscordVerified) score += 15; // +15 for verified Discord identity
    if (isEmailVerified) score += 5;   // +5 for verified email
    if (tournamentsPlayed >= 3) score += 5; // +5 for established fair-play track record

    // Deductions
    if (activeWarnings === 1) {
      score -= 35; // Drops to Limited range
    } else if (activeWarnings >= 2) {
      score -= 60; // Drops to At Risk range
    }

    if (isRestricted) {
      score -= 30;
    }

    if (verifiedReportsCount > 0) {
      score -= (verifiedReportsCount * 15);
    }

    if (isBanned) {
      score = 15;
    }

    // Clamp score 0 - 100
    score = Math.max(5, Math.min(100, score));

    // 4. Determine Standing Level
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
      }
    };
  }

  function extractFactors(profile, docData, reports, currentStanding) {
    return {
      activeWarnings: Number(profile.warningCount || docData.activeWarnings || 0),
      isBanned: Boolean(profile.banned || docData.isBanned),
      isRestricted: Boolean(profile.restricted || docData.isRestricted),
      discordVerified: Boolean(profile.discordVerified || docData.discordVerified),
      emailVerified: Boolean(profile.emailVerified !== false),
      rawReportsCount: Array.isArray(reports) ? reports.length : (Number(docData.rawReportsCount) || 0),
      verifiedReportsCount: Number(docData.verifiedReportsCount || 0),
      tournamentsPlayed: Number(profile.tournamentsPlayed || 1),
      cleanStreakDays: Number(docData.cleanStreakDays || 14),
      reportsProtected: true
    };
  }

  /**
   * Renders the Account Standing UI inside mAxSecurityModal and settings button
   */
  function renderAccountStandingUI(standingData, userProfile) {
    if (!standingData) return;
    const { standing, score, isOverridden, overrideReason, factors } = standingData;
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
    if (subtitle) {
      const discordText = factors.discordVerified ? 'Discord Linked' : 'Discord Unlinked';
      subtitle.textContent = `Standing: ${standing.replace('_', ' ')} • ${discordText}`;
    }

    // 2. Update Header Overview inside mAxSecurityModal
    const userAv = document.getElementById('axStandingUserAv');
    if (userAv && userProfile) {
      userAv.src = userProfile.avatar || userProfile.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${userProfile.uid || 'user'}`;
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
        contextMsg.textContent = "Thank you for upholding ArenaX's Terms of Service and Community Guidelines. If you have a violation, it will appear here.";
      } else if (standing === STANDING_LEVELS.LIMITED) {
        contextMsg.textContent = isOverridden 
          ? `Administrative Override: ${overrideReason || 'Account placed in limited standing'}. Complete requested actions to restore status.`
          : `Your account has active restrictions or warnings. Complete the cooldown period with dispute-free participation to restore All Good status.`;
      } else {
        contextMsg.textContent = isOverridden
          ? `Administrative Override: ${overrideReason || 'Account marked at risk by moderation council'}. Submit an appeal for review.`
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

    // 4. Update "Why is my account at this level?" factors
    updateFactorsList(standingData);

    // 5. Trigger AI Recommendations
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
    const { standing, factors, isOverridden, overrideReason } = standingData;
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

    if (cachedAiRecommendations && !forceRefresh) {
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
          score: currentStandingState.score,
          factors: currentStandingState.factors,
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
      sourceBadge.textContent = data.source === 'gemini_ai' ? 'Gemini 2.5' : 'Guardian AI';
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
    const { standing, factors, score } = standingState;
    const f = factors || {};
    const recs = [];
    let recoveryTimeline = "";

    if (standing === STANDING_LEVELS.AT_RISK) {
      recoveryTimeline = "30-day compliance period required. Complete clean participation to recover.";
      recs.push({
        id: 'fallback-warn',
        title: 'Active Disciplinary Cooldown',
        category: 'moderation',
        severity: 'high',
        description: 'Maintain 30 consecutive days of dispute-free matchmaking. Zero chat flags will automatically progress your standing to LIMITED.',
        actionLabel: 'Review Rules',
        actionTarget: 'view_guidelines',
        impact: 'Recovers to LIMITED'
      });
      if (!f.discordVerified) {
        recs.push({
          id: 'fallback-disc',
          title: 'Link Discord Identity',
          category: 'verification',
          severity: 'medium',
          description: 'Link your authentic Discord profile to substantiate your identity to moderation auditors.',
          actionLabel: 'Link Discord',
          actionTarget: 'link_discord',
          impact: '+15 Security Pts'
        });
      }
    } else if (standing === STANDING_LEVELS.LIMITED) {
      recoveryTimeline = "14 days of sustained dispute-free gameplay will restore ALL GOOD standing.";
      if (f.activeWarnings > 0) {
        recs.push({
          id: 'fallback-warn-clear',
          title: '14-Day Clean Play Cooldown',
          category: 'moderation',
          severity: 'medium',
          description: 'Avoid tournament disputes and chat warnings for 14 days. The warning will automatically expire upon completion.',
          actionLabel: 'Fair Play Rules',
          actionTarget: 'view_guidelines',
          impact: 'Restores ALL GOOD'
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

  /**
   * Real-time listener for current user's standing and signals
   */
  function initUserStandingListener(uid) {
    if (!uid || !window.fbDb || !window.fsTools) return;
    if (standingUnsubscribe) standingUnsubscribe();

    try {
      const { doc, onSnapshot } = window.fsTools;
      const standingDocRef = doc(window.fbDb, 'account_standings', uid);

      standingUnsubscribe = onSnapshot(standingDocRef, (snap) => {
        const standingData = snap.exists() ? snap.data() : null;
        const user = window.userProfile || window.guestProfile || {};
        const computed = computeAccountStanding(user, standingData, []);
        renderAccountStandingUI(computed, user);
      }, (err) => {
        console.warn("Standing listener error (falling back to user profile):", err);
        const user = window.userProfile || window.guestProfile || {};
        const computed = computeAccountStanding(user, null, []);
        renderAccountStandingUI(computed, user);
      });
    } catch (e) {
      console.warn("Could not attach standing listener:", e);
    }
  }

  // ── Global Window Interface ──
  window.accountStanding = {
    STANDING_LEVELS,
    computeAccountStanding,
    renderAccountStandingUI,
    fetchAiStandingRecommendations,
    initUserStandingListener,
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
        // Pulse highlight widget
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
