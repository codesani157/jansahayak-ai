import { Dimensions, Platform } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export const theme = {
  colors: {
    // Primary Brand Colors — richer emerald palette
    primary: '#059669',
    primaryDark: '#047857',
    primaryDarker: '#065f46',
    primaryLight: '#d1fae5',
    primaryLighter: '#ecfdf5',

    // Accent (saffron highlight)
    accent: '#f59e0b',
    accentLight: '#fef3c7',

    // Backgrounds
    background: '#f0fdf4',
    backgroundAlt: '#f8fafc',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',

    // Bubbles
    sysBubble: '#ffffff',
    userBubble: '#059669',

    // Text
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    textInverse: '#ffffff',
    textAccent: '#059669',

    // States & Feedback
    error: '#ef4444',
    errorLight: '#fee2e2',
    success: '#22c55e',
    successLight: '#dcfce7',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    overlay: 'rgba(0, 0, 0, 0.5)',

    // Alpha variants for dark backgrounds
    whiteAlpha15: 'rgba(255,255,255,0.15)',
    whiteAlpha70: 'rgba(255,255,255,0.7)',

    // Status indicators
    statusOnline: '#34d399',
  },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  radii: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    full: 9999,
  },
  typography: {
    sizes: {
      xxs: 10,
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 22,
      xxl: 28,
      xxxl: 36,
      hero: 44,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      heavy: '800' as const,
    },
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      wide: 0.5,
      wider: 1,
    },
    lineHeights: {
      sm: 20,
      md: 22,
      lg: 24,
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    float: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
    glow: {
      shadowColor: '#059669',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
  },
  layout: {
    maxContentWidth: 520,
    maxScreenWidth: 640,
    isWeb: Platform.OS === 'web',
    screenWidth,
  },
  sizes: {
    avatar: 32,
    iconButton: 44,
    actionButton: 48,
    iconBadge: 36,
    iconLg: 64,
    checkBadge: 24,
  },
};

export type ThemeType = typeof theme;
