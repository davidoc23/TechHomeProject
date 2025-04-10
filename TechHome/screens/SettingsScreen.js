import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import SettingsStyles from '../styles/SettingsScreenStyle';

export default function SettingsScreen() {
  const { user } = useAuth();

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

      <View style={SettingsStyles.versionContainer}>
        <Text style={SettingsStyles.versionText}>TechHome v1.0.0</Text>
      </View>
    </ScrollView>
  );
}