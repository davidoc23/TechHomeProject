import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, Alert, StatusBar, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SettingsStyles from '../styles/SettingsScreenStyle';
import { applyThemeToComponents } from '../theme/utils';

export default function SettingsScreen() {
  const { user, logout, updateProfile } = useAuth();
  const { isDarkMode, toggleDarkMode, theme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationTracking, setLocationTracking] = useState(true);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [networkModalVisible, setNetworkModalVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Network configuration state
  const [wifiSSID, setWifiSSID] = useState('TechHome_Network');
  const [wifiPassword, setWifiPassword] = useState('');
  const [useStaticIP, setUseStaticIP] = useState(false);
  const [ipAddress, setIpAddress] = useState('192.168.1.100');
  
  // Security settings state
  const [enableTwoFactor, setEnableTwoFactor] = useState(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState(5);
  const [requirePinForSensitive, setRequirePinForSensitive] = useState(true);
  
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
    // Apply theme colors to modal styles from SettingsStyles
    modalContainer: {
      ...SettingsStyles.modalContainer,
    },
    modalContent: {
      ...SettingsStyles.modalContent,
      backgroundColor: theme.cardBackground,
    },
    modalTitle: {
      ...SettingsStyles.modalTitle,
      color: theme.text,
    },
    input: {
      ...SettingsStyles.input,
      borderColor: theme.border,
      color: theme.text,
      backgroundColor: theme.inputBackground || '#f9f9f9',
    },
    buttonContainer: {
      ...SettingsStyles.buttonContainer,
    },
    button: {
      ...SettingsStyles.button,
    },
    cancelButton: {
      ...SettingsStyles.cancelButton,
    },
    saveButton: {
      ...SettingsStyles.saveButton,
      backgroundColor: theme.primary,
    },
    buttonText: {
      ...SettingsStyles.buttonText,
    },
    cancelButtonText: {
      ...SettingsStyles.cancelButtonText,
      color: theme.text,
    },
    saveButtonText: {
      ...SettingsStyles.saveButtonText,
    },
    errorText: {
      ...SettingsStyles.errorText,
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
  
  const handleUpdateProfile = async () => {
    if (isSubmitting) return;
    
    // Reset any previous errors
    setFormError('');
    
    // Input validation
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setFormError('All fields are required');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim()
      });
      
      setProfileModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      setFormError(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle network configuration changes
  const handleSaveNetworkSettings = () => {
    // Validate settings
    if (useStaticIP) {
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(ipAddress)) {
        Alert.alert('Invalid IP', 'Please enter a valid IP address');
        return;
      }
    }

    // In a real app, we would send these settings to the backend
    // For now, we'll just show a success message
    Alert.alert(
      'Network Settings Updated',
      `Wi-Fi network ${wifiSSID} configured successfully${useStaticIP ? ` with static IP ${ipAddress}` : ''}.`,
      [{ text: 'OK', onPress: () => setNetworkModalVisible(false) }]
    );
  };

  // Handle security settings changes
  const handleSaveSecuritySettings = () => {
    // In a real app, we would send these settings to the backend
    // For now, we'll just show a success message
    Alert.alert(
      'Security Settings Updated',
      `Your security preferences have been saved.${enableTwoFactor ? ' Two-factor authentication enabled.' : ''}`,
      [{ text: 'OK', onPress: () => setSecurityModalVisible(false) }]
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
        <TouchableOpacity 
          style={screenStyles.editProfileButton}
          onPress={() => setProfileModalVisible(true)}
        >
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
        
        <TouchableOpacity 
          style={themeStyles.navigationItem}
          onPress={() => setNetworkModalVisible(true)}
        >
          <View style={SettingsStyles.settingInfo}>
            <Ionicons name="wifi-outline" size={24} color={theme.textSecondary} style={SettingsStyles.settingIcon} />
            <Text style={themeStyles.text}>Network Configuration</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={themeStyles.navigationItem}
          onPress={() => setSecurityModalVisible(true)}
        >
          <View style={SettingsStyles.settingInfo}>
            <Ionicons name="shield-checkmark-outline" size={24} color={theme.textSecondary} style={SettingsStyles.settingIcon} />
            <Text style={themeStyles.text}>Security Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={themeStyles.navigationItem}
          onPress={() => setAboutModalVisible(true)}
        >
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
      
      {/* Edit Profile Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={screenStyles.modalContainer}>
          <View style={screenStyles.modalContent}>
            <Text style={screenStyles.modalTitle}>Edit Profile</Text>
            
            {formError ? <Text style={screenStyles.errorText}>{formError}</Text> : null}
            
            <TextInput
              style={screenStyles.input}
              placeholder="First Name"
              placeholderTextColor={theme.textTertiary}
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                setFormError('');
              }}
            />
            
            <TextInput
              style={screenStyles.input}
              placeholder="Last Name"
              placeholderTextColor={theme.textTertiary}
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                setFormError('');
              }}
            />
            
            <TextInput
              style={screenStyles.input}
              placeholder="Email"
              placeholderTextColor={theme.textTertiary}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setFormError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <View style={screenStyles.buttonContainer}>
              <TouchableOpacity
                style={[screenStyles.button, screenStyles.cancelButton]}
                onPress={() => {
                  setProfileModalVisible(false);
                  // Reset form values to current user data
                  setFirstName(user?.firstName || '');
                  setLastName(user?.lastName || '');
                  setEmail(user?.email || '');
                  setFormError('');
                }}
              >
                <Text style={[screenStyles.buttonText, screenStyles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[screenStyles.button, screenStyles.saveButton, isSubmitting && { opacity: 0.7 }]}
                onPress={handleUpdateProfile}
                disabled={isSubmitting}
              >
                <Text style={[screenStyles.buttonText, screenStyles.saveButtonText]}>
                  {isSubmitting ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Network Configuration Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={networkModalVisible}
        onRequestClose={() => setNetworkModalVisible(false)}
      >
        <View style={screenStyles.modalContainer}>
          <View style={screenStyles.modalContent}>
            <Text style={screenStyles.modalTitle}>Network Configuration</Text>
            
            <Text style={[themeStyles.textSecondary, {marginBottom: 5}]}>Wi-Fi Network Name (SSID)</Text>
            <TextInput
              style={screenStyles.input}
              placeholder="Network Name"
              placeholderTextColor={theme.textTertiary}
              value={wifiSSID}
              onChangeText={setWifiSSID}
            />
            
            <Text style={[themeStyles.textSecondary, {marginBottom: 5}]}>Wi-Fi Password</Text>
            <TextInput
              style={screenStyles.input}
              placeholder="Password"
              placeholderTextColor={theme.textTertiary}
              value={wifiPassword}
              onChangeText={setWifiPassword}
              secureTextEntry
            />

            <View style={{flexDirection: 'row', alignItems: 'center', marginVertical: 10}}>
              <Text style={themeStyles.text}>Use Static IP</Text>
              <Switch
                value={useStaticIP}
                onValueChange={setUseStaticIP}
                trackColor={{ false: '#767577', true: theme.primary + '80' }}
                thumbColor={useStaticIP ? theme.primary : theme.border}
                style={{marginLeft: 'auto'}}
              />
            </View>
            
            {useStaticIP && (
              <>
                <Text style={[themeStyles.textSecondary, {marginBottom: 5}]}>IP Address</Text>
                <TextInput
                  style={screenStyles.input}
                  placeholder="192.168.1.100"
                  placeholderTextColor={theme.textTertiary}
                  value={ipAddress}
                  onChangeText={setIpAddress}
                  keyboardType="numeric"
                />
              </>
            )}
            
            <View style={screenStyles.buttonContainer}>
              <TouchableOpacity
                style={[screenStyles.button, screenStyles.cancelButton]}
                onPress={() => setNetworkModalVisible(false)}
              >
                <Text style={[screenStyles.buttonText, screenStyles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[screenStyles.button, screenStyles.saveButton]}
                onPress={handleSaveNetworkSettings}
              >
                <Text style={[screenStyles.buttonText, screenStyles.saveButtonText]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Security Settings Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={securityModalVisible}
        onRequestClose={() => setSecurityModalVisible(false)}
      >
        <View style={screenStyles.modalContainer}>
          <View style={screenStyles.modalContent}>
            <Text style={screenStyles.modalTitle}>Security Settings</Text>
            
            <View style={{flexDirection: 'row', alignItems: 'center', marginVertical: 10}}>
              <View>
                <Text style={themeStyles.text}>Two-Factor Authentication</Text>
                <Text style={[themeStyles.textTertiary, {fontSize: 12}]}>
                  Adds extra security to your account
                </Text>
              </View>
              <Switch
                value={enableTwoFactor}
                onValueChange={setEnableTwoFactor}
                trackColor={{ false: '#767577', true: theme.primary + '80' }}
                thumbColor={enableTwoFactor ? theme.primary : theme.border}
                style={{marginLeft: 'auto'}}
              />
            </View>
            
            <View style={{flexDirection: 'row', alignItems: 'center', marginVertical: 10}}>
              <View>
                <Text style={themeStyles.text}>Require PIN for Sensitive Actions</Text>
                <Text style={[themeStyles.textTertiary, {fontSize: 12}]}>
                  Verify identity before critical changes
                </Text>
              </View>
              <Switch
                value={requirePinForSensitive}
                onValueChange={setRequirePinForSensitive}
                trackColor={{ false: '#767577', true: theme.primary + '80' }}
                thumbColor={requirePinForSensitive ? theme.primary : theme.border}
                style={{marginLeft: 'auto'}}
              />
            </View>
            
            <Text style={[themeStyles.textSecondary, {marginBottom: 5, marginTop: 10}]}>Auto-Lock Timeout (minutes)</Text>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10}}>
              {[1, 5, 10, 15, 30].map(value => (
                <TouchableOpacity 
                  key={value}
                  style={{
                    padding: 10,
                    backgroundColor: autoLockTimeout === value ? theme.primary : theme.cardBackground,
                    borderRadius: 5,
                    borderWidth: 1,
                    borderColor: theme.border,
                    minWidth: 40,
                    alignItems: 'center'
                  }}
                  onPress={() => setAutoLockTimeout(value)}
                >
                  <Text style={{
                    color: autoLockTimeout === value ? 'white' : theme.text
                  }}>{value}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={screenStyles.buttonContainer}>
              <TouchableOpacity
                style={[screenStyles.button, screenStyles.cancelButton]}
                onPress={() => setSecurityModalVisible(false)}
              >
                <Text style={[screenStyles.buttonText, screenStyles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[screenStyles.button, screenStyles.saveButton]}
                onPress={handleSaveSecuritySettings}
              >
                <Text style={[screenStyles.buttonText, screenStyles.saveButtonText]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* About TechHome Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={aboutModalVisible}
        onRequestClose={() => setAboutModalVisible(false)}
      >
        <View style={screenStyles.modalContainer}>
          <View style={screenStyles.modalContent}>
            <Text style={screenStyles.modalTitle}>About TechHome</Text>
            
            <View style={{alignItems: 'center', marginVertical: 20}}>
              <Ionicons name="home" size={60} color={theme.primary} />
              <Text style={[themeStyles.text, {fontSize: 24, fontWeight: 'bold', marginTop: 10}]}>TechHome</Text>
              <Text style={themeStyles.textSecondary}>Version 1.0.0</Text>
            </View>
            
            <Text style={[themeStyles.text, {fontWeight: '600', marginTop: 10}]}>Description</Text>
            <Text style={[themeStyles.textSecondary, {marginVertical: 5}]}>
              TechHome is a smart home management system that connects your devices,
              automates your routines, and makes your home more efficient and comfortable.
            </Text>
            
            <Text style={[themeStyles.text, {fontWeight: '600', marginTop: 10}]}>Developers</Text>
            <Text style={[themeStyles.textSecondary, {marginVertical: 5}]}>
              Created by the TechHome Team as part of the Advanced Software Development Project.
            </Text>
            
            <Text style={[themeStyles.text, {fontWeight: '600', marginTop: 10}]}>Contact</Text>
            <Text style={[themeStyles.textSecondary, {marginVertical: 5}]}>
              support@techhome.example.com
            </Text>
            
            <TouchableOpacity
              style={[screenStyles.button, screenStyles.saveButton, {marginTop: 20}]}
              onPress={() => setAboutModalVisible(false)}
            >
              <Text style={[screenStyles.buttonText, screenStyles.saveButtonText]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

