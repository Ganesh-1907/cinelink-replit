import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {authService} from '../services/AuthService';
import {User, PremiumTier} from '../types';

interface AppState {
  user: any | null;
  userData: User | null;
  premiumTier: PremiumTier;
  premiumExpiry: Date | null;
  isPremium: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  role: string;
  loading: boolean;
  refreshUserData: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppState>({
  user: null,
  userData: null,
  premiumTier: 'none',
  premiumExpiry: null,
  isPremium: false,
  isVerified: false,
  isAdmin: false,
  role: 'Actor',
  loading: true,
  refreshUserData: async () => {},
  signOut: async () => {},
});

export function AppProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<any | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [premiumTier, setPremiumTier] = useState<PremiumTier>('none');
  const [premiumExpiry, setPremiumExpiry] = useState<Date | null>(null);
  const [role, setRole] = useState('Actor');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const populateFromUserData = useCallback((data: User) => {
    setUserData(data);
    (globalThis as any).userData = data;
    (globalThis as any).user = {
      uid: data.id,
      email: data.email,
      displayName: data.fullName || data.name,
    };
    setPremiumTier(data.premiumTier || 'none');
    setPremiumExpiry(data.premiumExpiry ? new Date(data.premiumExpiry) : null);
    setRole(data.role || 'Actor');
    const adminEmail = 'anilkumardevarakonda03@gmail.com';
    setIsAdmin(data.isAdmin === true || data.email === adminEmail);
  }, []);

  const refreshUserData = useCallback(async () => {
    try {
      const data = await authService.fetchProfile();
      populateFromUserData(data);
    } catch (e) {
      console.warn('[AppContext] refreshUserData error:', e);
    }
  }, [populateFromUserData]);

  const signOut = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setUserData(null);
    setPremiumTier('none');
    setPremiumExpiry(null);
    setRole('Actor');
    setIsAdmin(false);
  }, []);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const session = await authService.restoreSession();
        if (session) {
          setUser({email: session.user.email, _id: session.user._id});
          populateFromUserData(session.user);
        }
      } catch (e) {
        console.warn('[AppContext] session restore error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [populateFromUserData]);

  const isPremium = premiumTier !== 'none';
  const isVerified = userData?.verifiedReal === true;

  return (
    <AppContext.Provider
      value={{
        user,
        userData,
        premiumTier,
        premiumExpiry,
        isPremium,
        isVerified,
        isAdmin,
        role,
        loading,
        refreshUserData,
        signOut,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

export default AppContext;
