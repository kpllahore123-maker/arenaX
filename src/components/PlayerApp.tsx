import { VIP_FRAME_DATA_URL } from '../constants/frame';
import React, { useState, useEffect, useRef } from 'react';
import { auth, db, googleProvider } from '../firebase';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  deleteUser
} from 'firebase/auth';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  where,
  limit,
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
import { requestNotificationPermissionAndGetToken, setupForegroundNotificationListener, autoRequestPermission } from '../fcm';

interface PlayerAppProps {
  onSwitchToAdmin: () => void;
  isAdminUID: boolean;
}

const AVATAR_SEEDS = ['ax1', 'ax2', 'ax3', 'ax4', 'bot1', 'bot2', 'bot3', 'bot4'];

export function getNumericPlayerId(uid: string, currentHandle?: string): string {
  if (currentHandle) {
    const digitsOnly = String(currentHandle).replace(/^ID:\s*/i, '').replace(/^@/, '').trim();
    if (/^\d{6,8}$/.test(digitsOnly)) {
      return digitsOnly;
    }
  }
  if (!uid) return String(Math.floor(100000 + Math.random() * 900000));
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash << 5) - hash + uid.charCodeAt(i);
    hash |= 0;
  }
  const numericId = 100000 + (Math.abs(hash) % 900000);
  return String(numericId);
}

export const PlayerApp: React.FC<PlayerAppProps> = ({ onSwitchToAdmin, isAdminUID }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [guestId, setGuestId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'Home' | 'Profile' | 'Rules' | 'Wallet' | 'Chat' | 'Tour' | 'Support'>('Home');
  const [showHamburger, setShowHamburger] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [rankingCategory, setRankingCategory] = useState<'AX Coins' | 'Weekly'>('AX Coins');
  const [leaderboardList, setLeaderboardList] = useState<any[]>([]);
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);

  // Auth Inputs & Modes
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showResendVerifyBtn, setShowResendVerifyBtn] = useState(false);
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
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string>('');

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
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [notifAnnounce, setNotifAnnounce] = useState(true);
  const [notifFriends, setNotifFriends] = useState(true);
  const [notifTours, setNotifTours] = useState(true);
  const [premiumPlan, setPremiumPlan] = useState<'weekly' | 'monthly'>('weekly');

  // FCM Debug states
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [fcmError, setFcmError] = useState<string | null>(null);

  // Listen to Auth & Firestore profile
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (fireUser) => {
      if (fireUser && !isGuest) {
        // Enforce Email Verification for Password auth provider users
        const isPasswordProvider = fireUser.providerData.some(p => p.providerId === 'password');
        if (isPasswordProvider && !fireUser.emailVerified) {
          setCurrentUser(null);
          await signOut(auth);
          return;
        }

        // Real-time Firestore document for current user profile
        const userDocRef = doc(db, 'users', fireUser.uid);
        onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const isEquippedLocal = localStorage.getItem('user_frame_equipped') === 'true';
            const localExpiry = localStorage.getItem('user_frame_expiry');
            const isExpired = localExpiry ? Date.now() > Number(localExpiry) : false;

            const hasFrame = data.hasFrame || (localStorage.getItem('user_has_frame') === 'true');
            const frameEquipped = !isExpired && (data.frameEquipped === true || (data.frameEquipped !== false && isEquippedLocal));

            const updatedProf = {
              id: fireUser.uid,
              uid: fireUser.uid,
              name: data.name || fireUser.displayName || fireUser.email?.split('@')[0] || 'Player',
              handle: getNumericPlayerId(fireUser.uid, data.handle),
              av: data.av || fireUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fireUser.uid}`,
              email: data.email || fireUser.email || '',
              premium: data.premium || false,
              banned: data.banned || false,
              banType: data.banType || 'none',
              banReason: data.banReason || '',
              banUntil: data.banUntil || null,
              balance: data.balance || 0,
              hasFrame: hasFrame,
              frameEquipped: frameEquipped,
              frameExpiresAt: data.frameExpiresAt || null,
              createdAt: data.createdAt || new Date().toISOString(),
              transactions: data.transactions || []
            };
            setCurrentUser(updatedProf);
            (window as any).currentUser = updatedProf;
            (window as any).userProfile = updatedProf;
            if ((window as any).updateAllAvatarFrames) (window as any).updateAllAvatarFrames();
          } else {
            // Document doesn't exist, bootstrap it
            const defaultName = fireUser.displayName || fireUser.email?.split('@')[0] || 'Player';
            const defaultHandle = getNumericPlayerId(fireUser.uid);
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

  useEffect(() => {
    if (currentUser) {
      (window as any).VIP_FRAME_DATA_URL = VIP_FRAME_DATA_URL;
      (window as any).currentUser = currentUser;
      (window as any).userProfile = currentUser;
      if (isGuest) (window as any).guestProfile = currentUser;
    } else {
      (window as any).currentUser = null;
      (window as any).userProfile = null;
      (window as any).guestProfile = null;
    }
    if ((window as any).updateAllAvatarFrames) {
      (window as any).updateAllAvatarFrames();
    }
    if ((window as any).updateTasksFrameButtonState) {
      (window as any).updateTasksFrameButtonState();
    }
    if ((window as any).updateCustomizeFrameButtonState) {
      (window as any).updateCustomizeFrameButtonState();
    }
  }, [currentUser, isGuest]);

  const handleRequestFcmToken = async () => {
    if (!currentUser) return;
    setFcmError(null);
    try {
      console.log("FCM: Manually requesting permission and token...");
      const token = await requestNotificationPermissionAndGetToken(currentUser.uid);
      if (token) {
        setFcmToken(token);
      } else {
        setFcmError("Failed to retrieve token. Please make sure notifications are enabled in your browser settings for this site.");
      }
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotifPermission(Notification.permission);
      }
    } catch (err: any) {
      console.error("FCM manual request failed:", err);
      setFcmError(err?.message || String(err));
    }
  };

  // Automatically ask for notification permission as soon as the app opens
  useEffect(() => {
    console.log("FCM: Triggering automatic permission request on app startup...");
    autoRequestPermission()
      .then((permission) => {
        console.log("FCM: Auto-request permission complete. Permission level:", permission);
        if (permission) setNotifPermission(permission);
      })
      .catch((err) => {
        console.error("FCM: Auto-request permission failed:", err);
      });
  }, []);

  // Request FCM Notification Permission and Save token when User logs in
  useEffect(() => {
    if (currentUser && currentUser.uid && !isGuest) {
      console.log("FCM: User logged in and currentUser is available. UID:", currentUser.uid);
      console.log("FCM: Calling requestNotificationPermissionAndGetToken(uid) now...");
      requestNotificationPermissionAndGetToken(currentUser.uid)
        .then((token) => {
          console.log("FCM: requestNotificationPermissionAndGetToken resolved successfully.");
          console.log("FCM: Token value obtained:", token);
          if (token) {
            setFcmToken(token);
          } else {
            setFcmError("Automatic token generation failed. Please generate manually below.");
          }
          if (typeof window !== 'undefined' && 'Notification' in window) {
            setNotifPermission(Notification.permission);
          }
        })
        .catch((err) => {
          console.error("FCM: Error while calling requestNotificationPermissionAndGetToken:", err);
          setFcmError(err?.message || String(err));
        });
    } else {
      console.log("FCM: Hook skipped. currentUser:", currentUser ? "Available" : "Null", "UID:", currentUser?.uid, "isGuest:", isGuest);
    }
  }, [currentUser?.uid, isGuest]);

  // Handle FCM foreground notifications and show toast
  useEffect(() => {
    if (!currentUser || isGuest) return;

    const unsubscribe = setupForegroundNotificationListener((payload) => {
      const title = payload.notification?.title || 'ArenaX Event';
      const body = payload.notification?.body || 'New update received';
      const newToastId = `toast_${Date.now()}_${Math.random()}`;
      setToasts((prev) => [...prev, { id: newToastId, title, body }]);
      
      // Auto remove after 7 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToastId));
      }, 7000);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser?.uid, isGuest]);

  // Load Tournaments & Current User's Registrations
  useEffect(() => {
    const qTours = query(collection(db, 'tournaments'));
    const unsubTours = onSnapshot(qTours, (snap) => {
      const list: Tournament[] = [];
      snap.forEach((d) => {
        const data = d.data();
        // Completely remove and ignore any FIFA or FIFA-related tournaments
        if (data.name && data.name.toLowerCase().includes('fifa')) return;
        if (data.game && data.game.toLowerCase().includes('fifa')) return;
        list.push({ id: d.id, ...data } as Tournament);
      });
      
      // Sort client-side by createdAt descending to ensure resilience
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      // Ensure ArenaX Champions Cup is always in the list
      const hasChampionsCup = list.some(t => t.name === 'ArenaX Champions Cup');
      if (!hasChampionsCup) {
        list.unshift({
          id: 'demo_champions',
          name: 'ArenaX Champions Cup',
          game: 'eFootball / FC 24',
          status: 'upcoming',
          registered: 12,
          maxPlayers: 32,
          prize: '50,000 AX Coins',
          date: 'Jul 15, 2026',
          time: '08:00 PM PKT',
          entryFee: 'Rs 200',
          teamType: 'Squad (4 Players)',
          hasTeams: true
        });
      }

      if (list.length === 1 && list[0].id === 'demo_champions') {
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
      const rawList: Friend[] = [];
      snap.forEach((d) => {
        rawList.push(d.data() as Friend);
      });

      // Render raw list immediately so friends load instantly on mobile!
      setFriends(rawList);

      // Asynchronously enrich friend details without blocking state updates
      Promise.all(rawList.map(async (f) => {
        try {
          if (f.uid) {
            const uSnap = await getDoc(doc(db, 'users', f.uid));
            if (uSnap.exists()) {
              const uData = uSnap.data();
              return {
                ...f,
                name: uData.name || f.name,
                av: uData.av || f.av,
                handle: getNumericPlayerId(f.uid, uData.handle || f.handle)
              };
            }
          }
        } catch (e) {}
        return f;
      })).then((updatedList) => {
        setFriends(updatedList);
      }).catch((err) => console.warn("Enrich friends error:", err));
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

  // Fetch Leaderboard data (AX Coins Ranking)
  useEffect(() => {
    const loadLeaderboardData = async () => {
      try {
        const qUsers = query(collection(db, 'users'), limit(100));
        const snap = await getDocs(qUsers);
        let fetched: any[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          fetched.push({
            uid: doc.id,
            name: data.name || data.displayName || data.username || 'Player',
            balance: Number(data.balance || data.coins || 0),
            av: data.av || data.avatar || data.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${doc.id}`
          });
        });

        if (currentUser) {
          const exists = fetched.some((u) => u.uid === currentUser.uid);
          if (!exists) {
            fetched.push({
              uid: currentUser.uid,
              name: currentUser.name || 'You',
              balance: Number(currentUser.balance || 0),
              av: currentUser.av || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`
            });
          } else {
            fetched = fetched.map((u) =>
              u.uid === currentUser.uid
                ? {
                    ...u,
                    name: currentUser.name || u.name,
                    balance: Number(currentUser.balance ?? u.balance),
                    av: currentUser.av || u.av
                  }
                : u
            );
          }
        }

        fetched.sort((a, b) => b.balance - a.balance);
        setLeaderboardList(fetched);

        // Update homeRankingAv image with #1 top player's avatar
        if (fetched[0]?.av) {
          const el = document.getElementById('homeRankingAv') as HTMLImageElement | null;
          if (el) el.src = fetched[0].av;
        }
      } catch (err) {
        console.warn("Leaderboard error:", err);
      }
    };

    loadLeaderboardData();

    // Attach global helpers so onclick="openRankingModal()" and "openTasksModal()" work anywhere
    (window as any).openRankingModal = () => {
      setShowRankingModal(true);
      loadLeaderboardData();
    };
    (window as any).openTasksModal = () => {
      setShowTasksModal(true);
    };
    (window as any).reactOpenTasksModal = () => {
      setShowTasksModal(true);
    };
  }, [currentUser]);

  useEffect(() => {
    const handleOpenTasks = () => setShowTasksModal(true);
    (window as any).openTasksModal = handleOpenTasks;
    (window as any).reactOpenTasksModal = handleOpenTasks;
    window.addEventListener('open-tasks-modal', handleOpenTasks);
    return () => {
      window.removeEventListener('open-tasks-modal', handleOpenTasks);
    };
  }, []);

  // Helper function to claim or toggle VIP Avatar Frame
  const handleClaimOrToggleFrame = async () => {
    if (!currentUser) return;
    const isCurrentlyEquipped = !!currentUser.frameEquipped;
    const newEquipped = !isCurrentlyEquipped;
    const expiryTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    localStorage.setItem('user_has_frame', 'true');
    localStorage.setItem('user_frame_equipped', String(newEquipped));
    localStorage.setItem('user_frame_expiry', String(Date.now() + 3 * 24 * 60 * 60 * 1000));

    const updated = {
      ...currentUser,
      hasFrame: true,
      frameEquipped: newEquipped,
      frameExpiresAt: expiryTime
    };

    setCurrentUser(updated);
    (window as any).currentUser = updated;
    (window as any).userProfile = updated;

    if (!isGuest && currentUser.uid) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          hasFrame: true,
          frameEquipped: newEquipped,
          frameExpiresAt: expiryTime
        });
      } catch (e) {
        console.warn("Failed to update user frame in Firestore:", e);
      }
    }

    if ((window as any).updateAllAvatarFrames) {
      setTimeout(() => (window as any).updateAllAvatarFrames(), 50);
    }
    if ((window as any).updateTasksFrameButtonState) {
      (window as any).updateTasksFrameButtonState();
    }
    if ((window as any).updateCustomizeFrameButtonState) {
      (window as any).updateCustomizeFrameButtonState();
    }

    if (!currentUser.hasFrame) {
      alert("🎉 Congratulations! You received the VIP Avatar Frame for 3 Days! Frame is now equipped across your profile.");
    } else {
      alert(newEquipped ? "VIP Avatar Frame Equipped! ✨" : "VIP Avatar Frame Unequipped.");
    }
  };

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

  // Real-time listener for active DM friend's profile updates
  useEffect(() => {
    if (!activeFriend?.uid || !showDMChat) return;
    const unsubFriendProfile = onSnapshot(doc(db, 'users', activeFriend.uid), (docSnap) => {
      if (docSnap.exists()) {
        const uData = docSnap.data();
        if (uData.av || uData.name) {
          setActiveFriend((prev) => {
            if (!prev) return null;
            if (prev.av !== uData.av || prev.name !== uData.name) {
              return {
                ...prev,
                name: uData.name || prev.name,
                av: uData.av || prev.av
              };
            }
            return prev;
          });
        }
      }
    });
    return () => unsubFriendProfile();
  }, [activeFriend?.uid, showDMChat]);

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

  // Auto-seed the "ArenaX Champions Cup" special tournament
  useEffect(() => {
    if (!currentUser || isGuest) return;
    const seedChampions = async () => {
      try {
        const q = query(
          collection(db, 'tournaments'),
          where('name', '==', 'ArenaX Champions Cup')
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          // Add the special event
          await addDoc(collection(db, 'tournaments'), {
            name: 'ArenaX Champions Cup',
            game: 'eFootball / FC 24',
            prize: '50,000 AX Coins',
            maxPlayers: 32,
            date: 'Jul 15, 2026',
            time: '08:00 PM PKT',
            entryFee: 'Rs 200',
            teamType: 'Squad (4 Players)',
            status: 'upcoming',
            hasTeams: true,
            registered: 12,
            createdAt: serverTimestamp()
          });
          console.log('ArenaX Champions Cup tournament successfully auto-provisioned!');
        }
      } catch (err) {
        console.warn('Failed to seed Champions tournament:', err);
      }
    };
    seedChampions();
  }, [currentUser, isGuest]);

  // Auth Validation & Helper Functions
  const validateEmailFormat = (emailStr: string): boolean => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(emailStr.trim());
  };

  const getFriendlyAuthErrorMessage = (err: any): string => {
    if (!err) return 'An unexpected error occurred.';
    const code = err.code || '';
    switch (code) {
      case 'auth/email-already-in-use':
        return '⚠️ This email address is already registered. Please switch to Sign In or click Forgot Password.';
      case 'auth/invalid-email':
        return '⚠️ Please enter a valid real email address (e.g. name@example.com).';
      case 'auth/user-not-found':
        return '⚠️ No registered account found with this email. Please check your email or click Sign Up.';
      case 'auth/wrong-password':
        return '⚠️ Incorrect password. Please try again or click Forgot Password.';
      case 'auth/invalid-credential':
        return '⚠️ Incorrect email or password. Please check your credentials or create a new account.';
      case 'auth/weak-password':
        return '⚠️ Password must be at least 6 characters long.';
      case 'auth/too-many-requests':
        return '⚠️ Access blocked due to too many failed attempts. Please reset password or try again later.';
      case 'auth/network-request-failed':
        return '⚠️ Network error. Please check your internet connection.';
      default:
        return err.message || 'Authentication failed. Please check your details.';
    }
  };

  // Google Login
  const handleGoogleLogin = async () => {
    if (!agreedToTerms) {
      setAuthError('⚠️ You must agree to the Terms & Conditions and Privacy Policy to enter the Arena!');
      setAuthSuccessMsg('');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccessMsg('');
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

  // Email Sign In or Sign Up
  const handleEmailAuth = async () => {
    if (!agreedToTerms) {
      setAuthError('⚠️ You must agree to the Terms & Conditions and Privacy Policy to enter the Arena!');
      setAuthSuccessMsg('');
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setAuthError('⚠️ Please enter email address and password.');
      setAuthSuccessMsg('');
      return;
    }

    if (!validateEmailFormat(trimmedEmail)) {
      setAuthError('⚠️ Please enter a valid email address (e.g. user@gmail.com).');
      setAuthSuccessMsg('');
      return;
    }

    if (trimmedPassword.length < 6) {
      setAuthError('⚠️ Password must be at least 6 characters long.');
      setAuthSuccessMsg('');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthSuccessMsg('');
    setShowResendVerifyBtn(false);

    if (authMode === 'signup') {
      const trimmedUsername = authUsername.trim() || trimmedEmail.split('@')[0];
      try {
        // Create account
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        await updateProfile(cred.user, { displayName: trimmedUsername });

        // Send verification email
        try {
          await sendEmailVerification(cred.user);
        } catch (vErr) {
          console.warn('Send verification email error:', vErr);
        }

        // Sign out user until they verify email
        await signOut(auth);

        setAuthSuccessMsg(`✉️ Registration successful! A verification email has been sent to ${trimmedEmail}.\n\nPlease check your email inbox (and spam folder) and click the verification link before signing in.`);
        setAuthMode('login');
        setPassword('');
      } catch (signUpErr: any) {
        setAuthError(getFriendlyAuthErrorMessage(signUpErr));
      } finally {
        setAuthLoading(false);
      }
    } else {
      // Sign In mode
      try {
        const cred = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);

        // Enforce Email Verification!
        if (!cred.user.emailVerified) {
          await signOut(auth);
          setAuthError(`⚠️ Email Not Verified! A verification link was sent to ${trimmedEmail}.\n\nPlease verify your email address in your inbox before logging in.`);
          setShowResendVerifyBtn(true);
          setAuthLoading(false);
          return;
        }

        setAuthSuccessMsg('✅ Sign in successful!');
      } catch (signInErr: any) {
        setAuthError(getFriendlyAuthErrorMessage(signInErr));
      } finally {
        setAuthLoading(false);
      }
    }
  };

  const handleResendVerification = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setAuthError('⚠️ Please enter your registered email and password above to resend the verification email.');
      setAuthSuccessMsg('');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthSuccessMsg('');
    try {
      const cred = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      if (cred.user.emailVerified) {
        setAuthSuccessMsg(`✅ Your email (${trimmedEmail}) is already verified! You can sign in now.`);
        setShowResendVerifyBtn(false);
      } else {
        await sendEmailVerification(cred.user);
        setAuthSuccessMsg(`✉️ A verification email has been sent to ${trimmedEmail}. Please check your inbox and spam folder.`);
      }
      await signOut(auth);
    } catch (err: any) {
      setAuthError(getFriendlyAuthErrorMessage(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthError('⚠️ Please enter your email address in the Email field above to reset your password.');
      setAuthSuccessMsg('');
      return;
    }
    if (!validateEmailFormat(trimmedEmail)) {
      setAuthError('⚠️ Please enter a valid email address.');
      setAuthSuccessMsg('');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccessMsg('');
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setAuthSuccessMsg(`✉️ Password reset link sent to ${trimmedEmail}! Please check your inbox and spam folder.`);
    } catch (err: any) {
      setAuthError(getFriendlyAuthErrorMessage(err));
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
    localStorage.setItem('guest_id', String(gid));
    setGuestId(gid);
    setIsGuest(true);

    const isEquippedLocal = localStorage.getItem('user_frame_equipped') === 'true';
    const localExpiry = localStorage.getItem('user_frame_expiry');
    const isExpired = localExpiry ? Date.now() > Number(localExpiry) : false;
    const hasFrame = localStorage.getItem('user_has_frame') === 'true';
    const frameEquipped = !isExpired && isEquippedLocal;

    const guestProf: UserProfile = {
      id: `guest_${gid}`,
      uid: `guest_${gid}`,
      name: 'Guest Player',
      handle: `@guest#${gid}`,
      av: `https://api.dicebear.com/7.x/bottts/svg?seed=g${gid}`,
      email: '',
      premium: false,
      banned: false,
      banType: 'none',
      banReason: '',
      banUntil: null,
      balance: 100,
      hasFrame: hasFrame,
      frameEquipped: frameEquipped,
      createdAt: new Date().toISOString(),
      transactions: []
    };

    setCurrentUser(guestProf);
    (window as any).currentUser = guestProf;
    (window as any).userProfile = guestProf;
    (window as any).guestProfile = guestProf;

    setShowGuestWarning(false);
    setActiveTab('Profile');

    setTimeout(() => {
      if ((window as any).updateAllAvatarFrames) (window as any).updateAllAvatarFrames();
      if ((window as any).updateTasksFrameButtonState) (window as any).updateTasksFrameButtonState();
      if ((window as any).updateCustomizeFrameButtonState) (window as any).updateCustomizeFrameButtonState();
    }, 50);
  };

  // Sign out
  const handleLogout = async () => {
    if (!confirm('Are you sure you want to exit the Arena?')) return;
    setCurrentUser(null);
    setIsGuest(false);
    setGuestId(null);
    setActiveTab('Profile');
    if ((window as any).cleanupAllUserListeners) {
      try { (window as any).cleanupAllUserListeners(); } catch(e){}
    }
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Sign out error:", e);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (!confirm('⚠️ Are you sure you want to PERMANENTLY delete your ArenaX account?\n\nThis action cannot be undone. All your stats, tournament entries, and profile data will be permanently erased.')) return;
    const user = auth.currentUser;
    setCurrentUser(null);
    setIsGuest(false);
    setGuestId(null);
    setActiveTab('Profile');
    if ((window as any).cleanupAllUserListeners) {
      try { (window as any).cleanupAllUserListeners(); } catch(e){}
    }
    try {
      if (user) {
        try {
          await deleteDoc(doc(db, 'users', user.uid));
        } catch(e) {
          console.warn('Error deleting user doc:', e);
        }
        await deleteUser(user);
      }
      alert('Your ArenaX account has been permanently deleted.');
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        alert('For security reasons, please sign out and sign in again before deleting your account.');
      } else {
        alert('Delete account error: ' + (err?.message || err));
      }
    }
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
    const rawStr = searchHandle.trim();
    const queryStr = rawStr.replace(/^ID:\s*/i, '').replace(/^ID\s*/i, '').replace(/^@/, '').trim().toLowerCase();

    if (!queryStr) {
      alert('Please enter a Numeric Player ID (e.g. 849201) or Username to search.');
      return;
    }
    setSearching(true);
    setSearchResult(null);
    try {
      let found: any = null;

      // 1. Direct query on handle
      const qUser = query(collection(db, 'users'), where('handle', '==', queryStr));
      const snap = await getDocs(qUser);
      snap.forEach((d) => {
        const u = d.data();
        if (!found && u.uid !== currentUser?.uid) {
          found = { id: d.id, ...u };
        }
      });

      // 2. Query with '@'
      if (!found) {
        const qUserAt = query(collection(db, 'users'), where('handle', '==', '@' + queryStr));
        const snapAt = await getDocs(qUserAt);
        snapAt.forEach((d) => {
          const u = d.data();
          if (!found && u.uid !== currentUser?.uid) {
            found = { id: d.id, ...u };
          }
        });
      }

      // 3. Scan user list for matching numeric ID or handle or name
      if (!found) {
        const allUsersSnap = await getDocs(query(collection(db, 'users'), limit(100)));
        allUsersSnap.forEach((d) => {
          const u = d.data();
          if (!found && u.uid !== currentUser?.uid) {
            const uNumId = getNumericPlayerId(u.uid, u.handle);
            const uHandleClean = (u.handle || '').replace(/^@/, '').toLowerCase();
            const uNameClean = (u.name || '').toLowerCase();
            if (uNumId === queryStr || uHandleClean === queryStr || uNameClean.includes(queryStr) || u.uid === queryStr) {
              found = { id: d.id, ...u };
            }
          }
        });
      }

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

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('❌ Please select an image file (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDim = 300;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setCustomAvatarUrl(dataUrl);
          setUploadStatusMsg('✓ Photo loaded successfully!');
        }
      };
      if (event.target?.result) img.src = event.target.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Customize Profile Changes Save
  const handleSaveCustomize = async () => {
    if (!currentUser || isGuest) return;
    const nameToSave = custName.trim() || currentUser.name;
    const avToSave = customAvatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedAvatarSeed}`;
    
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: nameToSave,
        av: avToSave,
        bio: custBio.trim()
      });

      // Sync avatar and name to all friends' documents
      try {
        const friendsSnap = await getDocs(collection(db, 'users', currentUser.uid, 'friends'));
        friendsSnap.forEach((fDoc) => {
          updateDoc(doc(db, 'users', fDoc.id, 'friends', currentUser.uid), {
            name: nameToSave,
            av: avToSave
          }).catch(() => {});
        });
      } catch (e) {
        console.warn("Failed syncing profile update to friends:", e);
      }

      setCurrentUser(prev => prev ? { ...prev, name: nameToSave, av: avToSave, bio: custBio.trim() } : null);
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

    const isSquadEvent = selectedTournament.hasTeams || selectedTournament.name.toLowerCase().includes('champions');
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
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-sans text-xl font-bold">
                  {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <div className="flex bg-[#171b2e] p-1 rounded-lg border border-[#252a45]">
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError('');
                      setAuthSuccessMsg('');
                      setShowResendVerifyBtn(false);
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition ${authMode === 'login' ? 'bg-[#f0c040] text-[#0a0c12]' : 'text-[#8890b0] hover:text-white'}`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthError('');
                      setAuthSuccessMsg('');
                      setShowResendVerifyBtn(false);
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition ${authMode === 'signup' ? 'bg-[#f0c040] text-[#0a0c12]' : 'text-[#8890b0] hover:text-white'}`}
                  >
                    Sign Up
                  </button>
                </div>
              </div>
              <p className="text-xs text-[#8890b0]">
                {authMode === 'login' ? 'Sign in to access your ArenaX account' : 'Register with a real email to verify your account'}
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-[#e8404a]/10 border border-[#e8404a]/30 rounded-lg text-xs text-[#e8404a] text-left leading-relaxed whitespace-pre-line">
                {authError}
              </div>
            )}

            {authSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 text-left leading-relaxed whitespace-pre-line">
                {authSuccessMsg}
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
              <span>or email</span>
              <div className="flex-1 h-[1px] bg-[#252a45]"></div>
            </div>

            <div className="space-y-3">
              {authMode === 'signup' && (
                <input
                  type="text"
                  placeholder="Username / Gamer Tag"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className="w-full bg-[#171b2e] border border-[#252a45] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#f0c040] transition text-white"
                />
              )}
              <input
                type="email"
                placeholder="Real Email address (e.g. name@gmail.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#171b2e] border border-[#252a45] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#f0c040] transition text-white"
              />
              <div>
                <input
                  type="password"
                  placeholder="Password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#171b2e] border border-[#252a45] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#f0c040] transition text-white"
                />
                {authMode === 'login' && (
                  <div className="flex justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[11px] text-[#f0c040] hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleEmailAuth}
                disabled={authLoading}
                className="w-full py-3 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] rounded-lg text-sm font-semibold flex items-center justify-center gap-2.5 transition active:scale-[0.98]"
              >
                {authLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-envelope"></i>}
                {authMode === 'login' ? 'Sign In with Email' : 'Create Account & Send Verification'}
              </button>

              {showResendVerifyBtn && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={authLoading}
                  className="w-full py-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  <i className="fas fa-paper-plane"></i>
                  Resend Verification Email Link
                </button>
              )}
            </div>

            <div className="text-center pt-1">
              <p className="text-xs text-[#8890b0]">
                {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    setAuthError('');
                    setAuthSuccessMsg('');
                    setShowResendVerifyBtn(false);
                  }}
                  className="text-[#f0c040] font-bold hover:underline ml-1 cursor-pointer"
                >
                  {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHamburger(true)}
            className="w-9 h-9 bg-[#171b2e] border border-[#252a45] rounded-xl flex items-center justify-center text-[#f0c040] hover:bg-[#1e2340] transition active:scale-95 shadow-sm"
            title="Menu"
          >
            <i className="fas fa-bars text-base"></i>
          </button>
          <div className="ff-title text-xl font-bold tracking-wider text-white flex items-center gap-1.5">
            <i className="fas fa-trophy text-[#f0c040]"></i>Arena<span className="text-[#f0c040]">X</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin panel switch option for staff */}
          {(isAdminUID || (currentUser && currentUser.email === 'admin@arenax.com')) && (
            <button
              onClick={onSwitchToAdmin}
              className="px-2.5 py-1 bg-[#e8404a] text-white text-[10px] uppercase font-bold rounded hover:bg-[#cc3540] transition tracking-wider flex items-center gap-1"
            >
              <i className="fas fa-shield-alt"></i> Staff
            </button>
          )}

          {/* Topbar Support Chat */}
          <button
            onClick={() => setActiveTab('Support')}
            className="relative w-8 h-8 bg-[#171b2e] border border-[#252a45] rounded-full flex items-center justify-center text-xs text-[#8890b0] hover:text-[#f0c040] transition"
            title="Support Chat"
          >
            <i className="fas fa-headset"></i>
          </button>

          {/* Notification Bell */}
          <button
            onClick={handleOpenNotifications}
            className="relative w-8 h-8 bg-[#171b2e] border border-[#252a45] rounded-full flex items-center justify-center text-xs text-[#8890b0] hover:text-[#f0c040] transition"
            title="Notifications"
          >
            <i className="fas fa-bell"></i>
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#e8404a] rounded-full ring-2 ring-[#111420]"></span>
            )}
          </button>

          {/* Settings Cog */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="relative w-8 h-8 bg-[#171b2e] border border-[#252a45] rounded-full flex items-center justify-center text-xs text-[#8890b0] hover:text-[#f0c040] transition"
            title="Settings"
          >
            <i className="fas fa-cog"></i>
          </button>

          <div
            onClick={() => setActiveTab('Profile')}
            className="w-8 h-8 rounded-full border-2 border-[#f0c040] flex-shrink-0 ml-1 cursor-pointer hover:scale-105 transition relative flex items-center justify-center"
          >
            <img src={currentUser.av} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            {currentUser.frameEquipped && (
              <img src="/arenaX/avatarframe1.svg" onError={(e)=>{if(e.currentTarget.src.includes("/arenaX/avatarframe1.svg")){e.currentTarget.src="/avatarframe1.svg";}}} alt="Frame" className="absolute -inset-[22%] w-[144%] h-[144%] pointer-events-none z-20 max-w-none object-contain" />
            )}
          </div>
        </div>
      </nav>

      {/* HAMBURGER SIDE DRAWER SECTION */}
      {showHamburger && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex justify-start">
          <div className="w-[280px] max-w-[85vw] h-full bg-[#111420] border-r border-[#252a45] p-5 flex flex-col justify-between animate-slide-right space-y-6 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#252a45]">
                <div className="ff-title text-lg font-bold text-white flex items-center gap-2">
                  <i className="fas fa-bars text-[#f0c040]"></i> Hamburger Section
                </div>
                <button
                  onClick={() => setShowHamburger(false)}
                  className="w-8 h-8 rounded-full bg-[#171b2e] text-[#8890b0] hover:text-white flex items-center justify-center text-xs transition"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* User Brief */}
              <div className="my-4 p-3 bg-[#171b2e] border border-[#252a45] rounded-xl flex items-center gap-3">
                <div className="relative shrink-0 flex items-center justify-center">
                  <img src={currentUser.av} alt="Avatar" className="w-10 h-10 rounded-full border border-[#f0c040]" />
                  {currentUser.frameEquipped && (
                    <img src="/arenaX/avatarframe1.svg" onError={(e)=>{if(e.currentTarget.src.includes("/arenaX/avatarframe1.svg")){e.currentTarget.src="/avatarframe1.svg";}}} alt="Frame" className="absolute -inset-[22%] w-[144%] h-[144%] pointer-events-none z-20 max-w-none object-contain" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-white truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-[#8890b0]">{currentUser.handle}</div>
                  <div className="text-[10px] font-bold text-[#f0c040]">{currentUser.balance || 0} AX Coins</div>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-bold text-[#4a5070] tracking-wider px-1">Menu Options</div>

                {/* Chat button placed in hamburger section */}
                <button
                  onClick={() => {
                    setActiveTab('Chat');
                    setShowHamburger(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'Chat'
                      ? 'bg-[#f0c040] text-[#0a0c12]'
                      : 'bg-[#171b2e] text-white hover:bg-[#1e2340] border border-[#252a45]'
                  }`}
                >
                  <i className="fas fa-comments text-base text-[#f0c040]"></i>
                  <span>Player Chats & DMs</span>
                  <span className="ml-auto text-[9px] bg-[#f0c040]/20 text-[#f0c040] px-1.5 py-0.5 rounded font-bold uppercase">Chat</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('Home');
                    setShowHamburger(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#171b2e] text-[#8890b0] hover:text-white hover:bg-[#1e2340] border border-[#252a45] transition"
                >
                  <i className="fas fa-home text-base text-[#f0c040]"></i>
                  <span>Home Dashboard</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('Support');
                    setShowHamburger(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#171b2e] text-[#8890b0] hover:text-white hover:bg-[#1e2340] border border-[#252a45] transition"
                >
                  <i className="fas fa-headset text-base text-[#f0c040]"></i>
                  <span>Support Center</span>
                </button>

                <button
                  onClick={() => {
                    setShowSettingsModal(true);
                    setShowHamburger(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#171b2e] text-[#8890b0] hover:text-white hover:bg-[#1e2340] border border-[#252a45] transition"
                >
                  <i className="fas fa-cog text-base text-[#f0c040]"></i>
                  <span>App Settings</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('Rules');
                    setShowHamburger(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#171b2e] text-[#8890b0] hover:text-white hover:bg-[#1e2340] border border-[#252a45] transition"
                >
                  <i className="fas fa-book-open text-base text-[#f0c040]"></i>
                  <span>Tournament Guidelines</span>
                </button>

                {(isAdminUID || (currentUser && currentUser.email === 'admin@arenax.com')) && (
                  <button
                    onClick={() => {
                      onSwitchToAdmin();
                      setShowHamburger(false);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                  >
                    <i className="fas fa-shield-alt text-base"></i>
                    <span>Staff Admin Panel</span>
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setShowHamburger(false);
                handleLogout();
              }}
              className="w-full py-2.5 bg-[#e8404a]/10 border border-[#e8404a]/30 text-[#e8404a] hover:bg-[#e8404a]/20 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2"
            >
              <i className="fas fa-sign-out-alt"></i> Sign Out
            </button>
          </div>
        </div>
      )}

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

        {/* ── HOME TAB ── */}
        {activeTab === 'Home' && (
          <div className="space-y-5 animate-fade-in">
            {/* Top Interface Bar matching user image */}
            <div className="relative overflow-hidden rounded-2xl bg-[#1d2238] p-4 shadow-xl bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/bg.png')" }}>
              {/* Overlay for readability */}
              <div className="absolute inset-0 bg-black/25 pointer-events-none"></div>

              {/* Background Mosque Silhouette & Sparkles */}
              <div className="absolute inset-0 opacity-15 pointer-events-none flex items-end justify-center">
                <svg viewBox="0 0 500 150" className="w-full h-full text-[#4a5580] fill-current">
                  <path d="M50,150 L50,80 L60,80 L60,150 M440,150 L440,80 L450,80 L450,150 M250,150 C200,150 190,70 250,50 C310,70 300,150 250,150 Z M190,150 L190,100 L200,100 L200,150 M300,150 L300,100 L310,100 L310,150" />
                </svg>
              </div>

              {/* User Header Row */}
              <div className="relative z-10 flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  {/* User Profile Avatar */}
                  <div
                    onClick={() => setActiveTab('Profile')}
                    className="w-12 h-12 rounded-full border-2 border-[#3d4566] cursor-pointer hover:scale-105 transition shadow-md flex-shrink-0 relative flex items-center justify-center"
                  >
                    <img src={currentUser.av} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    {currentUser.frameEquipped && (
                      <img src="/arenaX/avatarframe1.svg" onError={(e)=>{if(e.currentTarget.src.includes("/arenaX/avatarframe1.svg")){e.currentTarget.src="/avatarframe1.svg";}}} alt="Frame" className="absolute -inset-[22%] w-[144%] h-[144%] pointer-events-none z-20 max-w-none object-contain" />
                    )}
                  </div>

                  {/* AX Coins Badge Pill */}
                  <div
                    onClick={() => setActiveTab('Wallet')}
                    className="flex items-center gap-2 bg-[#23273e]/90 hover:bg-[#2c324e] border border-[#383f60] px-3.5 py-1.5 rounded-full cursor-pointer transition shadow-inner"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#f0c040] to-[#b8860b] flex items-center justify-center text-[#111420] text-xs font-black shadow">
                      <i className="fas fa-coins"></i>
                    </div>
                    <span className="font-extrabold text-sm text-white tracking-wide">
                      {currentUser?.balance || 0}
                    </span>
                    <span className="text-[#d4a017] font-bold text-sm ml-0.5">+</span>
                  </div>
                </div>

                {/* Events Button (Star icon + label) */}
                <button
                  onClick={() => alert('Events section coming soon!')}
                  className="flex flex-col items-center justify-center transition group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-[#17253d] border border-[#2dd4bf]/40 flex items-center justify-center text-[#2dd4bf] text-base shadow group-hover:scale-110 transition">
                    <i className="fas fa-star"></i>
                  </div>
                  <span className="text-[11px] font-medium text-[#a0a8c8] group-hover:text-white transition mt-0.5">Events</span>
                </button>
              </div>

              {/* 3 Circular Action Icons */}
              <div className="relative z-10 grid grid-cols-3 gap-2 pt-1 text-center">
                {/* Ranking */}
                <div
                  onClick={() => setShowRankingModal(true)}
                  className="flex flex-col items-center cursor-pointer group"
                >
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-b from-[#2a1b4e] to-[#161228] border-2 border-[#a78bfa] p-0.5 flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                    <div className="absolute -top-1 -left-1 text-[#f0c040] text-xs drop-shadow">
                      <i className="fas fa-crown"></i>
                    </div>
                    <img id="homeRankingAv" src={leaderboardList[0]?.av || currentUser.av} alt="Ranking" className="w-11 h-11 rounded-full object-cover" />
                  </div>
                  <span className="text-[11px] font-semibold text-[#a0a8c8] group-hover:text-white transition mt-1.5">Ranking</span>
                </div>

                {/* Tasks */}
                <div
                  onClick={() => setShowTasksModal(true)}
                  className="flex flex-col items-center cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-[18px] bg-gradient-to-b from-[#1b3a5d] to-[#0f2138] border-2 border-[#38bdf8] p-0.5 flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                    <div className="w-10 h-10 bg-[#2563eb]/20 rounded-xl flex items-center justify-center text-xl">
                      <i className="fas fa-clipboard-check text-[#ef4444]"></i>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#a0a8c8] group-hover:text-white transition mt-1.5">Tasks</span>
                </div>

                {/* Friends */}
                <div
                  onClick={() => setShowAddFriendModal(true)}
                  className="flex flex-col items-center cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-[18px] bg-gradient-to-b from-[#064e3b] to-[#022c22] border-2 border-[#10b981] p-0.5 flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                    <div className="w-10 h-10 bg-[#10b981]/20 rounded-xl flex items-center justify-center text-xl">
                      <i className="fas fa-user-alt text-[#34d399]"></i>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#a0a8c8] group-hover:text-white transition mt-1.5">Friends</span>
                </div>
              </div>
            </div>

            {/* Featured Event Banner */}
            <div className="p-4 bg-gradient-to-r from-[#f0c040]/15 via-[#171b2e] to-[#f0c040]/5 border border-[#f0c040]/30 rounded-2xl flex items-center justify-between gap-4 shadow-lg">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#f0c040] bg-[#f0c040]/10 px-2 py-0.5 rounded border border-[#f0c040]/20">
                  Featured Championship
                </span>
                <h3 className="ff-title text-lg font-extrabold text-white">ArenaX Champions Cup</h3>
                <p className="text-xs text-[#8890b0]">Assemble or claim a spot in a 4-Player squad! 50,000 AX prize pool.</p>
              </div>
              <button
                onClick={() => {
                  setActiveTab('Tour');
                  setActiveTournamentFilter('all');
                }}
                className="px-4 py-2 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] text-xs font-extrabold rounded-xl transition whitespace-nowrap shadow-md active:scale-95 cursor-pointer"
              >
                Join Now
              </button>
            </div>

            {/* Explore Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="ff-title text-base font-extrabold text-white flex items-center gap-2">
                  <i className="fas fa-compass text-[#f0c040]"></i> Explore
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                <div
                  onClick={() => setActiveTab('Chat')}
                  className="p-3.5 bg-[#171b2e] hover:bg-[#1e2340] border border-[#252a45] hover:border-[#f0c040]/50 rounded-2xl flex items-center justify-between transition cursor-pointer group shadow-md"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8] rounded-xl flex items-center justify-center text-lg group-hover:scale-110 transition shrink-0">
                      <i className="fas fa-comments"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-[#f0c040] transition">Message</h4>
                      <p className="text-xs text-[#8890b0]">chat with your friend</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#111420] border border-[#252a45] group-hover:border-[#f0c040]/40 flex items-center justify-center text-[#8890b0] group-hover:text-white transition text-xs">
                    <i className="fas fa-chevron-right"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tournaments List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="ff-title text-lg font-bold text-white flex items-center gap-2">
                  <i className="fas fa-trophy text-[#f0c040]"></i> Active Tournaments
                </h3>
                <button
                  onClick={() => setActiveTab('Tour')}
                  className="text-xs text-[#f0c040] hover:underline font-semibold"
                >
                  View All ({tournaments.length})
                </button>
              </div>

              {tournaments.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTournament(t);
                    setTregStep(1);
                  }}
                  className="bg-[#171b2e] border border-[#252a45] hover:border-[#f0c040]/50 rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{t.name}</span>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#f0c040]/10 text-[#f0c040] border border-[#f0c040]/20">
                        {t.mode || 'Battle Royale'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#8890b0] flex items-center gap-3">
                      <span>Prize: <strong className="text-[#f0c040]">{t.prize}</strong></span>
                      <span>Entry: <strong>{t.entryFee}</strong></span>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-[#1e2340] hover:bg-[#f0c040] hover:text-[#0a0c12] border border-[#252a45] rounded-lg text-xs font-bold text-[#f0c040] transition">
                    Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === 'Profile' && (
          <div className="space-y-4">
            <div className="ff-title text-xl font-bold flex items-center gap-2">
              <i className="fas fa-user-circle text-[#f0c040]"></i> My Profile
            </div>

            <div id="profileCard" className={`p-4 bg-[#171b2e] border border-[#252a45] rounded-xl flex items-center gap-4 relative overflow-hidden ${currentUser.premium ? 'border-[#a78bfa]/30 shadow-[0_0_20px_rgba(167,139,250,0.08)]' : ''}`}>
              <div className="relative flex-shrink-0 flex items-center justify-center">
                <img src={currentUser.av} alt="Avatar" className={`w-16 h-16 rounded-full border-2 ${currentUser.premium ? 'border-[#a78bfa]' : 'border-[#f0c040]'}`} />
                {currentUser.frameEquipped && (
                  <img src="/arenaX/avatarframe1.svg" onError={(e)=>{if(e.currentTarget.src.includes("/arenaX/avatarframe1.svg")){e.currentTarget.src="/avatarframe1.svg";}}} alt="Frame" className="absolute -inset-[22%] w-[144%] h-[144%] pointer-events-none z-20 max-w-none object-contain" />
                )}
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
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] rounded-full flex items-center justify-center text-[10px] transition z-30"
                >
                  <i className="fas fa-pen"></i>
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="ff-title text-lg font-bold text-white leading-tight flex items-center gap-2">
                  {currentUser.name}
                  {currentUser.premium && <i className="fas fa-crown text-[#a78bfa] text-sm" title="Premium"></i>}
                </h3>
                <p id="pHandle" className="text-xs text-[#f0c040] font-mono font-bold mb-2">ID: {getNumericPlayerId(currentUser.uid, currentUser.handle)}</p>
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
                  {currentUser.frameEquipped && (
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 uppercase">
                      VIP Frame Active
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* AVATAR FRAME MANAGEMENT CARD */}
            <div className="p-4 bg-[#171b2e] border border-[#252a45] rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-12 h-12 rounded-full shrink-0 flex items-center justify-center bg-[#111420]">
                  <img src={currentUser.av} alt="Preview" className="w-9 h-9 rounded-full object-cover" />
                  {(currentUser?.frameEquipped || currentUser?.hasFrame) && (
                    <img
                      src="/arenaX/avatarframe1.svg" onError={(e)=>{if(e.currentTarget.src.includes("/arenaX/avatarframe1.svg")){e.currentTarget.src="/avatarframe1.svg";}}}
                      alt="Frame Preview"
                      className={`absolute -inset-[22%] w-[144%] h-[144%] pointer-events-none z-10 max-w-none object-contain ${
                        currentUser?.frameEquipped ? 'opacity-100' : 'opacity-40 grayscale'
                      }`}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-white text-xs sm:text-sm truncate flex items-center gap-1.5">
                    VIP Avatar Frame
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#f0c040]/20 text-[#f0c040] border border-[#f0c040]/30 font-bold">3-Day Item</span>
                  </h4>
                  <p className="text-[10px] text-[#8890b0] truncate">
                    {currentUser?.hasFrame
                      ? (currentUser?.frameEquipped ? 'Equipped across profile' : 'Unlocked & Ready to equip')
                      : 'Earn in Tasks by logging in 1 day!'}
                  </p>
                </div>
              </div>
              {currentUser?.hasFrame ? (
                <button
                  onClick={handleClaimOrToggleFrame}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                    currentUser.frameEquipped
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-[#f0c040] text-[#0a0c12] hover:bg-[#e8b830]'
                  }`}
                >
                  {currentUser.frameEquipped ? 'Unequip' : 'Equip Frame'}
                </button>
              ) : (
                <button
                  onClick={() => setShowTasksModal(true)}
                  className="px-3 py-1.5 bg-[#f0c040]/10 hover:bg-[#f0c040]/20 text-[#f0c040] border border-[#f0c040]/30 rounded-lg text-xs font-bold transition shrink-0"
                >
                  Get Frame
                </button>
              )}
            </div>

            {/* FEATURED SQUAD TOURNAMENT CALLOUT */}
            <div className="p-4 bg-gradient-to-r from-[#f0c040]/15 to-[#f0c040]/5 border border-[#f0c040]/25 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#f0c040]/10 rounded-xl flex items-center justify-center text-lg text-[#f0c040] border border-[#f0c040]/20 flex-shrink-0">
                  <i className="fas fa-trophy"></i>
                </div>
                <div>
                  <h4 className="font-bold text-[#f0c040] text-sm">ArenaX Champions Cup Squad Event!</h4>
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

              <button
                onClick={handleDeleteAccount}
                className="w-full text-left px-4 py-3 hover:bg-red-500/20 text-sm flex items-center justify-between text-red-500 hover:text-red-400 transition font-semibold border-t border-[#252a45]"
              >
                <span className="flex items-center gap-3"><i className="fas fa-trash-alt"></i> Delete Account</span>
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
                {isGuest ? 'Restricted' : (currentUser?.balance ?? 0).toLocaleString()}
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
                <i className="fas fa-comments text-[#f0c040]"></i> Message
              </div>

              {/* Red-Circled Header Buttons: Human Icon (Friends) & Plus Icon (Add Friend + Requests) */}
              <div className="flex items-center gap-2">
                {/* Human Icon Button (Shows all added friends) */}
                <button
                  onClick={() => {
                    if (isGuest) {
                      alert('Register a full account first!');
                      return;
                    }
                    setShowFriendsModal(true);
                  }}
                  className="relative w-9 h-9 bg-[#171b2e] hover:bg-[#1e2340] border border-[#252a45] hover:border-[#f0c040]/40 rounded-full flex items-center justify-center text-white transition cursor-pointer shadow-xs group"
                  title="All Added Friends"
                >
                  <i className="fas fa-user-friends text-sm text-[#38bdf8] group-hover:scale-110 transition-transform"></i>
                  <span className="absolute -top-1 -right-1.5 bg-red-500 text-white font-black text-[9px] min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center border border-[#111420] shadow-xs">
                    {friends.length || 3}
                  </span>
                </button>

                {/* Plus Icon Button (Add Friend & Friend Requests) */}
                <button
                  onClick={() => {
                    if (isGuest) {
                      alert('Register a full account first!');
                      return;
                    }
                    setShowAddFriendModal(true);
                  }}
                  className="relative w-9 h-9 bg-[#171b2e] hover:bg-[#1e2340] border border-[#252a45] hover:border-[#f0c040]/40 rounded-full flex items-center justify-center text-white transition cursor-pointer shadow-xs group"
                  title="Add Friend & Requests"
                >
                  <i className="fas fa-plus text-sm text-[#f0c040] group-hover:scale-110 transition-transform"></i>
                  {friendRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1.5 bg-red-500 text-white font-black text-[9px] min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center border border-[#111420] shadow-xs animate-pulse">
                      {friendRequests.length}
                    </span>
                  )}
                </button>
              </div>
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
                      {friends.map((friend, fIdx) => {
                        const isOfficial = friend.name?.toLowerCase().includes('bot') || friend.name?.toLowerCase().includes('official');
                        const badgeNum = (fIdx % 3) + 1;
                        return (
                          <div
                            key={friend.uid}
                            onClick={() => openDM(friend)}
                            className="p-3 bg-[#171b2e] hover:bg-[#1e2340] border border-[#252a45] hover:border-[#f0c040]/30 rounded-xl flex items-center gap-3.5 text-xs cursor-pointer transition relative group"
                          >
                            <div className="relative shrink-0">
                              <img src={friend.av} alt="Avatar" className="w-11 h-11 rounded-full border border-[#252a45] object-cover" />
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center border border-[#171b2e]">
                                {badgeNum}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-bold text-white truncate flex items-center gap-1">
                                  <span>{friend.name}</span>
                                  {isOfficial && (
                                    <span className="bg-cyan-400/20 text-cyan-400 font-semibold text-[8px] px-1.5 py-0.2 rounded-full border border-cyan-400/30">
                                      Official
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] text-[#8890b0] shrink-0 font-medium">30/07/2026</span>
                              </div>
                              <p className="text-[11px] text-[#8890b0] truncate leading-snug font-normal">
                                Tap to open direct chat...
                              </p>
                            </div>
                          </div>
                        );
                      })}
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
          { tab: 'Home', label: 'Home', icon: 'fa-home' },
          { tab: 'Wallet', label: 'Wallet', icon: 'fa-wallet' },
          { tab: 'Tour', label: 'Events', icon: 'fa-trophy' },
          { tab: 'Voice', label: 'Voice', icon: 'fa-microphone' },
          { tab: 'Profile', label: 'Profile', icon: 'fa-user' }
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
                <label className="block text-[10px] uppercase text-[#4a5070] tracking-wider mb-1 font-bold">Custom Photo Upload</label>
                <div className="flex items-center gap-3 bg-[#171b2e] border border-[#252a45] p-2.5 rounded-xl">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-[#252a45] bg-[#0a0c12] flex-shrink-0">
                    <img src={customAvatarUrl || currentUser?.av || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedAvatarSeed}`} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer px-3 py-1.5 bg-[#252a45] hover:bg-[#2d3354] text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 transition">
                      <i className="fas fa-upload text-[#f0c040]"></i> Upload Photo
                      <input type="file" accept="image/*" onChange={handleAvatarFileUpload} className="hidden" />
                    </label>
                    {uploadStatusMsg && <p className="text-[9px] text-emerald-400 font-semibold mt-1">{uploadStatusMsg}</p>}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-[#4a5070] tracking-wider mb-1.5 font-bold">Or Select Seed Avatar</label>
                <div className="grid grid-cols-4 gap-2">
                  {AVATAR_SEEDS.map((seed) => (
                    <div
                      key={seed}
                      onClick={() => {
                        setSelectedAvatarSeed(seed);
                        setCustomAvatarUrl(null);
                        setUploadStatusMsg('');
                      }}
                      className={`aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition p-1 bg-[#171b2e] ${!customAvatarUrl && selectedAvatarSeed === seed ? 'border-[#f0c040] bg-[#f0c040]/10' : 'border-[#252a45] hover:border-[#8890b0]'}`}
                    >
                      <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`} alt="Avatar option" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              {/* AVATAR FRAMES SECTION IN EDIT PROFILE */}
              <div className="p-3 bg-gradient-to-r from-[#f0c040]/10 via-[#171b2e] to-[#a78bfa]/10 border border-[#f0c040]/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] uppercase text-[#f0c040] tracking-wider font-bold flex items-center gap-1.5">
                    <i className="fas fa-crown text-[#f0c040]"></i> VIP Avatar Frame
                  </label>
                  <span className="text-[8px] px-1.5 py-0.2 rounded bg-[#f0c040]/20 text-[#f0c040] border border-[#f0c040]/30 font-bold uppercase">
                    {currentUser?.hasFrame ? 'Unlocked' : '1 Item'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-11 h-11 rounded-full shrink-0 flex items-center justify-center bg-[#0a0c12]">
                      <img
                        src={customAvatarUrl || currentUser?.av || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedAvatarSeed}`}
                        alt="Avatar Preview"
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      {(currentUser?.frameEquipped || currentUser?.hasFrame) && (
                        <img
                          src="/arenaX/avatarframe1.svg" onError={(e)=>{if(e.currentTarget.src.includes("/arenaX/avatarframe1.svg")){e.currentTarget.src="/avatarframe1.svg";}}}
                          alt="Frame"
                          className={`absolute -inset-[22%] w-[144%] h-[144%] pointer-events-none z-20 max-w-none object-contain ${
                            currentUser?.frameEquipped ? 'opacity-100' : 'opacity-40 grayscale'
                          }`}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                        Golden VIP Frame
                        <span className="text-[8px] px-1 py-0.2 bg-[#f0c040]/20 text-[#f0c040] rounded font-bold">3-Day Pass</span>
                      </div>
                      <div className="text-[10px] text-[#8890b0] truncate">
                        {currentUser?.hasFrame
                          ? (currentUser?.frameEquipped ? 'Equipped on Profile ✓' : 'Unlocked & Ready to Equip')
                          : 'Locked - Earn in Daily Tasks!'}
                      </div>
                    </div>
                  </div>

                  {currentUser?.hasFrame ? (
                    <button
                      type="button"
                      onClick={handleClaimOrToggleFrame}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                        currentUser?.frameEquipped
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-[#f0c040] text-[#0a0c12] hover:bg-[#e8b830]'
                      }`}
                    >
                      {currentUser?.frameEquipped ? 'Unequip' : 'Equip Frame'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomizeModal(false);
                        setShowTasksModal(true);
                      }}
                      className="px-3 py-1.5 bg-[#f0c040]/10 hover:bg-[#f0c040]/20 text-[#f0c040] border border-[#f0c040]/30 rounded-lg text-xs font-bold transition shrink-0"
                    >
                      Get Frame
                    </button>
                  )}
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

            {/* FCM Notification Diagnostics */}
            <div className="space-y-3 border-t border-[#252a45]/50 pt-3">
              <h4 className="text-[10px] uppercase tracking-wider text-[#f0c040] font-bold flex items-center gap-1.5">
                <i className="fas fa-satellite-dish animate-pulse"></i> Firebase Notification Diagnostics
              </h4>
              <div className="space-y-2 bg-[#171b2e] border border-[#252a45] p-3 rounded-xl text-xs space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#8890b0]">Browser Permission:</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${
                    notifPermission === 'granted' ? 'bg-green/10 text-green border border-green/20' :
                    notifPermission === 'denied' ? 'bg-red/10 text-red border border-red/20' :
                    'bg-[#1e2340] text-[#8890b0] border border-[#252a45]'
                  }`}>
                    {notifPermission}
                  </span>
                </div>

                {fcmError && (
                  <div className="bg-red/5 border border-red/20 rounded p-2 text-[10px] text-red select-text break-all">
                    <strong>FCM Error:</strong> {fcmError}
                  </div>
                )}

                {notifPermission !== 'granted' && (
                  <div className="bg-red/5 border border-red/20 rounded p-2.5 space-y-1.5">
                    <p className="text-[10px] text-red leading-snug">
                      ⚠️ **Notifications are blocked/not allowed.** Please click the lock icon next to the browser URL and allow notifications.
                    </p>
                    <button
                      onClick={handleRequestFcmToken}
                      className="w-full py-1 bg-red text-white text-[10px] font-bold rounded hover:bg-red/90 transition flex items-center justify-center gap-1"
                    >
                      <i className="fas fa-bell"></i> Allow & Request Token
                    </button>
                  </div>
                )}

                {notifPermission === 'granted' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#8890b0] font-medium">Your FCM Token:</span>
                      <button
                        onClick={async () => {
                          if (fcmToken) {
                            await navigator.clipboard.writeText(fcmToken);
                            alert('📋 FCM Token copied to clipboard!');
                          } else {
                            handleRequestFcmToken();
                          }
                        }}
                        className="text-[10px] text-[#f0c040] hover:underline flex items-center gap-1 font-semibold"
                      >
                        {fcmToken ? (
                          <>
                            <i className="fas fa-copy"></i> Copy Token
                          </>
                        ) : (
                          <>
                            <i className="fas fa-sync animate-spin"></i> Generate
                          </>
                        )}
                      </button>
                    </div>
                    {fcmToken ? (
                      <div className="p-2 bg-bg border border-[#252a45] rounded font-mono text-[9px] text-[#8890b0] break-all select-all max-h-[60px] overflow-y-auto">
                        {fcmToken}
                      </div>
                    ) : (
                      <button
                        onClick={handleRequestFcmToken}
                        className="w-full py-1.5 bg-[#f0c040] text-[#0a0c12] text-[10px] font-bold rounded hover:bg-[#e8b830] transition"
                      >
                        Generate Token
                      </button>
                    )}
                    <p className="text-[9px] text-[#8890b0] leading-snug mt-1">
                      ℹ️ Copy this token and paste it under **Firebase Console &gt; Cloud Messaging &gt; Test message** to test sending notification!
                    </p>
                  </div>
                )}
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
                    const isSquadEvent = selectedTournament.hasTeams || selectedTournament.name.toLowerCase().includes('champions');
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
                      const isSquadEvent = selectedTournament.hasTeams || selectedTournament.name.toLowerCase().includes('champions');
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

      {/* FRIEND ADD & REQUESTS MODAL */}
      {showAddFriendModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-filter backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-[#252a45] rounded-2xl p-6 max-w-[440px] w-full animate-fade-in space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#252a45] pb-3">
              <h3 className="font-sans text-lg font-bold text-[#f0c040] flex items-center gap-1.5">
                <i className="fas fa-user-plus"></i> Add Friend & Requests
              </h3>
              <button
                onClick={() => { setShowAddFriendModal(false); setSearchResult(null); setSearchHandle(''); }}
                className="text-[#8890b0] hover:text-white transition cursor-pointer p-1"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            {/* Friend Requests Queue inside modal */}
            {friendRequests.length > 0 && (
              <div className="space-y-2 bg-[#1e2340]/50 p-3 border border-[#252a45] rounded-xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] text-[#a78bfa] uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <i className="fas fa-bell text-red-400"></i> Friend Requests
                  </h4>
                  <span className="bg-red-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full">
                    {friendRequests.length}
                  </span>
                </div>
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {friendRequests.map((req) => (
                    <div key={req.uid} className="bg-[#171b2e] border border-[#252a45] p-2 rounded-lg flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={req.av} alt="Avatar" className="w-8 h-8 rounded-full border border-[#252a45] object-cover" />
                        <div className="truncate">
                          <div className="font-semibold text-white leading-tight">{req.name}</div>
                          <div className="text-[9px] text-[#8890b0]">{req.handle}</div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleAcceptFriend(req)}
                          className="p-1.5 bg-[#3ddc84]/15 hover:bg-[#3ddc84]/25 text-[#3ddc84] rounded transition cursor-pointer"
                          title="Accept"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          onClick={() => handleDeclineFriend(req)}
                          className="p-1.5 bg-[#e8404a]/15 hover:bg-[#e8404a]/25 text-[#e8404a] rounded transition cursor-pointer"
                          title="Decline"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs text-[#8890b0]">Search by Numeric Player ID (e.g. 849201):</p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Player ID (e.g. 849201)"
                  value={searchHandle}
                  onChange={(e) => setSearchHandle(e.target.value)}
                  className="flex-1 bg-[#171b2e] border border-[#252a45] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#f0c040] transition"
                />
                <button
                  onClick={handleSearchFriend}
                  disabled={searching}
                  className="px-4 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {searching ? '...' : 'Search'}
                </button>
              </div>
            </div>

            {searchResult && (
              <div className="p-3 bg-[#171b2e] border border-[#252a45] rounded-xl flex items-center justify-between gap-3 text-xs mt-2 animate-fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <img src={searchResult.av} alt="Avatar" className="w-8 h-8 rounded-full border border-[#252a45]" />
                  <div className="truncate">
                    <div className="font-bold text-white">{searchResult.name}</div>
                    <div className="text-[10px] text-[#f0c040] font-bold font-mono">ID: {getNumericPlayerId(searchResult.uid, searchResult.handle)}</div>
                  </div>
                </div>
                <button
                  onClick={handleSendFriendRequest}
                  className="px-2.5 py-1.5 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] text-[10px] font-bold rounded cursor-pointer"
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
              className="w-full py-2 bg-[#171b2e] border border-[#252a45] text-[#8890b0] hover:text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ALL ADDED FRIENDS MODAL */}
      {showFriendsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-filter backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-[#252a45] rounded-2xl p-5 max-w-[440px] w-full animate-fade-in space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#252a45] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-[#38bdf8]/10 text-[#38bdf8] rounded-full flex items-center justify-center text-base border border-[#38bdf8]/20">
                  <i className="fas fa-user-friends"></i>
                </div>
                <div>
                  <h3 className="font-sans text-lg font-bold text-white leading-tight">My Added Friends ({friends.length})</h3>
                  <p className="text-[10px] text-[#8890b0]">All connected players & chat contacts</p>
                </div>
              </div>
              <button onClick={() => setShowFriendsModal(false)} className="text-[#8890b0] hover:text-white transition cursor-pointer p-1 text-base">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {friends.length === 0 ? (
                <div className="p-8 text-center text-[#4a5070] bg-[#171b2e] border border-[#252a45] rounded-xl text-xs space-y-2">
                  <i className="fas fa-user-friends text-3xl"></i>
                  <p className="font-medium text-white">No friends added yet.</p>
                  <p className="text-[10px] text-[#8890b0]">Click the + button to search and add players!</p>
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.uid}
                    className="p-3 bg-[#171b2e] hover:bg-[#1e2340] border border-[#252a45] rounded-xl flex items-center justify-between gap-3 text-xs transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={friend.av} alt="Avatar" className="w-10 h-10 rounded-full border border-[#252a45] object-cover shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{friend.name}</div>
                        <div className="text-[10px] text-[#8890b0] truncate">{friend.handle}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowFriendsModal(false);
                        openDM(friend);
                      }}
                      className="px-3 py-1.5 bg-[#f0c040] hover:bg-[#e8b830] text-[#0a0c12] text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                    >
                      <i className="fas fa-paper-plane"></i> Chat
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowFriendsModal(false)}
              className="w-full py-2.5 bg-[#171b2e] border border-[#252a45] text-[#8890b0] hover:text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* DIRECT MESSAGE FULL SCREEN CHAT PAGE */}
      {showDMChat && activeFriend && (
        <div className="fixed inset-0 bg-[#f4f4f6] z-[9999] flex flex-col w-full h-full h-screen overflow-hidden animate-fade-in">
          <div className="w-full h-full flex flex-col bg-[#f4f4f6]">
            {/* Full Width Top Header (Image 1 Style) */}
            <div className="w-full px-4 py-3 bg-white border-b border-gray-200/90 flex items-center justify-between shadow-xs shrink-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => { setShowDMChat(false); setActiveFriend(null); }}
                  className="text-gray-700 hover:text-gray-950 transition text-lg p-1.5 cursor-pointer flex items-center justify-center rounded-lg hover:bg-gray-100"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <div className="flex items-center gap-2 cursor-pointer min-w-0">
                  <span className="text-xs text-gray-400 font-bold shrink-0">6</span>
                  <h4 className="text-sm font-bold text-gray-900 truncate tracking-wide">{activeFriend.name}</h4>
                </div>
              </div>
              <button className="text-gray-600 hover:text-gray-900 transition text-base p-2 cursor-pointer hover:bg-gray-100 rounded-lg">
                <i className="fas fa-ellipsis-h"></i>
              </button>
            </div>

            {/* DMs messages stream (Image 1 Style Full Screen Stream) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#f4f4f6]">
              {dms.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs gap-1 py-12">
                  <i className="far fa-comments text-3xl text-gray-300"></i>
                  <p className="font-medium">No messages yet with {activeFriend.name}</p>
                  <p className="text-[10px] text-gray-400">Say hello to start the conversation!</p>
                </div>
              ) : (
                dms.map((msg, mIdx) => {
                  const isMe = msg.sender === currentUser?.uid;

                  // Format time badge string
                  let timeStr = '30/07/2026 01:37';
                  if (msg.createdAt) {
                    const dt = msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
                    const day = String(dt.getDate()).padStart(2, '0');
                    const month = String(dt.getMonth() + 1).padStart(2, '0');
                    const year = dt.getFullYear();
                    const hrs = String(dt.getHours()).padStart(2, '0');
                    const mins = String(dt.getMinutes()).padStart(2, '0');
                    timeStr = `${day}/${month}/${year} ${hrs}:${mins}`;
                  }

                  const prevMsg = mIdx > 0 ? dms[mIdx - 1] : null;
                  let showBadge = mIdx === 0;
                  if (prevMsg && prevMsg.createdAt && msg.createdAt) {
                    const dt1 = prevMsg.createdAt.toDate ? prevMsg.createdAt.toDate() : new Date(prevMsg.createdAt);
                    const dt2 = msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
                    if (dt2.getTime() - dt1.getTime() > 10 * 60 * 1000) {
                      showBadge = true;
                    }
                  }

                  return (
                    <React.Fragment key={mIdx}>
                      {showBadge && (
                        <div className="flex justify-center my-2">
                          <span className="bg-[#d1d5db] text-white text-[10px] px-2.5 py-0.5 rounded-md font-semibold tracking-wide shadow-2xs">
                            {timeStr}
                          </span>
                        </div>
                      )}
                      {isMe ? (
                        /* Sent Message - Cyan bubble right, Avatar right */
                        <div className="flex items-start justify-end gap-2 max-w-[88%] ml-auto">
                          <div className="flex items-center gap-1 max-w-[80%]">
                            <div className="px-3.5 py-2 bg-[#dcf8ff] text-slate-900 rounded-2xl rounded-tr-xs text-xs font-normal shadow-2xs border border-sky-100 break-words leading-relaxed">
                              {msg.text}
                            </div>
                          </div>
                          <img
                            src={currentUser?.av || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.uid}`}
                            alt="My avatar"
                            className="w-8 h-8 rounded-full border border-gray-200 object-cover shrink-0 mt-0.5 shadow-2xs"
                          />
                        </div>
                      ) : (
                        /* Received Message - White bubble left, Avatar left */
                        <div className="flex items-start justify-start gap-2 max-w-[88%]">
                          <img
                            src={activeFriend.av || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeFriend.uid}`}
                            alt="Friend avatar"
                            className="w-8 h-8 rounded-full border border-gray-200 object-cover shrink-0 mt-0.5 shadow-2xs"
                          />
                          <div className="px-3.5 py-2 bg-white text-slate-900 rounded-2xl rounded-tl-xs text-xs font-normal shadow-2xs border border-gray-100 max-w-[80%] break-words leading-relaxed">
                            {msg.text}
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })
              )}
              <div ref={dmEndRef} />
            </div>

            {/* Full Width Input bar (Image 1 Style) */}
            <div className="w-full px-4 py-3 bg-white border-t border-gray-200/90 flex items-center gap-3 shadow-md shrink-0">
              <div className="w-1 h-6 bg-emerald-500 rounded-full shrink-0"></div>
              <input
                type="text"
                placeholder="Type direct message..."
                value={dmText}
                onChange={(e) => setDmText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendDM()}
                className="flex-1 bg-[#f0f2f5] text-gray-900 text-xs rounded-full px-4 py-2.5 outline-none border border-transparent focus:border-sky-400 font-medium transition placeholder-gray-400"
              />
              <div className="flex items-center gap-2.5 shrink-0 text-gray-500">
                <button type="button" className="hover:text-gray-800 text-lg transition cursor-pointer p-1.5" title="Stickers/Emoji">
                  <i className="far fa-smile"></i>
                </button>
                <button type="button" className="hover:scale-110 text-lg transition cursor-pointer p-1.5 text-pink-500" title="Send Gift">
                  🎁
                </button>
                <button
                  onClick={handleSendDM}
                  className="w-9 h-9 bg-sky-500 hover:bg-sky-600 text-white rounded-full flex items-center justify-center text-xs transition cursor-pointer shadow-sm active:scale-95"
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RANKING LEADERBOARD FULL PAGE OVERLAY */}
      {showRankingModal && (() => {
        const rank1Player = leaderboardList[0] || {
          name: currentUser?.name || 'No Player',
          balance: currentUser?.balance || 0,
          av: currentUser?.av || 'https://api.dicebear.com/7.x/bottts/svg?seed=p1'
        };

        const rank2Player = leaderboardList[1] || {
          name: '—',
          balance: 0,
          av: 'https://api.dicebear.com/7.x/bottts/svg?seed=p2'
        };

        const rank3Player = leaderboardList[2] || {
          name: '—',
          balance: 0,
          av: 'https://api.dicebear.com/7.x/bottts/svg?seed=p3'
        };

        const remainingPlayers = leaderboardList.length > 3 ? leaderboardList.slice(3) : [];

        return (
          <div 
            className="fixed inset-0 bg-[#7c3aed] bg-cover bg-center bg-no-repeat z-[9999] flex flex-col overflow-y-auto animate-fade-in font-sans"
            style={{
              backgroundImage: "url('/rankbg.png'), url('/arenaX/rankbg.png'), linear-gradient(to bottom, #8b5cf6, #7c3aed, #6d28d9)",
              backgroundSize: 'cover',
              backgroundPosition: 'center top'
            }}
          >
            {/* TOP HEADER */}
            <div className="w-full px-4 pt-4 pb-2 flex items-center justify-between z-20">
              <button
                onClick={() => setShowRankingModal(false)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer active:scale-95"
              >
                <i className="fas fa-chevron-left text-lg"></i>
              </button>

              <h2 className="text-xl font-bold text-white tracking-wide">Leaderboard</h2>

              <div className="w-10 h-10 flex items-center justify-center text-white/80">
                <i className="fas fa-trophy text-lg text-yellow-300"></i>
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex justify-center my-2 z-20 px-4">
              <div className="flex bg-black/20 p-1 rounded-full border border-white/15 backdrop-blur-md">
                <button
                  onClick={() => setRankingCategory('AX Coins')}
                  className={`px-6 py-1.5 rounded-full text-xs font-bold transition ${
                    rankingCategory === 'AX Coins'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  AX Coins
                </button>
                <button
                  onClick={() => setRankingCategory('Weekly')}
                  className={`px-6 py-1.5 rounded-full text-xs font-bold transition ${
                    rankingCategory === 'Weekly'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Weekly
                </button>
              </div>
            </div>

            {/* TOP 3 PODIUM */}
            <div className="relative pt-8 pb-3 px-4 flex items-end justify-center gap-2 sm:gap-6 min-h-[320px]">
              {/* Background circular glowing rings */}
              <div className="absolute top-4 left-6 w-24 h-24 rounded-full border border-white/10 pointer-events-none"></div>
              <div className="absolute top-12 right-8 w-20 h-20 rounded-full border border-white/10 pointer-events-none"></div>

              {/* RANK 2 (Left) */}
              <div className="flex flex-col items-center z-10 w-1/3 max-w-[110px]">
                <div className="relative mb-2 flex flex-col items-center">
                  <div className="relative flex items-center justify-center">
                    <img
                      src={rank2Player.av}
                      alt={rank2Player.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-slate-200 shadow-xl"
                    />
                    {(rank2Player.frameEquipped || (rank2Player.uid === currentUser?.uid && currentUser?.frameEquipped)) && (
                      <img src="/arenaX/avatarframe1.svg" onError={(e)=>{if(e.currentTarget.src.includes("/arenaX/avatarframe1.svg")){e.currentTarget.src="/avatarframe1.svg";}}} alt="Frame" className="absolute -inset-[22%] w-[144%] h-[144%] pointer-events-none z-20 max-w-none object-contain" />
                    )}
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-slate-300 to-slate-500 text-white font-black text-[11px] rounded-full flex items-center justify-center border-2 border-white shadow z-30">
                      2
                    </span>
                  </div>
                  <h4 className="text-white font-bold text-xs sm:text-sm mt-2 text-center truncate max-w-[90px]">
                    {rank2Player.name}
                  </h4>
                  <span className="bg-white/20 backdrop-blur-md text-yellow-300 font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full mt-1 border border-white/20 shadow-xs">
                    {(rank2Player.balance || 0).toLocaleString()} AX
                  </span>
                </div>
                {/* Podium Column 2 */}
                <div className="w-full bg-gradient-to-t from-pink-500/80 to-purple-400/90 rounded-t-2xl h-28 sm:h-32 flex items-start justify-center pt-3 shadow-lg border-t border-white/30">
                  <span className="text-white/90 font-black text-4xl sm:text-5xl drop-shadow">2</span>
                </div>
              </div>

              {/* RANK 1 (Center - Taller Podium with Golden Crown) */}
              <div className="flex flex-col items-center z-20 w-1/3 max-w-[130px] -mt-6">
                <div className="relative mb-2 flex flex-col items-center">
                  {/* Golden Crown Icon sitting on head */}
                  <div className="absolute -top-7 text-yellow-300 text-2xl sm:text-3xl animate-bounce drop-shadow-[0_4px_12px_rgba(250,204,21,0.8)] z-30">
                    👑
                  </div>
                  <div className="relative flex items-center justify-center">
                    <img
                      src={rank1Player.av}
                      alt={rank1Player.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-yellow-300 shadow-[0_0_30px_rgba(250,204,21,0.6)]"
                    />
                    {(rank1Player.frameEquipped || (rank1Player.uid === currentUser?.uid && currentUser?.frameEquipped)) && (
                      <img src="/arenaX/avatarframe1.svg" onError={(e)=>{if(e.currentTarget.src.includes("/arenaX/avatarframe1.svg")){e.currentTarget.src="/avatarframe1.svg";}}} alt="Frame" className="absolute -inset-[22%] w-[144%] h-[144%] pointer-events-none z-20 max-w-none object-contain" />
                    )}
                    <span className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-br from-yellow-300 to-amber-500 text-gray-950 font-black text-xs rounded-full flex items-center justify-center border-2 border-white shadow-md z-30">
                      1
                    </span>
                  </div>
                  <h3 className="text-white font-extrabold text-sm sm:text-base mt-2 text-center truncate max-w-[105px] drop-shadow">
                    {rank1Player.name}
                  </h3>
                  <span className="bg-yellow-400 text-purple-950 font-black text-xs px-3 py-0.5 rounded-full mt-1 shadow-md border border-yellow-200">
                    {(rank1Player.balance || 0).toLocaleString()} AX
                  </span>
                </div>
                {/* Podium Column 1 */}
                <div className="w-full bg-gradient-to-t from-pink-500 to-purple-300/90 rounded-t-2xl h-36 sm:h-40 flex items-start justify-center pt-3 shadow-2xl border-t-2 border-white/50">
                  <span className="text-white font-black text-5xl sm:text-6xl drop-shadow-lg">1</span>
                </div>
              </div>

              {/* RANK 3 (Right) */}
              <div className="flex flex-col items-center z-10 w-1/3 max-w-[110px]">
                <div className="relative mb-2 flex flex-col items-center">
                  <div className="relative flex items-center justify-center">
                    <img
                      src={rank3Player.av}
                      alt={rank3Player.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-amber-600/90 shadow-xl"
                    />
                    {(rank3Player.frameEquipped || (rank3Player.uid === currentUser?.uid && currentUser?.frameEquipped)) && (
                      <img src="/arenaX/avatarframe1.svg" onError={(e)=>{if(e.currentTarget.src.includes("/arenaX/avatarframe1.svg")){e.currentTarget.src="/avatarframe1.svg";}}} alt="Frame" className="absolute -inset-[22%] w-[144%] h-[144%] pointer-events-none z-20 max-w-none object-contain" />
                    )}
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-600 to-amber-800 text-white font-black text-[11px] rounded-full flex items-center justify-center border-2 border-white shadow z-30">
                      3
                    </span>
                  </div>
                  <h4 className="text-white font-bold text-xs sm:text-sm mt-2 text-center truncate max-w-[90px]">
                    {rank3Player.name}
                  </h4>
                  <span className="bg-white/20 backdrop-blur-md text-yellow-300 font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full mt-1 border border-white/20 shadow-xs">
                    {(rank3Player.balance || 0).toLocaleString()} AX
                  </span>
                </div>
                {/* Podium Column 3 */}
                <div className="w-full bg-gradient-to-t from-pink-500/70 to-purple-400/80 rounded-t-2xl h-24 sm:h-28 flex items-start justify-center pt-3 shadow-lg border-t border-white/20">
                  <span className="text-white/80 font-black text-4xl sm:text-5xl drop-shadow">3</span>
                </div>
              </div>
            </div>

            {/* LOWER WHITE CARD LIST FOR RANKS 4 AND BEYOND */}
            <div className="w-full bg-white rounded-t-[32px] pt-6 pb-36 px-4 shadow-[0_-10px_35px_rgba(0,0,0,0.18)] space-y-3 max-w-2xl mx-auto grow min-h-[calc(100vh-280px)]">
              <div className="flex items-center justify-between px-2 pb-2 border-b border-gray-100 text-xs font-bold text-gray-400">
                <span>RANK & PLAYER</span>
                <span>AX COINS BALANCE</span>
              </div>

              <div className="space-y-2.5">
                {remainingPlayers.map((player, idx) => {
                  const rankNum = idx + 4;
                  const isCurrentUser = player.uid === currentUser?.uid;

                  return (
                    <div
                      key={player.uid || idx}
                      className={`flex items-center justify-between p-3 rounded-2xl transition ${
                        isCurrentUser
                          ? 'bg-purple-50 border-2 border-purple-300 shadow-sm'
                          : 'bg-gray-50/90 hover:bg-gray-100 border border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="font-extrabold text-sm text-gray-400 w-5 text-center shrink-0">
                          {rankNum}
                        </span>
                        <div className="relative shrink-0 flex items-center justify-center">
                          <img
                            src={player.av}
                            alt={player.name}
                            className="w-11 h-11 rounded-full object-cover border border-gray-200 shrink-0 shadow-xs"
                          />
                          {(player.frameEquipped || (player.uid === currentUser?.uid && currentUser?.frameEquipped)) && (
                            <img src="/arenaX/avatarframe1.svg" onError={(e)=>{if(e.currentTarget.src.includes("/arenaX/avatarframe1.svg")){e.currentTarget.src="/avatarframe1.svg";}}} alt="Frame" className="absolute -inset-[22%] w-[144%] h-[144%] pointer-events-none z-20 max-w-none object-contain" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-gray-900 truncate flex items-center gap-1.5">
                            <span>{player.name}</span>
                            {isCurrentUser && (
                              <span className="bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-md">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 font-medium truncate mt-0.5">
                            Rank #{rankNum} • Player
                          </div>
                        </div>
                      </div>

                      {/* AX COINS BALANCE DISPLAY INSTEAD OF FOLLOW BUTTON */}
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-100/80 border border-amber-200/90 text-amber-900 px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shrink-0 shadow-xs">
                        <i className="fas fa-coins text-amber-500 text-xs"></i>
                        <span>{(player.balance || 0).toLocaleString()} AX</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* TASKS MODAL */}
      {showTasksModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-[#252a45] rounded-2xl p-6 max-w-[420px] w-full animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-[#252a45] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-[#e8404a]/10 text-[#e8404a] rounded-full flex items-center justify-center text-lg border border-[#e8404a]/20">
                  <i className="fas fa-clipboard-check"></i>
                </div>
                <h3 className="font-sans text-xl font-bold text-white">Daily Tasks & Quests</h3>
              </div>
              <button onClick={() => setShowTasksModal(false)} className="text-[#8890b0] hover:text-white transition">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-2.5">
              {/* FEATURED AVATAR FRAME REWARD TASK */}
              <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-[#171b2e] to-purple-500/15 border border-[#f0c040]/40 rounded-xl flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-[#111420]">
                    <img src={currentUser?.av} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                    <img src="/arenaX/avatarframe1.svg" onError={(e)=>{if(e.currentTarget.src.includes("/arenaX/avatarframe1.svg")){e.currentTarget.src="/avatarframe1.svg";}}} alt="Frame" className="absolute -inset-[22%] w-[144%] h-[144%] pointer-events-none z-10 max-w-none object-contain" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      Login 1 Day
                      <span className="text-[8px] px-1.5 py-0.2 rounded bg-[#f0c040] text-[#0a0c12] font-black uppercase tracking-wider">SPECIAL</span>
                    </div>
                    <div className="text-[10px] text-[#8890b0] truncate">
                      Reward: <span className="text-[#f0c040] font-bold">VIP Avatar Frame (3 Days)</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleClaimOrToggleFrame}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                    currentUser?.hasFrame
                      ? currentUser?.frameEquipped
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                        : 'bg-[#f0c040] text-[#0a0c12] hover:bg-[#e8b830]'
                      : 'bg-[#f0c040] text-[#0a0c12] hover:bg-[#e8b830] shadow-[0_0_12px_rgba(240,192,64,0.4)]'
                  }`}
                >
                  {currentUser?.hasFrame
                    ? (currentUser?.frameEquipped ? 'Equipped ✓' : 'Equip Frame')
                    : 'Claim Frame'}
                </button>
              </div>

              {[
                { task: 'Join 1 Tournament Match', reward: '+50 AX', progress: '0/1', done: false },
                { task: 'Add 1 Friend to List', reward: '+30 AX', progress: `${friends.length > 0 ? 1 : 0}/1`, done: friends.length > 0 },
                { task: 'Check Tournament Guidelines', reward: '+20 AX', progress: '1/1', done: true }
              ].map((t, idx) => (
                <div key={idx} className="p-3 bg-[#171b2e] border border-[#252a45] rounded-xl flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-white">{t.task}</div>
                    <div className="text-[10px] text-[#8890b0]">Reward: <span className="text-[#f0c040] font-bold">{t.reward}</span></div>
                  </div>
                  <button
                    disabled={t.done}
                    onClick={() => alert(`Task reward claimed! ${t.reward}`)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      t.done
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                        : 'bg-[#f0c040] text-[#0a0c12] hover:bg-[#e8b830]'
                    }`}
                  >
                    {t.done ? 'Claimed ✓' : t.progress}
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowTasksModal(false)}
              className="w-full py-2.5 bg-[#1e2340] border border-[#252a45] text-[#8890b0] font-bold rounded-xl text-xs transition hover:text-white"
            >
              Close Tasks
            </button>
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
