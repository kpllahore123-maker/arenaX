import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';

interface WeeklyRewardsModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onClaimSuccess?: (rewardAmount: number, isMystery: boolean, newBalance: number) => void;
}

export const WeeklyRewardsModal: React.FC<WeeklyRewardsModalProps> = ({
  userId,
  isOpen,
  onClose,
  onClaimSuccess
}) => {
  const [currentDay, setCurrentDay] = useState<number>(1); // 1-based (1..7)
  const [isEligible, setIsEligible] = useState<boolean>(false);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const rewards = [15, 20, 25, 30, 35, 40];

  // Fetch status from server
  const fetchStatus = async () => {
    try {
      setLoading(true);
      let data: any = null;
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/weekly-rewards/status?uid=${encodeURIComponent(userId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('application/json')) {
          data = await res.json();
        }
      } catch (fetchErr) {
        // Handled via fallback or local calculation
      }

      if (data && data.success) {
        setCurrentDay(data.currentDay || 1);
        setIsEligible(data.isEligible);
        setRemainingMs(data.remainingMs || 0);
      } else {
        // Default eligible day 1 state
        setCurrentDay(1);
        setIsEligible(true);
        setRemainingMs(0);
      }
    } catch (err) {
      console.warn('Weekly reward status notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchStatus();
    }
  }, [isOpen, userId]);

  // Live countdown timer for remaining cooldown
  useEffect(() => {
    if (remainingMs <= 0) return;
    const interval = setInterval(() => {
      setRemainingMs((prev) => {
        if (prev <= 1000) {
          setIsEligible(true);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingMs]);

  // Format remaining cooldown to HH:MM:SS
  const formatCountdown = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const showToastNotification = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2200);
  };

  const handleClaim = async () => {
    if (claiming || !isEligible) return;
    setClaiming(true);
    setErrorMessage('');

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/weekly-rewards/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ uid: userId })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to claim weekly reward.');
      }

      const msg = data.isMystery
        ? `Mystery Gift claimed! +${data.rewardAmount} AX Coins`
        : `+${data.rewardAmount} AX Coins claimed!`;

      showToastNotification(msg);
      setIsEligible(false);
      setRemainingMs(24 * 60 * 60 * 1000); // Set 24h cooldown
      setCurrentDay(data.nextDay || (currentDay >= 7 ? 1 : currentDay + 1));

      if (onClaimSuccess) {
        onClaimSuccess(data.rewardAmount, data.isMystery, data.newBalance);
      }

      // Close popup automatically after claim success as instructed
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err: any) {
      console.error('Claim error:', err);
      setErrorMessage(err.message || 'Error claiming reward.');
    } finally {
      setClaiming(false);
    }
  };

  if (!isOpen) return null;

  // Active index (0 to 6) representing Day 1 to Day 7
  const activeIndex = currentDay - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn select-none">
      {/* Container Card */}
      <div className="relative w-full max-w-[322px] bg-white rounded-[18px] pt-[70px] px-5 pb-[22px] shadow-[0_10px_40px_rgba(0,0,0,0.5)] font-sans mt-20">
        
        {/* Close button if user already claimed today or needs to dismiss */}
        {!isEligible && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-zinc-200/80 hover:bg-zinc-300 text-zinc-600 flex items-center justify-center text-sm font-bold transition-all z-20"
            title="Close"
          >
            ✕
          </button>
        )}

        {/* Mascot SVG */}
        <div className="absolute -top-[100px] left-0 right-0 h-[124px] pointer-events-none">
          <svg viewBox="0 0 320 124" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7be3ff" />
                <stop offset="1" stopColor="#2aa8ff" />
              </linearGradient>
              <radialGradient id="cg" cx=".35" cy=".3" r=".8">
                <stop offset="0" stopColor="#ffe680" />
                <stop offset="1" stopColor="#ffb800" />
              </radialGradient>
            </defs>
            {/* Gift box (open, tilted) with rising star */}
            <ellipse cx="68" cy="36" rx="30" ry="26" fill="#ffd23a" opacity=".22" style={{ filter: 'blur(6px)' }} />
            <g transform="rotate(-14 68 90)">
              <rect x="46" y="62" width="44" height="42" rx="4" fill="#ff5a1f" />
              <rect x="63" y="62" width="10" height="42" fill="#ffd23a" />
              <ellipse cx="68" cy="62" rx="22" ry="5.5" fill="#b8300a" />
              <ellipse cx="68" cy="61" rx="17" ry="3.5" fill="#fff0a0" />
            </g>
            <g transform="rotate(20 66 32)">
              <polygon
                points="66,12 70.7,23.5 83.1,24.4 73.6,32.5 76.6,44.6 66,38 55.4,44.6 58.4,32.5 48.9,24.4 61.3,23.5"
                fill="#ffd23a"
                stroke="#f5a300"
                strokeWidth="2"
                strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0 0 6px #ffd23a)' }}
              />
            </g>
            <path className="tw" style={{ animationDelay: '0s' }} d="M36 14Q36 20 42 20Q36 20 36 26Q36 20 30 20Q36 20 36 14Z" fill="#fff4b0" />
            <path className="tw" style={{ animationDelay: '0.6s' }} d="M98 9Q98 14 103 14Q98 14 98 19Q98 14 93 14Q98 14 98 9Z" fill="#fff4b0" />
            <path className="tw" style={{ animationDelay: '1.1s' }} d="M94 44Q94 48 98 48Q94 48 94 52Q94 48 90 48Q94 48 94 44Z" fill="#fff4b0" />
            <path className="tw" style={{ animationDelay: '0.3s' }} d="M28 42.5Q28 46 31.5 46Q28 46 28 49.5Q28 46 24.5 46Q28 46 28 42.5Z" fill="#fff4b0" />
            <circle className="tw" style={{ animationDelay: '0.2s' }} cx="52" cy="5" r="1.8" fill="#ffd23a" />
            <circle className="tw" style={{ animationDelay: '0.8s' }} cx="82" cy="6" r="1.5" fill="#ffd23a" />
            <circle className="tw" style={{ animationDelay: '1.3s' }} cx="102" cy="32" r="1.8" fill="#ffd23a" />
            <circle className="tw" style={{ animationDelay: '0.5s' }} cx="40" cy="36" r="1.4" fill="#ffd23a" />
            
            {/* Arm + Hand holding coin */}
            <path d="M204 92 C222 88 232 70 238 52" stroke="#2aa8ff" strokeWidth="16" strokeLinecap="round" fill="none" />
            <circle cx="238" cy="50" r="11" fill="#5fd4ff" />
            
            {/* Coin with pinwheel design */}
            <g transform="rotate(-18 250 30)" style={{ filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.3))' }}>
              <svg x="222" y="2" width="56" height="56" viewBox="0 0 1024 1024">
                <circle cx="512" cy="512" r="500" fill="#ffb800" />
                <circle cx="512" cy="512" r="430" fill="url(#cg)" />
                <g transform="translate(512 512) scale(.62) translate(-512 -512)" stroke="#ff8a00" strokeWidth="124" strokeLinecap="round">
                  <line x1="350" y1="263" x2="495" y2="408" />
                  <line x1="760" y1="350" x2="615" y2="495" />
                  <line x1="263" y1="673" x2="408" y2="528" />
                  <line x1="528" y1="615" x2="673" y2="760" />
                </g>
              </svg>
            </g>
            
            {/* Head */}
            <path d="M126 30 L118 6 L146 22Z M194 30 L202 6 L174 22Z" fill="#2aa8ff" stroke="#1d8fe0" strokeWidth="2" strokeLinejoin="round" />
            <path d="M104 100 C96 56 116 18 160 18 S224 56 216 100Z" fill="url(#bg)" stroke="#1d8fe0" strokeWidth="2.5" />
            <ellipse cx="140" cy="32" rx="18" ry="7" fill="#fff" opacity=".4" transform="rotate(-15 140 32)" />
            <ellipse cx="139" cy="56" rx="7.5" ry="10" fill="#0b3a5a" />
            <ellipse cx="181" cy="56" rx="7.5" ry="10" fill="#0b3a5a" />
            <circle cx="141.5" cy="52" r="3" fill="#fff" />
            <circle cx="183.5" cy="52" r="3" fill="#fff" />
            <circle cx="137" cy="60" r="1.4" fill="#fff" />
            <circle cx="179" cy="60" r="1.4" fill="#fff" />
            <ellipse cx="122" cy="72" rx="8" ry="5" fill="#ff8fb0" opacity=".65" />
            <ellipse cx="198" cy="72" rx="8" ry="5" fill="#ff8fb0" opacity=".65" />
            <path d="M148 70 Q160 88 172 70Z" fill="#0b3a5a" />
            <path d="M153 78 Q160 84 167 78 Q160 74 153 78Z" fill="#ff6b8a" />
          </svg>
        </div>

        {/* 3D Folded Ribbon Header */}
        <div className="ribbon-container absolute -top-3 left-1/2 -translate-x-1/2 w-[calc(100%+20px)] z-10 h-[46px] bg-gradient-to-b from-[#ffd23a] to-[#ffb800] rounded-[6px] flex items-center justify-center shadow-[0_4px_0_#e89a00]">
          {/* Ribbon ends */}
          <div className="ribbon-wing-left" />
          <div className="ribbon-wing-right" />
          <h1 className="text-[19px] font-black text-[#f26a00] tracking-[0.2px] drop-shadow-sm">
            Weekly Rewards
          </h1>
        </div>

        {/* 7-Day Rewards Grid */}
        <div className="grid grid-cols-12 gap-2 mt-[18px]">
          {rewards.map((amount, i) => {
            const isDayDone = isEligible ? i < activeIndex : i <= activeIndex;
            const isDayActive = isEligible && i === activeIndex;

            return (
              <div
                key={i}
                className={`col-span-3 rounded-[8px] overflow-hidden text-center flex flex-col transition-transform duration-150 ${
                  isDayActive
                    ? 'border-[1.5px] border-[#f26a00] bg-gradient-to-b from-[#ffb340] to-[#f28a1a] shadow-sm'
                    : isDayDone
                    ? 'border-[1.5px] border-[#ffab3d]/40 bg-[#fff8e7]'
                    : 'border-[1.5px] border-[#ffab3d] bg-[#fff1cf]'
                }`}
              >
                <div
                  className={`text-[11.5px] font-extrabold py-[3px] text-white ${
                    isDayActive ? 'bg-[#f26a00]' : isDayDone ? 'bg-[#ffab3d]/70' : 'bg-[#ffab3d]'
                  }`}
                >
                  Day {i + 1}d{isDayDone && ' ✓'}
                </div>
                <div className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-0 min-h-[76px] ${isDayDone ? 'opacity-40' : ''}`}>
                  {/* Coin SVG */}
                  <svg
                    className={`w-[30px] h-[30px] ${isDayActive ? 'drop-shadow-[0_0_6px_#fff]' : ''}`}
                    viewBox="0 0 1024 1024"
                  >
                    <circle cx="512" cy="512" r="500" fill="#ffb800" />
                    <circle cx="512" cy="512" r="430" fill="#ffd23a" />
                    <g
                      transform="translate(512 512) scale(.62) translate(-512 -512)"
                      stroke="#ff8a00"
                      strokeWidth="124"
                      strokeLinecap="round"
                    >
                      <line x1="350" y1="263" x2="495" y2="408" />
                      <line x1="760" y1="350" x2="615" y2="495" />
                      <line x1="263" y1="673" x2="408" y2="528" />
                      <line x1="528" y1="615" x2="673" y2="760" />
                    </g>
                  </svg>
                  <div className={`text-[9.5px] font-bold ${isDayActive ? 'text-white font-extrabold' : 'text-[#e08a1a]'}`}>
                    Gold x{amount}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Day 7: Mystery Gift */}
          {(() => {
            const isDay7Done = isEligible ? activeIndex > 6 : activeIndex >= 6 && !isEligible;
            const isDay7Active = isEligible && activeIndex === 6;

            return (
              <div
                className={`col-span-6 rounded-[8px] overflow-hidden text-center flex flex-col transition-transform duration-150 ${
                  isDay7Active
                    ? 'border-[1.5px] border-[#f26a00] bg-gradient-to-b from-[#ffb340] to-[#f28a1a] shadow-sm'
                    : isDay7Done
                    ? 'border-[1.5px] border-[#ffab3d]/40 bg-[#fff8e7]'
                    : 'border-[1.5px] border-[#ffab3d] bg-[#fff1cf]'
                }`}
              >
                <div
                  className={`text-[11.5px] font-extrabold py-[3px] text-white ${
                    isDay7Active ? 'bg-[#f26a00]' : isDay7Done ? 'bg-[#ffab3d]/70' : 'bg-[#ffab3d]'
                  }`}
                >
                  Day 7d{isDay7Done && ' ✓'}
                </div>
                <div className={`flex-1 flex flex-row items-center justify-center gap-2.5 py-2 px-0 min-h-[76px] ${isDay7Done ? 'opacity-40' : ''}`}>
                  {/* Gift SVG */}
                  <svg className={`w-10 h-10 ${isDay7Active ? 'drop-shadow-[0_0_6px_#fff]' : ''}`} viewBox="0 0 40 40">
                    <rect x="5" y="16" width="30" height="21" rx="3" fill="#ff8a2a" />
                    <rect x="3" y="11" width="34" height="8" rx="3" fill="#ff6a1a" />
                    <rect x="18" y="11" width="5" height="26" fill="#ffd23a" />
                    <path d="M20 11C10 1 6 10 14 11zM20 11c10-10 14-1 6 0z" fill="#ffd23a" />
                  </svg>
                  <div className={`text-[11px] font-extrabold ${isDay7Active ? 'text-white' : 'text-[#e0701a]'}`}>
                    Mystery Gift
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Error notice if claim failed */}
        {errorMessage && (
          <p className="text-red-500 text-xs font-semibold text-center mt-2.5">
            {errorMessage}
          </p>
        )}

        {/* Claim Button */}
        <button
          onClick={handleClaim}
          disabled={!isEligible || claiming}
          className={`w-full mt-5 rounded-[30px] py-[13px] text-[17px] font-extrabold text-white transition-all select-none ${
            isEligible && !claiming
              ? 'bg-gradient-to-b from-[#ff9a1f] to-[#ff7f00] shadow-[0_3px_0_#d96a00] active:translate-y-[2px] active:shadow-[0_1px_0_#d96a00] cursor-pointer'
              : 'bg-[#c9c9c9] shadow-[0_3px_0_#a5a5a5] cursor-not-allowed opacity-90'
          }`}
        >
          {claiming ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Claiming...
            </span>
          ) : isEligible ? (
            'Claim'
          ) : remainingMs > 0 ? (
            `Next in ${formatCountdown(remainingMs)}`
          ) : (
            'Claimed'
          )}
        </button>

        {/* Cooldown indicator text if in cooldown */}
        {!isEligible && remainingMs > 0 && (
          <p className="text-[10px] text-zinc-400 font-semibold text-center mt-2">
            24-hour server lock • Next reward unlocks automatically
          </p>
        )}
      </div>

      {/* Floating Toast Notification */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#222] text-white px-[18px] py-2.5 rounded-[20px] text-sm font-semibold shadow-xl z-50 pointer-events-none transition-all duration-300 ${
          showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        {toastMessage}
      </div>

      {/* Custom Styles for Ribbon Wings and Sparkling Animation */}
      <style>{`
        .ribbon-wing-left {
          position: absolute;
          top: 0;
          left: -14px;
          width: 28px;
          height: 50px;
          background: linear-gradient(#f9b500 46px, #e89a00 46px);
          z-index: -1;
          clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%);
        }
        .ribbon-wing-right {
          position: absolute;
          top: 0;
          right: -14px;
          width: 28px;
          height: 50px;
          background: linear-gradient(#f9b500 46px, #e89a00 46px);
          z-index: -1;
          clip-path: polygon(0 0, 100% 0, calc(100% - 10px) 50%, 100% 100%, 0 100%);
        }
        .tw {
          animation: tw 1.8s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes tw {
          0%, 100% { opacity: 0.35; transform: scale(0.6); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};
