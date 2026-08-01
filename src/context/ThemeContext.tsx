import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {useColorScheme} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {darkColors, lightColors, applyColors} from '../theme';

type ThemeMode = 'dark' | 'light';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  resetToSystemTheme: () => void;
  themeKey: string;
}

const STORAGE_KEY = '@cinelink_theme_mode';

const ThemeContext = createContext<ThemeState>({
  mode: 'dark',
  isDark: true,
  toggleTheme: () => {},
  resetToSystemTheme: () => {},
  themeKey: 'dark',
});

export function ThemeProvider({children}: {children: ReactNode}) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [hasUserPreference, setHasUserPreference] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      console.log('[ThemeContext] Init: systemScheme:', systemScheme, 'saved:', saved);
      if (saved === 'light' || saved === 'dark') {
        const m = saved as ThemeMode;
        applyColors(m === 'dark' ? darkColors : lightColors);
        setMode(m);
        setHasUserPreference(true);
      } else {
        const m = systemScheme === 'light' ? 'light' : 'dark';
        applyColors(m === 'dark' ? darkColors : lightColors);
        setMode(m);
        setHasUserPreference(false);
      }
      setReady(true);
    });
  }, []);

  useEffect(() => {
    console.log('[ThemeContext] systemScheme changed:', systemScheme, 'hasUserPreference:', hasUserPreference, 'ready:', ready);
    if (!hasUserPreference && ready) {
      const nextMode = systemScheme === 'light' ? 'light' : 'dark';
      applyColors(nextMode === 'dark' ? darkColors : lightColors);
      setMode(nextMode);
    }
  }, [systemScheme, hasUserPreference, ready]);

  const toggleTheme = useCallback(() => {
    setMode(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyColors(next === 'dark' ? darkColors : lightColors);
      AsyncStorage.setItem(STORAGE_KEY, next);
      setHasUserPreference(true);
      return next;
    });
  }, []);

  const resetToSystemTheme = useCallback(() => {
    AsyncStorage.removeItem(STORAGE_KEY);
    setHasUserPreference(false);
    const nextMode = systemScheme === 'light' ? 'light' : 'dark';
    applyColors(nextMode === 'dark' ? darkColors : lightColors);
    setMode(nextMode);
  }, [systemScheme]);

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{mode, isDark: mode === 'dark', toggleTheme, resetToSystemTheme, themeKey: mode}}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeState {
  return useContext(ThemeContext);
}

export default ThemeContext;
