export const DARK_COLORS = {
  primary: '#1a1a2e',
  secondary: '#16213e',
  accent: '#e94560',
  background: '#0f0f1a',
  surface: '#1a1a2e',
  card: '#16213e',
  text: '#e0e0e0',
  textDim: '#8888a0',
  textMuted: '#555570',
  highlight: '#ffd700',
  success: '#4ade80',
  warning: '#f59e0b',
  error: '#ef4444',
  border: '#2a2a40',
  white: '#ffffff',
  black: '#000000',
};

export const LIGHT_COLORS = {
  primary: '#ffffff',
  secondary: '#f0f0f5',
  accent: '#e94560',
  background: '#f2f2f7',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#1c1c1e',
  textDim: '#636366',
  textMuted: '#aeaeb2',
  highlight: '#ffd700',
  success: '#34c759',
  warning: '#f59e0b',
  error: '#ff3b30',
  border: '#d1d1d6',
  white: '#ffffff',
  black: '#000000',
};

export type ThemeKey = 'dark' | 'light';
export function getThemeColors(mode: ThemeKey) {
  return mode === 'light' ? LIGHT_COLORS : DARK_COLORS;
}

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};
