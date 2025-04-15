import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, Alert, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SettingsStyles from '../styles/SettingsScreenStyle';
import { applyThemeToComponents } from '../theme/utils';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode, theme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationTracking, setLocationTracking] = useState(true);
  
  // Get common theme styles
  const themeStyles = applyThemeToComponents(theme);
  
  // Create screen-specific styles
  const screenStyles = {
    profileSection: {
      ...SettingsStyles.profileSection,
      backgroundColor: theme.cardBackground,
      ...theme.shadow,
    },
    profileIconContainer: {
      ...SettingsStyles.profileIconContainer,
      backgroundColor: theme.primary,
    },
    editProfileButton: {
      ...SettingsStyles.editProfileButton,
      backgroundColor: theme.border,
    },
    editProfileButtonText: {
      ...SettingsStyles.editProfileButtonText,
      color: theme.primary,
    },
    logoutButton: {
      ...SettingsStyles.logoutButton, 
      backgroundColor: '#FF0000',
      shadowColor: '#FF0000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    logoutText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 18,
    },
  };

  const handleLogout = async () => {
    console.log("handleLogout called in SettingsScreen");
    
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            console.log("Log Out button pressed");
            try {
              await logout();
              console.log("Logout completed");
            } catch (error) {
              console.error("Error during logout:", error);
              Alert.alert("Logout Error", "There was an error logging out. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={themeStyles.screenContainer}>
      <StatusBar barStyle={theme.statusBar} />
      {/* User Profile Section */}
      <View style={screenStyles.profileSection}>
        <View style={screenStyles.profileIconContainer}>
          <Ionicons name="person" size={40} color="white" />
        </View>
        <View style={SettingsStyles.profileInfo}>
          <Text style={[SettingsStyles.profileName, themeStyles.text]}>{user?.firstName} {user?.lastName}</Text>
          <Text style={[SettingsStyles.profileEmail, themeStyles.textSecondary]}>{user?.email}</Text>
          <Text style={[SettingsStyles.profileUsername, themeStyles.textTertiary]}>@{user?.username}</Text>
        </View>
        <TouchableOpacity style={screenStyles.editProfileButton}>
          <Text style={screenStyles.editProfileButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Settings Sections */}
      <View style={themeStyles.cardSection}>
        <Text style={[SettingsStyles.sectionTitle, themeStyles.text]}>App Settings</Text>
        
        <View style={themeStyles.listItem}>
          <View style={SettingsStyles.settingInfo}>
            <Ionicons 
              name="notifications-outline" 
              size={24} 
              color={theme.textSecondary}
              style={SettingsStyles.settingIcon} 
            />
            <Text style={themeStyles.text}>Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#767577', true: theme.primary + '80' }}
            thumbColor={notificationsEnabled ? theme.primary : theme.border}
          />
        </View>
        
        <View style={themeStyles.listItem}>
          <View style={SettingsStyles.settingInfo}>
            <Ionicons 
              name={isDarkMode ? "moon" : "moon-outline"} 
              size={24} 
              color={isDarkMode ? theme.primary : theme.textSecondary}
              style={SettingsStyles.settingIcon} 
            />
            <Text style={themeStyles.text}>Dark Mode</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#767577', true: theme.primary + '80' }}
            thumbColor={isDarkMode ? theme.primary : theme.border}
          />
        </View>
        
        <View style={themeStyles.listItem}>
          <View style={SettingsStyles.settingInfo}>
            <Ionicons 
              name="location-outline" 
              size={24} 
              color={theme.textSecondary}
              style={SettingsStyles.settingIcon} 
            />
            <Text style={themeStyles.text}>Location Services</Text>
          </View>
          <Switch
            value={locationTracking}
            onValueChange={setLocationTracking}
            trackColor={{ false: '#767577', true: theme.primary + '80' }}
            thumbColor={locationTracking ? theme.primary : theme.border}
          />
        </View>
      </View>

      <View style={themeStyles.cardSection}>
        <Text style={[SettingsStyles.sectionTitle, themeStyles.text]}>System Settings</Text>
        
        <TouchableOpacity style={themeStyles.navigationItem}>
          <View style={SettingsStyles.settingInfo}>
            <Ionicons name="wifi-outline" size={24} color={theme.textSecondary} style={SettingsStyles.settingIcon} />
            <Text style={themeStyles.text}>Network Configuration</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={themeStyles.navigationItem}>
          <View style={SettingsStyles.settingInfo}>
            <Ionicons name="shield-checkmark-outline" size={24} color={theme.textSecondary} style={SettingsStyles.settingIcon} />
            <Text style={themeStyles.text}>Security Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={themeStyles.navigationItem}>
          <View style={SettingsStyles.settingInfo}>
            <Ionicons name="information-circle-outline" size={24} color={theme.textSecondary} style={SettingsStyles.settingIcon} />
            <Text style={themeStyles.text}>About TechHome</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={themeStyles.cardSection}>
        {/* Direct logout button */}
        <TouchableOpacity 
          style={screenStyles.logoutButton}
          onPress={() => {
            console.log("Direct logout button pressed");
            logout().then(() => {
              console.log("Logout completed directly");
            }).catch(err => {
              console.error("Direct logout error:", err);
            });
          }}
          activeOpacity={0.6}
        >
          <Ionicons name="log-out-outline" size={24} color="white" style={SettingsStyles.logoutIcon} />
          <Text style={screenStyles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={SettingsStyles.versionContainer}>
        <Text style={themeStyles.textTertiary}>TechHome v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

