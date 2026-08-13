export interface UserProfile {
  id: string;
  uid: string;
  name: string;
  handle: string;
  av: string;
  email: string;
  premium: boolean;
  goldenNameEnabled?: boolean;
  nameColor?: string;
  bannerTheme?: string;
  avatarFrame?: string;
  bio?: string;
  banned: boolean; // Account ban status
  banType?: 'none' | 'full' | 'tournament';
  banReason?: string;
  banUntil?: string | null; // ISO string
  balance: number;
  axCoins?: number;
  playerShowUnlocked?: boolean;
  hasFrame?: boolean;
  frameEquipped?: boolean;
  frameExpiresAt?: string | null;
  createdAt?: string;
  transactions?: Transaction[];
}

export interface Tournament {
  id: string;
  name: string;
  game: string;
  prize: string;
  maxPlayers: number;
  registered: number;
  status: 'upcoming' | 'live' | 'ended' | 'cancelled';
  date: string;
  time: string;
  entryFee: string;
  teamType: 'Solo' | 'Duo (2 Players)' | 'Trio (3 Players)' | 'Squad (4 Players)';
  hasTeams?: boolean;
  createdAt?: any;
}

export interface Registration {
  id: string;
  tournamentId: string;
  tournamentName: string;
  userId: string;
  userName: string;
  userHandle: string;
  realName: string;
  gameName: string;
  gameUID: string;
  age: string;
  txnId: string;
  screenshot: string;
  status: 'pending' | 'approved' | 'rejected';
  selectedTeamColor?: string;
  submittedAt?: any;
}

export interface CheatReport {
  id: string;
  tournamentId: string;
  tournamentName: string;
  reporterId: string;
  reporterName: string;
  reportedName: string;
  reportedUID: string;
  hackType: string;
  reason: string;
  videoUrl: string;
  status: 'open' | 'resolved';
  createdAt?: any;
}

export interface SupportTicket {
  id: string;
  ticketId: string;
  uid: string;
  userName: string;
  userHandle: string;
  lastMsg: string;
  status: 'open' | 'resolved';
  updatedAt?: any;
}

export interface SupportMessage {
  id?: string;
  text: string;
  sender: 'user' | 'admin' | 'bot';
  senderName: string;
  createdAt?: any;
}

export interface Friend {
  uid: string;
  name: string;
  handle: string;
  av: string;
  addedAt?: any;
}

export interface FriendRequest {
  uid: string;
  name: string;
  handle: string;
  av: string;
  sentAt?: any;
}

export interface DirectMessage {
  id?: string;
  text: string;
  sender: string;
  senderName: string;
  createdAt?: any;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'adjustment';
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'sent';
  account?: string;
  timestamp: string;
  message?: string;
  color?: string; // e.g. 'green', 'red', 'golden', 'blue', etc.
}

export interface MomentItem {
  id?: string;
  userId: string;
  userName: string;
  userAv?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt?: any;
  likes?: string[];
  likeCount?: number;
}
