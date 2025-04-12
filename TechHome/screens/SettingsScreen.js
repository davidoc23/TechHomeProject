import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import SettingsStyles from '../styles/SettingsScreenStyle';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationTracking, setLocationTracking] = useState(true);

  const handleLogout = async () => {
    console.log("handleLogout called in SettingsScreen"); // Debug log
    
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
            console.log("Log Out button pressed"); // Debug log
            try {
              await logout();
              console.log("Logout completed"); // Debug log
            } catch (error) {
              console.error("Error during logout:", error);
              alert("There was an error logging out. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={SettingsStyles.container}>
      {/* User Profile Section */}
      <View style={SettingsStyles.profileSection}>
        <View style={SettingsStyles.profileIconContainer}>
          <Ionicons name="person" size={40} color="#fff" />
        </View>
        <View style={SettingsStyles.profileInfo}>
          <Text style={SettingsStyles.profileName}>{user?.firstName} {user?.lastName}</Text>
          <Text style={SettingsStyles.profileEmail}>{user?.email}</Text>
          <Text style={SettingsStyles.profileUsername}>@{user?.username}</Text>
        </View>
        <TouchableOpacity style={SettingsStyles.editProfileButton}>
          <Text style={SettingsStyles.editProfileButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Settings Sections */}
      <View style={SettingsStyles.section}>
        <Text style={SettingsStyles.sectionTitle}>App Settings</Text>
        
        <View style={SettingsStyles.settingItem}>
          <View style={SettingsStyles.settingInfo}>
            <Ionicons name="notifications-outline" size={24} color="#555" style={SettingsStyles.settingIcon} />
            <Text style={SettingsStyles.settingText}>Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={notificationsEnabled ? '#007AFF' : '#f4f3f4'}
          />
        </View>
        
        <View style={SettingsStyles.settingItem}>
          <View style={SettingsStyles.settingInfo}>
            <Ionicons name="moon-outline" size={24} color="#555" style={SettingsStyles.settingIcon} />
            <Text style={SettingsStyles.settingText}>Dark Mode</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={darkMode ? '#007AFF' : '#f4f3f4'}
          />
        </View>
        
        <View style={SettingsStyles.settingItem}>
          <View style={SettingsStyles.settingInfo}>
            <Ionicons name="location-outline" size={24} color="#555" style={SettingsStyles.settingIcon} />
            <Text style={SettingsStyles.settingText}>Location Services</Text>
          </View>
          <Switch
            value={locationTracking}
            onValueChange={setLocationTracking}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={locationTracking ? '#007AFF' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={SettingsStyles.section}>
        <Text style={SettingsStyles.sectionTitle}>System Settings</Text>
        
        <TouchableOpacity style={SettingsStyles.navigationItem}>
          <View style={SettingsStyles.settingInfo}>
            <Ionicons name="wifi-outline" size={24} color="#555" style={SettingsStyles.settingIcon} />
            <Text style={SettingsStyles.settingText}>Network Configuration</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={SettingsStyles.navigationItem}>
          <View style={SettingsStyles.settingInfo}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#555" style={SettingsStyles.settingIcon} />
            <Text style={SettingsStyles.settingText}>Security Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={SettingsStyles.navigationItem}>
          <View style={SettingsStyles.settingInfo}>
            <Ionicons name="information-circle-outline" size={24} color="#555" style={SettingsStyles.settingIcon} />
            <Text style={SettingsStyles.settingText}>About TechHome</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <View style={SettingsStyles.section}>
        <TouchableOpacity 
          style={SettingsStyles.logoutButton} 
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" style={SettingsStyles.logoutIcon} />
          <Text style={SettingsStyles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={SettingsStyles.versionContainer}>
        <Text style={SettingsStyles.versionText}>TechHome v1.0.0</Text>
      </View>
    </ScrollView>
  );
}