import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  increment,
  arrayUnion,
  limit
} from 'firebase/firestore';
import {
  UserProfile,
  Tournament,
  Registration,
  CheatReport,
  SupportTicket,
  SupportMessage
} from '../types';

interface AdminPanelProps {
  onSwitchToPlayer: () => void;
  adminEmail: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onSwitchToPlayer, adminEmail }) => {
  const [activePage, setActivePage] = useState<'pgDash' | 'pgUsers' | 'pgPayments' | 'pgTours' | 'pgReports' | 'pgRegistrations' | 'pgSupport' | 'pgGlobalChat'>('pgDash');
  const [clockStr, setClockEl] = useState('');

  // Firestore collections states
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [reports, setReports] = useState<CheatReport[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [globalMessages, setGlobalMessages] = useState<any[]>([]);
  const [chatReports, setChatReports] = useState<any[]>([]);

  // Filters & Searches
  const [userFilter, setUserFilter] = useState<'all' | 'premium' | 'banned'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [payFilter, setPayFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [regFilter, setRegFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  // Support Chat Modal state
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // General Action Modal state
  const [showGeneralModal, setShowGeneralModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalBody, setModalBody] = useState<React.ReactNode | null>(null);
  const [modalConfirmAction, setModalConfirmAction] = useState<(() => void) | null>(null);

  // Ban Modal state
  const [showBanModal, setShowBanModal] = useState(false);
  const [banUser, setBanUser] = useState<UserProfile | null>(null);
  const [banType, setBanType] = useState<'full' | 'tournament'>('full');
  const [banDuration, setBanDuration] = useState<string>('30'); // in days, or 'permanent'
  const [banReason, setBanReason] = useState<string>('');

  // Admin Global Chat broadcasts
  const [adminChatText, setAdminChatText] = useState('');
  const [adminChatType, setAdminChatType] = useState<'admin' | 'announcement'>('admin');

  // Mute Modal state
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [muteUser, setMuteUser] = useState<UserProfile | null>(null);
  const [muteDuration, setMuteDuration] = useState<string>('1'); // in hours, or 'permanent'
  const [muteReason, setMuteReason] = useState<string>('');

  // Custom Notifications states
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifTargetType, setNotifTargetType] = useState<'single' | 'all'>('single');
  const [notifTargetUser, setNotifTargetUser] = useState<UserProfile | null>(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifSending, setNotifSending] = useState(false);

  // Add Tournament inputs
  const [showTourModal, setShowTourModal] = useState(false);
  const [editingTour, setEditingTour] = useState<Tournament | null>(null);
  const [tName, setTName] = useState('');
  const [tGame, setTGame] = useState('Grand RP Mobile');
  const [tPrize, setTPrize] = useState('');
  const [tMax, setTMax] = useState('32');
  const [tDate, setTDate] = useState('');
  const [tTime, setTTime] = useState('');
  const [tFee, setTFee] = useState('Free');
  const [tTeamType, setTTeamType] = useState<'Solo' | 'Duo (2 Players)' | 'Trio (3 Players)' | 'Squad (4 Players)'>('Solo');
  const [tStatus, setTStat] = useState<'upcoming' | 'live' | 'ended'>('upcoming');

  // Update PKR Clock
  useEffect(() => {
    const updateTime = () => {
      const pkr = new Date().toLocaleString('en-PK', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Karachi'
      });
      setClockEl(pkr);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to Users
  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as UserProfile);
      });
      setUsers(list);
    }, (err) => {
      console.warn("Failed to listen to users:", err);
    });
  }, []);

  // Listen to Tournaments
  useEffect(() => {
    const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const list: Tournament[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Tournament);
      });
      setTournaments(list);
    }, (err) => {
      console.warn("Failed to listen to tournaments:", err);
    });
  }, []);

  // Listen to Registrations
  useEffect(() => {
    const q = query(collection(db, 'tournament_registrations'), orderBy('submittedAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const list: Registration[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Registration);
      });
      setRegistrations(list);
    }, (err) => {
      console.warn("Failed to listen to registrations:", err);
    });
  }, []);

  // Listen to Cheat Reports
  useEffect(() => {
    const q = query(collection(db, 'tournament_reports'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const list: CheatReport[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as CheatReport);
      });
      setReports(list);
    }, (err) => {
      console.warn("Failed to listen to reports:", err);
    });
  }, []);

  // Listen to Support Tickets
  useEffect(() => {
    const q = query(collection(db, 'support_tickets'), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const list: SupportTicket[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as SupportTicket);
      });
      setTickets(list);
    }, (err) => {
      console.warn("Failed to listen to tickets:", err);
    });
  }, []);

  // Listen to Global Chat Room messages for Admin Spectator
  useEffect(() => {
    const q = query(collection(db, 'global_chat'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setGlobalMessages(list);
    }, (err) => {
      console.warn("Failed to listen to global chat:", err);
    });
  }, []);

  // Listen to Abusive Chat Reports for Admin
  useEffect(() => {
    const q = query(collection(db, 'chat_reports'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setChatReports(list);
    }, (err) => {
      console.warn("Failed to listen to chat reports:", err);
    });
  }, []);

  // Listen to specific active Ticket support messages
  useEffect(() => {
    if (!activeTicket || !showSupportModal) {
      setSupportMessages([]);
      return;
    }
    const q = query(collection(db, 'support', activeTicket.ticketId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const msgs: SupportMessage[] = [];
      snap.forEach((d) => {
        msgs.push(d.data() as SupportMessage);
      });
      setSupportMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => {
      console.warn("Failed to listen to chat messages:", err);
    });
    return () => unsub();
  }, [activeTicket, showSupportModal]);

  // Support DM Chat send response
  const handleSendAdminReply = async () => {
    if (!replyText.trim() || !activeTicket) return;
    const txt = replyText.trim();
    setReplyText('');
    try {
      await addDoc(collection(db, 'support', activeTicket.ticketId, 'messages'), {
        text: txt,
        sender: 'admin',
        senderName: 'Staff Admin',
        createdAt: serverTimestamp()
      });
      // Update ticket last state
      await updateDoc(doc(db, 'support_tickets', activeTicket.id), {
        lastMsg: `[Admin]: ${txt}`,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      alert('Error replying: ' + error.message);
    }
  };

  // Support ticket Delete / Clean logs
  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this Support Chat ticket?\nThis will clear it from active logs.')) return;
    try {
      await deleteDoc(doc(db, 'support_tickets', ticketId));
      alert('Support ticket deleted successfully! ✅');
    } catch (e: any) {
      alert('Error deleting ticket: ' + e.message);
    }
  };

  // Give / Remove user Premium status
  const handleTogglePremium = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', user.id), {
        premium: !user.premium
      });
      alert(`Premium status updated for ${user.name}! ✅`);
    } catch (error: any) {
      alert('Error updating Premium: ' + error.message);
    }
  };

  // Ban confirmation processing
  const handleProcessBan = async () => {
    if (!banUser) return;
    if (!banReason.trim()) {
      alert('Please enter a ban reason!');
      return;
    }

    const untilDate = banDuration === 'permanent'
      ? null
      : new Date(Date.now() + parseInt(banDuration) * 24 * 60 * 60 * 1000).toISOString();

    try {
      await updateDoc(doc(db, 'users', banUser.id), {
        banned: true,
        banType: banType,
        banReason: banReason.trim(),
        banUntil: untilDate
      });
      setShowBanModal(false);
      setBanReason('');
      setBanUser(null);
      alert(`User ${banUser.name} has been banned successfully!`);
    } catch (err: any) {
      alert('Ban Error: ' + err.message);
    }
  };

  // Lift ban
  const handleUnbanUser = async (user: UserProfile) => {
    if (!confirm(`Are you sure you want to lift the ban for ${user.name}?`)) return;
    try {
      await updateDoc(doc(db, 'users', user.id), {
        banned: false,
        banType: 'none',
        banReason: '',
        banUntil: null
      });
      alert(`Ban lifted for ${user.name}!`);
    } catch (err: any) {
      alert('Unban Error: ' + err.message);
    }
  };

  // Mute action handlers
  const handleProcessMute = async () => {
    if (!muteUser) return;
    if (!muteReason.trim()) {
      alert('Please enter a mute reason!');
      return;
    }

    const untilDate = muteDuration === 'permanent'
      ? null
      : new Date(Date.now() + parseFloat(muteDuration) * 60 * 60 * 1000).toISOString(); // duration in hours

    try {
      await updateDoc(doc(db, 'users', muteUser.id), {
        muted: true,
        muteReason: muteReason.trim(),
        muteUntil: untilDate
      });
      setShowMuteModal(false);
      setMuteReason('');
      setMuteUser(null);
      alert(`User ${muteUser.name} has been muted successfully! 🔇`);
    } catch (err: any) {
      alert('Mute Error: ' + err.message);
    }
  };

  const handleUnmuteUser = async (user: UserProfile) => {
    if (!confirm(`Are you sure you want to unmute ${user.name}?`)) return;
    try {
      await updateDoc(doc(db, 'users', user.id), {
        muted: false,
        muteReason: '',
        muteUntil: null
      });
      alert(`User ${user.name} has been unmuted successfully! 🔊`);
    } catch (err: any) {
      alert('Unmute Error: ' + err.message);
    }
  };

  // Adjust User balance
  const handleAdjustBalance = async (user: UserProfile) => {
    const amtStr = prompt(`Enter amount to adjust for ${user.name} (e.g. 500 to add, -200 to subtract):`);
    if (!amtStr) return;
    const adj = parseFloat(amtStr);
    if (isNaN(adj) || adj === 0) {
      alert('Invalid amount!');
      return;
    }

    const msg = prompt(`Enter custom message for this transaction (optional):`, adj > 0 ? 'Admin Credit' : 'Admin Cut');
    const colorStr = prompt(`Enter text color ('green', 'red', 'golden', 'blue' or leave empty for default):`, adj > 0 ? 'green' : 'red');

    // Create transaction object
    const newTx = {
      id: `tx_${Math.floor(100000 + Math.random() * 900000)}`,
      type: 'adjustment',
      amount: adj,
      status: 'approved',
      account: adj > 0 ? 'Admin Add' : 'Admin Cut',
      timestamp: new Date().toLocaleString(),
      message: msg || (adj > 0 ? 'Admin Coins Added' : 'Admin Coins Deducted'),
      color: colorStr ? colorStr.toLowerCase().trim() : (adj > 0 ? 'green' : 'red')
    };

    try {
      await updateDoc(doc(db, 'users', user.id), {
        balance: increment(adj),
        transactions: arrayUnion(newTx)
      });
      
      // Send real-time notification to user
      await addDoc(collection(db, 'notifications'), {
        userId: user.id,
        title: adj > 0 ? 'Coins Added! 🪙' : 'Coins Deducted! ⚠️',
        message: msg || (adj > 0 ? `Admin added ${adj} AX Coins to your wallet.` : `Admin deducted ${Math.abs(adj)} AX Coins from your wallet.`),
        body: msg || (adj > 0 ? `Admin added ${adj} AX Coins to your wallet.` : `Admin deducted ${Math.abs(adj)} AX Coins from your wallet.`),
        type: 'wallet',
        read: false,
        createdAt: serverTimestamp()
      });

      alert(`Balance adjusted by ${adj > 0 ? '+' : ''}${adj} AX Coins!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Custom Notifications Sender
  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      alert('Please enter both Title and Message Body!');
      return;
    }

    setNotifSending(true);

    try {
      if (notifTargetType === 'all') {
        if (users.length === 0) {
          alert('No users found to send notifications to!');
          setNotifSending(false);
          return;
        }

        const promises = users.map((u) => {
          return addDoc(collection(db, 'notifications'), {
            userId: u.id,
            message: `${notifTitle}: ${notifBody}`,
            title: notifTitle.trim(),
            body: notifBody.trim(),
            type: 'broadcast',
            read: false,
            createdAt: serverTimestamp()
          });
        });

        await Promise.all(promises);
        alert(`Broadcast notification successfully sent to all ${users.length} players! 📢`);
      } else if (notifTargetUser) {
        await addDoc(collection(db, 'notifications'), {
          userId: notifTargetUser.id,
          message: `${notifTitle}: ${notifBody}`,
          title: notifTitle.trim(),
          body: notifBody.trim(),
          type: 'custom',
          read: false,
          createdAt: serverTimestamp()
        });
        alert(`Notification successfully sent to ${notifTargetUser.name}! ✅`);
      }

      setShowNotifModal(false);
      setNotifTitle('');
      setNotifBody('');
      setNotifTargetUser(null);
    } catch (err: any) {
      alert('Failed to send notification: ' + err.message);
    } finally {
      setNotifSending(false);
    }
  };

  // Tournament Slot incremental approves
  const handleApproveRegistration = async (reg: Registration) => {
    try {
      // Find tournament to check entry fee
      let feeAmount = 0;
      const localTour = tournaments.find(t => t.id === reg.tournamentId);
      if (localTour && localTour.entryFee) {
        const feeString = localTour.entryFee;
        if (!feeString.toLowerCase().includes('free')) {
          const matches = feeString.match(/\d+/);
          if (matches) feeAmount = parseInt(matches[0], 10);
        }
      } else {
        // Fallback: Fetch directly from firestore
        const tourDoc = await getDoc(doc(db, 'tournaments', reg.tournamentId));
        if (tourDoc.exists()) {
          const feeString = tourDoc.data().entryFee || '';
          if (feeString && !feeString.toLowerCase().includes('free')) {
            const matches = feeString.match(/\d+/);
            if (matches) feeAmount = parseInt(matches[0], 10);
          }
        }
      }

      // Deduct fee atomically from user balance
      if (feeAmount > 0) {
        await updateDoc(doc(db, 'users', reg.userId), {
          balance: increment(-feeAmount)
        });

        // Write transaction history log
        await addDoc(collection(db, 'deposit_requests'), {
          userId: reg.userId,
          userName: reg.userName || '',
          userEmail: '',
          type: 'withdrawal',
          method: 'Tournament Fee',
          amountPKR: 0,
          amountAX: feeAmount,
          txnId: 'REG-' + Math.floor(100000 + Math.random() * 900000),
          status: 'approved',
          submittedAt: serverTimestamp()
        });
      }

      // 1. Approve registration document
      await updateDoc(doc(db, 'tournament_registrations', reg.id), {
        status: 'approved'
      });

      // 2. Increment Tournament registered count in Firestore atomically
      await updateDoc(doc(db, 'tournaments', reg.tournamentId), {
        registered: increment(1)
      });

      // 3. Send Notification to User
      await addDoc(collection(db, 'notifications'), {
        userId: reg.userId,
        message: `🎉 Slots confirmed! Your registration entry for "${reg.tournamentName}" has been APPROVED. Good luck in the matches! ${feeAmount > 0 ? `${feeAmount} AX Coins have been deducted from your wallet.` : ''}`,
        type: 'approved',
        read: false,
        createdAt: serverTimestamp()
      });

      alert(`Slot Registration Approved! ${feeAmount > 0 ? `${feeAmount} AX Coins deducted.` : ''} Slot counter incremented. ✅`);
    } catch (e: any) {
      alert('Approval Error: ' + e.message);
    }
  };

  const handleRejectRegistration = async (reg: Registration) => {
    if (!confirm('Decline this registration application?')) return;
    try {
      await updateDoc(doc(db, 'tournament_registrations', reg.id), {
        status: 'rejected'
      });

      // Send rejection notification
      await addDoc(collection(db, 'notifications'), {
        userId: reg.userId,
        message: `❌ Your registration application for "${reg.tournamentName}" was declined. Please verify your TXN details or contact support.`,
        type: 'rejected',
        read: false,
        createdAt: serverTimestamp()
      });

      alert('Registration declined.');
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Cheat reports action handlers
  const handleResolveReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, 'tournament_reports', reportId), {
        status: 'resolved'
      });
      alert('Report marked as Resolved! ✅');
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this cheat report permanently?')) return;
    try {
      await deleteDoc(doc(db, 'tournament_reports', reportId));
      alert('Report deleted.');
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  // Save or Edit tournament
  const handleSaveTournament = async () => {
    if (!tName.trim()) {
      alert('Please enter the tournament name!');
      return;
    }

    const tData = {
      name: tName.trim(),
      game: tGame.trim(),
      prize: tPrize.trim() || 'TBD',
      maxPlayers: parseInt(tMax) || 32,
      date: tDate.trim() || 'TBA',
      time: tTime.trim() || 'TBA',
      entryFee: tFee.trim() || 'Free',
      teamType: tTeamType,
      status: tStatus
    };

    try {
      if (editingTour) {
        // Edit existing
        await updateDoc(doc(db, 'tournaments', editingTour.id), tData);
        alert('Tournament updated successfully! ✅');
      } else {
        // Create new
        await addDoc(collection(db, 'tournaments'), {
          ...tData,
          registered: 0,
          createdAt: serverTimestamp()
        });
        alert('Tournament created successfully! ✅');
      }
      setShowTourModal(false);
      setEditingTour(null);
      // Reset inputs
      setTName('');
      setTPrize('');
      setTMax('32');
      setTDate('');
      setTTime('');
      setTFee('Free');
    } catch (error: any) {
      alert('Tournament Save Error: ' + error.message);
    }
  };

  const handleOpenEditTour = (tour: Tournament) => {
    setEditingTour(tour);
    setTName(tour.name);
    setTGame(tour.game);
    setTPrize(tour.prize);
    setTMax(tour.maxPlayers.toString());
    setTDate(tour.date);
    setTTime(tour.time);
    setTFee(tour.entryFee);
    setTTeamType(tour.teamType || 'Solo');
    setTStat(tour.status);
    setShowTourModal(true);
  };

  const handleDeleteTour = async (tourId: string) => {
    if (!confirm('Are you sure you want to delete this tournament permanently? This action is irreversible.')) return;
    try {
      await deleteDoc(doc(db, 'tournaments', tourId));
      alert('Tournament deleted permanently!');
    } catch (error: any) {
      alert(error.message);
    }
  };

  // User Page Filtering & Search
  const filteredUsers = users.filter((u) => {
    if (userFilter === 'premium' && !u.premium) return false;
    if (userFilter === 'banned' && !u.banned) return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div id="adminApp" className="block min-h-screen bg-[#07090f] text-[#f0f2ff] font-sans">
      <style>{`
        .ff-title { font-family: 'Rajdhani', sans-serif; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #1e2440; border-radius: 4px; }
      `}</style>

      <div className="flex h-screen overflow-hidden">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-[220px] bg-[#0f1220] border-r border-[#1e2440] flex flex-col flex-shrink-0">
          <div className="p-5 border-b border-[#1e2440] text-center">
            <h2 className="ff-title text-xl font-extrabold tracking-wider">
              Arena<span className="text-[#e8404a]">X</span> ADMIN
            </h2>
            <p className="text-[10px] text-[#4a5070] tracking-widest uppercase mt-0.5">Control Panel</p>
          </div>

          <nav className="flex-1 py-4 overflow-y-auto space-y-1.5">
            <div className="text-[10px] text-[#4a5070] uppercase font-bold tracking-wider px-5 py-2">Analytics</div>
            
            <button
              onClick={() => setActivePage('pgDash')}
              className={`w-full text-left px-5 py-2.5 text-sm font-semibold flex items-center gap-3 transition ${activePage === 'pgDash' ? 'text-[#f0c040] bg-[#f0c040]/10 border-l-3 border-[#f0c040]' : 'text-[#8890b0] hover:bg-[#141828] hover:text-white border-l-3 border-transparent'}`}
            >
              <i className="fas fa-chart-line w-4 text-center text-xs"></i>
              Dashboard
            </button>

            <button
              onClick={() => setActivePage('pgUsers')}
              className={`w-full text-left px-5 py-2.5 text-sm font-semibold flex items-center gap-3 transition ${activePage === 'pgUsers' ? 'text-[#f0c040] bg-[#f0c040]/10 border-l-3 border-[#f0c040]' : 'text-[#8890b0] hover:bg-[#141828] hover:text-white border-l-3 border-transparent'}`}
            >
              <i className="fas fa-users w-4 text-center text-xs"></i>
              Users Management
            </button>

            <div className="text-[10px] text-[#4a5070] uppercase font-bold tracking-wider px-5 py-2 pt-4">Tournaments</div>

            <button
              onClick={() => setActivePage('pgTours')}
              className={`w-full text-left px-5 py-2.5 text-sm font-semibold flex items-center gap-3 transition ${activePage === 'pgTours' ? 'text-[#f0c040] bg-[#f0c040]/10 border-l-3 border-[#f0c040]' : 'text-[#8890b0] hover:bg-[#141828] hover:text-white border-l-3 border-transparent'}`}
            >
              <i className="fas fa-trophy w-4 text-center text-xs"></i>
              Events List
            </button>

            <button
              onClick={() => setActivePage('pgRegistrations')}
              className={`w-full text-left px-5 py-2.5 text-sm font-semibold flex items-center gap-3 transition ${activePage === 'pgRegistrations' ? 'text-[#f0c040] bg-[#f0c040]/10 border-l-3 border-[#f0c040]' : 'text-[#8890b0] hover:bg-[#141828] hover:text-white border-l-3 border-transparent'}`}
            >
              <i className="fas fa-clipboard-list w-4 text-center text-xs"></i>
              Registrations ({registrations.filter(r => r.status === 'pending').length})
            </button>

            <button
              onClick={() => setActivePage('pgReports')}
              className={`w-full text-left px-5 py-2.5 text-sm font-semibold flex items-center gap-3 transition ${activePage === 'pgReports' ? 'text-[#f0c040] bg-[#f0c040]/10 border-l-3 border-[#f0c040]' : 'text-[#8890b0] hover:bg-[#141828] hover:text-white border-l-3 border-transparent'}`}
            >
              <i className="fas fa-flag w-4 text-center text-xs"></i>
              Cheat Reports ({reports.filter(r => r.status === 'open').length})
            </button>

            <div className="text-[10px] text-[#4a5070] uppercase font-bold tracking-wider px-5 py-2 pt-4">Customer Logs</div>

            <button
              onClick={() => setActivePage('pgSupport')}
              className={`w-full text-left px-5 py-2.5 text-sm font-semibold flex items-center gap-3 transition ${activePage === 'pgSupport' ? 'text-[#f0c040] bg-[#f0c040]/10 border-l-3 border-[#f0c040]' : 'text-[#8890b0] hover:bg-[#141828] hover:text-white border-l-3 border-transparent'}`}
            >
              <i className="fas fa-headset w-4 text-center text-xs"></i>
              Support Tickets ({tickets.filter(t => t.status === 'open').length})
            </button>

            <button
              onClick={() => setActivePage('pgGlobalChat')}
              className={`w-full text-left px-5 py-2.5 text-sm font-semibold flex items-center gap-3 transition ${activePage === 'pgGlobalChat' ? 'text-[#f0c040] bg-[#f0c040]/10 border-l-3 border-[#f0c040]' : 'text-[#8890b0] hover:bg-[#141828] hover:text-white border-l-3 border-transparent'}`}
            >
              <i className="fas fa-comments w-4 text-center text-xs"></i>
              Global Chat Spectator
            </button>
          </nav>

          <div className="p-4 border-t border-[#1e2440] space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#e8404a] text-white flex items-center justify-center text-xs font-bold uppercase">
                AD
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">Staff Moderator</div>
                <div className="text-[9px] uppercase tracking-wider text-[#e8404a] font-bold">Admin Authority</div>
              </div>
            </div>

            <button
              onClick={onSwitchToPlayer}
              className="w-full py-2 bg-[#1e2440] hover:bg-[#252a45] text-xs font-semibold rounded-lg text-[#8890b0] hover:text-white transition flex items-center justify-center gap-1.5"
            >
              <i className="fas fa-arrow-left"></i> Player Panel
            </button>
          </div>
        </aside>

        {/* MAIN BODY AREA */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#07090f]">
          
          {/* TOPBAR */}
          <div className="h-14 bg-[#0f1220] border-b border-[#1e2440] flex items-center justify-between px-6">
            <h3 className="ff-title text-lg font-bold text-white uppercase tracking-wider">
              {activePage === 'pgDash' && 'Dashboard Overview'}
              {activePage === 'pgUsers' && 'User Management Log'}
              {activePage === 'pgTours' && 'Active Events List'}
              {activePage === 'pgRegistrations' && 'Slots Verification'}
              {activePage === 'pgReports' && 'Hack cheat Reports'}
              {activePage === 'pgSupport' && 'Live Support Channels'}
              {activePage === 'pgGlobalChat' && 'Global Chat Room Spectator'}
            </h3>
            <span className="text-xs text-[#4a5070] font-mono tracking-wide">{clockStr}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* ── DASHBOARD ANALYTICS ── */}
            {activePage === 'pgDash' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-[#141828] border border-[#1e2440] rounded-xl">
                    <div className="text-xs text-[#8890b0] uppercase font-bold tracking-wider">Total Users</div>
                    <div className="ff-title text-3xl font-black text-[#f0c040] mt-1">{users.length}</div>
                    <p className="text-[10px] text-[#4a5070] mt-1">Live profiles</p>
                  </div>
                  <div className="p-4 bg-[#141828] border border-[#1e2440] rounded-xl">
                    <div className="text-xs text-[#8890b0] uppercase font-bold tracking-wider">Premium Users</div>
                    <div className="ff-title text-3xl font-black text-[#a78bfa] mt-1">{users.filter(u=>u.premium).length}</div>
                    <p className="text-[10px] text-[#4a5070] mt-1">VIP Passes</p>
                  </div>
                  <div className="p-4 bg-[#141828] border border-[#1e2440] rounded-xl">
                    <div className="text-xs text-[#8890b0] uppercase font-bold tracking-wider">Pending Slotes</div>
                    <div className="ff-title text-3xl font-black text-[#e8404a] mt-1">{registrations.filter(r=>r.status==='pending').length}</div>
                    <p className="text-[10px] text-[#4a5070] mt-1">Slot approvals</p>
                  </div>
                  <div className="p-4 bg-[#141828] border border-[#1e2440] rounded-xl">
                    <div className="text-xs text-[#8890b0] uppercase font-bold tracking-wider">Active Hack Reports</div>
                    <div className="ff-title text-3xl font-black text-[#e8404a] mt-1">{reports.filter(r=>r.status==='open').length}</div>
                    <p className="text-[10px] text-[#4a5070] mt-1">Unresolved cheats</p>
                  </div>
                </div>

                <div className="bg-[#141828] border border-[#1e2440] rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#1e2440] flex justify-between items-center bg-[#0f1220]/50">
                    <h4 className="ff-title text-base font-bold text-white">Recent Registration Requests</h4>
                    <button onClick={() => setActivePage('pgRegistrations')} className="text-xs text-[#f0c040] hover:underline font-semibold">View All Registrations →</button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#0f1220]/30 border-b border-[#1e2440] text-[#4a5070] font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-4">Player</th>
                          <th className="p-4">Tournament</th>
                          <th className="p-4">IGN / UID</th>
                          <th className="p-4">TXN ID</th>
                          <th className="p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e2440]/30">
                        {registrations.slice(0, 4).map((reg) => (
                          <tr key={reg.id} className="hover:bg-white/[0.02]">
                            <td className="p-4 font-semibold text-white">{reg.realName} <span className="text-[10px] text-[#4a5070] font-normal">{reg.userHandle}</span></td>
                            <td className="p-4 text-[#f0c040] font-semibold">{reg.tournamentName}</td>
                            <td className="p-4 text-[#8890b0]">{reg.gameName} <div className="text-[10px] text-[#4a5070] font-mono">{reg.gameUID}</div></td>
                            <td className="p-4 text-blue-400 font-mono">{reg.txnId}</td>
                            <td className="p-4 space-x-1 flex">
                              {reg.status === 'pending' ? (
                                <>
                                  <button onClick={() => handleApproveRegistration(reg)} className="px-2.5 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded text-[11px] font-semibold">Approve</button>
                                  <button onClick={() => handleRejectRegistration(reg)} className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-[11px] font-semibold">Decline</button>
                                </>
                              ) : (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${reg.status === 'approved' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                                  {reg.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {registrations.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-[#4a5070]">No registration requests yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── USERS MANAGEMENT PAGE ── */}
            {activePage === 'pgUsers' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2.5 justify-between items-center">
                  <div className="flex flex-wrap gap-2 items-center">
                    {['all', 'premium', 'banned'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setUserFilter(filter as any)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition ${userFilter === filter ? 'bg-[#f0c040] text-[#0a0c12]' : 'bg-[#141828] hover:bg-[#1e2440] border border-[#1e2440] text-[#8890b0]'}`}
                      >
                        {filter}
                      </button>
                    ))}
                    <span className="w-[1px] h-4 bg-[#1e2440] mx-1"></span>
                    <button
                      onClick={() => {
                        setNotifTargetType('all');
                        setNotifTargetUser(null);
                        setNotifTitle('');
                        setNotifBody('');
                        setShowNotifModal(true);
                      }}
                      className="px-3.5 py-1.5 bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 border border-[#3b82f6]/30 text-[#60a5fa] text-xs font-bold rounded-full transition uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <i className="fas fa-bullhorn"></i> Broadcast to All
                    </button>
                  </div>

                  <div className="flex bg-[#141828] border border-[#1e2440] px-3 py-1.5 rounded-lg text-xs items-center gap-2">
                    <i className="fas fa-search text-[#4a5070]"></i>
                    <input
                      type="text"
                      placeholder="Search name/handle..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-white w-[180px]"
                    />
                  </div>
                </div>

                <div className="bg-[#141828] border border-[#1e2440] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#0f1220]/40 border-b border-[#1e2440] text-[#4a5070] font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-4">Profile</th>
                        <th className="p-4">Balance</th>
                        <th className="p-4">Role/Status</th>
                        <th className="p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2440]/30">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-white/[0.01]">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img src={user.av} alt="Avatar" className="w-8 h-8 rounded-full border border-[#1e2440]" />
                              <div>
                                <div className="font-bold text-white">{user.name}</div>
                                <div className="text-[10px] text-[#4a5070]">{user.handle}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-bold text-[#f0c040]">{user.balance.toLocaleString()} AX</td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1 items-start">
                              {user.banned ? (
                                <span className="px-2 py-0.5 bg-red-500/15 text-red-400 border border-red-500/20 text-[9px] font-bold rounded uppercase">
                                  {user.banType === 'tournament' ? 'Tournament Banned' : 'Banned Account'}
                                </span>
                              ) : user.premium ? (
                                <span className="px-2 py-0.5 bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/20 text-[9px] font-bold rounded uppercase">
                                  Premium VIP
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-neutral-800 text-neutral-400 border border-neutral-700 text-[9px] font-bold rounded uppercase">
                                  Free
                                </span>
                              )}
                              {user.muted && (
                                <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/20 text-[9px] font-bold rounded uppercase">
                                  Muted 🔇
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 space-x-1 space-y-1">
                            <button
                              onClick={() => handleAdjustBalance(user)}
                              className="px-2 py-1 bg-[#1e2340] border border-[#1e2440] hover:border-white text-white text-[11px] font-semibold rounded hover:bg-[#141828] transition"
                            >
                              Coins
                            </button>
                            <button
                              onClick={() => handleTogglePremium(user)}
                              className="px-2 py-1 bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 text-[#a78bfa] text-[11px] font-semibold rounded border border-[#a78bfa]/20 transition"
                            >
                              {user.premium ? 'Revoke VIP' : 'Give VIP'}
                            </button>
                            <button
                              onClick={() => {
                                setNotifTargetType('single');
                                setNotifTargetUser(user);
                                setNotifTitle('');
                                setNotifBody('');
                                setShowNotifModal(true);
                              }}
                              className="px-2 py-1 bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 text-[#60a5fa] text-[11px] font-semibold rounded border border-[#3b82f6]/20 transition"
                            >
                              Notify
                            </button>
                            {user.muted ? (
                              <button
                                onClick={() => handleUnmuteUser(user)}
                                className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-semibold rounded border border-amber-500/20 transition"
                              >
                                Unmute
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setMuteUser(user);
                                  setMuteDuration('1');
                                  setMuteReason('');
                                  setShowMuteModal(true);
                                }}
                                className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-semibold rounded border border-amber-500/20 transition"
                              >
                                Mute
                              </button>
                            )}
                            {user.banned ? (
                              <button
                                onClick={() => handleUnbanUser(user)}
                                className="px-2 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-[11px] font-semibold rounded border border-green-500/20 transition"
                              >
                                Lift Ban
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setBanUser(user);
                                  setBanType('full');
                                  setBanDuration('30');
                                  setBanReason('');
                                  setShowBanModal(true);
                                }}
                                className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-semibold rounded border border-red-500/20 transition"
                              >
                                Ban
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-[#4a5070]">No users match this description.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TOURNAMENTS PAGE ── */}
            {activePage === 'pgTours' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="ff-title text-base font-bold text-[#8890b0] uppercase tracking-wider">Configure Events</h4>
                  <button
                    onClick={() => {
                      setEditingTour(null);
                      setTName('');
                      setTPrize('');
                      setTMax('32');
                      setTDate('');
                      setTTime('');
                      setTFee('Rs 100');
                      setTTeamType('Solo');
                      setTStat('upcoming');
                      setShowTourModal(true);
                    }}
                    className="px-4 py-2 bg-[#e8404a] text-white text-xs font-bold rounded-lg hover:bg-[#cc3540] transition flex items-center gap-1.5"
                  >
                    <i className="fas fa-plus"></i> Add Tournament
                  </button>
                </div>

                <div className="bg-[#141828] border border-[#1e2440] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#0f1220]/40 border-b border-[#1e2440] text-[#4a5070] font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-4">Tournament / Date</th>
                        <th className="p-4">Game</th>
                        <th className="p-4">Format / Size</th>
                        <th className="p-4">Slots</th>
                        <th className="p-4">Prize Pool</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2440]/30">
                      {tournaments.map((tour) => (
                        <tr key={tour.id} className="hover:bg-white/[0.01]">
                          <td className="p-4">
                            <div className="font-bold text-white text-sm">{tour.name}</div>
                            <div className="text-[10px] text-[#4a5070]">{tour.date} · {tour.time}</div>
                          </td>
                          <td className="p-4 text-[#8890b0]">{tour.game}</td>
                          <td className="p-4 font-semibold text-[#a78bfa]">{tour.teamType || 'Solo'}</td>
                          <td className="p-4 font-semibold text-white">{tour.registered}/{tour.maxPlayers}</td>
                          <td className="p-4 font-bold text-[#f0c040]">{tour.prize}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${tour.status==='live'?'bg-red-500/15 text-red-400':'bg-blue-500/15 text-blue-400'}`}>
                              {tour.status}
                            </span>
                          </td>
                          <td className="p-4 space-x-1">
                            <button
                              onClick={() => handleOpenEditTour(tour)}
                              className="px-2 py-1 bg-[#1e2340] border border-[#1e2440] text-white text-[11px] font-semibold rounded hover:bg-[#141828] transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTour(tour.id)}
                              className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-semibold rounded border border-red-500/20 transition"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {tournaments.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-[#4a5070]">No tournaments configured yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── REGISTRATIONS VERIFICATION PAGE ── */}
            {activePage === 'pgRegistrations' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {['pending', 'approved', 'rejected', 'all'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setRegFilter(filter as any)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition ${regFilter === filter ? 'bg-[#f0c040] text-[#0a0c12]' : 'bg-[#141828] hover:bg-[#1e2440] border border-[#1e2440] text-[#8890b0]'}`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <div className="bg-[#141828] border border-[#1e2440] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#0f1220]/40 border-b border-[#1e2440] text-[#4a5070] font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-4">Player Details</th>
                        <th className="p-4">Tournament</th>
                        <th className="p-4">IGN & UID</th>
                        <th className="p-4">Transaction Details</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2440]/30">
                      {registrations
                        .filter(r => regFilter === 'all' || r.status === regFilter)
                        .map((reg) => (
                          <tr key={reg.id} className="hover:bg-white/[0.01]">
                            <td className="p-4">
                              <div className="font-bold text-white">{reg.realName}</div>
                              <div className="text-[10px] text-[#4a5070]">{reg.userHandle} (Age: {reg.age})</div>
                            </td>
                            <td className="p-4 text-[#f0c040] font-semibold">{reg.tournamentName}</td>
                            <td className="p-4">
                              <div className="font-semibold text-white">{reg.gameName}</div>
                              <div className="text-[10px] text-[#4a5070] font-mono">UID: {reg.gameUID}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-mono text-blue-400 font-bold">{reg.txnId}</div>
                              {reg.screenshot && (
                                <a href={reg.screenshot} target="_blank" rel="noreferrer" className="text-[10px] text-[#8890b0] hover:text-[#f0c040] underline mt-0.5 block">View Payment Receipt</a>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${reg.status === 'approved' ? 'bg-green-500/15 text-green-400 border border-green-500/20' : reg.status === 'rejected' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 animate-pulse'}`}>
                                {reg.status}
                              </span>
                            </td>
                            <td className="p-4 space-x-1">
                              {reg.status === 'pending' && (
                                <>
                                  <button onClick={() => handleApproveRegistration(reg)} className="px-2 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 text-[11px] font-semibold rounded transition">Approve</button>
                                  <button onClick={() => handleRejectRegistration(reg)} className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-semibold rounded transition">Reject</button>
                                </>
                              )}
                              {reg.status !== 'pending' && <span className="text-[#4a5070]">-</span>}
                            </td>
                          </tr>
                        ))}
                      {registrations.filter(r => regFilter === 'all' || r.status === regFilter).length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[#4a5070]">No registration requests found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── CHEAT REPORTS PAGE ── */}
            {activePage === 'pgReports' && (
              <div className="space-y-4">
                <div className="bg-[#141828] border border-[#1e2440] rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#1e2440] bg-[#0f1220]/30">
                    <h4 className="ff-title text-base font-bold text-white">Cheat Reports logs</h4>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#0f1220]/30 border-b border-[#1e2440] text-[#4a5070] font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-4">Reporter</th>
                          <th className="p-4">Reported Hacker</th>
                          <th className="p-4">Event Name</th>
                          <th className="p-4">Details & Reason</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e2440]/30">
                        {reports.map((rep) => (
                          <tr key={rep.id} className="hover:bg-white/[0.01] align-top">
                            <td className="p-4">
                              <div className="font-bold text-white">{rep.reporterName || 'Unknown'}</div>
                              <div className="text-[10px] text-[#4a5070] font-mono">UID: {rep.reporterId}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-red-400">{rep.reportedName}</div>
                              <div className="text-[10px] text-[#4a5070] font-mono">UID: {rep.reportedUID}</div>
                              <span className="mt-1 px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-[9px] font-bold uppercase border border-red-500/20 inline-block">{rep.hackType}</span>
                            </td>
                            <td className="p-4 font-semibold text-[#f0c040]">{rep.tournamentName}</td>
                            <td className="p-4 max-w-[240px]">
                              <p className="text-white leading-relaxed">{rep.reason}</p>
                              {rep.videoUrl && (
                                <a href={rep.videoUrl} target="_blank" rel="noreferrer" className="text-blue-400 font-medium hover:underline text-[10px] mt-1.5 block flex items-center gap-1">
                                  <i className="fas fa-video"></i> View Video Evidence
                                </a>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${rep.status === 'open' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-green-500/15 text-green-400 border border-green-500/20'}`}>
                                {rep.status}
                              </span>
                            </td>
                            <td className="p-4 space-y-1 block">
                              {rep.status === 'open' ? (
                                <>
                                  <button onClick={() => handleResolveReport(rep.id)} className="w-full px-2 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 text-[10px] font-semibold rounded block text-center">Resolve</button>
                                  <button
                                    onClick={() => {
                                      // Search user profile of reported hacker
                                      const u = users.find(x => x.name.toLowerCase() === rep.reportedName.toLowerCase() || x.uid === rep.reportedUID);
                                      if (u) {
                                        setBanUser(u);
                                        setBanType('full');
                                        setBanDuration('permanent');
                                        setBanReason(`Cheating reported in event: ${rep.tournamentName}`);
                                        setShowBanModal(true);
                                      } else {
                                        alert(`Hacker UID (${rep.reportedUID}) not found in live User Database.`);
                                      }
                                    }}
                                    className="w-full px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-semibold rounded block text-center"
                                  >
                                    Ban Hacker
                                  </button>
                                </>
                              ) : (
                                <button onClick={() => handleDeleteReport(rep.id)} className="w-full px-2 py-1 bg-[#1e2340] border border-[#1e2440] text-red-400 text-[10px] font-semibold rounded block text-center">Delete</button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {reports.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-[#4a5070]">No cheat reports submitted.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUPPORT TICKETS CHANNEL PAGE ── */}
            {activePage === 'pgSupport' && (
              <div className="space-y-4">
                <div className="bg-[#141828] border border-[#1e2440] rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#1e2440] bg-[#0f1220]/30 flex justify-between items-center">
                    <h4 className="ff-title text-base font-bold text-white">Live Support Channels</h4>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#0f1220]/30 border-b border-[#1e2440] text-[#4a5070] font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-4">Customer</th>
                          <th className="p-4">Last Message</th>
                          <th className="p-4">Last Updated</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e2440]/30">
                        {tickets.map((t) => (
                          <tr key={t.id} className="hover:bg-white/[0.01]">
                            <td className="p-4 font-semibold text-white">{t.userName} <span className="text-[10px] text-[#4a5070] font-normal">{t.userHandle}</span></td>
                            <td className="p-4 text-[#8890b0] max-w-[200px] truncate">{t.lastMsg}</td>
                            <td className="p-4 text-[#4a5070]">{t.updatedAt?.toDate?.()?.toLocaleString('en-PK') || 'recently'}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${t.status === 'open' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-green-500/15 text-green-400 border border-green-500/20'}`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="p-4 space-x-1.5 flex items-center">
                              <button
                                onClick={() => { setActiveTicket(t); setShowSupportModal(true); }}
                                className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[11px] font-semibold rounded transition"
                              >
                                Reply Log
                              </button>
                              
                              {t.status === 'open' && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await updateDoc(doc(db, 'support_tickets', t.id), { status: 'resolved' });
                                      alert('Ticket resolved successfully!');
                                    } catch (e: any) { alert(e.message); }
                                  }}
                                  className="px-2.5 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 text-[11px] font-semibold rounded transition"
                                >
                                  Resolve
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteTicket(t.id)}
                                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-semibold rounded transition"
                                title="Delete Ticket"
                              >
                                <i className="fas fa-trash-alt"></i> Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {tickets.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-[#4a5070]">No support tickets active.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── GLOBAL CHAT SPECTATOR & REPORTS PAGE ── */}
            {activePage === 'pgGlobalChat' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-160px)]">
                {/* Left: Chat Spectator */}
                <div className="bg-[#141828] border border-[#1e2440] rounded-xl flex flex-col min-h-0 overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#1e2440] bg-[#0f1220]/30 flex justify-between items-center shrink-0">
                    <div>
                      <h4 className="ff-title text-base font-bold text-white flex items-center gap-2">
                        <i className="fas fa-eye text-[#3ddc84]"></i> Live Global Chat Spectator
                      </h4>
                      <p className="text-[10px] text-[#8890b0] mt-0.5">Real-time monitor of players' conversations.</p>
                    </div>
                    <span className="px-2 py-0.5 bg-[#3ddc84]/10 text-[#3ddc84] border border-[#3ddc84]/20 text-[9px] font-bold rounded-full uppercase tracking-wider animate-pulse">
                      Live
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {globalMessages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[#4a5070] text-xs">
                        No chat messages to display.
                      </div>
                    ) : (
                      globalMessages.map((msg) => {
                        // 1. Check for Public Admin Deletion
                        if (msg.isDeletedByAdmin) {
                          return (
                            <div key={msg.id} className="bg-red-500/5 border border-red-500/20 p-3 rounded-lg flex items-start justify-between gap-4 opacity-75">
                              <div className="flex gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-[#171b2e] flex items-center justify-center border border-red-500/20 text-red-400 shrink-0">
                                  <i className="fas fa-trash-can text-xs"></i>
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-red-400">{msg.userName || 'Anonymous'}</span>
                                    <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[8px] font-bold rounded uppercase tracking-wider">Publicly Deleted</span>
                                  </div>
                                  <p className="text-xs text-[#8890b0] mt-1 italic line-through font-serif">{msg.text}</p>
                                  {msg.originalText && msg.originalText !== msg.text && (
                                    <p className="text-[10px] text-white font-mono mt-1 bg-black/40 p-1.5 rounded border border-[#252a45]/40">
                                      Original text before delete: <span className="font-sans font-bold text-red-300">"{msg.originalText}"</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={async () => {
                                    if (confirm('Are you sure you want to completely PURGE this message from the database?')) {
                                      try {
                                        await deleteDoc(doc(db, 'global_chat', msg.id));
                                        alert('Message permanently purged! 🗑️');
                                      } catch (e: any) {
                                        alert('Error purging: ' + e.message);
                                      }
                                    }
                                  }}
                                  className="p-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded border border-orange-500/20 transition"
                                  title="Silent Delete Completely (Purge document)"
                                >
                                  <i className="fas fa-eraser text-xs"></i>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        // 2. Check for System Announcement
                        if (msg.isSystemAnnouncement) {
                          return (
                            <div key={msg.id} className="bg-amber-500/5 border border-amber-500/30 p-3 rounded-lg flex items-start justify-between gap-4">
                              <div className="flex gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/40 text-amber-400 shrink-0">
                                  <i className="fas fa-bullhorn text-xs"></i>
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-amber-400">Official Announcement</span>
                                    <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 text-[8px] font-bold rounded uppercase tracking-wider">System</span>
                                  </div>
                                  <p className="text-xs text-white mt-1 font-semibold whitespace-pre-wrap select-text">{msg.text}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={async () => {
                                    if (confirm('Are you sure you want to delete this announcement?')) {
                                      try {
                                        await deleteDoc(doc(db, 'global_chat', msg.id));
                                        alert('Announcement deleted!');
                                      } catch (e: any) {
                                        alert('Error: ' + e.message);
                                      }
                                    }
                                  }}
                                  className="p-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded border border-orange-500/20 transition"
                                  title="Silent Delete Announcement"
                                >
                                  <i className="fas fa-eraser text-xs"></i>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        // 3. Check for Admin Message
                        if (msg.isAdminMessage) {
                          return (
                            <div key={msg.id} className="bg-red-500/5 border border-red-500/30 p-3 rounded-lg flex items-start justify-between gap-4">
                              <div className="flex gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/35 text-red-400 shrink-0">
                                  <i className="fas fa-shield-alt text-xs"></i>
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-red-400">{msg.userName || 'System Admin'}</span>
                                    <span className="px-1.5 py-0.5 bg-red-500/15 text-red-400 text-[8px] font-bold rounded uppercase tracking-wider">Staff</span>
                                  </div>
                                  <p className="text-xs text-white mt-1 font-medium whitespace-pre-wrap select-text">{msg.text}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={async () => {
                                    if (confirm('Are you sure you want to delete this staff message?')) {
                                      try {
                                        await deleteDoc(doc(db, 'global_chat', msg.id));
                                        alert('Staff message deleted!');
                                      } catch (e: any) {
                                        alert('Error: ' + e.message);
                                      }
                                    }
                                  }}
                                  className="p-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded border border-orange-500/20 transition"
                                  title="Silent Delete Staff Message"
                                >
                                  <i className="fas fa-eraser text-xs"></i>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        // 4. Regular User Message
                        const isMuted = users.find(u => u.id === msg.userId)?.muted || false;
                        const isBanned = users.find(u => u.id === msg.userId)?.banned || false;
                        return (
                          <div key={msg.id} className="bg-[#171b2e]/50 border border-[#252a45]/40 p-3 rounded-lg flex items-start justify-between gap-4">
                            <div className="flex gap-2.5 min-w-0">
                              <img src={msg.userAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=ax1'} alt="Avatar" className="w-8 h-8 rounded-full border border-[#252a45] shrink-0" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-white truncate max-w-[120px]">{msg.userName || 'Anonymous'}</span>
                                  <span className="text-[8px] text-[#4a5070] font-mono">UID: {msg.userId?.slice(-6)}</span>
                                  {msg.isAbusive && (
                                    <span className="px-1.5 py-0.5 bg-[#e8404a]/10 text-[#e8404a] text-[8px] font-bold rounded uppercase">Flagged</span>
                                  )}
                                  {isMuted && (
                                    <span className="px-1 py-0.5 bg-amber-500/10 text-amber-400 text-[8px] font-bold rounded uppercase">Muted</span>
                                  )}
                                  {isBanned && (
                                    <span className="px-1 py-0.5 bg-red-500/10 text-red-400 text-[8px] font-bold rounded uppercase">Banned</span>
                                  )}
                                </div>
                                <p className="text-xs text-[#8890b0] mt-1 break-all whitespace-pre-wrap select-text">{msg.text}</p>
                                {msg.originalText && msg.originalText !== msg.text && (
                                  <p className="text-[9px] text-[#e8404a]/80 mt-1 font-mono italic">Original: "{msg.originalText}"</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 font-sans">
                              {/* Silent Delete */}
                              <button
                                onClick={async () => {
                                  if (confirm('Are you sure you want to SILENTLY delete this message? It will disappear completely.')) {
                                    try {
                                      await deleteDoc(doc(db, 'global_chat', msg.id));
                                      alert('Message silently deleted!');
                                    } catch (e: any) {
                                      alert('Error: ' + e.message);
                                    }
                                  }
                                }}
                                className="p-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded border border-orange-500/20 transition"
                                title="Silent Delete (Erase completely)"
                              >
                                <i className="fas fa-eraser text-xs"></i>
                              </button>

                              {/* Public Delete */}
                              <button
                                onClick={async () => {
                                  if (confirm('Are you sure you want to PUBLICLY delete this message? It will be replaced with a notice.')) {
                                    try {
                                      await updateDoc(doc(db, 'global_chat', msg.id), {
                                        isDeletedByAdmin: true,
                                        text: 'This message was deleted by administration.',
                                        originalText: msg.originalText || msg.text || ''
                                      });
                                      alert('Message publicly deleted!');
                                    } catch (e: any) {
                                      alert('Error: ' + e.message);
                                    }
                                  }
                                }}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded border border-red-500/20 transition"
                                title="Public Delete (Show Deleted message)"
                              >
                                <i className="fas fa-trash-alt text-xs"></i>
                              </button>

                              {/* Mute Action */}
                              <button
                                onClick={() => {
                                  const foundUser = users.find(u => u.id === msg.userId);
                                  if (foundUser) {
                                    if (foundUser.muted) {
                                      handleUnmuteUser(foundUser);
                                    } else {
                                      setMuteUser(foundUser);
                                      setMuteDuration('1');
                                      setMuteReason(`Abusive behavior in Global Chat ("${msg.text}")`);
                                      setShowMuteModal(true);
                                    }
                                  } else {
                                    alert(`Player ID ${msg.userId} not found in user management.`);
                                  }
                                }}
                                className={`p-1.5 rounded border transition ${
                                  users.find(u => u.id === msg.userId)?.muted
                                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/30'
                                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20'
                                }`}
                                title={users.find(u => u.id === msg.userId)?.muted ? "Unmute Player" : "Mute Player"}
                              >
                                <i className={`fas fa-${users.find(u => u.id === msg.userId)?.muted ? 'volume-up' : 'volume-mute'} text-xs`}></i>
                              </button>

                              {/* Ban Action */}
                              <button
                                onClick={() => {
                                  const foundUser = users.find(u => u.id === msg.userId);
                                  if (foundUser) {
                                    setBanUser(foundUser);
                                    setBanReason(`Abusive behavior in Global Chat ("${msg.text}")`);
                                    setShowBanModal(true);
                                  } else {
                                    alert(`Player ID ${msg.userId} not found in user management.`);
                                  }
                                }}
                                className="p-1.5 bg-[#ff4500]/10 hover:bg-[#ff4500]/20 text-[#ff4500] rounded border border-[#ff4500]/20 transition"
                                title="Ban Player"
                              >
                                <i className="fas fa-ban text-xs"></i>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Broadcast form */}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!adminChatText.trim()) return;
                      try {
                        const payload: any = {
                          userId: 'admin_staff',
                          userName: adminEmail ? adminEmail.split('@')[0].toUpperCase() : 'ADMIN',
                          userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin_staff',
                          text: adminChatText.trim(),
                          originalText: adminChatText.trim(),
                          createdAt: serverTimestamp()
                        };
                        if (adminChatType === 'announcement') {
                          payload.isSystemAnnouncement = true;
                        } else {
                          payload.isAdminMessage = true;
                        }
                        await addDoc(collection(db, 'global_chat'), payload);
                        setAdminChatText('');
                        alert('Published broadcast successfully! 📢');
                      } catch (err: any) {
                        alert('Broadcast failed: ' + err.message);
                      }
                    }}
                    className="p-4 border-t border-[#1e2440] bg-[#0f1220]/20 space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-[#0c0e17] border border-[#222a45] px-2.5 py-1.5 rounded-lg">
                        <label className="text-[10px] uppercase font-bold text-[#8890b0] select-none">Send As:</label>
                        <select
                          value={adminChatType}
                          onChange={(e: any) => setAdminChatType(e.target.value)}
                          className="bg-transparent border-none text-xs text-white font-bold outline-none cursor-pointer focus:ring-0"
                        >
                          <option value="admin" className="bg-[#141828] text-red-400 font-bold">🔴 Staff Message</option>
                          <option value="announcement" className="bg-[#141828] text-amber-400 font-bold">📢 Official Announcement</option>
                        </select>
                      </div>
                      <span className="text-[10px] text-[#8890b0] font-mono">Posting as: <strong className="text-white">{adminEmail ? adminEmail.split('@')[0].toUpperCase() : 'ADMIN'}</strong></span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={adminChatText}
                        onChange={(e) => setAdminChatText(e.target.value)}
                        placeholder="Type official staff message or announcement here..."
                        className="flex-1 bg-[#0c0e17] border border-[#222a45] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-red-500"
                        required
                      />
                      <button
                        type="submit"
                        className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5"
                      >
                        <i className="fas fa-paper-plane"></i> Publish
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right: Abusive Reports */}
                <div className="bg-[#141828] border border-[#1e2440] rounded-xl flex flex-col min-h-0 overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#1e2440] bg-[#0f1220]/30 flex justify-between items-center shrink-0">
                    <div>
                      <h4 className="ff-title text-base font-bold text-[#e8404a] flex items-center gap-2">
                        <i className="fas fa-exclamation-triangle"></i> Automated Abusive Chat Reports
                      </h4>
                      <p className="text-[10px] text-[#8890b0] mt-0.5">Logs of automatically reported system flags.</p>
                    </div>
                    <span className="px-2 py-0.5 bg-[#e8404a]/10 text-[#e8404a] border border-[#e8404a]/20 text-[9px] font-bold rounded-full uppercase tracking-wider">
                      {chatReports.filter(r => r.status === 'open').length} Open
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatReports.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[#4a5070] text-xs">
                        No abusive chat reports logged.
                      </div>
                    ) : (
                      chatReports.map((rep) => (
                        <div key={rep.id} className={`p-4 rounded-lg flex flex-col gap-3 border ${rep.status === 'open' ? 'bg-[#e8404a]/5 border-[#e8404a]/20' : 'bg-[#171b2e]/30 border-[#252a45]/30'}`}>
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <div className="font-bold text-white text-xs">{rep.userName || 'Anonymous'}</div>
                              <div className="text-[9px] text-[#8890b0] font-mono mt-0.5">{rep.userEmail} | UID: {rep.userId?.slice(-6)}</div>
                            </div>
                            <span className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded-full border ${rep.status === 'open' ? 'bg-[#e8404a]/10 text-[#e8404a] border-[#e8404a]/20' : 'bg-[#3ddc84]/10 text-[#3ddc84] border-[#3ddc84]/20'}`}>
                              {rep.status}
                            </span>
                          </div>

                          <div className="p-2.5 bg-[#0a0d16]/80 rounded-lg border border-[#252a45]/60">
                            <div className="text-[8px] uppercase tracking-wider text-[#e8404a] font-bold mb-1">Flagged Text:</div>
                            <p className="text-xs text-[#8890b0] font-mono select-all font-semibold italic">"{rep.messageText}"</p>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-[#4a5070] mt-1 border-t border-[#252a45]/40 pt-2.5">
                            <span>{rep.createdAt ? new Date(rep.createdAt.seconds * 1000).toLocaleString() : 'Just now'}</span>
                            {rep.status === 'open' && (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={async () => {
                                    try {
                                      await updateDoc(doc(db, 'chat_reports', rep.id), { status: 'dismissed' });
                                      alert('Report dismissed successfully! ✅');
                                    } catch (e: any) {
                                      alert('Error: ' + e.message);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-[#4a5070]/20 hover:bg-[#4a5070]/30 border border-[#4a5070]/30 text-[#8890b0] rounded text-xs font-bold transition"
                                >
                                  Dismiss
                                </button>
                                <button
                                  onClick={async () => {
                                    const foundUser = users.find(u => u.id === rep.userId);
                                    if (foundUser) {
                                      setMuteUser(foundUser);
                                      setMuteDuration('24'); // Default to 24 hours for report mutes
                                      setMuteReason(`Abusive behavior in Global Chat ("${rep.messageText}")`);
                                      setShowMuteModal(true);
                                      try {
                                        await updateDoc(doc(db, 'chat_reports', rep.id), { status: 'resolved_muted' });
                                      } catch (e) {
                                        console.warn(e);
                                      }
                                    } else {
                                      alert(`Player ID ${rep.userId} not found in database.`);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-[#0f1220] rounded text-xs font-bold transition"
                                >
                                  Mute Player
                                </button>
                                <button
                                  onClick={() => {
                                    const foundUser = users.find(u => u.id === rep.userId);
                                    if (foundUser) {
                                      setBanUser(foundUser);
                                      setBanReason(`Abusive behavior in Global Chat ("${rep.messageText}")`);
                                      setShowBanModal(true);
                                      updateDoc(doc(db, 'chat_reports', rep.id), { status: 'resolved_banned' }).catch(console.warn);
                                    } else {
                                      alert(`Player ID ${rep.userId} not found in database.`);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-[#ff4500] hover:bg-[#e03d00] text-white rounded text-xs font-bold transition"
                                >
                                  Ban Player
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* MODAL WINDOW GENERAL */}
      {showGeneralModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-filter backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#0f1220] border border-[#1e2440] rounded-2xl p-6 max-w-[400px] w-full animate-fade-in space-y-4">
            <h3 className="font-sans text-lg font-bold text-[#f0c040]">{modalTitle}</h3>
            <div className="text-xs text-[#8890b0] leading-relaxed">{modalBody}</div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowGeneralModal(false)} className="flex-1 py-2 bg-[#1e2340] hover:bg-[#141828] text-[#8890b0] font-semibold rounded-lg text-xs transition">Cancel</button>
              <button onClick={() => { if (modalConfirmAction) modalConfirmAction(); setShowGeneralModal(false); }} className="flex-1 py-2 bg-[#e8404a] hover:bg-[#cc3540] text-white font-semibold rounded-lg text-xs transition">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIG TOURNAMENT */}
      {showTourModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-filter backdrop-blur-sm z-[999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0f1220] border border-[#1e2440] rounded-2xl p-6 max-w-[440px] w-full animate-fade-in space-y-4 relative">
            <button onClick={() => setShowTourModal(false)} className="absolute top-4 right-4 text-[#8890b0] hover:text-[#f0c040] transition">
              <i className="fas fa-times"></i>
            </button>

            <h3 className="font-sans text-lg font-bold text-[#f0c040]">
              {editingTour ? 'Configure Tournament Settings' : 'Create New Tournament'}
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] text-[#4a5070] uppercase font-bold mb-1">Tournament Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Grand RP Champion League"
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  className="w-full bg-[#141828] border border-[#1e2440] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-[#f0c040] transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#4a5070] uppercase font-bold mb-1">Max Player slots *</label>
                  <input
                    type="number"
                    value={tMax}
                    onChange={(e) => setTMax(e.target.value)}
                    className="w-full bg-[#141828] border border-[#1e2440] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-[#f0c040] transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#4a5070] uppercase font-bold mb-1">Team Size Format *</label>
                  <select
                    value={tTeamType}
                    onChange={(e) => setTTeamType(e.target.value as any)}
                    className="w-full bg-[#141828] border border-[#1e2440] rounded-lg px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#f0c040] transition"
                  >
                    <option value="Solo">Solo (1 Player)</option>
                    <option value="Duo (2 Players)">Duo (2 Players)</option>
                    <option value="Trio (3 Players)">Trio (3 Players)</option>
                    <option value="Squad (4 Players)">Squad (4 Players)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#4a5070] uppercase font-bold mb-1">Match Date *</label>
                  <input
                    type="text"
                    placeholder="e.g. Jul 5, 2026"
                    value={tDate}
                    onChange={(e) => setTDate(e.target.value)}
                    className="w-full bg-[#141828] border border-[#1e2440] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-[#f0c040] transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#4a5070] uppercase font-bold mb-1">Match Time *</label>
                  <input
                    type="text"
                    placeholder="e.g. 08:00 PM PKT"
                    value={tTime}
                    onChange={(e) => setTTime(e.target.value)}
                    className="w-full bg-[#141828] border border-[#1e2440] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-[#f0c040] transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#4a5070] uppercase font-bold mb-1">Registration Fee *</label>
                  <input
                    type="text"
                    placeholder="e.g. Rs 100 or Free"
                    value={tFee}
                    onChange={(e) => setTFee(e.target.value)}
                    className="w-full bg-[#141828] border border-[#1e2440] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-[#f0c040] transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#4a5070] uppercase font-bold mb-1">Status *</label>
                  <select
                    value={tStatus}
                    onChange={(e) => setTStat(e.target.value as any)}
                    className="w-full bg-[#141828] border border-[#1e2440] rounded-lg px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#f0c040] transition"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="live">🔴 Live Now</option>
                    <option value="ended">Ended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#4a5070] uppercase font-bold mb-1">Prize Pool Earnings *</label>
                <input
                  type="text"
                  placeholder="e.g. 15,000 AX Coins"
                  value={tPrize}
                  onChange={(e) => setTPrize(e.target.value)}
                  className="w-full bg-[#141828] border border-[#1e2440] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-[#f0c040] transition"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                onClick={() => setShowTourModal(false)}
                className="flex-1 py-2.5 bg-[#1e2340] border border-[#1e2440] text-[#8890b0] font-semibold rounded-lg text-xs hover:bg-[#141828] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTournament}
                className="flex-1 py-2.5 bg-[#e8404a] text-white font-bold rounded-lg text-xs hover:bg-[#cc3540] transition"
              >
                Save config
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BAN / BLOCK SETTINGS */}
      {showBanModal && banUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-filter backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#0f1220] border border-[#1e2440] rounded-2xl p-6 max-w-[420px] w-full animate-fade-in space-y-4 relative">
            <button onClick={() => { setShowBanModal(false); setBanUser(null); }} className="absolute top-4 right-4 text-[#8890b0] hover:text-[#f0c040] transition">
              <i className="fas fa-times"></i>
            </button>

            <h3 className="font-sans text-lg font-bold text-[#e8404a] flex items-center gap-1.5">
              <i className="fas fa-ban"></i> Ban Settings: {banUser.name}
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] text-[#4a5070] uppercase font-bold mb-1">Ban Type *</label>
                <select
                  value={banType}
                  onChange={(e) => setBanType(e.target.value as any)}
                  className="w-full bg-[#141828] border border-[#1e2440] rounded-lg px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#f0c040] transition"
                >
                  <option value="full">Ban Entire Account (Full Lockout)</option>
                  <option value="tournament">Ban ONLY from Tournament Participation</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#4a5070] uppercase font-bold mb-1">Ban Duration *</label>
                <select
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  className="w-full bg-[#141828] border border-[#1e2440] rounded-lg px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#f0c040] transition"
                >
                  <option value="1">1 Day</option>
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                  <option value="permanent">Permanent / Forever</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#4a5070] uppercase font-bold mb-1">Reason for Ban *</label>
                <input
                  type="text"
                  placeholder="e.g. Verified aimbot hacks in city cup"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full bg-[#141828] border border-[#1e2440] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-[#f0c040] transition"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                onClick={() => { setShowBanModal(false); setBanUser(null); }}
                className="flex-1 py-2.5 bg-[#1e2340] border border-[#1e2440] text-[#8890b0] font-semibold rounded-lg text-xs hover:bg-[#141828] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessBan}
                className="flex-1 py-2.5 bg-[#e8404a] text-white font-bold rounded-lg text-xs hover:bg-[#cc3540] transition"
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MUTE SETTINGS */}
      {showMuteModal && muteUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-filter backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#0f1220] border border-[#1e2440] rounded-2xl p-6 max-w-[420px] w-full animate-fade-in space-y-4 relative shadow-2xl">
            <button onClick={() => { setShowMuteModal(false); setMuteUser(null); }} className="absolute top-4 right-4 text-[#8890b0] hover:text-[#f0c040] transition">
              <i className="fas fa-times"></i>
            </button>

            <h3 className="font-sans text-lg font-bold text-amber-500 flex items-center gap-1.5">
              <i className="fas fa-volume-mute"></i> Mute Settings: {muteUser.name}
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] text-[#4a5070] uppercase font-bold mb-1">Mute Duration *</label>
                <select
                  value={muteDuration}
                  onChange={(e) => setMuteDuration(e.target.value)}
                  className="w-full bg-[#141828] border border-[#1e2440] rounded-lg px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#f0c040] transition"
                >
                  <option value="1">1 Hour</option>
                  <option value="12">12 Hours</option>
                  <option value="24">24 Hours (1 Day)</option>
                  <option value="168">7 Days (1 Week)</option>
                  <option value="permanent">Permanent / Forever</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#4a5070] uppercase font-bold mb-1">Reason for Mute *</label>
                <input
                  type="text"
                  placeholder="e.g. Excessive spamming / foul language in global chat"
                  value={muteReason}
                  onChange={(e) => setMuteReason(e.target.value)}
                  className="w-full bg-[#141828] border border-[#1e2440] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-[#f0c040] transition"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                onClick={() => { setShowMuteModal(false); setMuteUser(null); }}
                className="flex-1 py-2.5 bg-[#1e2340] border border-[#1e2440] text-[#8890b0] font-semibold rounded-lg text-xs hover:bg-[#141828] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessMute}
                className="flex-1 py-2.5 bg-amber-500 text-[#0f1220] font-bold rounded-lg text-xs hover:bg-amber-600 transition"
              >
                Confirm Mute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPPORT LIVE CHAT RESPONSES MODAL */}
      {showSupportModal && activeTicket && (
        <div className="fixed inset-0 bg-black/85 backdrop-filter backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#0f1220] border border-[#1e2440] rounded-2xl w-full max-w-[500px] h-[520px] flex flex-col overflow-hidden animate-fade-in relative shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-[#1e2440] bg-[#0f1220] flex items-center justify-between gap-3">
              <div>
                <h3 className="font-sans text-base font-bold text-white leading-tight">Live Chat Support</h3>
                <p className="text-[10px] text-[#4a5070]">User: <span className="text-[#f0c040] font-bold">{activeTicket.userName}</span> ({activeTicket.userHandle})</p>
              </div>
              <button
                onClick={() => { setShowSupportModal(false); setActiveTicket(null); }}
                className="text-[#8890b0] hover:text-[#f0c040] text-lg transition"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#07090f]/50">
              {supportMessages.map((msg, mIdx) => {
                const isAdmin = msg.sender === 'admin';
                const isBot = msg.sender === 'bot';
                return (
                  <div key={mIdx} className={`flex gap-2.5 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${isAdmin ? 'bg-[#e8404a] text-white' : isBot ? 'bg-[#f0c040]/10 text-[#f0c040] border border-[#f0c040]/20' : 'bg-[#1e2340] text-white border border-[#1e2440]'}`}>
                      <i className={`fas fa-${isAdmin ? 'shield-alt' : isBot ? 'robot' : 'user'}`}></i>
                    </div>
                    <div className="max-w-[75%]">
                      <div className={`text-[10px] text-[#4a5070] mb-0.5 ${isAdmin ? 'text-right' : ''}`}>
                        {isAdmin ? 'Admin' : isBot ? 'ArenaX Bot' : activeTicket.userName}
                      </div>
                      <div className={`p-3 rounded-xl text-xs leading-relaxed ${isAdmin ? 'bg-[#e8404a]/15 border border-[#e8404a]/25 text-white rounded-tr-none' : 'bg-[#141828] border border-[#1e2440] text-white rounded-tl-none'}`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Footer Input */}
            <div className="p-3 bg-[#0f1220] border-t border-[#1e2440] flex gap-2">
              <input
                type="text"
                placeholder="Type admin reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendAdminReply()}
                className="flex-1 bg-[#141828] border border-[#1e2440] rounded-xl px-4 py-2.5 text-xs outline-none text-white focus:border-[#f0c040] transition"
              />
              <button
                onClick={handleSendAdminReply}
                className="w-10 h-10 bg-[#e8404a] text-white rounded-xl flex items-center justify-center text-xs hover:bg-[#cc3540] transition active:scale-95"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM NOTIFICATION MODAL */}
      {showNotifModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-filter backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#0f1220] border border-[#1e2440] rounded-2xl p-6 max-w-[420px] w-full animate-fade-in space-y-4 relative">
            <button
              onClick={() => { setShowNotifModal(false); setNotifTargetUser(null); }}
              className="absolute top-4 right-4 text-[#8890b0] hover:text-[#f0c040] transition"
            >
              <i className="fas fa-times"></i>
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-lg">
                <i className="fas fa-bell"></i>
              </div>
              <div>
                <h3 className="font-sans text-base font-bold text-white">
                  {notifTargetType === 'all' ? 'Broadcast Notification' : 'Send Player Notification'}
                </h3>
                <p className="text-[11px] text-[#8890b0]">
                  {notifTargetType === 'all' 
                    ? 'This will send a notification to ALL registered users simultaneously.' 
                    : `To: ${notifTargetUser?.name || 'Player'} (${notifTargetUser?.handle || ''})`}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] text-[#4a5070] uppercase font-bold mb-1">Notification Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Announcement, Reward Alert..."
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="w-full bg-[#141828] border border-[#1e2440] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-[#f0c040] transition font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#4a5070] uppercase font-bold mb-1">Message Body *</label>
                <textarea
                  rows={4}
                  placeholder="Type your notification message body..."
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  className="w-full bg-[#141828] border border-[#1e2440] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-[#f0c040] transition resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowNotifModal(false); setNotifTargetUser(null); }}
                className="flex-1 py-2 bg-[#1e2340] border border-[#1e2440] text-[#8890b0] font-semibold rounded-lg text-xs hover:bg-[#141828] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNotification}
                disabled={notifSending}
                className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-xs transition disabled:opacity-50"
              >
                {notifSending ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
