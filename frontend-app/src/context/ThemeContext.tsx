import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getThemeColors, type ThemeKey } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'app_theme_mode';

function getDefaultTheme(): ThemeKey {
  return 'dark';
}

interface ThemeCtx {
  mode: ThemeKey;
  setMode: (m: ThemeKey) => void;
  colors: ReturnType<typeof getThemeColors>;
}

export const ThemeContext = createContext<ThemeCtx>({
  mode: 'dark',
  setMode: () => {},
  colors: getThemeColors('dark'),
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, rawSetMode] = useState<ThemeKey>(getDefaultTheme());

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((v) => {
      if (v === 'light' || v === 'dark') rawSetMode(v);
    });
  }, []);

  const setMode = useCallback((m: ThemeKey) => {
    rawSetMode(m);
    AsyncStorage.setItem(THEME_KEY, m);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, setMode, colors: getThemeColors(mode) }}>
      {children}
    </ThemeContext.Provider>
  );
}
