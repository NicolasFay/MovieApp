import '@/global.css';

import { useMemo } from 'react';
import { Platform, StyleSheet, useColorScheme } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    border: '#C9CCD3', // input outlines and dividers
    placeholder: '#8A8F98', // placeholder text inside inputs
    base_purple: '#dfcdfa', // light purple
    active_purple: '#6D28D9', // deeper purple for the selected tab
    inactive_purple: '#8B7BA8', // muted purple for the others
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    border: '#3A3D42',
    placeholder: '#7C8087',
    base_purple: '#ba8bff', // light purple
    active_purple: '#6D28D9', // deeper purple for the selected tab
    inactive_purple: '#8B7BA8', // muted purple for the others
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export type AppColors = typeof Colors.light | typeof Colors.dark;

// builds the shared screen styles from whichever palette is active
function createAppStyles(c: AppColors) {
  return StyleSheet.create({
    container: {
      marginTop: 40,
      padding: 12,
    },
    verticallySpaced: {
      paddingTop: 4,
      paddingBottom: 4,
      alignSelf: 'stretch',
    },
    mt20: {
      marginTop: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textSecondary,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 4,
      padding: 12,
      fontSize: 16,
      color: c.text,
      backgroundColor: c.backgroundElement,
    },
    inputDisabled: {
      backgroundColor: c.background,
      borderColor: c.border,
      color: c.textSecondary,
    },
    button: {
      backgroundColor: c.active_purple,
      borderRadius: 4,
      padding: 12,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    avatarContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },
    avatar: {
      borderRadius: 5,
      overflow: 'hidden',
      maxWidth: '100%',
      marginBottom: 20,
    },
    image: {
      objectFit: 'cover',
      paddingTop: 0,
    },
    noImage: {
      backgroundColor: c.backgroundSelected,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: c.border,
      borderRadius: 5,
    },
  });
}

// Use inside a component:  const { styles, colors } = useAppStyles();
// Re-renders automatically when the phone switches between light and dark.
export function useAppStyles() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  return useMemo(
    () => ({ styles: createAppStyles(Colors[scheme]), colors: Colors[scheme] }),
    [scheme]
  );
}