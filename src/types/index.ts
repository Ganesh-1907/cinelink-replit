// ── Premium tiers ────────────────────────────────────────────────────────────
export type PremiumTier =
  | 'none'
  | 'spotlight'
  | 'marquee'
  | 'premiere'
  | 'premiereElite'
  | 'black';

// ── Core user document (mirrors MongoDB User schema) ─────────────────────────
export interface User {
  id?: string;
  uid?: string;
  _id?: string;
  displayName?: string | null;
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  photoURL?: string | null;
  photoUrl?: string | null;
  role: string | null;
  bio?: string;
  location?: string;
  isApprovedDirector?: boolean;
  isAdmin?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  fcmToken?: string;
  profileLikes?: number;
  profileLikedBy?: string[];
  profileViews?: number;
  votedEntries?: string[];
  createdAt?: string;

  premiumTier: PremiumTier;
  premiumExpiry: string | null;
  verifiedReal: boolean;
  subscriptionId: string | null;
  monthlyApplicationCount: number;
  isTopDirector: boolean;
  verifiedProductionHouse: boolean;

  introVideoLink?: string;
  portfolio1?: string;
  portfolio2?: string;
  portfolio3?: string;
  portfolioPhotos?: string[];
  portfolioMedia?: string[];
  instagramLink?: string;
  youtubeLink?: string;
  ageRange?: string;
  height?: string;
  bodyType?: string;
  availabilityStatus?: string;
  lookingFor?: string;
  profileTags?: string[];
  verificationStatus?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  tier: Exclude<PremiumTier, 'none'>;
  paymentId: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
}

export interface AuthResponse {
  user: User;
  token: string;
  isNewUser?: boolean;
}
