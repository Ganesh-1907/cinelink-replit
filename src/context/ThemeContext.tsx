import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {darkColors, lightColors, applyColors} from '../theme';

type ThemeMode = 'dark' | 'light';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  themeKey: string;
}

const STORAGE_KEY = '@cinelink_theme_mode';

const ThemeContext = createContext<ThemeState>({
  mode: 'dark',
  isDark: true,
  toggleTheme: () => {},
  themeKey: 'dark',
});

export function ThemeProvider({children}: {children: ReactNode}) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      const m = (saved === 'light' || saved === 'dark') ? saved as ThemeMode : 'dark';
      applyColors(m === 'dark' ? darkColors : lightColors);
      setMode(m);
      setReady(true);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyColors(next === 'dark' ? darkColors : lightColors);
      AsyncStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  // Key changes on every toggle to force full tree remount
  // This makes all StyleSheet.create() calls re-run with new Colors
  const [themeKey, setThemeKey] = useState('dark');
  useEffect(() => {
    setThemeKey(`${mode}_${Date.now()}`);
  }, [mode]);

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{mode, isDark: mode === 'dark', toggleTheme, themeKey}} key={themeKey}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeState {
  return useContext(ThemeContext);
}

export default ThemeContext;
