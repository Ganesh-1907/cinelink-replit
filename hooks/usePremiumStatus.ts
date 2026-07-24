import {useApp} from '../src/context/AppContext';
import {PremiumTier} from '../src/types';

interface PremiumStatus {
  isPremium: boolean;
  tier: PremiumTier;
  expiryDate: Date | null;
  isExpiringSoon: boolean;
  isVerified: boolean;
  loading: boolean;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export function usePremiumStatus(): PremiumStatus {
  const {isPremium, premiumTier, premiumExpiry, isVerified, loading} = useApp();

  const now = Date.now();
  const expiryMs = premiumExpiry?.getTime() ?? 0;
  const isExpiringSoon = isPremium && expiryMs - now <= THREE_DAYS_MS;

  return {
    isPremium,
    tier: premiumTier,
    expiryDate: premiumExpiry,
    isExpiringSoon,
    isVerified,
    loading,
  };
}
