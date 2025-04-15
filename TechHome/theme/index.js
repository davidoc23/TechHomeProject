// Main theme export file
import { Platform } from 'react-native';
import { lightColors, darkColors } from './colors';
import { spacing, layout } from './spacing';
import { typography, getFontStyles } from './typography';
import { shadows } from './shadows';

// Add custom CSS for web platform to fix Picker in dark mode
if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `
    .dark-mode select {
      background-color: #121212 !important;
      color: white !important;
    }
    .dark-mode option {
      background-color: #121212 !important;
      color: white !important;
    }
  `;
  document.head.appendChild(style);
}

// Create theme objects with all needed properties
export const lightTheme = {
  ...lightColors,
  spacing,
  layout,
  typography,
  fontStyles: getFontStyles(false),
  shadow: shadows.light.medium,
  statusBar: 'dark-content',
  isDark: false,
};

export const darkTheme = {
  ...darkColors,
  spacing,
  layout,
  typography,
  fontStyles: getFontStyles(true),
  shadow: shadows.dark.medium,
  statusBar: 'light-content',
  isDark: true,
};

// Helper functions for styling components
export const getThemeStyles = (theme) => ({
  container: {
    backgroundColor: theme.background,
    flex: 1,
    padding: layout.padding.screen,
  },
  card: {
    backgroundColor: theme.cardBackground,
    borderRadius: layout.borderRadius.card,
    padding: layout.padding.card,
    marginBottom: layout.margin.section,
    ...theme.shadow,
  },
  section: {
    marginBottom: layout.margin.section,
  },
  input: {
    backgroundColor: theme.isDark ? theme.border : theme.background,
    color: theme.text,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: layout.borderRadius.medium,
    padding: spacing.md,
    fontSize: typography.fontSizes.md,
    marginBottom: spacing.md,
  },
  button: {
    primary: {
      backgroundColor: theme.primary,
      padding: spacing.md,
      borderRadius: layout.borderRadius.medium,
      alignItems: 'center',
    },
    secondary: {
      backgroundColor: 'transparent',
      borderColor: theme.primary,
      borderWidth: 1,
      padding: spacing.md,
      borderRadius: layout.borderRadius.medium,
      alignItems: 'center',
    },
    danger: {
      backgroundColor: theme.danger,
      padding: spacing.md,
      borderRadius: layout.borderRadius.medium,
      alignItems: 'center',
    },
  },
  text: {
    primary: {
      color: theme.text,
    },
    secondary: {
      color: theme.textSecondary,
    },
    tertiary: {
      color: theme.textTertiary,
    },
  },
  pickerContainer: {
    borderColor: theme.border,
    backgroundColor: theme.isDark ? '#121212' : theme.background,
    borderWidth: 1,
    borderRadius: layout.borderRadius.medium,
    marginBottom: spacing.md,
    overflow: 'hidden'
  },
});

// Export additional helpers
export { applyThemeToComponents } from './utils';
