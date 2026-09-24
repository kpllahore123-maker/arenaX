import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Wallet,
  MessageSquare,
  Award,
  ShoppingBag,
  User,
  Shield,
  HelpCircle,
  Sparkles,
  Coins,
  Flame,
  CheckCircle2,
  Lock,
  Send,
  PlusCircle,
  Copy,
  ExternalLink,
  ChevronRight,
  LogOut,
  Bell,
  Search,
  Zap,
  Globe,
  Gift
} from 'lucide-react';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  increment,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth, ADMIN_UIDS } from '../firebase';
import { UserProfile, Tournament, DepositRequest } from '../types';
import { AVATAR_FRAMES, BANNER_THEMES } from '../constants/frame';
import { ReportModal } from './ReportModal';
import { AdminPanel } from './AdminPanel';
import { MomentsFeed } from './MomentsFeed';
import { FontPickerModal } from './FontPickerModal';
import { WeeklyRewardsModal } from './WeeklyRewardsModal';
import { VIP_FONTS } from '../types';
import { Film, Type, Palette } from 'lucide-react';

interface PlayerAppProps {
  user: UserProfile;
}

export const PlayerApp: React.FC<PlayerAppProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'tournaments' | 'moments' | 'chat' | 'leaderboard' | 'wallet' | 'shop' | 'profile'>('home');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  const [selectedGame, setSelectedGame] = useState<string>('All');
  const [registeredMatches, setRegisteredMatches] = useState<string[]>([]);
  
  // Modals
  const [showReport, setShowReport] = useState(false);
  const [selectedTourForReport, setSelectedTourForReport] = useState<Tournament | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSupportAi, setShowSupportAi] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  
  // Wallet states
  const [depositAmountPKR, setDepositAmountPKR] = useState<number>(100);
  const [depositMethod, setDepositMethod] = useState<'JazzCash' | 'EasyPaisa'>('JazzCash');
  const [depositTxnId, setDepositTxnId] = useState<string>('');
  const [depositsList, setDepositsList] = useState<DepositRequest[]>([]);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string>('');

  // Global Chat states
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Leaderboard states
  const [topPlayers, setTopPlayers] = useState<any[]>([]);

  // AI Chat states
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    { role: 'model', text: 'Hello warrior! I am your ArenaX Support AI. How can I assist you today with tournaments, deposits, or game rules?' }
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  // Weekly Rewards state
  const [showWeeklyRewards, setShowWeeklyRewards] = useState(false);
  const [rewardChecked, setRewardChecked] = useState(false);
  const [weeklyRewardSummary, setWeeklyRewardSummary] = useState<{
    isEligible: boolean;
    currentDay: number;
    remainingMs: number;
  } | null>(null);

  const isAdmin = ADMIN_UIDS.includes(user.uid) || user.email === 'kpllahore123@gmail.com' || !!user.premium;

  // Auto-check Weekly Reward eligibility when player enters the Arena
  useEffect(() => {
    if (!user.uid || rewardChecked) return;
    let isMounted = true;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/weekly-rewards/status?uid=${encodeURIComponent(user.uid)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.success && isMounted) {
          setWeeklyRewardSummary({
            isEligible: !!data.isEligible,
            currentDay: data.currentDay || 1,
            remainingMs: data.remainingMs || 0
          });
          // Requirement: "The reward popup should appear automatically when the user enters/opens the Arena... only when the user is eligible to claim their next daily reward."
          if (data.isEligible) {
            setShowWeeklyRewards(true);
          }
        }
      } catch (err) {
        console.warn('Error checking weekly rewards status:', err);
      } finally {
        if (isMounted) setRewardChecked(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [user.uid, rewardChecked]);

  // 1. Subscribe to Tournaments
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'tournaments'),
      (snap) => {
        const list: Tournament[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Tournament));
        setTournaments(list);
      },
      (err) => {
        console.warn('Tournaments snapshot warning:', err);
      }
    );
    return () => unsub();
  }, []);

  // 2. Subscribe to user registrations
  useEffect(() => {
    if (!user.uid) return;
    const qReg = query(
      collection(db, 'tournament_registrations'),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(
      qReg,
      (snap) => {
        const matchIds: string[] = [];
        snap.forEach((d) => {
          matchIds.push(d.data().tournamentId);
        });
        setRegisteredMatches(matchIds);
      },
      (err) => {
        console.warn('Registrations snapshot warning:', err);
      }
    );
    return () => unsub();
  }, [user.uid]);

  // 3. Subscribe to user deposits
  useEffect(() => {
    if (!user.uid) return;
    const qDep = query(
      collection(db, 'deposit_requests'),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(
      qDep,
      (snap) => {
        const list: DepositRequest[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as DepositRequest));
        setDepositsList(list.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0)));
      },
      (err) => {
        console.warn('Deposits snapshot warning:', err);
      }
    );
    return () => unsub();
  }, [user.uid]);

  // 4. Subscribe to Live Global Chat
  useEffect(() => {
    const qChat = query(
      collection(db, 'global_chat'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    const unsub = onSnapshot(
      qChat,
      (snap) => {
        const msgs: any[] = [];
        snap.forEach((d) => msgs.push({ id: d.id, ...d.data() }));
        setChatMessages(msgs);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      },
      (err) => {
        console.warn('Global chat snapshot warning:', err);
      }
    );
    return () => unsub();
  }, []);

  // 5. Subscribe to Top Leaderboard Players
  useEffect(() => {
    const qTop = query(
      collection(db, 'users'),
      orderBy('balance', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(
      qTop,
      (snap) => {
        const players: any[] = [];
        snap.forEach((d) => players.push({ id: d.id, ...d.data() }));
        setTopPlayers(players);
      },
      (err) => {
        console.warn('Leaderboard snapshot warning:', err);
      }
    );
    return () => unsub();
  }, []);

  // Handle Tournament Join
  const handleRegisterTournament = async (t: Tournament) => {
    if ((user.balance || 0) < t.entryFee) {
      alert(`Insufficient AX Coins! You have ${user.balance || 0} AX but need ${t.entryFee} AX. Please deposit in your Wallet tab.`);
      setActiveTab('wallet');
      return;
    }

    const confirmJoin = window.confirm(`Join "${t.name}" for ${t.entryFee === 0 ? 'FREE' : `${t.entryFee} AX Coins`}?`);
    if (!confirmJoin) return;

    try {
      if (t.entryFee > 0) {
        await updateDoc(doc(db, 'users', user.uid), {
          balance: increment(-t.entryFee)
        });
      }

      await addDoc(collection(db, 'tournament_registrations'), {
        tournamentId: t.id,
        tournamentName: t.name,
        userId: user.uid,
        userName: user.name,
        userHandle: user.handle,
        registeredAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'tournaments', t.id), {
        registered: increment(1)
      });

      alert(`✅ Registration successful! Room ID & Password will appear here 15 minutes before the match.`);
    } catch (err) {
      console.error(err);
      alert('Failed to register. Please check your connection.');
    }
  };

  // Handle Deposit Submission
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositTxnId.trim() || depositAmountPKR < 50) {
      alert('Please enter a valid Transaction ID and minimum Rs 50 amount.');
      return;
    }

    try {
      await addDoc(collection(db, 'deposit_requests'), {
        userId: user.uid,
        userName: user.name,
        userHandle: user.handle,
        amountPKR: Number(depositAmountPKR),
        amountAX: Number(depositAmountPKR), // 1 PKR = 1 AX Coin
        method: depositMethod,
        txnId: depositTxnId.trim(),
        status: 'pending',
        submittedAt: serverTimestamp()
      });

      setDepositSuccessMsg(`Deposit request submitted! Admin will verify Txn: ${depositTxnId} shortly.`);
      setDepositTxnId('');
      setTimeout(() => setDepositSuccessMsg(''), 6000);
    } catch (e) {
      console.error(e);
      alert('Failed to submit deposit.');
    }
  };

  // Send Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const msg = chatInput.trim();
    setChatInput('');
    try {
      await addDoc(collection(db, 'global_chat'), {
        userId: user.uid,
        userName: user.name,
        userHandle: user.handle,
        userAv: user.av,
        premium: !!user.premium,
        hasBlueTick: !!user.hasBlueTick || !!user.isVerified,
        avatarFrame: user.avatarFrame || 'none',
        text: msg,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Support AI Handler
  const handleAskSupportAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiChatInput.trim() || aiLoading) return;

    const question = aiChatInput.trim();
    setAiChatInput('');
    const newHistory = [...aiMessages, { role: 'user' as const, text: question }];
    setAiMessages(newHistory);
    setAiLoading(true);

    try {
      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          history: newHistory,
          userProfile: user,
          tournaments
        })
      });
      const data = await res.json();
      setAiMessages((prev) => [...prev, { role: 'model' as const, text: data.text || 'I could not process your query right now. Please try again.' }]);
    } catch (err) {
      setAiMessages((prev) => [...prev, { role: 'model' as const, text: 'Support AI is temporarily offline. You can contact an admin directly in the Chat tab.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Upgrade to Premium Pass
  const handleBuyPremium = async () => {
    if ((user.balance || 0) < 150) {
      alert('You need 150 AX Coins to upgrade to VIP Premium Pass! Please top up your wallet.');
      setActiveTab('wallet');
      return;
    }
    const ok = window.confirm('Unlock Lifetime ArenaX VIP Premium Pass for 150 AX Coins?');
    if (!ok) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(-150),
        premium: true,
        goldenNameEnabled: true,
        hasBlueTick: true
      });
      alert('🎉 Congratulations! You are now an official ArenaX VIP Member with a Golden Name and Blue Tick badge!');
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTournaments = tournaments.filter((t) => {
    if (selectedGame === 'All') return true;
    return t.game.toLowerCase().includes(selectedGame.toLowerCase());
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#090b10] text-[#f4f6fb] pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#0e111a]/95 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-rose-500 to-indigo-600 p-[1.5px] shadow-lg">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center font-black text-sm tracking-tighter text-amber-400">
              AX
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wide text-white">ARENA<span className="text-amber-400">X</span></span>
              {user.premium && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-gradient-to-r from-amber-400 to-rose-500 text-black uppercase">
                  VIP
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 font-medium">Esports Tournament Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Weekly Rewards Launcher Chip */}
          <button
            onClick={() => setShowWeeklyRewards(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all shadow-sm ${
              weeklyRewardSummary?.isEligible
                ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/25 border-amber-400 text-amber-300 animate-pulse'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-amber-500/40'
            }`}
            title="Weekly Rewards"
          >
            <Gift size={14} className={weeklyRewardSummary?.isEligible ? 'text-amber-400 animate-bounce' : 'text-amber-400/80'} />
            <span className="text-xs font-bold">
              {weeklyRewardSummary?.isEligible ? 'Claim Daily' : `Day ${weeklyRewardSummary?.currentDay || 1}`}
            </span>
          </button>

          {/* Wallet Chip */}
          <button
            onClick={() => setActiveTab('wallet')}
            className="flex items-center gap-1.5 bg-zinc-900 border border-amber-500/30 px-3 py-1.5 rounded-full hover:border-amber-400 transition-colors shadow-sm"
          >
            <Coins size={14} className="text-amber-400" />
            <span className="text-xs font-bold text-amber-300">{(user.balance || 0).toLocaleString()}</span>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">AX</span>
          </button>

          {/* AI Support button */}
          <button
            onClick={() => setShowSupportAi(true)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-indigo-400 hover:text-indigo-300"
            title="Support AI"
          >
            <Sparkles size={16} />
          </button>

          {/* Admin panel launcher */}
          {isAdmin && (
            <button
              onClick={() => setShowAdmin(true)}
              className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30"
              title="Admin Panel"
            >
              <Shield size={16} />
            </button>
          )}

          {/* Sign out */}
          <button
            onClick={() => signOut(auth)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 space-y-6">
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Hero Welcome Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1f2e] via-[#12141f] to-[#0a0c12] border border-amber-500/20 p-6 shadow-2xl">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={user.av}
                      alt={user.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400/80 shadow-md"
                    />
                    {user.hasBlueTick && (
                      <span className="absolute -bottom-1 -right-1 bg-sky-500 text-white p-0.5 rounded-full text-[10px]" title="Verified Player">
                        ✓
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className={`text-xl font-black ${user.goldenNameEnabled ? 'golden-name-shimmer' : 'text-white'} ${user.selectedFont || ''}`}>
                        {user.name}
                      </h1>
                      {user.premium && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                          VIP PASS
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">ID: @{user.handle}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs font-semibold">
                      <span className="text-amber-400 flex items-center gap-1">
                        <Coins size={12} /> {(user.balance || 0).toLocaleString()} AX Coins
                      </span>
                      <span className="text-zinc-500">•</span>
                      <span className="text-rose-400 flex items-center gap-1">
                        <Flame size={12} /> Rank Tier: Diamond
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('tournaments')}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-black font-extrabold text-xs shadow-lg hover:opacity-95 transition-all flex items-center gap-2"
                  >
                    <Trophy size={14} /> Join Matches
                  </button>
                  <button
                    onClick={() => setActiveTab('wallet')}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-bold text-xs hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                  >
                    <PlusCircle size={14} /> Deposit
                  </button>
                </div>
              </div>

              {/* Pitch grid ambient visual */}
              <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Weekly Rewards Quick Card */}
            <div
              onClick={() => setShowWeeklyRewards(true)}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-zinc-900/60 border border-amber-500/30 p-4 shadow-md flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 p-[1.5px] shadow-sm flex items-center justify-center shrink-0">
                  <div className="w-full h-full bg-[#12141f] rounded-[10px] flex items-center justify-center">
                    <Gift size={20} className="text-amber-400 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-white">Weekly Rewards System</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Day {weeklyRewardSummary?.currentDay || 1}/7
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {weeklyRewardSummary?.isEligible
                      ? '🎉 Daily reward is ready to claim! Tap to collect your AX Coins.'
                      : 'Cooldown active (24h). Tap to view 7-day progression & Day 7 Mystery Gift.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-3 py-1.5 rounded-xl font-extrabold text-xs shadow transition-all ${
                  weeklyRewardSummary?.isEligible
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black animate-pulse'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                }`}>
                  {weeklyRewardSummary?.isEligible ? 'Claim Reward' : 'View Streak'}
                </span>
                <ChevronRight size={16} className="text-zinc-500 group-hover:text-amber-400 transition-colors" />
              </div>
            </div>

            {/* Quick Action Bento Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div
                onClick={() => setActiveTab('tournaments')}
                className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/50 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                  <Trophy size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Live Tourneys</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{tournaments.length} Active matches</p>
                </div>
              </div>

              <div
                onClick={() => setActiveTab('moments')}
                className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-rose-500/50 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                  <Film size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h3 className="font-bold text-sm text-white">Moments</h3>
                    <span className="text-[9px] px-1 bg-amber-500/20 text-amber-400 font-bold rounded">1080p</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">Clips & highlights</p>
                </div>
              </div>

              <div
                onClick={() => setActiveTab('chat')}
                className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-indigo-500/50 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Global Chat</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Real-time room</p>
                </div>
              </div>

              <div
                onClick={() => setActiveTab('leaderboard')}
                className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/50 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Leaderboard</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Top earners & wins</p>
                </div>
              </div>

              <div
                onClick={() => setActiveTab('shop')}
                className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-emerald-500/50 cursor-pointer transition-all flex flex-col justify-between col-span-2 sm:col-span-1"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">VIP Shop</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Frames & perks</p>
                </div>
              </div>
            </div>

            {/* Featured Matches Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame size={18} className="text-amber-400" /> Featured Tournaments
                </h2>
                <button
                  onClick={() => setActiveTab('tournaments')}
                  className="text-xs text-amber-400 hover:underline font-semibold"
                >
                  View All ({tournaments.length})
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tournaments.slice(0, 4).map((t) => {
                  const isRegistered = registeredMatches.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-800 text-amber-400">
                              {t.game}
                            </span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              t.status === 'ongoing' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {t.status}
                            </span>
                          </div>
                          <h3 className="font-bold text-sm text-white mt-2">{t.name}</h3>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-amber-400">{t.prize}</span>
                          <p className="text-[10px] text-zinc-500">Prize Pool</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                        <div className="text-xs text-zinc-400">
                          Fee: <span className="font-bold text-white">{t.entryFee === 0 ? 'Free' : `${t.entryFee} AX`}</span>
                        </div>

                        {isRegistered ? (
                          <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 size={12} /> Registered
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRegisterTournament(t)}
                            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs"
                          >
                            Join Match
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TOURNAMENTS */}
        {activeTab === 'tournaments' && (
          <div className="space-y-5">
            {/* Filter tags */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {['All', 'BGMI', 'Free Fire', 'COD Mobile', 'Valorant'].map((game) => (
                <button
                  key={game}
                  onClick={() => setSelectedGame(game)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedGame === game
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  {game}
                </button>
              ))}
            </div>

            {/* Match Cards */}
            <div className="space-y-4">
              {filteredTournaments.length === 0 ? (
                <div className="text-center py-16 bg-zinc-900/40 rounded-2xl border border-zinc-800 text-zinc-500 text-xs">
                  No tournaments found for category "{selectedGame}". Check back soon!
                </div>
              ) : (
                filteredTournaments.map((t) => {
                  const isRegistered = registeredMatches.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      className="p-5 rounded-2xl bg-gradient-to-r from-zinc-900/90 via-[#11141e] to-zinc-900/90 border border-zinc-800 hover:border-amber-500/40 transition-all space-y-4 shadow-lg"
                    >
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              {t.game}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              t.status === 'ongoing' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {t.status.toUpperCase()}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-white mt-2">{t.name}</h3>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-black text-amber-400">{t.prize}</span>
                          <p className="text-[10px] text-zinc-400">Total Prize Pool</p>
                        </div>
                      </div>

                      {/* Room Key Box (Reveals if registered & ongoing) */}
                      {isRegistered && t.roomDetails?.roomId && (
                        <div className="p-3 bg-indigo-950/40 border border-indigo-500/40 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-black text-indigo-400 tracking-wider">Custom Room Key:</span>
                            <div className="text-xs font-mono font-bold text-white mt-0.5">
                              Room ID: <span className="text-amber-400">{t.roomDetails.roomId}</span> | Pass: <span className="text-amber-400">{t.roomDetails.roomPass || 'N/A'}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${t.roomDetails?.roomId} / ${t.roomDetails?.roomPass}`);
                              alert('Room ID and Password copied to clipboard!');
                            }}
                            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs"
                            title="Copy Room Key"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-400">
                        <div className="flex items-center gap-4">
                          <span>Entry: <strong className="text-white">{t.entryFee === 0 ? 'Free' : `${t.entryFee} AX`}</strong></span>
                          <span>Slots: <strong className="text-white">{t.registered || 0}/{t.maxPlayers || 100}</strong></span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedTourForReport(t);
                              setShowReport(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-red-400 text-xs font-semibold"
                          >
                            Report Hacker
                          </button>

                          {isRegistered ? (
                            <span className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 font-extrabold text-xs flex items-center gap-1.5">
                              <CheckCircle2 size={14} /> Slot Booked
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRegisterTournament(t)}
                              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md transition-all"
                            >
                              Register Now
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB: MOMENTS */}
        {activeTab === 'moments' && (
          <MomentsFeed user={user} onNavigateToShop={() => setActiveTab('shop')} />
        )}

        {/* TAB 3: GLOBAL CHAT */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[70vh] bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-3 border-b border-zinc-800 bg-zinc-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-emerald-400 animate-pulse" />
                <h2 className="font-bold text-sm text-white">Global Player Lounge</h2>
              </div>
              <span className="text-[10px] text-zinc-400 font-semibold">Live Real-time</span>
            </div>

            {/* Chat message stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {chatMessages.map((m) => {
                const isMe = m.userId === user.uid;
                return (
                  <div key={m.id} className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <img
                      src={m.userAv || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.userId}`}
                      alt={m.userName}
                      className="w-8 h-8 rounded-full border border-zinc-700 object-cover shrink-0"
                    />
                    <div className={`max-w-[75%] rounded-2xl p-3 text-xs ${
                      isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-zinc-800/90 text-zinc-200 rounded-tl-none border border-zinc-700/50'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-bold text-[11px] text-amber-300">{m.userName}</span>
                        {m.hasBlueTick && <span className="text-sky-400 text-[10px]" title="Verified">✓</span>}
                        {m.premium && <span className="text-[8px] px-1 bg-amber-500/30 text-amber-300 rounded font-black">VIP</span>}
                      </div>
                      <p className="leading-relaxed break-words">{m.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input box */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message to global arena players..."
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/60"
              />
              <button
                type="submit"
                className="p-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-amber-500/30 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">Global Hall of Fame</h2>
                <p className="text-xs text-zinc-400">Top ranked players by balance & trophies</p>
              </div>
              <Trophy size={28} className="text-amber-400" />
            </div>

            <div className="space-y-2">
              {topPlayers.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 text-center font-black text-sm ${
                      idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-amber-600' : 'text-zinc-500'
                    }`}>
                      #{idx + 1}
                    </span>
                    <img
                      src={p.av || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.uid}`}
                      alt={p.name}
                      className="w-9 h-9 rounded-xl object-cover border border-zinc-700"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white">{p.name || 'Anonymous'}</span>
                        {(p.hasBlueTick || p.isVerified) && <span className="text-sky-400 text-xs">✓</span>}
                      </div>
                      <p className="text-[10px] text-zinc-400">@{p.handle || 'player'}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-amber-400">{(p.balance || 0).toLocaleString()} AX</span>
                    <p className="text-[10px] text-zinc-500">Coins</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: WALLET */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            {/* Balance Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-950 border border-amber-500/40 shadow-2xl flex items-center justify-between flex-wrap gap-4">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Available Wallet Balance</span>
                <div className="text-3xl font-black text-amber-400 mt-1 flex items-center gap-2">
                  <Coins size={28} />
                  <span>{(user.balance || 0).toLocaleString()}</span>
                  <span className="text-sm font-semibold text-zinc-300">AX Coins</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">1 AX Coin = 1 PKR (Instant Tournament Registration)</p>
              </div>

              <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 text-xs space-y-1">
                <div className="text-zinc-400">JazzCash Account: <strong className="text-white">0302-4686897</strong></div>
                <div className="text-zinc-400">EasyPaisa Account: <strong className="text-white">0315-9876543</strong></div>
                <div className="text-zinc-400">Title: <strong className="text-amber-400">ArenaX Esports Official</strong></div>
              </div>
            </div>

            {/* Deposit Form */}
            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <PlusCircle size={16} className="text-amber-400" /> Submit Deposit Request
              </h3>

              {depositSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
                  {depositSuccessMsg}
                </div>
              )}

              <form onSubmit={handleDepositSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Payment Method</label>
                    <select
                      value={depositMethod}
                      onChange={(e) => setDepositMethod(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="JazzCash">JazzCash (0302-4686897)</option>
                      <option value="EasyPaisa">EasyPaisa (0315-9876543)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Amount (PKR / AX)</label>
                    <input
                      type="number"
                      min="50"
                      value={depositAmountPKR}
                      onChange={(e) => setDepositAmountPKR(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Transaction ID (Txn ID)</label>
                    <input
                      type="text"
                      placeholder="e.g. 10482958291"
                      value={depositTxnId}
                      onChange={(e) => setDepositTxnId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md transition-all"
                >
                  Submit Deposit Request
                </button>
              </form>
            </div>

            {/* Deposit History */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-white">Your Deposit Records</h3>
              <div className="space-y-2">
                {depositsList.length === 0 ? (
                  <div className="text-center py-8 bg-zinc-900/40 rounded-xl border border-zinc-800 text-zinc-500 text-xs">
                    No transactions yet.
                  </div>
                ) : (
                  depositsList.map((d) => (
                    <div key={d.id} className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">Rs {d.amountPKR}</span>
                          <span className="text-zinc-400">({d.method})</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Txn ID: {d.txnId}</p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                        d.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                        d.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {d.status.toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: VIP SHOP */}
        {activeTab === 'shop' && (
          <div className="space-y-6">
            {/* VIP Pass Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-600/20 border border-amber-500/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black text-amber-400 uppercase tracking-widest">ArenaX Exclusive Pass</span>
                <h2 className="text-2xl font-black text-white mt-1">VIP Premium Pass</h2>
                <p className="text-xs text-zinc-300 mt-1 max-w-md">
                  Unlock permanent verified blue tick, custom golden shimmering username, access to high-roller VIP tournaments, and priority 24/7 support.
                </p>
              </div>

              {user.premium ? (
                <div className="px-5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} /> VIP ACTIVE
                </div>
              ) : (
                <button
                  onClick={handleBuyPremium}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-black font-black text-xs shadow-lg hover:opacity-95"
                >
                  Upgrade for 150 AX
                </button>
              )}
            </div>

            {/* Avatar Frames */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-white">Avatar Border Frames</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {AVATAR_FRAMES.map((f) => (
                  <div key={f.id} className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl flex flex-col items-center text-center space-y-3">
                    <img
                      src={user.av}
                      alt={f.name}
                      className={`w-12 h-12 rounded-xl object-cover ${f.previewClass}`}
                    />
                    <div>
                      <h4 className="font-bold text-xs text-white">{f.name}</h4>
                      <p className="text-[10px] text-amber-400 font-semibold">{f.price === 0 ? 'Free' : `${f.price} AX`}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: PROFILE */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="p-6 bg-zinc-900/80 border border-zinc-800 rounded-3xl space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={user.av}
                  alt={user.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className={`text-lg font-black ${user.goldenNameEnabled ? 'golden-name-shimmer' : 'text-white'} ${user.selectedFont || ''}`}>
                      {user.name}
                    </h2>
                    {user.hasBlueTick && <span className="text-sky-400 text-sm">✓</span>}
                  </div>
                  <p className="text-xs text-zinc-400">UID: @{user.handle}</p>
                  <p className="text-[11px] text-zinc-500 mt-1">{user.email || 'Guest Player'}</p>
                </div>
              </div>

              {/* VIP / Premium Custom Font Card */}
              <div className="p-4 bg-gradient-to-r from-blue-950/40 via-zinc-950/60 to-indigo-950/40 border border-blue-500/30 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-lg font-bold text-white shrink-0 ${user.selectedFont || 'font-poppins'}`}>
                    Gg
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-blue-400" /> VIP Custom Font
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded font-bold uppercase border border-blue-500/30">
                        12 Fonts
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      Current: <span className={`text-amber-400 font-bold ${user.selectedFont || 'font-poppins'}`}>{VIP_FONTS.find(f => f.className === (user.selectedFont || 'font-poppins'))?.name || 'Poppins'}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="btnProfileOpenFontPicker"
                  onClick={() => setShowFontPicker(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Choose Font</span>
                </button>
              </div>

              <div className="pt-4 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                  <span className="text-base font-black text-amber-400">{(user.balance || 0).toLocaleString()}</span>
                  <p className="text-[10px] text-zinc-400">AX Coins</p>
                </div>
                <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                  <span className="text-base font-black text-emerald-400">{registeredMatches.length}</span>
                  <p className="text-[10px] text-zinc-400">Matches Joined</p>
                </div>
                <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                  <span className="text-base font-black text-rose-400">Diamond</span>
                  <p className="text-[10px] text-zinc-400">Rank Tier</p>
                </div>
                <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                  <span className="text-base font-black text-indigo-400">{user.premium ? 'VIP Pass' : 'Standard'}</span>
                  <p className="text-[10px] text-zinc-400">Status</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#0c0e17]/95 backdrop-blur-lg border-t border-zinc-800/80 z-40 px-2 py-2">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'home' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Flame size={18} />
            <span className="text-[10px]">Home</span>
          </button>

          <button
            onClick={() => setActiveTab('tournaments')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'tournaments' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Trophy size={18} />
            <span className="text-[10px]">Matches</span>
          </button>

          <button
            onClick={() => setActiveTab('moments')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold transition-colors relative ${
              activeTab === 'moments' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Film size={18} />
            <span className="text-[10px]">Moments</span>
            {user.premium && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'chat' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <MessageSquare size={18} />
            <span className="text-[10px]">Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'leaderboard' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Award size={18} />
            <span className="text-[10px]">Ranks</span>
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'wallet' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Wallet size={18} />
            <span className="text-[10px]">Wallet</span>
          </button>
        </div>
      </nav>

      {/* Support AI Modal */}
      {showSupportAi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#10131c] border border-indigo-500/30 rounded-2xl w-full max-w-lg h-[600px] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-3.5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-400" />
                <h3 className="font-bold text-sm text-white">ArenaX Support AI</h3>
              </div>
              <button
                onClick={() => setShowSupportAi(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg bg-zinc-900"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {aiMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-zinc-800/90 text-zinc-200 rounded-tl-none border border-zinc-700/50'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800/90 text-zinc-400 rounded-2xl rounded-tl-none p-3 text-xs border border-zinc-700/50 animate-pulse">
                    Support AI is typing...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleAskSupportAi} className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2">
              <input
                type="text"
                value={aiChatInput}
                onChange={(e) => setAiChatInput(e.target.value)}
                placeholder="Ask about deposits, matches, rules..."
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Cheater Report Modal */}
      {showReport && (
        <ReportModal
          isOpen={showReport}
          onClose={() => {
            setShowReport(false);
            setSelectedTourForReport(null);
          }}
          userId={user.uid}
          userName={user.name}
          tournamentId={selectedTourForReport?.id}
          tournamentName={selectedTourForReport?.name}
        />
      )}

      {/* Admin Panel Modal */}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}

      {/* VIP Custom Font Picker Modal */}
      <FontPickerModal
        isOpen={showFontPicker}
        onClose={() => setShowFontPicker(false)}
        currentUser={user}
        onUpgradeVIP={() => {
          setShowFontPicker(false);
          setActiveTab('shop');
        }}
      />

      {/* Weekly Rewards System Modal */}
      <WeeklyRewardsModal
        isOpen={showWeeklyRewards}
        userId={user.uid}
        onClose={() => setShowWeeklyRewards(false)}
        onClaimSuccess={(rewardAmount, isMystery, newBalance) => {
          setWeeklyRewardSummary((prev) => ({
            isEligible: false,
            currentDay: prev ? (prev.currentDay >= 7 ? 1 : prev.currentDay + 1) : 1,
            remainingMs: 24 * 60 * 60 * 1000
          }));
        }}
      />
    </div>
  );
};
