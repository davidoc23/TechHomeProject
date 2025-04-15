import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../theme';
import { applyThemeToBody } from '../theme/utils';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Get system color scheme
  const colorScheme = useColorScheme();
  
  // Theme state: 'light', 'dark', or 'system'
  const [themePreference, setThemePreference] = useState('system');
  
  // The actual theme object to use
  const [theme, setTheme] = useState(colorScheme === 'dark' ? darkTheme : lightTheme);
  
  // Indicates if dark mode is currently active
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');
  
  // Apply dark-mode class for web platform
  useEffect(() => {
    applyThemeToBody(isDarkMode);
  }, [isDarkMode]);
  
  // Load theme preference from storage on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem('themePreference');
        if (savedPreference) {
          setThemePreference(savedPreference);
          
          // Apply the correct theme based on the preference
          if (savedPreference === 'light') {
            setTheme(lightTheme);
            setIsDarkMode(false);
          } else if (savedPreference === 'dark') {
            setTheme(darkTheme);
            setIsDarkMode(true);
          } else {
            // 'system' preference
            setTheme(colorScheme === 'dark' ? darkTheme : lightTheme);
            setIsDarkMode(colorScheme === 'dark');
          }
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };
    
    loadThemePreference();
  }, [colorScheme]);
  
  // Toggle dark mode
  const toggleDarkMode = async () => {
    try {
      const newDarkModeValue = !isDarkMode;
      setIsDarkMode(newDarkModeValue);
      
      // Set theme to dark or light based on the toggle
      const newTheme = newDarkModeValue ? darkTheme : lightTheme;
      setTheme(newTheme);
      
      // Save as explicit preference
      const newPreference = newDarkModeValue ? 'dark' : 'light';
      setThemePreference(newPreference);
      await AsyncStorage.setItem('themePreference', newPreference);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };
  
  // Set a specific theme mode
  const setThemeMode = async (mode) => {
    try {
      if (mode === 'system') {
        setThemePreference('system');
        setTheme(colorScheme === 'dark' ? darkTheme : lightTheme);
        setIsDarkMode(colorScheme === 'dark');
      } else if (mode === 'dark') {
        setThemePreference('dark');
        setTheme(darkTheme);
        setIsDarkMode(true);
      } else {
        setThemePreference('light');
        setTheme(lightTheme);
        setIsDarkMode(false);
      }
      
      await AsyncStorage.setItem('themePreference', mode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };
  
  const themeContext = {
    theme,
    isDarkMode,
    toggleDarkMode,
    themePreference,
    setThemeMode,
  };
  
  return (
    <ThemeContext.Provider value={themeContext}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);