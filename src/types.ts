export interface UserProfile {
  uid: string;
  id?: string;
  name: string;
  handle: string;
  email?: string;
  av: string;
  balance: number;
  premium?: boolean;
  isPremium?: boolean;
  isVIP?: boolean;
  vip?: boolean;
  selectedFont?: string;
  banned?: boolean;
  banType?: 'none' | 'full' | 'chat';
  banReason?: string;
  banUntil?: string | null;
  bannerTheme?: string;
  nameColor?: string;
  goldenNameEnabled?: boolean;
  avatarFrame?: string;
  badge?: string;
  bio?: string;
  country?: string;
  favoriteGame?: string;
  gameUID?: string;
  socialDiscord?: string;
  socialInstagram?: string;
  socialYoutube?: string;
  popularity?: number;
  transactions?: any[];
  weeklyReward?: {
    currentDay: number;
    lastClaimAt?: string | null;
    nextClaimAt?: string | null;
    cycleStartedAt?: string | null;
    cycleId?: string;
    totalClaims?: number;
  };
  hasBlueTick?: boolean;
  isVerified?: boolean;
  createdAt?: string;
  referredBy?: string;
}

export interface WeeklyRewardState {
  currentDay: number;
  lastClaimAt?: string | null;
  nextClaimAt?: string | null;
  cycleStartedAt?: string | null;
  cycleId?: string;
  totalClaims: number;
}

export interface RewardTransaction {
  id?: string;
  userId: string;
  rewardType: 'weekly_reward';
  day: number;
  amount: number;
  isMystery?: boolean;
  cycleId?: string;
  claimedAt: any;
  claimedAtIso?: string;
  createdAt?: string;
}

export interface VIPFont {
  id: string;
  name: string;
  className: string;
  category?: string;
}

export const VIP_FONTS: VIPFont[] = [
  { id: 'poppins', name: 'Poppins', className: 'font-poppins', category: 'Modern' },
  { id: 'orbitron', name: 'Orbitron', className: 'font-orbitron', category: 'Sci-Fi' },
  { id: 'luckiest-guy', name: 'Luckiest Guy', className: 'font-luckiest-guy', category: 'Bubble' },
  { id: 'fredoka', name: 'Fredoka', className: 'font-fredoka', category: 'Casual' },
  { id: 'bungee', name: 'Bungee', className: 'font-bungee', category: 'Heavy Block' },
  { id: 'chakra', name: 'Chakra Petch', className: 'font-chakra', category: 'Esports' },
  { id: 'press-start', name: 'Press Start 2P', className: 'font-press-start', category: 'Pixel 8-Bit' },
  { id: 'cinzel', name: 'Cinzel', className: 'font-cinzel', category: 'Roman Serif' },
  { id: 'rajdhani', name: 'Rajdhani', className: 'font-rajdhani', category: 'Tactical' },
  { id: 'unifraktur', name: 'Unifraktur', className: 'font-unifraktur', category: 'Gothic' },
  { id: 'permanent-marker', name: 'Permanent Marker', className: 'font-permanent-marker', category: 'Street Brush' },
  { id: 'pacifico', name: 'Pacifico', className: 'font-pacifico', category: 'Flowing Script' },
];

export interface Tournament {
  id: string;
  name: string;
  game: string;
  banner?: string;
  entryFee: number;
  prize: string;
  prizePool?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  registered: number;
  maxPlayers: number;
  startTime?: any;
  date?: string;
  roomDetails?: {
    roomId?: string;
    roomPass?: string;
  };
}

export interface DepositRequest {
  id?: string;
  userId: string;
  userName: string;
  userHandle: string;
  amountPKR: number;
  amountAX: number;
  method: 'JazzCash' | 'EasyPaisa' | 'Referral Bonus' | string;
  txnId: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt?: any;
  notes?: string;
}

export interface WithdrawRequest {
  id?: string;
  userId: string;
  userName: string;
  userHandle: string;
  amountAX: number;
  amountPKR: number;
  method: string;
  accountNumber: string;
  accountName: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt?: any;
}

export type MediaQuality = '480p' | '720p' | '1080p';

export interface MomentItem {
  id: string;
  userId: string;
  userName: string;
  userHandle: string;
  userAv: string;
  hasBlueTick?: boolean;
  premium?: boolean;
  avatarFrame?: string;
  caption: string;
  game?: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  quality: MediaQuality;
  resolution: string;
  fileSizeFormatted?: string;
  likesCount: number;
  likedBy?: string[];
  commentsCount: number;
  createdAt?: any;
}

export interface MomentComment {
  id: string;
  momentId: string;
  userId: string;
  userName: string;
  userHandle: string;
  userAv: string;
  hasBlueTick?: boolean;
  premium?: boolean;
  text: string;
  createdAt?: any;
}

