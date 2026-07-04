import React, { useState, useEffect, useRef } from 'react';
import { auth, db, googleProvider } from '../firebase';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  where,
  arrayUnion
} from 'firebase/firestore';
import {
  UserProfile,
  Tournament,
  Registration,
  Friend,
  FriendRequest,
  DirectMessage,
  SupportMessage,
  Transaction
} from '../types';
import { ReportModal } from './ReportModal';

interface PlayerAppProps {
  onSwitchToAdmin: () => void;
  isAdminUID: boolean;
}

const AVATAR_SEEDS = ['ax1', 'ax2', 'ax3', 'ax4', 'bot1', 'bot2', 'bot3', 'bot4'];

export const PlayerApp: React.FC<PlayerAppProps> = ({ onSwitchToAdmin, isAdminUID }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [guestId, setGuestId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'Profile' | 'Rules' | 'Wallet' | 'Chat' | 'Tour' | 'Support'>('Profile');

  // Auth Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showGuestWarning, setShowGuestWarning] = useState(false);

  // Firestore Lists
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<{ [tourId: string]: Registration }>({});
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [activeTournamentFilter, setActiveTournamentFilter] = useState<string>('all');

  // Customizations
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [custName, setCustName] = useState('');
  const [custBio, setCustBio] = useState('');
  const [selectedAvatarSeed, setSelectedAvatarSeed] = useState(AVATAR_SEEDS[0]);

  // Wallet
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payStep, setPayStep] = useState<1 | 2>(1);
  const [payMethod, setPayMethod] = useState<'jc' | 'ep' | 'cc'>('jc');
  const [payAmount, setPayAmount] = useState<string>('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [depositRequests, setDepositRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser || isGuest) {
      setDepositRequests([]);
      return;
    }
    const qDeposits = query(
      collection(db, 'deposit_requests'),
      where('userId', '==', currentUser.uid)
    );
    const unsub = onSnapshot(qDeposits, (snap) => {
      const list: any[] = [];
      snap.forEach((dDoc) => {
        list.push({ id: dDoc.id, ...dDoc.data() });
      });
      setDepositRequests(list);
    }, (err) => {
      console.warn("Failed to listen to deposit requests:", err);
    });
    return () => unsub();
  }, [currentUser, isGuest]);

  useEffect(() => {
    const profileTxs = currentUser?.transactions || [];
    const normalizedDeposits = depositRequests.map(d => ({
      id: d.id || d.txnId,
      type: d.type || 'deposit',
      amount: d.amountAX || 0,
      status: d.status || 'pending',
      account: d.method || 'Deposit',
      timestamp: d.submittedAt ? (d.submittedAt.seconds ? new Date(d.submittedAt.seconds * 1000).toLocaleString() : new Date(d.submittedAt).toLocaleString()) : 'Just now',
      message: d.rejectionReason ? `Rejected: ${d.rejectionReason}` : (d.status === 'approved' ? (d.type === 'withdrawal' ? 'Withdrawal successful' : 'Deposit successful') : 'Pending review'),
      color: d.status === 'approved' ? 'green' : (d.status === 'rejected' ? 'red' : 'gold')
    }));

    const combined = [...profileTxs, ...normalizedDeposits];
    combined.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() || b.id.localeCompare(a.id);
    });

    setTransactions(combined);
  }, [currentUser?.transactions, depositRequests]);

  // Tournament Registration & Details Modal
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [tregStep, setTregStep] = useState<1 | 2 | 3 | 4>(1);
  const [tregRealName, setTregRealName] = useState('');
  const [tregGameName, setTregGameName] = useState('');
  const [tregUID, setTregUID] = useState('');
  const [tregAge, setTregAge] = useState('');
  const [tregTxnId, setTregTxnId] = useState('');
  const [tregScreenshot, setTregScreenshot] = useState('');
  const [tregCheck1, setTregCheck1] = useState(false);
  const [tregCheck2, setTregCheck2] = useState(false);
  const [tregSubmitting, setTregSubmitting] = useState(false);
  const [allTournamentRegistrations, setAllTournamentRegistrations] = useState<any[]>([]);
  const [tregSelectedTeamColor, setTregSelectedTeamColor] = useState<string>('');

  // Report Modal state
  const [reportTour, setReportTour] = useState<Tournament | null>(null);

  // Friend Add
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [searchHandle, setSearchHandle] = useState('');
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);

  // DM Chat Modal
  const [showDMChat, setShowDMChat] = useState(false);
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);
  const [dms, setDms] = useState<DirectMessage[]>([]);
  const [dmText, setDmText] = useState('');
  const dmEndRef = useRef<HTMLDivElement>(null);

  // Support Chat
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportText, setSupportText] = useState('');
  const supportEndRef = useRef<HTMLDivElement>(null);
  const [escalated, setEscalated] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [toasts, setToasts] = useState<{ id: string; title: string; body: string }[]>([]);
  const isInitialNotifs = useRef(true);

  // Rules search
  const [rulesQuery, setRulesQuery] = useState('');
  const [expandedRules, setExpandedRules] = useState<number[]>([0]);

  // Premium plans modal
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Settings & Terms/Privacy Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [notifAnnounce, setNotifAnnounce] = useState(true);
  const [notifFriends, setNotifFriends] = useState(true);
  const [notifTours, setNotifTours] = useState(true);
  const [premiumPlan, setPremiumPlan] = useState<'weekly' | 'monthly'>('weekly');

  // Listen to Auth & Firestore profile
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (fireUser) => {
      if (fireUser && !isGuest) {
        // Real-time Firestore document for current user profile
        const userDocRef = doc(db, 'users', fireUser.uid);
        onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCurrentUser({
              id: fireUser.uid,
              uid: fireUser.uid,
              name: data.name || fireUser.displayName || fireUser.email?.split('@')[0] || 'Player',
              handle: data.handle || '@' + (fireUser.displayName || 'player').toLowerCase().replace(/\s+/g, '') + '#' + fireUser.uid.slice(-4),
              av: data.av || fireUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fireUser.uid}`,
              email: data.email || fireUser.email || '',
              premium: data.premium || false,
              banned: data.banned || false,
              banType: data.banType || 'none',
              banReason: data.banReason || '',
              banUntil: data.banUntil || null,
              balance: data.balance || 0,
              createdAt: data.createdAt || new Date().toISOString(),
              transactions: data.transactions || []
            });
          } else {
            // Document doesn't exist, bootstrap it
            const defaultName = fireUser.displayName || fireUser.email?.split('@')[0] || 'Player';
            const defaultHandle = '@' + defaultName.toLowerCase().replace(/\s+/g, '') + '#' + fireUser.uid.slice(-4);
            const defaultAv = fireUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fireUser.uid}`;
            
            const newProfile: any = {
              name: defaultName,
              handle: defaultHandle,
              av: defaultAv,
              email: fireUser.email || '',
              uid: fireUser.uid,
              premium: false,
              banned: false,
              banType: 'none',
              banReason: '',
              banUntil: null,
              balance: 0,
              createdAt: new Date().toISOString(),
              transactions: []
            };
            
            setDoc(userDocRef, newProfile).catch(console.error);
            setCurrentUser({ id: fireUser.uid, ...newProfile });
          }
        }, (err) => {
          console.warn("Failed to listen to user profile document:", err);
        });
      } else if (!isGuest) {
        setCurrentUser(null);
      }
    });
    return () => unsub();
  }, [isGuest]);

  // Load Tournaments & Current User's Registrations
  useEffect(() => {
    const qTours = query(collection(db, 'tournaments'));
    const unsubTours = onSnapshot(qTours, (snap) => {
      const list: Tournament[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Tournament);
      });
      
      // Sort client-side by createdAt descending to ensure resilience
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      // Ensure FIFA World Cup is always in the list
      const hasFIFA = list.some(t => t.name === 'FIFA World Cup');
      if (!hasFIFA) {
        list.unshift({
          id: 'demo_fifa',
          name: 'FIFA World Cup',
          game: 'FIFA Mobile / FC 24',
          status: 'upcoming',
          registered: 0,
          maxPlayers: 32,
          prize: '50,000 AX Coins',
          date: 'Jul 15, 2026',
          time: '08:00 PM PKT',
          entryFee: 'Rs 200',
          teamType: 'Squad (4 Players)',
          hasTeams: true
        });
      }

      if (list.length === 1 && list[0].id === 'demo_fifa') {
        // Fallback demo data if Firestore is empty except for our injected one
        setTournaments([
          list[0],
          {
            id: 'demo1',
            name: 'Grand RP Duo Showdown',
            game: 'Grand RP Mobile',
            status: 'live',
            registered: 18,
            maxPlayers: 32,
            prize: '10,000 AX',
            date: 'Live Now',
            time: '08:00 PM',
            entryFee: 'Rs 150',
            teamType: 'Duo (2 Players)'
          },
          {
            id: 'demo2',
            name: 'City Cup Championship',
            game: 'Grand RP Mobile',
            status: 'upcoming',
            registered: 4,
            maxPlayers: 64,
            prize: '25,000 AX',
            date: 'July 5, 2026',
            time: '09:00 PM',
            entryFee: 'Free',
            teamType: 'Squad (4 Players)'
          }
        ]);
      } else {
        setTournaments(list);
      }
    }, (err) => {
      console.warn("Failed to listen to tournaments:", err);
    });

    return () => unsubTours();
  }, []);

  // Listen to Registrations for Current User
  useEffect(() => {
    if (!currentUser || isGuest) {
      setUserRegistrations({});
      return;
    }
    const qRegs = query(
      collection(db, 'tournament_registrations'),
      where('userId', '==', currentUser.uid)
    );
    const unsubRegs = onSnapshot(qRegs, (snap) => {
      const mapping: { [tourId: string]: Registration } = {};
      snap.forEach((d) => {
        const r = d.data() as Registration;
        mapping[r.tournamentId] = { id: d.id, ...r };
      });
      setUserRegistrations(mapping);
    }, (err) => {
      console.warn("Failed to listen to user registrations:", err);
    });
    return () => unsubRegs();
  }, [currentUser, isGuest]);

  // Listen to Friend System (Friends, Friend Requests, Direct Messages)
  useEffect(() => {
    if (!currentUser || isGuest) {
      setFriends([]);
      setFriendRequests([]);
      return;
    }

    const unsubFriends = onSnapshot(collection(db, 'users', currentUser.uid, 'friends'), (snap) => {
      const list: Friend[] = [];
      snap.forEach((d) => {
        list.push(d.data() as Friend);
      });
      setFriends(list);
    }, (err) => {
      console.warn("Failed to listen to friends:", err);
    });

    const unsubReqs = onSnapshot(collection(db, 'users', currentUser.uid, 'friendRequests'), (snap) => {
      const list: FriendRequest[] = [];
      snap.forEach((d) => {
        list.push({ uid: d.id, ...d.data() } as FriendRequest);
      });
      setFriendRequests(list);
    }, (err) => {
      console.warn("Failed to listen to friend requests:", err);
    });

    return () => {
      unsubFriends();
      unsubReqs();
    };
  }, [currentUser, isGuest]);

  // Listen to DM Messages when open
  useEffect(() => {
    if (!currentUser || !activeFriend || !showDMChat) {
      setDms([]);
      return;
    }
    const chatId = [currentUser.uid, activeFriend.uid].sort().join('_');
    const qDM = query(collection(db, 'dms', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubDMs = onSnapshot(qDM, (snap) => {
      const list: DirectMessage[] = [];
      snap.forEach((d) => {
        list.push(d.data() as DirectMessage);
      });
      setDms(list);
      setTimeout(() => dmEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => {
      console.warn("Failed to listen to DMs:", err);
    });

    return () => unsubDMs();
  }, [currentUser, activeFriend, showDMChat]);

  // Listen to Support Messages
  useEffect(() => {
    if (!currentUser || isGuest) {
      setSupportMessages([]);
      return;
    }
    const ticketId = currentUser.uid + '_ticket';
    const qSupport = query(collection(db, 'support', ticketId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubSupport = onSnapshot(qSupport, (snap) => {
      const list: SupportMessage[] = [];
      snap.forEach((d) => {
        list.push(d.data() as SupportMessage);
      });
      setSupportMessages(list);
      setTimeout(() => supportEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => {
      console.warn("Failed to listen to support messages:", err);
    });

    return () => unsubSupport();
  }, [currentUser, isGuest]);

  // Listen to Notifications
  useEffect(() => {
    if (!currentUser || isGuest) {
      setNotifications([]);
      setUnreadNotifsCount(0);
      isInitialNotifs.current = true;
      return;
    }
    const qNotifs = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid)
    );
    const unsubNotifs = onSnapshot(qNotifs, (snap) => {
      const list: any[] = [];
      let unread = 0;
      snap.forEach((d) => {
        const n = d.data();
        list.push({ id: d.id, ...n });
        if (!n.read) unread++;
      });

      // Show real-time alerts for newly added notifications
      if (!isInitialNotifs.current) {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const n = change.doc.data();
            if (!n.read) {
              const title = n.title || 'New Notification';
              const body = n.message || n.body || '';
              const newToastId = `toast_${Date.now()}_${Math.random()}`;
              setToasts((prev) => [...prev, { id: newToastId, title, body }]);
              // Auto remove after 7 seconds
              setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== newToastId));
              }, 7000);
            }
          }
        });
      } else {
        isInitialNotifs.current = false;
      }

      setNotifications(list);
      setUnreadNotifsCount(unread);
    }, (err) => {
      console.warn("Failed to listen to notifications:", err);
    });
    return () => unsubNotifs();
  }, [currentUser, isGuest]);

  // Listen to all registrations for the selected tournament
  useEffect(() => {
    if (!selectedTournament) {
      setAllTournamentRegistrations([]);
      setTregSelectedTeamColor('');
      return;
    }

    const q = query(
      collection(db, 'tournament_registrations'),
      where('tournamentId', '==', selectedTournament.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setAllTournamentRegistrations(list);
    });

    return () => unsubscribe();
  }, [selectedTournament]);

  // Auto-seed the "FIFA World Cup" special tournament
  useEffect(() => {
    if (!currentUser || isGuest) return;
    const seedFIFA = async () => {
      try {
        const q = query(
          collection(db, 'tournaments'),
          where('name', '==', 'FIFA World Cup')
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          // Add the special event
          await addDoc(collection(db, 'tournaments'), {
            name: 'FIFA World Cup',
            game: 'FIFA Mobile / FC 24',
            prize: '50,000 AX Coins',
            maxPlayers: 32,
            date: 'Jul 15, 2026',
            time: '08:00 PM PKT',
            entryFee: 'Rs 200',
            teamType: 'Squad (4 Players)',
            status: 'upcoming',
            hasTeams: true,
            registered: 0,
            createdAt: serverTimestamp()
          });
          console.log('FIFA World Cup tournament successfully auto-provisioned!');
        }
      } catch (err) {
        console.warn('Failed to seed FIFA tournament:', err);
      }
    };
    seedFIFA();
  }, [currentUser, isGuest]);

  // Google Login
  const handleGoogleLogin = async () => {
    if (!agreedToTerms) {
      setAuthError('⚠️ You must agree to the Terms & Conditions and Privacy Policy to enter the Arena!');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error(error);
      if (error.code !== 'auth/popup-closed-by-user') {
        setAuthError(error.message);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Email Sign In or Create
  const handleEmailAuth = async () => {
    if (!agreedToTerms) {
      setAuthError('⚠️ You must agree to the Terms & Conditions and Privacy Policy to enter the Arena!');
      return;
    }
    if (!email || !password) {
      setAuthError('Please enter email and password.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (signInErr: any) {
      if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
        // Try creating account instead
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          const displayName = email.split('@')[0];
          await updateProfile(cred.user, { displayName });
          
          // Profile doc will be bootstrapped by onAuthStateChanged
        } catch (signUpErr: any) {
          setAuthError(signUpErr.message);
        }
      } else {
        setAuthError(signInErr.message);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Guest Account login
  const handleGuestConfirm = () => {
    if (!agreedToTerms) {
      alert('You must agree to the Terms & Conditions and Privacy Policy to enter the Arena!');
      return;
    }
    const gid = Math.floor(100000 + Math.random() * 900000);
    setGuestId(gid);
    setIsGuest(true);
    setCurrentUser({
      id: `guest_${gid}`,
      uid: `guest_${gid}`,
      name: 'Guest Player',
      handle: `@guest#${gid}`,
      av: `https://api.dicebear.com/7.x/bottts/svg?seed=g${gid}`,
      email: '',
      premium: false,
      banned: false,
      balance: 0
    });
    setShowGuestWarning(false);
    setActiveTab('Profile');
  };

  // Sign out
  const handleLogout = async () => {
    if (!confirm('Are you sure you want to exit the Arena?')) return;
    if (isGuest) {
      setIsGuest(false);
      setGuestId(null);
      setCurrentUser(null);
    } else {
      await signOut(auth);
    }
    setActiveTab('Profile');
  };

  // Handle DM Send
  const handleSendDM = async () => {
    if (!dmText.trim() || !currentUser || !activeFriend) return;
    const txt = dmText.trim();
    setDmText('');
    const chatId = [currentUser.uid, activeFriend.uid].sort().join('_');
    try {
      await addDoc(collection(db, 'dms', chatId, 'messages'), {
        text: txt,
        sender: currentUser.uid,
        senderName: currentUser.name,
        createdAt: serverTimestamp()
      });
    } catch (e: any) {
      console.error('Error sending DM: ', e);
    }
  };

  // Support Bot automated responses (now written directly to firestore!)
  const BOT_RULES = [
    { keys: ['jazzcash', 'jazz cash'], reply: 'To deposit via JazzCash: Open app → Send Money → 0302-4686897 → enter amount → Confirm. Coins added instantly!' },
    { keys: ['easypaisa'], reply: 'To deposit via EasyPaisa: Open app → Send Money → 0315-9876543 → enter amount → Confirm. Coins in 5 min!' },
    { keys: ['deposit', 'add coins', 'recharge'], reply: 'Go to Wallet → Deposit → choose JazzCash or EasyPaisa → enter amount. Min Rs 50.' },
    { keys: ['withdraw'], reply: 'Go to Wallet → Withdraw → enter amount. Processing takes 24-48 hours.' },
    { keys: ['tournament', 'join', 'register', 'event'], reply: 'Go to Events → choose a tournament → tap it to see details and Participate!' },
    { keys: ['premium', 'upgrade'], reply: 'Go to Profile → Premium Plans. Premium users get exclusive tournaments and priority support!' },
    { keys: ['rules', 'rule'], reply: 'Check the Rules section for all guidelines. No cheating, no abuse. Violations may result in a ban.' },
    { keys: ['hello', 'hi', 'hey'], reply: 'Hello! I am ArenaX Support Bot. Ask me about wallet, tournaments, deposits, or your account!' },
    { keys: ['thanks', 'thank you'], reply: 'Happy to help! Let me know if you need anything else.' },
    { keys: ['report', 'cheat', 'hack'], reply: 'To report a player: Click on the "Report Hack/Cheat" button below the tournament card, fill in all player details and evidence, or type "agent" to connect with our team.' },
    { keys: ['ban', 'banned'], reply: 'If suspended from tournaments, click the tournament to view details. To appeal, type "agent" to speak with a human moderator.' },
  ];

  // Send Support Message & trigger saved BOT Reply
  const handleSendSupport = async (overrideText?: string) => {
    const txt = (overrideText || supportText).trim();
    if (!txt || !currentUser) return;
    if (!overrideText) setSupportText('');

    const ticketId = currentUser.uid + '_ticket';
    const messagesCollection = collection(db, 'support', ticketId, 'messages');

    try {
      // 1. Save User Message
      await addDoc(messagesCollection, {
        text: txt,
        sender: 'user',
        senderName: currentUser.name || 'Player',
        createdAt: serverTimestamp()
      });

      // Update or create support ticket index document
      await setDoc(doc(db, 'support_tickets', ticketId), {
        id: ticketId,
        ticketId: ticketId,
        uid: currentUser.uid,
        userName: currentUser.name || 'Player',
        userHandle: currentUser.handle || 'player',
        lastMsg: txt,
        status: escalated ? 'escalated' : 'open',
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 2. Check and generate Bot Reply if not escalated
      if (!escalated) {
        const lower = txt.toLowerCase();
        
        // Human Escalation keywords
        if (['agent', 'human', 'urgent', 'complaint', 'connect me', 'admin'].some(k => lower.includes(k))) {
          setEscalated(true);
          setTimeout(async () => {
            const botReplyMsg = 'Connecting to Human Agent... Your message has been sent to the live support team. Please wait while an administrator reviews your ticket!';
            await addDoc(messagesCollection, {
              text: botReplyMsg,
              sender: 'bot',
              senderName: 'ArenaX Support Bot',
              createdAt: serverTimestamp()
            });
            await setDoc(doc(db, 'support_tickets', ticketId), {
              status: 'escalated',
              lastMsg: '[Bot]: Connecting to human agent...',
              updatedAt: serverTimestamp()
            }, { merge: true });
          }, 800);
          return;
        }

        // Call Gemini support chat API
        try {
          const history = (supportMessages || [])
            .filter(m => m.sender === 'user' || m.sender === 'bot')
            .map(m => ({
              role: m.sender === 'user' ? 'user' : 'model',
              text: m.text
            }));

          const cleanProfile = currentUser ? {
            name: currentUser.name,
            handle: currentUser.handle,
            balance: currentUser.balance,
            premium: currentUser.premium
          } : null;

          const cleanTournaments = (tournaments || []).map(t => ({
            name: t.name,
            game: t.game,
            entryFee: t.entryFee,
            prize: t.prize,
            status: t.status,
            registered: t.registered,
            maxPlayers: t.maxPlayers
          }));

          const res = await fetch('/api/support-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: txt,
              history: history,
              userProfile: cleanProfile,
              tournaments: cleanTournaments
            })
          });

          if (!res.ok) throw new Error('API server returned error');
          const data = await res.json();
          let replyStr = data.text;

          if (replyStr.includes('[ESCALATE]')) {
            setEscalated(true);
            replyStr = replyStr.replace('[ESCALATE]', '').trim();

            setTimeout(async () => {
              await addDoc(messagesCollection, {
                text: replyStr,
                sender: 'bot',
                senderName: 'ArenaX Support Bot',
                createdAt: serverTimestamp()
              });
              await addDoc(messagesCollection, {
                text: '🔄 [Ticket Escalated]: Connecting to live human agent moderator... Your query has been marked as high-priority. Please wait!',
                sender: 'bot',
                senderName: 'ArenaX Support Bot',
                createdAt: serverTimestamp()
              });
              await setDoc(doc(db, 'support_tickets', ticketId), {
                status: 'escalated',
                lastMsg: '[Bot]: Ticket escalated to live admin.',
                updatedAt: serverTimestamp()
              }, { merge: true });
            }, 700);
          } else {
            setTimeout(async () => {
              await addDoc(messagesCollection, {
                text: replyStr,
                sender: 'bot',
                senderName: 'ArenaX Support Bot',
                createdAt: serverTimestamp()
              });
              await setDoc(doc(db, 'support_tickets', ticketId), {
                lastMsg: `[Bot]: ${replyStr.slice(0, 60)}...`,
                updatedAt: serverTimestamp()
              }, { merge: true });
            }, 700);
          }
        } catch (apiErr) {
          console.warn("React support bot Gemini API failed, using local rules:", apiErr);
          // Fallback to local keyword rules
          const matched = BOT_RULES.find(rule => rule.keys.some(k => lower.includes(k)));
          const botReplyMsg = matched ? matched.reply : 'I am not sure! Try rephrasing or type "agent" to connect with our live human support moderators.';
          
          setTimeout(async () => {
            await addDoc(messagesCollection, {
              text: botReplyMsg,
              sender: 'bot',
              senderName: 'ArenaX Support Bot',
              createdAt: serverTimestamp()
            });
            await setDoc(doc(db, 'support_tickets', ticketId), {
              lastMsg: `[Bot]: ${botReplyMsg.slice(0, 60)}...`,
              updatedAt: serverTimestamp()
            }, { merge: true });
          }, 700);
        }
      }
    } catch (err: any) {
      console.error('Error saving support chat: ', err);
    }
  };

  // Friend Request Add
  const handleSearchFriend = async () => {
    const queryStr = searchHandle.trim().toLowerCase();
    if (queryStr.length < 3) {
      alert('Search handle must be at least 3 characters.');
      return;
    }
    setSearching(true);
    setSearchResult(null);
    try {
      const qUser = query(collection(db, 'users'), where('handle', '==', queryStr));
      const snap = await getDocs(qUser);
      let found: any = null;
      snap.forEach((d) => {
        const u = d.data();
        if (!found && u.uid !== currentUser?.uid) {
          found = { id: d.id, ...u };
        }
      });
      setSearchResult(found);
    } catch (error) {
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!currentUser || !searchResult) return;
    try {
      await setDoc(doc(db, 'users', searchResult.uid, 'friendRequests', currentUser.uid), {
        uid: currentUser.uid,
        name: currentUser.name,
        handle: currentUser.handle,
        av: currentUser.av,
        sentAt: serverTimestamp()
      });
      setShowAddFriendModal(false);
      setSearchHandle('');
      setSearchResult(null);
      alert('Friend request sent successfully!');
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleAcceptFriend = async (req: FriendRequest) => {
    if (!currentUser) return;
    try {
      // Add to my friend list
      await setDoc(doc(db, 'users', currentUser.uid, 'friends', req.uid), {
        uid: req.uid,
        name: req.name,
        handle: req.handle,
        av: req.av,
        addedAt: serverTimestamp()
      });
      // Add myself to their friend list
      await setDoc(doc(db, 'users', req.uid, 'friends', currentUser.uid), {
        uid: currentUser.uid,
        name: currentUser.name,
        handle: currentUser.handle,
        av: currentUser.av,
        addedAt: serverTimestamp()
      });
      // Delete friend request
      await deleteDoc(doc(db, 'users', currentUser.uid, 'friendRequests', req.uid));
      alert(`Friendship accepted with ${req.name}!`);
    } catch (error: any) {
      alert('Error accepting friend request: ' + error.message);
    }
  };

  const handleDeclineFriend = async (req: FriendRequest) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'friendRequests', req.uid));
    } catch (error) {
      console.error(error);
    }
  };

  const openDM = (friend: Friend) => {
    setActiveFriend(friend);
    setShowDMChat(true);
  };

  // Customize Profile Changes Save
  const handleSaveCustomize = async () => {
    if (!currentUser || isGuest) return;
    const nameToSave = custName.trim() || currentUser.name;
    const avToSave = `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedAvatarSeed}`;
    
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: nameToSave,
        av: avToSave,
        bio: custBio.trim()
      });
      setShowCustomizeModal(false);
      alert('Profile customization saved successfully! ✅');
    } catch (error: any) {
      alert('Error saving customization: ' + error.message);
    }
  };

  // Wallet Deposits
  const handleConfirmPayment = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt < 50) {
      alert('Minimum deposit amount is Rs 50!');
      return;
    }
    if (!currentUser) return;

    try {
      // In Demo mode, we add balance immediately but also record transaction in transactions subcollection
      const methodNames = { jc: 'JazzCash', ep: 'EasyPaisa', cc: 'Card/Bank' };
      const newBal = (currentUser.balance || 0) + amt;

      // Add transaction history
      const newTx: Transaction = {
        id: `tx_${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'deposit',
        amount: amt,
        status: 'approved',
        account: methodNames[payMethod],
        timestamp: new Date().toLocaleString()
      };

      await updateDoc(doc(db, 'users', currentUser.uid), {
        balance: newBal,
        transactions: arrayUnion(newTx)
      });

      setShowPaymentModal(false);
      setPayAmount('');
      setPayStep(1);
      alert(`Rs ${amt} successfully deposited via ${methodNames[payMethod]}! ${amt} AX Coins have been added to your ArenaX wallet.`);
    } catch (error: any) {
      alert('Deposit error: ' + error.message);
    }
  };

  // Wallet Withdrawals
  const handleWithdrawal = async () => {
    if (!currentUser) return;
    if (currentUser.balance <= 0) {
      alert('You have no AX Coins available to withdraw!');
      return;
    }
    const amtStr = prompt(`Withdraw how many AX Coins? (Max: ${currentUser.balance})`);
    if (!amtStr) return;
    const amt = parseFloat(amtStr);
    if (isNaN(amt) || amt <= 0 || amt > currentUser.balance) {
      alert('Invalid withdrawal amount!');
      return;
    }

    const accountDetails = prompt('Enter your withdrawal details (e.g. JazzCash / EasyPaisa Number):');
    if (!accountDetails || !accountDetails.trim()) {
      alert('Account details are required for processing withdrawal!');
      return;
    }

    // Process
    try {
      const newBal = currentUser.balance - amt;

      const newTx: Transaction = {
        id: `tx_${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'withdraw',
        amount: amt,
        status: 'pending',
        account: accountDetails,
        timestamp: new Date().toLocaleString()
      };

      await updateDoc(doc(db, 'users', currentUser.uid), {
        balance: newBal,
        transactions: arrayUnion(newTx)
      });
      alert(`Withdrawal request of ${amt} AX Coins submitted! Processing takes 24-48 hours.`);
    } catch (error: any) {
      alert('Withdrawal error: ' + error.message);
    }
  };

  // Buy premium logic
  const handleBuyPremium = async () => {
    if (isGuest || !currentUser) {
      alert('Please connect a real account to purchase premium.');
      return;
    }
    const costCoins = premiumPlan === 'weekly' ? 199 : 399;
    const balance = currentUser.balance || 0;

    if (balance < costCoins) {
      alert('Insufficient coins! Please deposit more coins into your ArenaX wallet to purchase premium. ❌');
      return;
    }

    if (confirm(`Confirm Premium activation? This will deduct ${costCoins} AX Coins from your ArenaX wallet immediately.`)) {
      try {
        const newBal = balance - costCoins;
        await updateDoc(doc(db, 'users', currentUser.uid), {
          premium: true,
          balance: newBal
        });

        // Write to deposit_requests (for real-time transaction syncing)
        await addDoc(collection(db, 'deposit_requests'), {
          userId: currentUser.uid,
          userName: currentUser.name,
          userEmail: currentUser.email || '',
          type: 'withdrawal',
          method: premiumPlan === 'weekly' ? 'Weekly Sub' : 'Monthly Sub',
          amountPKR: 0,
          amountAX: costCoins,
          txnId: 'PRM-' + Math.floor(100000 + Math.random() * 900000),
          status: 'approved',
          submittedAt: serverTimestamp()
        });

        setShowPremiumModal(false);
        alert(`🎉 ArenaX Premium activated! ${costCoins} AX Coins successfully deducted. Enjoy direct messaging, exclusive custom badges, and prioritized support!`);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Active tournaments filtered
  const filteredTournaments = tournaments.filter((t) => {
    if (activeTournamentFilter === 'all') return true;
    return t.status === activeTournamentFilter;
  });

  // Check tournament registration click / verification
  const handleTournamentClick = (tour: Tournament) => {
    // If user is banned from ArenaX tournaments:
    if (currentUser && (currentUser.banType === 'tournament' || currentUser.banned)) {
      const reason = currentUser.banReason || 'Unspecified rule violation';
      alert(`❌ Tournament Participation Blocked!\n\nYou are banned from participating in tournaments.\n\nReason: ${reason}\n\nIf you feel this is unfair, please contact support immediately.`);
      return;
    }

    const reg = userRegistrations[tour.id];
    if (reg && reg.status === 'approved') {
      alert(`✅ Registration Verified!\n\nYou are already registered for "${tour.name}". Your slot is locked. Check in 10 minutes before the live event starts!`);
      return;
    }

    // Otherwise, open detail modal for registration/status review
    setSelectedTournament(tour);
    setTregStep(1);
    setTregRealName('');
    setTregGameName('');
    setTregUID('');
    setTregAge('');
    setTregTxnId('');
    setTregScreenshot('');
    setTregCheck1(false);
    setTregCheck2(false);
  };

  // Register form submit
  const handleRegisterSubmit = async () => {
    if (!selectedTournament || !currentUser) return;
    if (!tregRealName.trim() || !tregGameName.trim() || !tregUID.trim() || !tregAge.trim()) {
      alert('Please fill out all required fields!');
      return;
    }

    const isSquadEvent = selectedTournament.hasTeams || selectedTournament.name.toLowerCase().includes('fifa');
    if (isSquadEvent && !tregSelectedTeamColor) {
      alert('Please select a Squad / Team Color theme!');
      return;
    }

    if (isSquadEvent && tregSelectedTeamColor) {
      const approvedCount = allTournamentRegistrations.filter(r => r.selectedTeamColor === tregSelectedTeamColor && r.status === 'approved').length;
      if (approvedCount >= 4) {
        alert(`❌ Team ${tregSelectedTeamColor} is already full with 4 approved players! Please choose a different color.`);
        return;
      }
    }

    if (!tregCheck1 || !tregCheck2) {
      alert('You must accept the rules and guidelines to participate!');
      return;
    }

    // Parse entry fee and verify balance
    const feeString = selectedTournament.entryFee || '';
    let feeAmount = 0;
    if (feeString && !feeString.toLowerCase().includes('free')) {
      const matches = feeString.match(/\d+/);
      if (matches) feeAmount = parseInt(matches[0], 10);
    }

    const balance = currentUser.balance || 0;
    if (balance < feeAmount) {
      alert('Insufficient coins! Please deposit more coins into your ArenaX wallet to register for this tournament. ❌');
      return;
    }

    setTregSubmitting(true);
    try {
      const autoTxnId = 'AX-WALLET-REG-' + Math.floor(100000 + Math.random() * 900000);
      await addDoc(collection(db, 'tournament_registrations'), {
        tournamentId: selectedTournament.id,
        tournamentName: selectedTournament.name,
        userId: currentUser.uid,
        userName: currentUser.name,
        userHandle: currentUser.handle,
        realName: tregRealName.trim(),
        gameName: tregGameName.trim(),
        gameUID: tregUID.trim(),
        age: tregAge.trim(),
        txnId: autoTxnId,
        screenshot: 'Auto-verified ArenaX Wallet Hold',
        status: 'pending',
        selectedTeamColor: tregSelectedTeamColor || null,
        submittedAt: serverTimestamp()
      });
      setTregStep(4); // Success step
    } catch (err: any) {
      alert('Registration error: ' + err.message);
    } finally {
      setTregSubmitting(false);
    }
  };

  // Toggle Accordion
  const toggleAccordion = (index: number) => {
    setExpandedRules((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // Open notifications
  const handleOpenNotifications = async () => {
    if (!currentUser || isGuest) return;
    const unread = notifications.filter(n => !n.read);
    const messages = notifications.map(n => {
      if (n.message) return `• ${n.message}`;
      if (n.title && n.body) return `• ${n.title}\n  ${n.body}`;
      if (n.body) return `• ${n.body}`;
      if (n.title) return `• ${n.title}`;
      return '• New ArenaX notification received.';
    }).join('\n\n');
    
    if (notifications.length === 0) {
      alert('No notifications yet!');
      return;
    }

    alert(`🔔 ArenaX Notifications:\n\n${messages}`);

    // Mark as read
    try {
      for (const notif of unread) {
        await updateDoc(doc(db, 'notifications', notif.id), { read: true });
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Full user account ban block screen
  if (currentUser && currentUser.banned && currentUser.banType === 'full') {
    return (
      <div className="fixed inset-0 bg-[#07090f] text-white flex items-center justify-center p-6 z-[99999]">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-[#e8404a]/10 text-[#e8404a] rounded-full flex items-center justify-center text-4xl border border-[#e8404a]/30 mx-auto animate-pulse">
            <i className="fas fa-user-slash"></i>
          </div>
          <div className="space-y-2">
            <h1 className="font-sans text-3xl font-extrabold text-[#e8404a] tracking-wider uppercase">Account Suspended</h1>
            <p className="text-sm text-[#8890b0]">Your ArenaX account has been suspended for violating terms of service.</p>
          </div>
          <div className="bg-[#111420] border border-[#252a45] rounded-xl p-5 text-left space-y-3">
            <div className="flex justify-between border-bottom border-[#1e2440] pb-2 text-xs">
              <span className="text-[#8890b0] font-medium">SUSPENSION TYPE</span>
              <span className="text-white font-bold uppercase">{currentUser.banType} PERMANENT</span>
            </div>
            <div className="flex justify-between border-bottom border-[#1e2440] pb-2 text-xs">
              <span className="text-[#8890b0] font-medium">REASON</span>
              <span className="text-[#e8404a] font-bold">{currentUser.banReason || 'Using third-party cheat engines / illegal hacks'}</span>
            </div>
            <div className="text-[11px] text-[#8890b0] leading-relaxed pt-2">
              If you believe this decision is incorrect or wish to submit an appeal with logs, please contact our support department at <span className="text-[#f0c040] font-medium">support@arenax.com</span>.
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-[#e8404a] hover:bg-[#cc3540] text-white font-bold rounded-lg text-sm transition uppercase tracking-wider"
          >
            Go Back / Exit
          </button>
        </div>
      </div>
    );
  }

  // Auth screen if not logged in
  if (!currentUser) {
    return (
      <div id="sLogin" className="relative min-h-screen bg-[#0a0c12] text-[#f0f2ff] font-sans flex items-center justify-center overflow-y-auto px-4 py-8">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-[#f0c040]/10 to-transparent rounded-full filter blur-[120px]"></div>
        </div>

        <div className="relative z-10 w-full max-w-[420px] space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#f0c040] to-[#e8a820] rounded-2xl flex items-center justify-center text-3xl text-[#0a0c12] mx-auto shadow-[0_0_32px_rgba(240,192,64,0.4)]">
              <i className="fas fa-trophy"></i>
            </div>
            <h1 className="font-sans text-4xl font-extrabold tracking-wider mt-4">Arena<span className="text-[#f0c040]">X</span></h1>
            <p className="text-[11px] text-[#8890b0] tracking-[3px] uppercase mt-1">Compete · Rise · Dominate</p>
          </div>

          <div className="bg-[#111420] border border-[#252a45] rounded-2xl p-6 shadow-xl space-y-5">
            <div>
              <h2 className="font-sans text-xl font-bold">Enter the Arena</h2>
              <p className="text-xs text-[#8890b0]">Choose how you want to continue</p>
            </div>

            {authError && (
              <div className="p-3 bg-[#e8404a]/10 border border-[#e8404a]/30 rounded-lg text-xs text-[#e8404a] text-center">
                {authError}
              </div>
            )}

            {/* Terms & Conditions / Privacy Policy Agreement Checkbox */}
            <div className="flex items-start gap-2.5 p-3 bg-[#171b2e] border border-[#252a45] rounded-lg">
              <input
                id="reactTermsCheckbox"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#f0c040] rounded border-[#252a45] bg-[#0a0c12] cursor-pointer"
              />
              <label htmlFor="reactTermsCheckbox" className="text-[11px] text-[#8890b0] leading-snug cursor-pointer select-none">
                I agree to the{' '}
                <span onClick={() => setShowTermsModal(true)} className="text-white font-medium hover:underline cursor-pointer">
                  Terms & Conditions
                </span>{' '}
                and{' '}
                <span onClick={() => setShowPrivacyModal(true)} className="text-white font-medium hover:underline cursor-pointer">
                  Privacy Policy
                </span>{' '}
                of ArenaX.
              </label>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full py-3 bg-white hover:bg-neutral-100 text-neutral-800 rounded-lg text-sm font-semibold flex items-center justify-center gap-2.5 transition active:scale-[0.98]"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
              Continue with Google
            </button>

            <div className="flex items-center gap-3 text-xs text-[#4a5070]">
              <div className="flex-1 h-[1px] bg-[#252a45]"></div>
              <span>or</span>
              <div className="flex-1 h-[1px] bg-[#252a45]"></div>
            </div>

            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#171b2e] border border-[#252a45] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#f0c040] transition text-white"
              />
              <input
                type="password"
                placeholder="Password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#171b2e] border border-[#252a45] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#f0c040] transition text-white"
              />
              <button
                onClick={handleEmailAuth}
                disabled={authLoading}
                className="w-full py-3 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] rounded-lg text-sm font-semibold flex items-center justify-center gap-2.5 transition active:scale-[0.98]"
              >
                {authLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-envelope"></i>}
                Continue with Email
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#4a5070]">
              <div className="flex-1 h-[1px] bg-[#252a45]"></div>
              <span>or</span>
              <div className="flex-1 h-[1px] bg-[#252a45]"></div>
            </div>

            <button
              onClick={() => setShowGuestWarning(true)}
              className="w-full py-3 bg-transparent hover:border-[#f0c040] hover:text-[#f0c040] border border-[#252a45] text-[#8890b0] rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              <i className="fas fa-user-secret"></i>
              Continue as Guest
            </button>
          </div>
        </div>

        {/* Guest Warning Modal */}
        {showGuestWarning && (
          <div className="fixed inset-0 bg-black/85 backdrop-filter backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-[#111420] border border-[#252a45] rounded-2xl p-6 max-w-[420px] w-full animate-fade-in text-center space-y-4">
              <div className="w-14 h-14 bg-[#e8404a]/10 text-[#e8404a] rounded-full flex items-center justify-center text-2xl border border-[#e8404a]/25 mx-auto">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h3 className="font-sans text-xl font-bold text-[#e8404a]">Guest Account Warning</h3>
              <p className="text-xs text-[#8890b0] leading-relaxed">
                Your guest account <strong>cannot be recovered</strong> under any condition if you clear your browser cache.
              </p>
              <ul className="text-left text-xs text-[#8890b0] space-y-2 bg-[#171b2e] p-4 rounded-xl border border-[#252a45]">
                <li className="flex items-center gap-2"><i className="fas fa-times-circle text-[#e8404a]"></i> No account recovery or password resets</li>
                <li className="flex items-center gap-2"><i className="fas fa-times-circle text-[#e8404a]"></i> Wallet AX balance is strictly non-transferable</li>
                <li className="flex items-center gap-2"><i className="fas fa-times-circle text-[#e8404a]"></i> Profile customizations are restricted</li>
                <li className="flex items-center gap-2"><i className="fas fa-times-circle text-[#e8404a]"></i> Support tickets and group match chats are limited</li>
              </ul>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowGuestWarning(false)}
                  className="flex-1 py-2.5 bg-[#1e2340] hover:bg-[#171b2e] border border-[#252a45] text-[#8890b0] font-semibold rounded-lg text-xs transition"
                >
                  Go Back
                </button>
                <button
                  onClick={handleGuestConfirm}
                  className="flex-1 py-2.5 bg-[#e8404a] hover:bg-[#cc3540] text-white font-semibold rounded-lg text-xs transition"
                >
                  I Understand
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main Dashboard
  return (
    <div id="sDash" className="min-h-screen bg-[#0a0c12] text-[#f0f2ff] flex flex-col font-sans pb-[64px] overflow-hidden">
      {/* Real-Time Toast Notifications Overlay */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => {
              setToasts((prev) => prev.filter((item) => item.id !== t.id));
              handleOpenNotifications();
            }}
            className="bg-[#111420] border border-[#252a45] text-white rounded-xl shadow-2xl p-4 flex flex-col gap-1 pointer-events-auto cursor-pointer hover:bg-[#171b2e] transition duration-300 transform translate-x-0 animate-slide-in"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#f0c040]/10 flex items-center justify-center text-[#f0c040] text-sm">
                  <i className="fas fa-bell"></i>
                </div>
                <span className="font-semibold text-xs text-[#f0c040] tracking-wide uppercase">{t.title}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts((prev) => prev.filter((item) => item.id !== t.id));
                }}
                className="text-[#4a5070] hover:text-white transition text-xs"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <p className="text-xs text-[#8890b0] pl-10 leading-relaxed">{t.body}</p>
          </div>
        ))}
      </div>

      {/* Dynamic Cursor Effects Styling */}
      <style>{`
        body { font-family: 'Inter', sans-serif; }
        .ff-title { font-family: 'Rajdhani', sans-serif; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #252a45; border-radius: 4px; }
        @keyframes ring-pulse {
          0% { box-shadow: 0 0 0 0 rgba(240,192,64,0.4); }
          100% { box-shadow: 0 0 0 8px rgba(240,192,64,0); }
        }
        .glow-active { animation: ring-pulse 1.8s infinite; }
      `}</style>

      {/* TOPBAR */}
      <nav className="h-[56px] bg-[#111420] border-b border-[#252a45] flex items-center justify-between px-4 z-20">
        <div className="ff-title text-xl font-bold tracking-wider text-white">
          <i className="fas fa-trophy text-[#f0c040] mr-2"></i>Arena<span className="text-[#f0c040]">X</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Admin panel switch option for staff */}
          {(isAdminUID || (currentUser && currentUser.email === 'admin@arenax.com')) && (
            <button
              onClick={onSwitchToAdmin}
              className="px-3 py-1 bg-[#e8404a] text-white text-[11px] uppercase font-bold rounded hover:bg-[#cc3540] transition tracking-wider flex items-center gap-1"
            >
              <i className="fas fa-shield-alt"></i> Staff Admin
            </button>
          )}

          {/* Topbar Support Chat */}
          <button
            onClick={() => setActiveTab('Support')}
            className="relative w-9 h-9 bg-[#171b2e] border border-[#252a45] rounded-full flex items-center justify-center text-sm text-[#8890b0] hover:text-[#f0c040] transition"
            title="Support Chat"
          >
            <i className="fas fa-headset"></i>
          </button>

          {/* Notification Bell */}
          <button
            onClick={handleOpenNotifications}
            className="relative w-9 h-9 bg-[#171b2e] border border-[#252a45] rounded-full flex items-center justify-center text-sm text-[#8890b0] hover:text-[#f0c040] transition"
            title="Notifications"
          >
            <i className="fas fa-bell"></i>
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#e8404a] rounded-full ring-2 ring-[#111420]"></span>
            )}
          </button>

          {/* Settings Cog */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="relative w-9 h-9 bg-[#171b2e] border border-[#252a45] rounded-full flex items-center justify-center text-sm text-[#8890b0] hover:text-[#f0c040] transition"
            title="Settings"
          >
            <i className="fas fa-cog"></i>
          </button>

          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#f0c040] flex-shrink-0 ml-1">
            <img src={currentUser.av} alt="Avatar" className="w-full h-full object-cover" />
          </div>
        </div>
      </nav>

      {/* Banners */}
      {isGuest && (
        <div className="bg-[#f0c040]/10 border-b border-[#f0c040]/20 px-4 py-2 flex items-center gap-2 text-xs text-[#c0a030]">
          <i className="fas fa-exclamation-circle text-sm"></i>
          <span>Guest Account — certain wallet & chat features are restricted.</span>
          <button
            onClick={() => alert('Connect a real Google/Email account via logout and relogin to unlock.')}
            className="ml-auto bg-[#f0c040] text-[#0a0c12] font-bold px-2 py-0.5 rounded text-[10px]"
          >
            Upgrade
          </button>
        </div>
      )}

      {currentUser.premium && (
        <div className="bg-[#a78bfa]/10 border-b border-[#a78bfa]/20 px-4 py-2 flex items-center gap-2 text-xs text-[#a78bfa]">
          <i className="fas fa-crown text-sm"></i>
          <span><strong>Premium Active</strong> — Direct DM messaging and visual customization are unlocked!</span>
        </div>
      )}

      {/* MAIN BODY SCROLL */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ── PROFILE TAB ── */}
        {activeTab === 'Profile' && (
          <div className="space-y-4">
            <div className="ff-title text-xl font-bold flex items-center gap-2">
              <i className="fas fa-user-circle text-[#f0c040]"></i> My Profile
            </div>

            <div className={`p-4 bg-[#171b2e] border border-[#252a45] rounded-xl flex items-center gap-4 relative overflow-hidden ${currentUser.premium ? 'border-[#a78bfa]/30 shadow-[0_0_20px_rgba(167,139,250,0.08)]' : ''}`}>
              <div className="relative flex-shrink-0">
                <img src={currentUser.av} alt="Avatar" className={`w-16 h-16 rounded-full border-2 ${currentUser.premium ? 'border-[#a78bfa]' : 'border-[#f0c040]'}`} />
                <button
                  onClick={() => {
                    if (isGuest) {
                      alert('Register a full account first to customize!');
                      return;
                    }
                    setCustName(currentUser.name);
                    setCustBio(custBio);
                    setShowCustomizeModal(true);
                  }}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] rounded-full flex items-center justify-center text-[10px] transition"
                >
                  <i className="fas fa-pen"></i>
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="ff-title text-lg font-bold text-white leading-tight flex items-center gap-2">
                  {currentUser.name}
                  {currentUser.premium && <i className="fas fa-crown text-[#a78bfa] text-sm" title="Premium"></i>}
                </h3>
                <p className="text-xs text-[#8890b0] mb-2">{currentUser.handle}</p>
                <p className="text-[11px] text-[#8890b0] italic mb-2 max-w-[200px] truncate">{custBio || 'No bio written yet.'}</p>
                
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-[#f0c040]/10 text-[#f0c040] rounded border border-[#f0c040]/20 uppercase">
                    <i className="fas fa-star mr-1"></i> Unranked
                  </span>
                  {isGuest && (
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-neutral-800 text-neutral-400 rounded border border-neutral-700 uppercase">
                      Guest
                    </span>
                  )}
                  {currentUser.premium && (
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-[#a78bfa]/20 text-[#a78bfa] rounded border border-[#a78bfa]/30 uppercase">
                      Premium
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* FEATURED SQUAD TOURNAMENT CALLOUT */}
            <div className="p-4 bg-gradient-to-r from-[#f0c040]/15 to-[#f0c040]/5 border border-[#f0c040]/25 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#f0c040]/10 rounded-xl flex items-center justify-center text-lg text-[#f0c040] border border-[#f0c040]/20 flex-shrink-0">
                  <i className="fas fa-trophy"></i>
                </div>
                <div>
                  <h4 className="font-bold text-[#f0c040] text-sm">FIFA World Cup Squad Event!</h4>
                  <p className="text-[11px] text-[#8890b0] leading-normal">
                    Assemble or claim a spot in a 4-Player squad! Choose one of 8 team colors. Rs 200 entry / 50,000 AX prize!
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveTab('Tour');
                  setActiveTournamentFilter('all');
                }}
                className="px-3.5 py-1.5 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] text-xs font-bold rounded-lg transition whitespace-nowrap font-bold"
              >
                Join Now
              </button>
            </div>

            {/* PREMIUM PROMO CARD */}
            {!currentUser.premium && !isGuest && (
              <div className="p-4 bg-gradient-to-br from-[#a78bfa]/15 to-[#7c3aed]/5 border border-[#a78bfa]/20 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#a78bfa]/10 rounded-xl flex items-center justify-center text-lg text-[#a78bfa] border border-[#a78bfa]/20 flex-shrink-0">
                    <i className="fas fa-crown"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#a78bfa] text-sm">Go Premium!</h4>
                    <p className="text-[11px] text-[#8890b0]">Unlock player Direct Messages, customized profiles, and priority queue.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPremiumModal(true)}
                  className="px-3.5 py-1.5 bg-[#a78bfa] hover:bg-[#8b5cf6] text-white text-xs font-bold rounded-lg transition"
                >
                  Upgrade
                </button>
              </div>
            )}

            {/* STATS */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#171b2e] border border-[#252a45] rounded-xl text-center">
                <div className="ff-title text-2xl font-bold text-[#f0c040]">
                  {Object.keys(userRegistrations).length}
                </div>
                <div className="text-[10px] uppercase text-[#8890b0] tracking-wider mt-0.5">Tournaments</div>
              </div>
              <div className="p-3 bg-[#171b2e] border border-[#252a45] rounded-xl text-center">
                <div className="ff-title text-2xl font-bold text-[#f0c040]">0</div>
                <div className="text-[10px] uppercase text-[#8890b0] tracking-wider mt-0.5">Wins</div>
              </div>
              <div className="p-3 bg-[#171b2e] border border-[#252a45] rounded-xl text-center">
                <div className="ff-title text-2xl font-bold text-[#f0c040]">0%</div>
                <div className="text-[10px] uppercase text-[#8890b0] tracking-wider mt-0.5">Win Rate</div>
              </div>
              <div className="p-3 bg-[#171b2e] border border-[#252a45] rounded-xl text-center">
                <div className="ff-title text-2xl font-bold text-[#f0c040]">—</div>
                <div className="text-[10px] uppercase text-[#8890b0] tracking-wider mt-0.5">Best Rank</div>
              </div>
            </div>

            {/* SETTINGS MENUS */}
            <div className="bg-[#171b2e] border border-[#252a45] rounded-xl divide-y divide-[#252a45] overflow-hidden">
              <div className="px-4 py-2.5 text-[10px] font-semibold text-[#8890b0] uppercase tracking-wider bg-[#111420]/50">
                Account Navigation
              </div>
              
              <button
                onClick={() => {
                  if (isGuest) {
                    alert('Register a full account first!');
                    return;
                  }
                  setSelectedAvatarSeed(currentUser.av.split('seed=')[1] || 'ax1');
                  setCustName(currentUser.name);
                  setCustBio(custBio);
                  setShowCustomizeModal(true);
                }}
                className="w-full text-left px-4 py-3 hover:bg-[#1e2340] text-sm flex items-center justify-between text-[#8890b0] hover:text-white transition"
              >
                <span className="flex items-center gap-3"><i className="fas fa-palette text-[#f0c040]"></i> Customize Profile</span>
                <span className="flex items-center gap-2">
                  <span className="text-[9px] bg-[#a78bfa]/15 text-[#a78bfa] px-1.5 py-0.5 rounded uppercase font-bold">Premium</span>
                  <i className="fas fa-chevron-right text-xs"></i>
                </span>
              </button>

              <button
                onClick={() => {
                  if (isGuest) {
                    alert('Register a full account first!');
                    return;
                  }
                  setActiveTab('Chat');
                }}
                className="w-full text-left px-4 py-3 hover:bg-[#1e2340] text-sm flex items-center justify-between text-[#8890b0] hover:text-white transition"
              >
                <span className="flex items-center gap-3"><i className="fas fa-comments text-[#f0c040]"></i> Player Chats</span>
                <i className="fas fa-chevron-right text-xs"></i>
              </button>

              {!isGuest && (
                <button
                  onClick={() => setShowPremiumModal(true)}
                  className="w-full text-left px-4 py-3 hover:bg-[#1e2340] text-sm flex items-center justify-between text-[#8890b0] hover:text-white transition"
                >
                  <span className="flex items-center gap-3"><i className="fas fa-crown text-[#f0c040]"></i> Premium Plans</span>
                  <i className="fas fa-chevron-right text-xs"></i>
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 hover:bg-[#e8404a]/10 text-sm flex items-center justify-between text-[#e8404a] transition font-semibold"
              >
                <span className="flex items-center gap-3"><i className="fas fa-sign-out-alt"></i> Sign Out of Arena</span>
                <i className="fas fa-chevron-right text-xs"></i>
              </button>
            </div>
          </div>
        )}

        {/* ── RULES TAB ── */}
        {activeTab === 'Rules' && (
          <div className="space-y-4">
            <div className="ff-title text-xl font-bold flex items-center gap-2">
              <i className="fas fa-book-open text-[#f0c040]"></i> Tournament Guidelines
            </div>

            <div className="bg-[#171b2e] border border-[#252a45] rounded-xl flex items-center px-3 py-2">
              <i className="fas fa-search text-[#8890b0] mr-2"></i>
              <input
                type="text"
                placeholder="Search rules..."
                value={rulesQuery}
                onChange={(e) => setRulesQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white w-full"
              />
            </div>

            <div className="space-y-2.5">
              {[
                {
                  title: 'General Guidelines',
                  icon: 'fa-gavel',
                  rules: [
                    'Register before tournament deadline — no exceptions.',
                    'Be online 10 minutes before your match starts.',
                    'No-shows automatically result in a disqualification.',
                    'Match results are final once verified by administrators.'
                  ]
                },
                {
                  title: 'Team Sizes & Types',
                  icon: 'fa-users',
                  rules: [
                    'Check event size: Solo, Duo, Trio, or Squad (4 Players).',
                    'A player can only participate in one team per tournament.',
                    'Duo requires exactly 2 verified player registrations.',
                    'Squad requires exactly 4 verified player registrations.'
                  ]
                },
                {
                  title: 'Strict Anti-Cheat Policy',
                  icon: 'fa-shield-alt',
                  rules: [
                    'Wallhacks, ESP, No-Recoil, Fly Hacks, and triggerbots are STRICTLY FORBIDDEN.',
                    'All matches are manually monitored by spectating admins and anti-cheat software.',
                    'If cheating is reported, a full video url must be provided for logs.',
                    'Confirmed cheaters will receive an immediate permanent account suspension and ban.'
                  ]
                }
              ]
                .filter(sec => sec.title.toLowerCase().includes(rulesQuery.toLowerCase()) || sec.rules.some(r => r.toLowerCase().includes(rulesQuery.toLowerCase())))
                .map((sec, idx) => (
                  <div key={idx} className="bg-[#171b2e] border border-[#252a45] rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleAccordion(idx)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-[#111420]/30 font-semibold text-sm text-white"
                    >
                      <span className="flex items-center gap-2">
                        <i className={`fas ${sec.icon} text-[#f0c040]`}></i>
                        {sec.title}
                      </span>
                      <i className={`fas fa-chevron-down text-[#8890b0] text-xs transition-transform ${expandedRules.includes(idx) ? 'rotate-180' : ''}`}></i>
                    </button>
                    {expandedRules.includes(idx) && (
                      <ul className="p-4 space-y-2 text-xs text-[#8890b0] list-none">
                        {sec.rules.map((rule, rIdx) => (
                          <li key={rIdx} className="relative pl-4">
                            <span className="absolute left-0 text-[#f0c040]">▸</span>
                            {rule}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── WALLET TAB ── */}
        {activeTab === 'Wallet' && (
          <div className="space-y-4">
            <div className="ff-title text-xl font-bold flex items-center gap-2">
              <i className="fas fa-wallet text-[#f0c040]"></i> Wallet & Funds
            </div>

            <div className={`p-5 rounded-2xl relative overflow-hidden bg-gradient-to-br from-[#1a2040] to-[#252b4a] border border-[#f0c040]/25`}>
              <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#f0c040]/5 rounded-full filter blur-xl"></div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] text-[#8890b0] uppercase tracking-wider font-semibold">ArenaX Balance</span>
                <i className="fas fa-coins text-[#f0c040] text-lg"></i>
              </div>
              <div className="ff-title text-4xl font-black text-[#f0c040] leading-none mb-1">
                {isGuest ? 'Restricted' : currentUser.balance.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#8890b0] mb-4">AX Coins</div>
              
              <div className="flex gap-2.5">
                <button
                  onClick={() => {
                    if (isGuest) {
                      alert('Log in to deposit funds!');
                      return;
                    }
                    setPayStep(1);
                    setPayAmount('');
                    setShowPaymentModal(true);
                  }}
                  className="flex-1 py-2 bg-[#f0c040]/10 border border-[#f0c040]/20 text-[#f0c040] font-semibold rounded-lg text-xs hover:bg-[#f0c040]/20 transition flex items-center justify-center gap-1.5"
                >
                  <i className="fas fa-plus"></i> Deposit
                </button>
                <button
                  onClick={handleWithdrawal}
                  className="flex-1 py-2 bg-[#f0c040]/10 border border-[#f0c040]/20 text-[#f0c040] font-semibold rounded-lg text-xs hover:bg-[#f0c040]/20 transition flex items-center justify-center gap-1.5"
                >
                  <i className="fas fa-arrow-up"></i> Withdraw
                </button>
              </div>
            </div>

            {isGuest && (
              <div className="p-6 bg-[#171b2e] border border-[#252a45] rounded-xl text-center space-y-3">
                <i className="fas fa-lock text-3xl text-[#4a5070]"></i>
                <p className="text-xs text-[#8890b0]">Wallet features are locked for guest accounts to prevent data/fund loss.</p>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] rounded-lg text-xs font-bold transition"
                >
                  Connect Profile
                </button>
              </div>
            )}

            {!isGuest && (
              <div className="space-y-2">
                <h4 className="text-[10px] text-[#8890b0] uppercase tracking-wider font-semibold">Transaction Activity</h4>
                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-[#4a5070] bg-[#171b2e] border border-[#252a45] rounded-xl text-xs space-y-1">
                    <i className="fas fa-receipt text-2xl"></i>
                    <p>No processed transactions yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => {
                      const color = tx.color ? tx.color.toLowerCase() : '';
                      let iconClass = 'fa-exchange-alt';
                      let colorClass = 'text-white';
                      let bgClass = 'bg-white/10 text-white';
                      let sign = '';

                      if (tx.type === 'deposit') {
                        iconClass = 'fa-arrow-down';
                        colorClass = 'text-[#3ddc84]';
                        bgClass = 'bg-[#3ddc84]/10 text-[#3ddc84]';
                        sign = '+';
                      } else if (tx.type === 'withdraw') {
                        iconClass = 'fa-arrow-up';
                        colorClass = 'text-[#e8404a]';
                        bgClass = 'bg-[#e8404a]/10 text-[#e8404a]';
                        sign = '-';
                      } else {
                        sign = tx.amount >= 0 ? '+' : '-';
                      }

                      if (color === 'green') {
                        colorClass = 'text-green-400';
                        bgClass = 'bg-green-400/10 text-green-400';
                        iconClass = 'fa-check-circle';
                      } else if (color === 'red') {
                        colorClass = 'text-red-400';
                        bgClass = 'bg-red-400/10 text-red-400';
                        iconClass = 'fa-times-circle';
                      } else if (color === 'golden' || color === 'gold') {
                        colorClass = 'text-[#f0c040]';
                        bgClass = 'bg-[#f0c040]/10 text-[#f0c040]';
                        iconClass = 'fa-crown';
                      } else if (color === 'blue') {
                        colorClass = 'text-blue-400';
                        bgClass = 'bg-blue-400/10 text-blue-400';
                        iconClass = 'fa-info-circle';
                      }

                      return (
                        <div key={tx.id} className="p-3 bg-[#171b2e] border border-[#252a45] rounded-xl flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${bgClass}`}>
                              <i className={`fas ${iconClass}`}></i>
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate text-xs">
                                {tx.message || (tx.type === 'adjustment' ? 'Account Adjustment' : tx.type)}
                              </div>
                              <div className="text-[10px] text-[#4a5070]">{tx.timestamp}</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`font-sans font-bold text-sm ${colorClass}`}>
                              {sign}{Math.abs(tx.amount).toLocaleString()} AX
                            </div>
                            <div className="text-[9px] uppercase tracking-wider text-[#8890b0] font-medium">{tx.account || 'System'}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── CHAT TAB ── */}
        {activeTab === 'Chat' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="ff-title text-xl font-bold flex items-center gap-2">
                <i className="fas fa-comments text-[#f0c040]"></i> Player DMs
              </div>
              <button
                onClick={() => {
                  if (isGuest) {
                    alert('Register a full account first!');
                    return;
                  }
                  setShowAddFriendModal(true);
                }}
                className="px-3 py-1 bg-[#f0c040]/10 hover:bg-[#f0c040]/20 border border-[#f0c040]/20 text-[#f0c040] rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                <i className="fas fa-user-plus"></i> Add Friend
              </button>
            </div>

            {isGuest && (
              <div className="p-6 bg-[#171b2e] border border-[#252a45] rounded-xl text-center space-y-3">
                <i className="fas fa-comments text-3xl text-[#4a5070]"></i>
                <p className="text-xs text-[#8890b0]">DM Chat is locked for guest accounts to prevent spam and impersonation.</p>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] rounded-lg text-xs font-bold transition"
                >
                  Create Account
                </button>
              </div>
            )}

            {!isGuest && (
              <div className="space-y-3">
                {/* Friend Requests Queue */}
                {friendRequests.length > 0 && (
                  <div className="space-y-2 bg-[#1e2340]/40 p-3 border border-[#252a45] rounded-xl">
                    <h4 className="text-[10px] text-[#a78bfa] uppercase tracking-wider font-bold">Friend Requests</h4>
                    {friendRequests.map((req) => (
                      <div key={req.uid} className="bg-[#171b2e] border border-[#252a45] p-2 rounded-lg flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={req.av} alt="Avatar" className="w-8 h-8 rounded-full border border-[#252a45]" />
                          <div className="truncate">
                            <div className="font-semibold text-white leading-tight">{req.name}</div>
                            <div className="text-[9px] text-[#8890b0]">{req.handle}</div>
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleAcceptFriend(req)}
                            className="p-1.5 bg-[#3ddc84]/15 hover:bg-[#3ddc84]/25 text-[#3ddc84] rounded transition"
                          >
                            <i className="fas fa-check"></i>
                          </button>
                          <button
                            onClick={() => handleDeclineFriend(req)}
                            className="p-1.5 bg-[#e8404a]/15 hover:bg-[#e8404a]/25 text-[#e8404a] rounded transition"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Friend List */}
                <div className="space-y-2">
                  <h4 className="text-[10px] text-[#8890b0] uppercase tracking-wider font-semibold">Friends List</h4>
                  {friends.length === 0 ? (
                    <div className="p-8 text-center text-[#4a5070] bg-[#171b2e] border border-[#252a45] rounded-xl text-xs space-y-1">
                      <i className="fas fa-user-friends text-2xl"></i>
                      <p>No friends added yet.</p>
                      <p className="text-[10px] text-[#4a5070]">Click "Add Friend" at top to send invites.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {friends.map((friend) => (
                        <div
                          key={friend.uid}
                          onClick={() => openDM(friend)}
                          className="p-3 bg-[#171b2e] hover:bg-[#1e2340] border border-[#252a45] hover:border-[#f0c040]/30 rounded-xl flex items-center gap-3 text-xs cursor-pointer transition"
                        >
                          <img src={friend.av} alt="Avatar" className="w-10 h-10 rounded-full border border-[#252a45]" />
                          <div className="flex-1">
                            <div className="font-semibold text-white leading-tight">{friend.name}</div>
                            <div className="text-[10px] text-[#8890b0] mt-0.5">{friend.handle}</div>
                          </div>
                          <i className="fas fa-chevron-right text-[#4a5070] text-xs"></i>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EVENTS/TOURNAMENTS TAB ── */}
        {activeTab === 'Tour' && (
          <div className="space-y-4">
            <div className="ff-title text-xl font-bold flex items-center gap-2">
              <i className="fas fa-trophy text-[#f0c040]"></i> Active Tournaments
            </div>

            {/* FILTERS */}
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
              {['all', 'live', 'upcoming', 'ended'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveTournamentFilter(filter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition ${activeTournamentFilter === filter ? 'bg-[#f0c040] text-[#0a0c12]' : 'bg-[#171b2e] hover:bg-[#1e2340] border border-[#252a45] text-[#8890b0]'}`}
                >
                  {filter === 'live' ? '🔴 Live' : filter}
                </button>
              ))}
            </div>

            {/* LIST */}
            <div className="space-y-3">
              {filteredTournaments.length === 0 ? (
                <div className="p-12 text-center text-[#4a5070] bg-[#171b2e] border border-[#252a45] rounded-xl text-xs space-y-1">
                  <i className="fas fa-calendar-times text-3xl"></i>
                  <p>No active tournaments found in this category.</p>
                </div>
              ) : (
                filteredTournaments.map((tour) => {
                  const reg = userRegistrations[tour.id];
                  return (
                    <div
                      key={tour.id}
                      onClick={() => handleTournamentClick(tour)}
                      className={`p-4 bg-[#171b2e] hover:bg-[#1e2340] border border-[#252a45] rounded-xl transition cursor-pointer relative ${reg && reg.status === 'approved' ? 'border-[#3ddc84]/40 bg-[#3ddc84]/5 shadow-[0_0_15px_rgba(61,220,132,0.03)]' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="ff-title text-[15px] font-bold text-white tracking-wide">{tour.name}</h3>
                          <p className="text-[10px] text-[#8890b0] font-medium mt-0.5">{tour.game}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${tour.status === 'live' ? 'bg-[#e8404a]/15 text-[#e8404a] border border-[#e8404a]/20 animate-pulse' : tour.status === 'upcoming' ? 'bg-[#4f9eff]/15 text-[#4f9eff] border border-[#4f9eff]/20' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}`}>
                          {tour.status === 'live' ? '🔴 Live' : tour.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#8890b0] mt-3 bg-[#111420]/30 p-2.5 rounded-lg border border-[#252a45]/40">
                        <div className="flex items-center gap-1">
                          <i className="fas fa-users text-[#f0c040] text-[10px]"></i>
                          <span>{tour.registered}/{tour.maxPlayers} Slots ({tour.teamType || 'Solo'})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <i className="fas fa-coins text-[#f0c040] text-[10px]"></i>
                          <span>Prize: {tour.prize}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <i className="fas fa-ticket-alt text-[#f0c040] text-[10px]"></i>
                          <span>Entry: {tour.entryFee}</span>
                        </div>
                      </div>

                      {reg && (
                        <div className={`mt-3 text-xs font-bold flex items-center gap-1.5 ${reg.status === 'approved' ? 'text-[#3ddc84]' : reg.status === 'rejected' ? 'text-[#e8404a]' : 'text-[#f0c040]'}`}>
                          <i className={`fas ${reg.status === 'approved' ? 'fa-check-circle' : reg.status === 'rejected' ? 'fa-times-circle' : 'fa-clock'}`}></i>
                          {reg.status === 'approved' ? 'Slot Confirmed & Registered' : reg.status === 'rejected' ? 'Registration Declined' : 'Registration Pending Review'}
                        </div>
                      )}

                      {/* Cheat Reporting */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isGuest) {
                            alert('Connect a real profile to report users.');
                            return;
                          }
                          setReportTour(tour);
                        }}
                        className="w-full mt-3 py-1.5 bg-[#e8404a]/10 hover:bg-[#e8404a]/20 border border-[#e8404a]/20 text-[#e8404a] text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition"
                      >
                        <i className="fas fa-flag"></i> Report Hack / Cheat
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── SUPPORT TAB ── */}
        {activeTab === 'Support' && (
          <div className="space-y-4">
            <div className="ff-title text-xl font-bold flex items-center gap-2">
              <i className="fas fa-headset text-[#f0c040]"></i> ArenaX Live Help
            </div>

            {isGuest && (
              <div className="p-6 bg-[#171b2e] border border-[#252a45] rounded-xl text-center space-y-3">
                <i className="fas fa-headset text-3xl text-[#4a5070]"></i>
                <p className="text-xs text-[#8890b0]">Live chat support is locked for guest profiles. Sign in to submit tickets.</p>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] rounded-lg text-xs font-bold transition"
                >
                  Connect Account
                </button>
              </div>
            )}

            {!isGuest && (
              <div className="flex flex-col h-[calc(100vh-230px)] bg-[#171b2e] border border-[#252a45] rounded-xl overflow-hidden relative">
                {/* Message logs */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="flex gap-2">
                    <div className="w-7 h-7 bg-[#f0c040]/10 text-[#f0c040] border border-[#f0c040]/20 rounded-full flex items-center justify-center text-xs flex-shrink-0">
                      <i className="fas fa-robot"></i>
                    </div>
                    <div className="max-w-[75%] space-y-2">
                      <div className="bg-[#1e2340] border border-[#252a45] rounded-2xl rounded-tl-sm p-3 text-xs leading-relaxed text-white">
                        👋 Hey! I'm ArenaX Support assistant. How can I help you today?
                        
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {[
                            { lbl: 'Deposit Issue', msg: 'I have an issue with my deposit' },
                            { lbl: 'Rules Info', msg: 'Explain tournament guidelines' },
                            { lbl: 'Report Hack', msg: 'I want to report a cheating player' },
                            { lbl: 'Agent Live', msg: 'agent' }
                          ].map((chip, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() => handleSendSupport(chip.msg)}
                              className="px-2.5 py-1 bg-[#171b2e] border border-[#252a45] text-[#f0c040] text-[10px] font-semibold rounded-full hover:bg-[#f0c040]/10 transition"
                            >
                              {chip.lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {supportMessages.map((m, mIdx) => {
                    const isUser = m.sender === 'user';
                    const isBot = m.sender === 'bot';
                    return (
                      <div key={mIdx} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${isUser ? 'bg-[#f0c040] text-[#0a0c12]' : isBot ? 'bg-[#f0c040]/10 text-[#f0c040] border border-[#f0c040]/20' : 'bg-[#e8404a]/10 text-[#e8404a] border border-[#e8404a]/20'}`}>
                          <i className={`fas ${isUser ? 'fa-user' : isBot ? 'fa-robot' : 'fa-headset'}`}></i>
                        </div>
                        <div className="max-w-[75%]">
                          <div className={`bg-[#1e2340] border border-[#252a45] rounded-2xl p-3 text-xs leading-relaxed text-white ${isUser ? 'bg-[#f0c040] text-[#0a0c12] font-medium rounded-tr-none' : 'rounded-tl-none'}`}>
                            {m.text}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={supportEndRef} />
                </div>

                {/* Input action */}
                <div className="p-3 bg-[#111420] border-t border-[#252a45] flex gap-2">
                  <input
                    type="text"
                    placeholder="Describe issue (type 'agent' for human admin)..."
                    value={supportText}
                    onChange={(e) => setSupportText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendSupport()}
                    className="flex-1 bg-[#171b2e] border border-[#252a45] rounded-xl px-4 py-2 text-xs outline-none text-white focus:border-[#f0c040] transition"
                  />
                  <button
                    onClick={() => handleSendSupport()}
                    className="w-9 h-9 bg-[#f0c040] text-[#0a0c12] rounded-xl flex items-center justify-center text-xs hover:bg-[#e8b830] transition active:scale-95"
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 h-[64px] bg-[#111420] border-t border-[#252a45] flex z-20">
        {[
          { tab: 'Profile', label: 'Profile', icon: 'fa-user' },
          { tab: 'Rules', label: 'Rules', icon: 'fa-book-open' },
          { tab: 'Wallet', label: 'Wallet', icon: 'fa-wallet' },
          { tab: 'Chat', label: 'Chat', icon: 'fa-comments' },
          { tab: 'Tour', label: 'Events', icon: 'fa-trophy' }
        ].map((item) => (
          <button
            key={item.tab}
            onClick={() => setActiveTab(item.tab as any)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] transition relative ${activeTab === item.tab ? 'text-[#f0c040]' : 'text-[#4a5070] hover:text-[#8890b0]'}`}
          >
            <i className={`fas ${item.icon} text-base`}></i>
            <span className="font-semibold">{item.label}</span>
            {activeTab === item.tab && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-[#f0c040] rounded-b"></span>
            )}
            {item.tab === 'Chat' && !isGuest && friendRequests.length > 0 && (
              <span className="absolute top-2 right-4 w-2 h-2 bg-[#e8404a] rounded-full"></span>
            )}
          </button>
        ))}
      </nav>

      {/* CUSTOMIZE MODAL */}
      {showCustomizeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-filter backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-[#252a45] rounded-2xl p-6 max-w-[420px] w-full animate-fade-in space-y-4">
            <h3 className="font-sans text-xl font-bold text-[#f0c040]">Customize Profile</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase text-[#4a5070] tracking-wider mb-1 font-bold">Display Name</label>
                <input
                  type="text"
                  placeholder="Enter name"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full bg-[#171b2e] border border-[#252a45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f0c040] transition"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-[#4a5070] tracking-wider mb-1 font-bold">Bio</label>
                <input
                  type="text"
                  placeholder="Something about you..."
                  value={custBio}
                  onChange={(e) => setCustBio(e.target.value)}
                  className="w-full bg-[#171b2e] border border-[#252a45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f0c040] transition"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-[#4a5070] tracking-wider mb-1.5 font-bold">Avatar Seeds</label>
                <div className="grid grid-cols-4 gap-2">
                  {AVATAR_SEEDS.map((seed) => (
                    <div
                      key={seed}
                      onClick={() => setSelectedAvatarSeed(seed)}
                      className={`aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition p-1 bg-[#171b2e] ${selectedAvatarSeed === seed ? 'border-[#f0c040] bg-[#f0c040]/10' : 'border-[#252a45] hover:border-[#8890b0]'}`}
                    >
                      <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`} alt="Avatar option" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="flex-1 py-2.5 bg-[#1e2340] border border-[#252a45] hover:bg-[#171b2e] text-[#8890b0] font-semibold rounded-lg text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomize}
                className="flex-1 py-2.5 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] font-semibold rounded-lg text-xs transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM PLANS MODAL */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-filter backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-[#252a45] rounded-2xl p-6 max-w-[420px] w-full animate-fade-in space-y-4">
            <div className="w-12 h-12 bg-[#a78bfa]/10 text-[#a78bfa] rounded-full border border-[#a78bfa]/20 flex items-center justify-center text-xl mx-auto shadow-lg">
              <i className="fas fa-crown"></i>
            </div>
            <h3 className="font-sans text-xl font-bold text-center text-[#a78bfa]">ArenaX Premium Pass</h3>

            <div className="text-xs text-[#8890b0] bg-[#171b2e] border border-[#252a45] p-3.5 rounded-xl space-y-2">
              <div className="flex items-center gap-2"><i className="fas fa-check-circle text-green-400"></i> Direct DM chat messaging with friends</div>
              <div className="flex items-center gap-2"><i className="fas fa-check-circle text-green-400"></i> Full animated background options</div>
              <div className="flex items-center gap-2"><i className="fas fa-check-circle text-green-400"></i> Highlighted Premium badge & profile glow</div>
              <div className="flex items-center gap-2"><i className="fas fa-check-circle text-green-400"></i> Priority queue slot in support logs</div>
            </div>

            <div className="space-y-2">
              <div
                onClick={() => setPremiumPlan('weekly')}
                className={`p-3.5 bg-[#171b2e] border rounded-xl flex items-center justify-between cursor-pointer transition ${premiumPlan === 'weekly' ? 'border-[#a78bfa] bg-[#a78bfa]/10' : 'border-[#252a45] hover:border-[#8890b0]'}`}
              >
                <div>
                  <div className="font-semibold text-white text-sm">Weekly Pass</div>
                  <div className="text-[10px] text-[#8890b0]">7 days premium logs access</div>
                </div>
                <div className="ff-title text-lg font-black text-[#a78bfa]">199 AX</div>
              </div>
              <div
                onClick={() => setPremiumPlan('monthly')}
                className={`p-3.5 bg-[#171b2e] border rounded-xl flex items-center justify-between cursor-pointer transition ${premiumPlan === 'monthly' ? 'border-[#a78bfa] bg-[#a78bfa]/10' : 'border-[#252a45] hover:border-[#8890b0]'}`}
              >
                <div>
                  <div className="font-semibold text-white text-sm">Monthly Pass</div>
                  <div className="text-[10px] text-[#8890b0]">30 days premium + early ticket slots</div>
                </div>
                <div className="ff-title text-lg font-black text-[#a78bfa]">399 AX</div>
              </div>
            </div>

            <button
              onClick={handleBuyPremium}
              className="w-full py-3 bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white font-bold rounded-lg text-sm uppercase tracking-wide transition shadow-md"
            >
              Get Premium — {premiumPlan === 'weekly' ? '199 AX Coins' : '399 AX Coins'}
            </button>
            <button
              onClick={() => setShowPremiumModal(false)}
              className="w-full text-center text-xs text-[#8890b0] hover:text-white transition py-1"
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-filter backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-[#252a45] rounded-2xl p-6 max-w-[420px] w-full animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-[#252a45]/50 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#f0c040]/10 border border-[#f0c040]/20 rounded-full flex items-center justify-center text-[#f0c040] text-lg">
                  <i className="fas fa-cog"></i>
                </div>
                <h3 className="font-sans text-xl font-bold text-white">ArenaX Settings</h3>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="text-[#8890b0] hover:text-white transition">
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Notification Settings */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase tracking-wider text-[#8890b0] font-bold">Notification Preferences</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-[#171b2e] border border-[#252a45] rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">Announcement Alerts</span>
                    <span className="text-[9px] text-[#8890b0]">Real-time alerts for system announcements</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifAnnounce}
                      onChange={(e) => setNotifAnnounce(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#252a45] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f0c040]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#171b2e] border border-[#252a45] rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">Friend Request Alerts</span>
                    <span className="text-[9px] text-[#8890b0]">Alerts when someone sends a friend request</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifFriends}
                      onChange={(e) => setNotifFriends(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#252a45] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f0c040]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#171b2e] border border-[#252a45] rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">Tournament Updates</span>
                    <span className="text-[9px] text-[#8890b0]">Get alerts about event brackets & slots</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifTours}
                      onChange={(e) => setNotifTours(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#252a45] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f0c040]"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Legal Documents */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase tracking-wider text-[#8890b0] font-bold">Legal Agreements</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowTermsModal(true)}
                  className="py-2.5 bg-[#171b2e] hover:bg-[#171b2e]/80 border border-[#252a45] text-[#8890b0] hover:text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <i className="fas fa-file-contract text-[#f0c040]/80"></i> Terms & Conditions
                </button>
                <button
                  onClick={() => setShowPrivacyModal(true)}
                  className="py-2.5 bg-[#171b2e] hover:bg-[#171b2e]/80 border border-[#252a45] text-[#8890b0] hover:text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <i className="fas fa-user-shield text-[#f0c040]/80"></i> Privacy Policy
                </button>
              </div>
            </div>

            <div className="flex gap-2 border-t border-[#252a45]/50 pt-3">
              <button
                onClick={() => {
                  alert('⚙️ Settings saved successfully!');
                  setShowSettingsModal(false);
                }}
                className="flex-1 py-2.5 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] text-xs font-bold rounded-lg transition"
              >
                Save Settings
              </button>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 py-2.5 bg-[#1e2340] hover:bg-[#171b2e] border border-[#252a45] text-[#8890b0] text-xs font-semibold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TERMS & CONDITIONS MODAL */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-filter backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-[#252a45] rounded-2xl p-6 max-w-[460px] w-full space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 border-b border-[#252a45]/50 pb-3">
              <div className="w-10 h-10 bg-[#f0c040]/10 border border-[#f0c040]/20 rounded-full flex items-center justify-center text-[#f0c040] text-lg">
                <i className="fas fa-file-contract"></i>
              </div>
              <h3 className="font-sans text-xl font-bold text-white">Terms & Conditions</h3>
            </div>

            <div className="max-h-[250px] overflow-y-auto text-xs text-[#8890b0] space-y-3 pr-2">
              <p className="font-bold text-white">Welcome to ArenaX!</p>
              <p>By registering for or playing in ArenaX tournaments, you agree to comply fully with these Terms and Conditions.</p>

              <p className="font-semibold text-white">1. Fair Play & Anti-Cheat</p>
              <p>Cheating, exploiting game bugs, using third-party macro software/scripts, or collusion with other players is strictly forbidden. Admins monitor matches and can ban accounts and forfeit entry fees without any appeal.</p>

              <p className="font-semibold text-white">2. Wallet, Deposits & Withdrawals</p>
              <p>All deposits are reviewed by administration. Entering fake transaction IDs (TXN) will trigger an immediate permanent account ban. Withdrawals settle within 24-48 hours. Coins inside ArenaX cannot be transferred directly to other user accounts.</p>

              <p className="font-semibold text-white">3. Content Restrictions</p>
              <p>Harassment, hate speech, spamming, and toxic behavior in public chats or support rooms is prohibited and will result in temporary or permanent messaging restrictions.</p>

              <p className="font-semibold text-white">4. Account Loss</p>
              <p>Guest account data is stored locally in your browser. Clearing your cache or browser cookies will lead to loss of access, and guest accounts cannot be recovered.</p>
            </div>

            <button
              onClick={() => setShowTermsModal(false)}
              className="w-full py-2.5 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] text-xs font-bold rounded-lg transition"
            >
              I Understand & Agree
            </button>
          </div>
        </div>
      )}

      {/* PRIVACY POLICY MODAL */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-filter backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-[#252a45] rounded-2xl p-6 max-w-[460px] w-full space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 border-b border-[#252a45]/50 pb-3">
              <div className="w-10 h-10 bg-[#f0c040]/10 border border-[#f0c040]/20 rounded-full flex items-center justify-center text-[#f0c040] text-lg">
                <i className="fas fa-user-shield"></i>
              </div>
              <h3 className="font-sans text-xl font-bold text-white">Privacy Policy</h3>
            </div>

            <div className="max-h-[250px] overflow-y-auto text-xs text-[#8890b0] space-y-3 pr-2">
              <p className="font-bold text-white">Your Privacy Matters to ArenaX</p>
              <p>We are committed to securing your personal information and ensuring full transparency.</p>

              <p className="font-semibold text-white">1. Information We Collect</p>
              <p>We collect your email address, display name, profile avatar, and system metadata during registration/sign-in. Your gameplay logs, transaction histories, and messaging records are stored in a secure cloud database (Firestore).</p>

              <p className="font-semibold text-white">2. How We Use Data</p>
              <p>Your data is used to maintain your profile, track balances, match you in tournaments, provide support, and prevent fraudulent actions or cheating.</p>

              <p className="font-semibold text-white">3. Third Party Policy</p>
              <p>ArenaX does not sell, lease, or distribute your email address or personal statistics to any third-party marketing companies.</p>

              <p className="font-semibold text-white">4. Your Control</p>
              <p>You can modify your display profile settings, turn off certain notifications in settings, or request full account deletion via support.</p>
            </div>

            <button
              onClick={() => setShowPrivacyModal(false)}
              className="w-full py-2.5 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] text-xs font-bold rounded-lg transition"
            >
              I Understand & Agree
            </button>
          </div>
        </div>
      )}

      {/* WALLET DEPOSIT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-filter backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-[#252a45] rounded-2xl p-6 max-w-[420px] w-full animate-fade-in space-y-4">
            <h3 className="font-sans text-xl font-bold text-[#f0c040] flex items-center gap-2">
              <i className="fas fa-coins"></i> Deposit AX Coins
            </h3>

            {payStep === 1 ? (
              <div className="space-y-2.5">
                <div
                  onClick={() => { setPayMethod('jc'); setPayStep(2); }}
                  className="p-3 bg-[#171b2e] border border-[#252a45] hover:border-[#3ddc84] rounded-xl flex items-center gap-3 cursor-pointer transition"
                >
                  <div className="w-10 h-10 bg-[#3ddc84]/15 rounded-lg flex items-center justify-center text-lg text-[#3ddc84] border border-[#3ddc84]/20">
                    <i className="fas fa-mobile-alt"></i>
                  </div>
                  <div>
                    <div className="font-bold text-[#3ddc84] text-sm">JazzCash</div>
                    <div className="text-[10px] text-[#8890b0]">0302-4686897 · Instant Processing</div>
                  </div>
                </div>

                <div
                  onClick={() => { setPayMethod('ep'); setPayStep(2); }}
                  className="p-3 bg-[#171b2e] border border-[#252a45] hover:border-[#a78bfa] rounded-xl flex items-center gap-3 cursor-pointer transition"
                >
                  <div className="w-10 h-10 bg-[#a78bfa]/15 rounded-lg flex items-center justify-center text-lg text-[#a78bfa] border border-[#a78bfa]/20">
                    <i className="fas fa-wallet"></i>
                  </div>
                  <div>
                    <div className="font-bold text-[#a78bfa] text-sm">EasyPaisa</div>
                    <div className="text-[10px] text-[#8890b0]">0315-9876543 · Processing 5 min</div>
                  </div>
                </div>

                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full py-2.5 bg-[#1e2340] hover:bg-[#171b2e] border border-[#252a45] text-[#8890b0] text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button onClick={() => setPayStep(1)} className="text-xs text-[#8890b0] hover:text-[#f0c040] transition">
                  <i className="fas fa-arrow-left"></i> Change Method
                </button>

                <div className="flex gap-2">
                  {['100', '200', '500', '1000'].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setPayAmount(amt)}
                      className={`flex-1 py-1.5 rounded-full text-xs font-semibold border transition ${payAmount === amt ? 'bg-[#f0c040]/10 border-[#f0c040] text-[#f0c040]' : 'bg-[#171b2e] border-[#252a45] text-[#8890b0] hover:border-white'}`}
                    >
                      Rs {amt}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  placeholder="Custom Deposit Amount (Min Rs 50)"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-[#171b2e] border border-[#252a45] rounded-lg px-3 py-2 text-sm outline-none text-white focus:border-[#f0c040] transition"
                />

                <div className="bg-[#171b2e] p-3 border border-[#252a45] rounded-xl text-xs text-[#8890b0] space-y-1 bg-[#111420]/40">
                  {payMethod === 'jc' ? (
                    <>
                      <strong>JazzCash Instructions:</strong>
                      <p>1. Open JazzCash App and click Send Money</p>
                      <p>2. Send to Till/Mobile No: <strong>0302-4686897</strong></p>
                      <p>3. Enter Reference ID: <strong>AX-COINS</strong></p>
                    </>
                  ) : (
                    <>
                      <strong>EasyPaisa Instructions:</strong>
                      <p>1. Open EasyPaisa App and click EasyPaisa Transfer</p>
                      <p>2. Send to Mobile Number: <strong>0315-9876543</strong></p>
                    </>
                  )}
                </div>

                <button
                  onClick={handleConfirmPayment}
                  className="w-full py-2.5 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] font-bold rounded-lg text-sm transition uppercase tracking-wider"
                >
                  Confirm & Process
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOURNAMENT REGISTRATION / DETAIL MODAL */}
      {selectedTournament && (
        <div className="fixed inset-0 bg-black/85 backdrop-filter backdrop-blur-sm z-[999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111420] border border-[#252a45] rounded-2xl p-6 max-w-[440px] w-full animate-fade-in space-y-4">
            
            {tregStep === 1 && (
              <div className="space-y-4">
                <div className="text-center p-4 bg-gradient-to-br from-[#1a2040]/30 to-[#252a45]/30 border border-[#252a45] rounded-xl">
                  <h3 className="ff-title text-2xl font-bold text-[#f0c040] tracking-wide">{selectedTournament.name}</h3>
                  <p className="text-xs text-[#8890b0] mb-3">{selectedTournament.game} ({selectedTournament.teamType || 'Solo'})</p>
                  
                  <div className="grid grid-cols-3 gap-2 border-t border-[#252a45] pt-3 text-center">
                    <div>
                      <div className="font-bold text-sm text-white">{selectedTournament.registered}/{selectedTournament.maxPlayers}</div>
                      <div className="text-[10px] text-[#8890b0] uppercase tracking-wide">Players</div>
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">{selectedTournament.prize}</div>
                      <div className="text-[10px] text-[#8890b0] uppercase tracking-wide">Prize Pool</div>
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white capitalize">{selectedTournament.status}</div>
                      <div className="text-[10px] text-[#8890b0] uppercase tracking-wide">Status</div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-[#8890b0] space-y-2 bg-[#171b2e] p-3.5 border border-[#252a45] rounded-xl leading-relaxed">
                  <strong className="text-white block mb-1">⚠️ Warning Checklist:</strong>
                  <p>• If cheat reports or software hacks are verified, the entry fee is strictly <strong>non-refundable</strong>.</p>
                  <p>• Roster accounts cannot be shared during live events.</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setSelectedTournament(null)}
                    className="flex-1 py-2.5 bg-[#1e2340] hover:bg-[#171b2e] border border-[#252a45] text-[#8890b0] font-semibold rounded-lg text-xs transition"
                  >
                    Close
                  </button>
                  {selectedTournament.status !== 'ended' && (
                    <button
                      onClick={() => setTregStep(2)}
                      className="flex-1 py-2.5 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] font-bold rounded-lg text-xs transition flex items-center justify-center gap-1"
                    >
                      <i className="fas fa-gamepad"></i> Participate Now
                    </button>
                  )}
                </div>
              </div>
            )}

            {tregStep === 2 && (
              <div className="space-y-3">
                <h3 className="font-sans text-lg font-bold text-[#f0c040]">Registration Form</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-[#8890b0] uppercase font-bold mb-1">Real Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Hammad Khan"
                      value={tregRealName}
                      onChange={(e) => setTregRealName(e.target.value)}
                      className="w-full bg-[#171b2e] border border-[#252a45] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#f0c040] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8890b0] uppercase font-bold mb-1">In-Game Name (IGN) *</label>
                    <input
                      type="text"
                      placeholder="e.g. ArenaX_Hammad"
                      value={tregGameName}
                      onChange={(e) => setTregGameName(e.target.value)}
                      className="w-full bg-[#171b2e] border border-[#252a45] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#f0c040] transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-[#8890b0] uppercase font-bold mb-1">Game UID *</label>
                      <input
                        type="text"
                        placeholder="e.g. 842938423"
                        value={tregUID}
                        onChange={(e) => setTregUID(e.target.value)}
                        className="w-full bg-[#171b2e] border border-[#252a45] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#f0c040] transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#8890b0] uppercase font-bold mb-1">Age *</label>
                      <input
                        type="number"
                        placeholder="e.g. 19"
                        value={tregAge}
                        onChange={(e) => setTregAge(e.target.value)}
                        className="w-full bg-[#171b2e] border border-[#252a45] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#f0c040] transition"
                      />
                    </div>
                  </div>

                  {(() => {
                    const isSquadEvent = selectedTournament.hasTeams || selectedTournament.name.toLowerCase().includes('fifa');
                    if (!isSquadEvent) return null;

                    const squadColors = [
                      { id: 'Red', label: 'Team Red', icon: '🔴' },
                      { id: 'Blue', label: 'Team Blue', icon: '🔵' },
                      { id: 'Green', label: 'Team Green', icon: '🟢' },
                      { id: 'Yellow', label: 'Team Yellow', icon: '🟡' },
                      { id: 'Purple', label: 'Team Purple', icon: '🟣' },
                      { id: 'Orange', label: 'Team Orange', icon: '🟠' },
                      { id: 'White', label: 'Team White', icon: '⚪' },
                      { id: 'Black', label: 'Team Black', icon: '⚫' },
                    ];

                    return (
                      <div className="space-y-1.5 border-t border-[#252a45]/60 pt-2.5">
                        <label className="block text-[10px] text-[#8890b0] uppercase font-bold">Select Squad Color Theme *</label>
                        
                        <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                          {squadColors.map((squad) => {
                            const approvedCount = allTournamentRegistrations.filter(r => r.selectedTeamColor === squad.id && r.status === 'approved').length;
                            const isFull = approvedCount >= 4;
                            const isSelected = tregSelectedTeamColor === squad.id;

                            return (
                              <button
                                key={squad.id}
                                type="button"
                                disabled={isFull}
                                onClick={() => setTregSelectedTeamColor(squad.id)}
                                className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold transition ${
                                  isSelected 
                                    ? 'bg-[#1e2340] border-[#f0c040] text-[#f0c040]' 
                                    : isFull 
                                      ? 'opacity-40 cursor-not-allowed bg-black/20 border-transparent text-[#4a5070]' 
                                      : 'bg-[#141828]/50 border-[#252a45] text-white hover:border-[#8890b0]'
                                }`}
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <span>{squad.icon}</span>
                                  <span className="truncate">{squad.label}</span>
                                </span>
                                <span className={`text-[9px] px-1 rounded ${isFull ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                  {isFull ? 'FULL' : `${approvedCount}/4`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-2 border-t border-[#252a45] pt-3">
                    <label className="flex items-start gap-2.5 text-xs text-[#8890b0] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tregCheck1}
                        onChange={(e) => setTregCheck1(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>I agree to refrain from any third-party hacks, ESP, aimbots, or recoil control exploits.</span>
                    </label>
                    <label className="flex items-start gap-2.5 text-xs text-[#8890b0] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tregCheck2}
                        onChange={(e) => setTregCheck2(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>I understand match logs are monitored. Disqualification and permanent bans apply if caught.</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    onClick={() => setTregStep(1)}
                    className="flex-1 py-2 bg-[#1e2340] text-[#8890b0] font-semibold rounded-lg text-xs transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (!tregRealName || !tregGameName || !tregUID || !tregAge) {
                        alert('Fill all fields!');
                        return;
                      }
                      const isSquadEvent = selectedTournament.hasTeams || selectedTournament.name.toLowerCase().includes('fifa');
                      if (isSquadEvent && !tregSelectedTeamColor) {
                        alert('Please select a Squad / Team Color theme!');
                        return;
                      }
                      if (!tregCheck1 || !tregCheck2) {
                        alert('Agree to anti-cheat declarations first!');
                        return;
                      }
                      setTregStep(3);
                    }}
                    className="flex-1 py-2 bg-[#f0c040] text-[#0a0c12] font-bold rounded-lg text-xs transition"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {tregStep === 3 && (() => {
              // Parse entry fee and balance
              const feeString = selectedTournament.entryFee || '';
              let feeAmount = 0;
              if (feeString && !feeString.toLowerCase().includes('free')) {
                const matches = feeString.match(/\d+/);
                if (matches) feeAmount = parseInt(matches[0], 10);
              }
              const balance = currentUser?.balance || 0;
              const hasEnough = balance >= feeAmount;

              return (
                <div className="space-y-3">
                  <h3 className="font-sans text-lg font-bold text-[#f0c040]">Confirm Wallet Registration</h3>
                  
                  <div className="bg-[#171b2e] p-4 border border-[#252a45] rounded-xl text-xs space-y-3 leading-relaxed">
                    <div className="flex justify-between items-center border-b border-[#252a45]/50 pb-2">
                      <span className="text-[#8890b0]">Tournament Fee</span>
                      <strong className="text-white font-semibold">{feeAmount} AX Coins</strong>
                    </div>
                    <div className="flex justify-between items-center border-b border-[#252a45]/50 pb-2">
                      <span className="text-[#8890b0]">Your Current Balance</span>
                      <strong className="text-white font-semibold">{balance} AX Coins</strong>
                    </div>
                    <div className="flex justify-between items-center pb-1">
                      <span className="text-[#8890b0]">Balance After Approval</span>
                      <strong className={`font-semibold ${hasEnough ? 'text-green-400' : 'text-red-400'}`}>
                        {hasEnough ? `${balance - feeAmount} AX Coins` : 'Insufficient Balance'}
                      </strong>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#171b2e]/60 border border-[#252a45] rounded-lg text-xs leading-relaxed">
                    {hasEnough ? (
                      <p className="text-[#8890b0]">
                        <span className="text-green-400 font-semibold">✅ Coins Secured!</span> Your ArenaX wallet has sufficient balance. The entry fee of <strong className="text-white">{feeAmount} AX Coins</strong> will be deducted from your wallet automatically when the admin approves your registration.
                      </p>
                    ) : (
                      <p className="text-red-400 font-semibold">
                        ⚠️ Insufficient balance! You need {feeAmount} AX Coins to participate, but your current balance is only {balance} AX Coins. Please deposit coins to register.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      onClick={() => setTregStep(2)}
                      className="flex-1 py-2 bg-[#1e2340] text-[#8890b0] font-semibold rounded-lg text-xs transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleRegisterSubmit}
                      disabled={tregSubmitting || !hasEnough}
                      className={`flex-1 py-2 font-bold rounded-lg text-xs transition ${hasEnough ? 'bg-[#3ddc84] hover:bg-[#32b56c] text-[#0a0c12]' : 'bg-[#252a45] text-[#8890b0] cursor-not-allowed'}`}
                    >
                      {tregSubmitting ? 'Submitting...' : hasEnough ? 'Confirm & Register' : 'Insufficient Coins'}
                    </button>
                  </div>
                </div>
              );
            })()}

            {tregStep === 4 && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-[#3ddc84]/10 text-[#3ddc84] border border-[#3ddc84]/30 rounded-full flex items-center justify-center text-3xl mx-auto">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="space-y-1">
                  <h3 className="font-sans text-xl font-bold text-[#3ddc84]">Registration Submitted!</h3>
                  <p className="text-xs text-[#8890b0] max-w-[300px] mx-auto leading-relaxed">
                    Our team is reviewing your payment logs. Slot updates will be pushed shortly! Check notifications.
                  </p>
                  {tregSelectedTeamColor && (
                    <div className="mt-2 text-xs bg-[#1e2340]/50 border border-[#252a45] px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-[#f0c040]">
                      Selected Team: 
                      {tregSelectedTeamColor === 'Red' && '🔴 Team Red'}
                      {tregSelectedTeamColor === 'Blue' && '🔵 Team Blue'}
                      {tregSelectedTeamColor === 'Green' && '🟢 Team Green'}
                      {tregSelectedTeamColor === 'Yellow' && '🟡 Team Yellow'}
                      {tregSelectedTeamColor === 'Purple' && '🟣 Team Purple'}
                      {tregSelectedTeamColor === 'Orange' && '🟠 Team Orange'}
                      {tregSelectedTeamColor === 'White' && '⚪ Team White'}
                      {tregSelectedTeamColor === 'Black' && '⚫ Team Black'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedTournament(null)}
                  className="px-6 py-2 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] text-xs font-bold rounded-lg transition"
                >
                  Done
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* FRIEND ADD MODAL */}
      {showAddFriendModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-filter backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-[#252a45] rounded-2xl p-6 max-w-[420px] w-full animate-fade-in space-y-4">
            <h3 className="font-sans text-lg font-bold text-[#f0c040] flex items-center gap-1.5">
              <i className="fas fa-user-plus"></i> Add Friend
            </h3>
            
            <p className="text-xs text-[#8890b0]">Search by handles (e.g. @player#1234):</p>
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. @player#1234"
                value={searchHandle}
                onChange={(e) => setSearchHandle(e.target.value)}
                className="flex-1 bg-[#171b2e] border border-[#252a45] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#f0c040] transition"
              />
              <button
                onClick={handleSearchFriend}
                disabled={searching}
                className="px-4 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] text-xs font-bold rounded-xl transition"
              >
                {searching ? '...' : 'Search'}
              </button>
            </div>

            {searchResult && (
              <div className="p-3 bg-[#171b2e] border border-[#252a45] rounded-xl flex items-center justify-between gap-3 text-xs mt-2 animate-fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <img src={searchResult.av} alt="Avatar" className="w-8 h-8 rounded-full border border-[#252a45]" />
                  <div className="truncate">
                    <div className="font-bold text-white">{searchResult.name}</div>
                    <div className="text-[10px] text-[#8890b0]">{searchResult.handle}</div>
                  </div>
                </div>
                <button
                  onClick={handleSendFriendRequest}
                  className="px-2.5 py-1.5 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] text-[10px] font-bold rounded"
                >
                  Send Invite
                </button>
              </div>
            )}

            {searchResult === null && searchHandle.length >= 3 && !searching && (
              <div className="p-2.5 text-center text-xs text-[#e8404a] bg-[#e8404a]/10 border border-[#e8404a]/20 rounded-lg">
                No players match that handle!
              </div>
            )}

            <button
              onClick={() => { setShowAddFriendModal(false); setSearchResult(null); setSearchHandle(''); }}
              className="w-full py-2 bg-[#1e2340] hover:bg-[#171b2e] border border-[#252a45] text-[#8890b0] text-xs font-semibold rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* DIRECT MESSAGE CHAT WINDOW */}
      {showDMChat && activeFriend && (
        <div className="fixed inset-0 bg-black/80 backdrop-filter backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-[#252a45] rounded-2xl w-full max-w-[440px] h-[480px] flex flex-col overflow-hidden animate-fade-in relative shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-[#252a45] bg-[#111420] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={activeFriend.av} alt="Friend avatar" className="w-9 h-9 rounded-full border border-[#252a45]" />
                <div className="truncate">
                  <div className="font-bold text-white text-sm leading-tight">{activeFriend.name}</div>
                  <div className="text-[10px] text-green-400">Online</div>
                </div>
              </div>
              <button
                onClick={() => { setShowDMChat(false); setActiveFriend(null); }}
                className="text-[#8890b0] hover:text-[#f0c040] text-lg transition"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* DMs lists */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0c12]/30">
              {dms.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#4a5070] text-xs gap-1">
                  <i className="fas fa-comment-alt text-2xl"></i>
                  <p>Say hello to your friend!</p>
                </div>
              ) : (
                dms.map((msg, mIdx) => {
                  const isMe = msg.sender === currentUser.uid;
                  return (
                    <div key={mIdx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] p-3 rounded-xl text-xs leading-relaxed ${isMe ? 'bg-[#f0c040] text-[#0a0c12] font-semibold rounded-tr-none' : 'bg-[#171b2e] border border-[#252a45] text-white rounded-tl-none'}`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={dmEndRef} />
            </div>

            {/* Form footer */}
            <div className="p-3 bg-[#111420] border-t border-[#252a45] flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={dmText}
                onChange={(e) => setDmText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendDM()}
                className="flex-1 bg-[#171b2e] border border-[#252a45] rounded-xl px-4 py-2 text-xs outline-none text-white focus:border-[#f0c040] transition"
              />
              <button
                onClick={handleSendDM}
                className="w-9 h-9 bg-[#f0c040] text-[#0a0c12] rounded-xl flex items-center justify-center text-xs hover:bg-[#e8b830] transition"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT MODAL ATTACHED */}
      {reportTour && (
        <ReportModal
          isOpen={true}
          onClose={() => setReportTour(null)}
          tournamentId={reportTour.id}
          tournamentName={reportTour.name}
          reporterId={currentUser.uid}
          reporterName={currentUser.name}
        />
      )}

    </div>
  );
};
