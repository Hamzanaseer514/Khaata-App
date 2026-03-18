const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000';

const LIGHT_COLORS = {
  background: '#f8f9fa',
  surface: '#ffffff',
  surfaceLight: 'rgba(0, 0, 0, 0.05)',
  primary: '#0ea5e9', // Sky Blue
  secondary: '#8b5cf6', // Violet
  text: '#0f172a',
  textMuted: '#64748b',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',
};

const DARK_COLORS = {
  background: '#0a0a0c',
  surface: '#16161a',
  surfaceLight: 'rgba(255, 255, 255, 0.05)',
  primary: '#25d1f4', // Neon Cyan
  secondary: '#a855f7', // Neon Purple
  text: '#ffffff',
  textMuted: '#94a3b8',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f39c12',
  info: '#20B2AA',
};

export default {
  BASE_URL,
  LIGHT_COLORS,
  DARK_COLORS,
};
