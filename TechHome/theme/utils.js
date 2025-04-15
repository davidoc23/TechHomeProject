// Utility functions for theme
import { Platform } from 'react-native';

// Apply theme class to body element (web only)
export const applyThemeToBody = (isDarkMode) => {
  if (Platform.OS === 'web') {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }
};

// Helper function to generate dynamic styles based on theme for common components
export const applyThemeToComponents = (theme) => {
  return {
    // Common screen container
    screenContainer: {
      flex: 1,
      backgroundColor: theme.background,
      padding: 15,
    },
    
    // Card section
    cardSection: {
      backgroundColor: theme.cardBackground,
      borderRadius: 10,
      padding: 15,
      marginBottom: 20,
      ...theme.shadow,
    },
    
    // Text styles
    text: {
      color: theme.text,
    },
    textSecondary: {
      color: theme.textSecondary,
    },
    textTertiary: {
      color: theme.textTertiary,
    },
    
    // Form inputs
    input: {
      backgroundColor: theme.isDark ? theme.border : theme.background,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 10,
      marginBottom: 15,
      fontSize: 16,
    },
    
    // Picker styles for dropdowns
    pickerContainer: {
      borderColor: theme.border,
      backgroundColor: theme.isDark ? '#121212' : theme.background,
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 15,
      overflow: 'hidden',
    },
    
    // Buttons
    primaryButton: {
      backgroundColor: theme.primary,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      padding: 15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.primary,
      alignItems: 'center',
    },
    dangerButton: {
      backgroundColor: theme.danger,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButtonText: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    
    // List items
    listItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    
    // Navigation items
    navigationItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
  };
};
