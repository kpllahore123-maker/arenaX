// ============================================================
// ARENAX - SUPPORTER TITLE GENERATOR (LVL 1 - 4)
// Generates authentic Supporter Title components preserving
// all colors, heart SVGs, gradients, sparkles, wings, and crown.
// ============================================================

export function getSupporterTitleHtml(levelInput = 1, options = {}) {
  const level = Math.min(4, Math.max(1, parseInt(levelInput, 10) || 1));
  const isViewProfile = options.isViewProfile !== false;

  // Level 1: Bronze warm gradient with bordered circle heart icon
  if (level === 1) {
    const html = `
      <div class="ax-st-title ax-st-lvl1" title="Supporter LVL 1">
        <span class="ax-st-icon">
          <svg viewBox="0 0 24 24" fill="#fff" stroke="rgba(0,0,0,.25)" stroke-width=".8" stroke-linejoin="round">
            <path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z"/>
          </svg>
        </span>
        <span class="ax-st-text">Supporter</span>
        <b class="ax-st-lvl">LVL 1</b>
      </div>
    `;
    return isViewProfile ? `<div class="vpp-supporter-title-wrapper vpp-st-l1">${html}</div>` : html;
  }

  // Level 2: Steel blue gradient with gloss sweep shine
  if (level === 2) {
    const html = `
      <div class="ax-st-title ax-st-lvl2" title="Supporter LVL 2">
        <span class="ax-st-icon">
          <svg viewBox="0 0 24 24" fill="#fff" stroke="rgba(0,0,0,.25)" stroke-width=".8" stroke-linejoin="round">
            <path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z"/>
          </svg>
        </span>
        <span class="ax-st-text">Supporter</span>
        <b class="ax-st-lvl">LVL 2</b>
      </div>
    `;
    return isViewProfile ? `<div class="vpp-supporter-title-wrapper vpp-st-l2">${html}</div>` : html;
  }

  // Level 3: Gold aura, rising particles & twinkling sparkles
  if (level === 3) {
    const html = `
      <div class="ax-st-lvl3-wrap" title="Supporter LVL 3">
        <span class="ax-st-aura3"></span>
        <i class="ax-st-pt3" style="--x:28px;--z:4px;--t:2.8s;--d:0s;--dx:-4px"></i>
        <i class="ax-st-pt3" style="--x:52px;--z:3px;--t:3.4s;--d:0.9s;--dx:3px"></i>
        <i class="ax-st-pt3" style="--x:76px;--z:5px;--t:3.0s;--d:1.7s;--dx:-3px"></i>
        <i class="ax-st-pt3" style="--x:98px;--z:3px;--t:3.8s;--d:0.4s;--dx:4px"></i>
        <i class="ax-st-pt3" style="--x:120px;--z:4px;--t:2.6s;--d:2.2s;--dx:-2px"></i>
        <i class="ax-st-pt3" style="--x:142px;--z:5px;--t:3.2s;--d:1.2s;--dx:3px"></i>
        <i class="ax-st-pt3" style="--x:164px;--z:3px;--t:3.6s;--d:2.7s;--dx:-4px"></i>
        <i class="ax-st-pt3" style="--x:186px;--z:4px;--t:2.9s;--d:0.6s;--dx:2px"></i>
        <i class="ax-st-pt3" style="--x:64px;--z:3px;--t:3.5s;--d:3.0s;--dx:-3px"></i>
        <span class="ax-st-sp3" style="right:24px;top:30px;width:11px;height:11px"></span>
        <span class="ax-st-sp3" style="left:34px;top:26px;width:8px;height:8px;animation-delay:.8s"></span>
        <span class="ax-st-sp3" style="left:8px;bottom:22px;width:7px;height:7px;animation-delay:1.4s"></span>
        <div class="ax-st-title ax-st-lvl3">
          <span class="ax-st-icon">
            <svg viewBox="0 0 24 24" fill="#fff" stroke="rgba(0,0,0,.25)" stroke-width=".8" stroke-linejoin="round">
              <path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z"/>
            </svg>
          </span>
          <span class="ax-st-text">Supporter</span>
          <b class="ax-st-lvl">LVL 3</b>
        </div>
      </div>
    `;
    return isViewProfile ? `<div class="vpp-supporter-title-wrapper vpp-st-l3">${html}</div>` : html;
  }

  // Level 4: Royal Animated Wings, Crown, Dual Aura, Conic Border & Rising Particles
  const html = `
    <div class="ax-st-lvl4-wrap" title="Supporter LVL 4">
      <div class="ax-st-stage">
        <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
          <linearGradient id="ax_st_wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a6"/><stop offset=".55" stop-color="#ffc928"/><stop offset="1" stop-color="#e58a00"/></linearGradient>
          <linearGradient id="ax_st_cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a6"/><stop offset=".5" stop-color="#ffc928"/><stop offset="1" stop-color="#e58a00"/></linearGradient>
          <linearGradient id="ax_st_hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#ffc2e6"/></linearGradient>
        </defs></svg>

        <span class="ax-st-aura4"></span>
        <span class="ax-st-floor"></span>
        <svg class="ax-st-wing l" viewBox="0 0 44 44" aria-hidden="true"><g transform="translate(40 22)"><path d="M0 0C7-7 20-9 30-3C21 3 9 5 0 0Z" transform="rotate(-150) scale(0.850)" fill="url(#ax_st_wg)" stroke="#b8740a" stroke-width="1.1" stroke-linejoin="round"/><path d="M0 0C7-7 20-9 30-3C21 3 9 5 0 0Z" transform="rotate(-172) scale(0.935)" fill="url(#ax_st_wg)" stroke="#b8740a" stroke-width="1.1" stroke-linejoin="round"/><path d="M0 0C7-7 20-9 30-3C21 3 9 5 0 0Z" transform="rotate(172) scale(0.850)" fill="url(#ax_st_wg)" stroke="#b8740a" stroke-width="1.1" stroke-linejoin="round"/><path d="M0 0C7-7 20-9 30-3C21 3 9 5 0 0Z" transform="rotate(150) scale(0.680)" fill="url(#ax_st_wg)" stroke="#b8740a" stroke-width="1.1" stroke-linejoin="round"/></g></svg>
        <svg class="ax-st-wing r" viewBox="0 0 44 44" aria-hidden="true"><g transform="translate(40 22)"><path d="M0 0C7-7 20-9 30-3C21 3 9 5 0 0Z" transform="rotate(-150) scale(0.850)" fill="url(#ax_st_wg)" stroke="#b8740a" stroke-width="1.1" stroke-linejoin="round"/><path d="M0 0C7-7 20-9 30-3C21 3 9 5 0 0Z" transform="rotate(-172) scale(0.935)" fill="url(#ax_st_wg)" stroke="#b8740a" stroke-width="1.1" stroke-linejoin="round"/><path d="M0 0C7-7 20-9 30-3C21 3 9 5 0 0Z" transform="rotate(172) scale(0.850)" fill="url(#ax_st_wg)" stroke="#b8740a" stroke-width="1.1" stroke-linejoin="round"/><path d="M0 0C7-7 20-9 30-3C21 3 9 5 0 0Z" transform="rotate(150) scale(0.680)" fill="url(#ax_st_wg)" stroke="#b8740a" stroke-width="1.1" stroke-linejoin="round"/></g></svg>
        <i class="ax-st-pt4 g" style="--x:16px;--z:4px;--t:2.9s;--d:0s;--dx:-4px"></i>
        <i class="ax-st-pt4 v" style="--x:40px;--z:3px;--t:3.6s;--d:0.9s;--dx:3px"></i>
        <i class="ax-st-pt4 g" style="--x:64px;--z:5px;--t:3.1s;--d:1.7s;--dx:-3px"></i>
        <i class="ax-st-pt4 g" style="--x:88px;--z:3px;--t:3.9s;--d:0.4s;--dx:4px"></i>
        <i class="ax-st-pt4 v" style="--x:112px;--z:4px;--t:2.7s;--d:2.2s;--dx:-2px"></i>
        <i class="ax-st-pt4 g" style="--x:136px;--z:5px;--t:3.3s;--d:1.2s;--dx:3px"></i>
        <i class="ax-st-pt4 v" style="--x:160px;--z:3px;--t:3.7s;--d:2.7s;--dx:-4px"></i>
        <i class="ax-st-pt4 g" style="--x:184px;--z:4px;--t:3.0s;--d:0.6s;--dx:2px"></i>
        <i class="ax-st-pt4 g" style="--x:208px;--z:3px;--t:3.5s;--d:1.9s;--dx:-3px"></i>
        <i class="ax-st-pt4 v" style="--x:226px;--z:4px;--t:2.8s;--d:3.0s;--dx:3px"></i>
        <i class="ax-st-pt4 v" style="--x:76px;--z:3px;--t:3.4s;--d:3.2s;--dx:2px"></i>
        <i class="ax-st-pt4 g" style="--x:148px;--z:3px;--t:3.8s;--d:0.2s;--dx:-2px"></i>

        <svg class="ax-st-crown" viewBox="0 0 26 20" aria-hidden="true">
          <path d="M3 17L2 6L8 10L13 2L18 10L24 6L23 17Z" fill="url(#ax_st_cg)" stroke="#a86a00" stroke-width="1.5" stroke-linejoin="round"/>
          <circle cx="2" cy="5" r="2" fill="#ff5fa8"/><circle cx="13" cy="2" r="2.3" fill="#6ee7ff"/><circle cx="24" cy="5" r="2" fill="#ff5fa8"/>
        </svg>
        <span class="ax-st-sp4 g" style="right:-8px;top:-10px;width:12px;height:12px"></span>
        <span class="ax-st-sp4 v" style="left:58px;top:-14px;width:9px;height:9px;animation-delay:.8s"></span>
        <span class="ax-st-sp4 g" style="right:60px;top:-12px;width:8px;height:8px;animation-delay:1.5s"></span>
        <span class="ax-st-sp4 v" style="left:-6px;bottom:-8px;width:8px;height:8px;animation-delay:1.1s"></span>

        <div class="ax-st-pill">
          <span class="ax-st-icon">
            <svg viewBox="0 0 24 24" fill="url(#ax_st_hg)" stroke="rgba(0,0,0,.25)" stroke-width=".8" stroke-linejoin="round"><path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z"/></svg>
          </span>
          <span class="ax-st-text">Supporter</span>
          <b class="ax-st-lvl">LVL 4</b>
        </div>
      </div>
    </div>
  `;
  return isViewProfile ? `<div class="vpp-supporter-title-wrapper vpp-st-l4">${html}</div>` : html;
}

if (typeof window !== 'undefined') {
  window.getSupporterTitleHtml = getSupporterTitleHtml;
}
