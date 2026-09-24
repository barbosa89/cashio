/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    canvas: '#F7F7F5',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceMuted: '#F0F0EE',
    surfaceSelected: '#FFF0E6',
    border: '#D7D8D4',
    primary: '#F97316',
    primaryPressed: '#EA580C',
    primaryContainer: '#FFF0E6',
    onPrimary: '#17120E',
    success: '#047857',
    danger: '#C2413A',
    warning: '#A16207',
    focus: '#C2410C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    canvas: '#0E0F11',
    surface: '#17181B',
    surfaceRaised: '#202226',
    surfaceMuted: '#282A2F',
    surfaceSelected: '#422413',
    border: '#3A3D43',
    primary: '#FB923C',
    primaryPressed: '#F97316',
    primaryContainer: '#422413',
    onPrimary: '#1A1009',
    success: '#34D399',
    danger: '#FB7185',
    warning: '#FBBF24',
    focus: '#FDBA74',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const AppPalette = {
  brandOrange: '#f97316',
  brandOrangeActive: '#ea580c',
  foregroundOnBrand: '#000000',
  foregroundInverse: '#ffffff',
  incomeGreen: '#10b981',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  control: 10,
  card: 16,
  pill: 999,
} as const;

export const ControlSize = {
  compact: 44,
  default: 48,
  large: 52,
} as const;

// Android screens already sit inside SafeAreaView, which applies the system
// navigation-bar inset. Adding another fixed inset here creates excess space.
export const BottomTabInset = Platform.select({ ios: 50, android: 0 }) ?? 0;
export const DROPDOWN_LIST_MODE = Platform.OS === 'android' ? 'MODAL' : 'SCROLLVIEW';
export const MaxContentWidth = 800;
export const MaxPhoneContentWidth = 430;
