// Typography styles for the app

export const typography = {
    fontSizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 22,
      xxxl: 28,
    },
    fontWeights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    fontFamily: {
      base: 'System',
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      loose: 1.75,
    },
  };
  
  export const getFontStyles = (isDark = false) => ({
    title: {
      fontSize: typography.fontSizes.xxl,
      fontWeight: typography.fontWeights.bold,
      color: isDark ? '#FFFFFF' : '#333333',
    },
    subtitle: {
      fontSize: typography.fontSizes.lg,
      fontWeight: typography.fontWeights.semibold,
      color: isDark ? '#DDDDDD' : '#666666',
    },
    body: {
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.regular,
      color: isDark ? '#FFFFFF' : '#333333',
    },
    caption: {
      fontSize: typography.fontSizes.sm,
      fontWeight: typography.fontWeights.regular,
      color: isDark ? '#AAAAAA' : '#999999',
    },
    button: {
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.semibold,
      color: '#FFFFFF',
    },
  });
  