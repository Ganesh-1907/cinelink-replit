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
import {useTheme} from './ThemeContext';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {GOOGLE_WEB_CLIENT_ID} from '../api/config';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});


interface AppState {
  user: any | null;
  userData: User | null;
  premiumTier: PremiumTier;
  premiumExpiry: Date | null;
  isPremium: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  isApprovedDirector: boolean;
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
  isApprovedDirector: false,
  role: 'Actor',
  loading: true,
  refreshUserData: async () => {},
  signOut: async () => {},
});

export function AppProvider({children}: {children: ReactNode}) {
  const {resetToSystemTheme} = useTheme();
  const [user, setUser] = useState<any | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [premiumTier, setPremiumTier] = useState<PremiumTier>('none');
  const [premiumExpiry, setPremiumExpiry] = useState<Date | null>(null);
  const [role, setRole] = useState('Actor');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApprovedDirector, setIsApprovedDirector] = useState(false);
  const [loading, setLoading] = useState(true);

  const populateFromUserData = useCallback((data: User) => {
    const userId = (data as any)._id || data.id;
    setUser({
      uid: userId,
      _id: userId,
      email: data.email,
      displayName: data.fullName || data.name,
      photoURL: data.photoUrl,
    });
    setUserData(data);
    (globalThis as any).userData = data;
    (globalThis as any).user = {
      uid: userId,
      email: data.email,
      displayName: data.fullName || data.name,
      photoURL: data.photoUrl,
    };
    setPremiumTier(data.premiumTier || 'none');
    setPremiumExpiry(data.premiumExpiry ? new Date(data.premiumExpiry) : null);
    setRole(data.role || 'Actor');
    setIsAdmin(data.role === 'Admin');
    setIsApprovedDirector(data.role === 'Director' && data.isApprovedDirector === true);
  }, []);

  const refreshUserData = useCallback(async () => {
    try {
      const data = await authService.fetchProfile();
      populateFromUserData(data);
    } catch (e) {
      console.warn('[AppContext] refreshUserData error:', e);
      throw e;
    }
  }, [populateFromUserData]);

  const signOut = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      // ignore
    }
    await authService.logout();
    resetToSystemTheme();
    setUser(null);
    setUserData(null);
    setPremiumTier('none');
    setPremiumExpiry(null);
    setRole('Actor');
    setIsAdmin(false);
    setIsApprovedDirector(false);
  }, [resetToSystemTheme]);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const session = await authService.restoreSession();
        if (session) {
          setUser({email: session.user.email, _id: session.user._id});
          populateFromUserData(session.user);
          const data = await authService.fetchProfile();
          populateFromUserData(data);
        } else {
          resetToSystemTheme();
        }
      } catch (e) {
        console.warn('[AppContext] session restore error:', e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToSystemTheme]);

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
        isApprovedDirector,
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
