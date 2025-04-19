import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDevices } from '../hooks/useDevices';
import { homeStyles } from '../styles/homeStyles'; 
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useDeviceContext, DEVICE_EVENTS } from '../context/DeviceContext';
import { useTheme } from '../context/ThemeContext';
import { LeonVoiceAssistant } from '../components/ui/LeonVoiceAssistant';
import { AIDeviceSuggestions } from '../components/ui/AIDeviceSuggestions';

export default function HomeScreen() {
  const { devices, activities, error, isLoading, fetchDevices, toggleDevice, toggleAllLights } = useDevices();
  const { subscribeToDeviceEvents } = useDeviceContext();
  const { theme, isDarkMode } = useTheme();
  
  // Add state for voice modal visibility
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  // Track local state for active device count to ensure UI consistency
  const [activeDeviceCount, setActiveDeviceCount] = useState(0);
  const [totalDeviceCount, setTotalDeviceCount] = useState(0);
  
  // Keep device counts updated
  useEffect(() => {
    const active = devices.filter(d => d.isOn).length;
    setActiveDeviceCount(active);
    setTotalDeviceCount(devices.length);
  }, [devices]);
  
  // Listen for device events to update counts immediately
  useEffect(() => {
    // When a device is toggled
    const unsubscribeToggle = subscribeToDeviceEvents(DEVICE_EVENTS.DEVICE_TOGGLED, (updatedDevice) => {
      setActiveDeviceCount(prev => updatedDevice.isOn ? prev + 1 : prev - 1);
    });
    
    // When all devices are updated
    const unsubscribeUpdate = subscribeToDeviceEvents(DEVICE_EVENTS.DEVICES_UPDATED, (allDevices) => {
      const active = allDevices.filter(d => d.isOn).length;
      setActiveDeviceCount(active);
      setTotalDeviceCount(allDevices.length);
    });
    
    return () => {
      unsubscribeToggle();
      unsubscribeUpdate();
    };
  }, [subscribeToDeviceEvents]);


  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} retry={fetchDevices} />;
  
  // Use our tracked device counts instead of recalculating them each render

  const handleAllLights = () => {
    const lightDevices = devices.filter(device => device.type === 'light');
    const anyLightOn = lightDevices.some(light => light.isOn);
    toggleAllLights(!anyLightOn);  // If any light is on, turn all off. Otherwise, turn all on
};


  const handleThermostat = () => {
    const thermostat = devices.find(device => device.type === 'thermostat');
    if (thermostat) {
      toggleDevice(thermostat.id);
    }
  };

  const handleVoiceControl = () => {
    console.log("Voice control button pressed"); // For debugging
    setVoiceModalVisible(true);
  };

  // Import theme utilities
  const { applyThemeToComponents } = require('../theme/utils');
  
  // Get common theme styles
  const themeStyles = applyThemeToComponents(theme);
  
  // Screen-specific styles
  const screenStyles = {
    welcomeSection: {
      ...homeStyles.welcomeSection,
      backgroundColor: theme.cardBackground,
      ...theme.shadow,
    },
    actionButton: {
      ...homeStyles.actionButton,
      backgroundColor: theme.cardBackground,
      borderColor: theme.border,
      borderWidth: 1,
    },
    voiceButton: {
      ...homeStyles.voiceButton,
      backgroundColor: theme.primary,
    },
    activityItem: {
      ...homeStyles.activityItem, 
      borderBottomColor: theme.border,
    }
  };

  return (
    <ScrollView style={themeStyles.screenContainer}>
      <StatusBar barStyle={theme.statusBar} />
      {/* Welcome Section */}
      <View style={screenStyles.welcomeSection}>
        <Text style={[homeStyles.welcomeText, themeStyles.text]}>Welcome Home</Text>
        <Text style={[homeStyles.statsText, themeStyles.textSecondary]}>
          {activeDeviceCount} of {totalDeviceCount} devices active
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={themeStyles.cardSection}>
        <Text style={[homeStyles.sectionTitle, themeStyles.text]}>Quick Actions</Text>
        <View style={homeStyles.quickActions}>

          <TouchableOpacity 
            style={screenStyles.actionButton}
            onPress={handleAllLights}
          >
            <Ionicons name="bulb" size={24} color={theme.primary} />
            <Text style={themeStyles.text}>All Lights</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={screenStyles.actionButton}
            onPress={handleThermostat}
          >
            <Ionicons name="thermometer" size={24} color={theme.primary} />
            <Text style={themeStyles.text}>
              Thermostat ({devices.find(d => d.type === 'thermostat')?.temperature}°F)
            </Text>
          </TouchableOpacity>
          
        </View>
      </View>

      {/* Recent Activity section */}
    <View style={themeStyles.cardSection}>
        <Text style={[homeStyles.sectionTitle, themeStyles.text]}>Recent Activity</Text>
        <View style={homeStyles.activityList}>
            {activities && activities.length > 0 ? (
                activities.map((activity) => (
                    <View key={activity.id} style={screenStyles.activityItem}>
                        <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
                        <Text style={themeStyles.textSecondary}>
                            {activity.deviceName} {activity.action}
                        </Text>
                    </View>
                ))
            ) : (
                <Text style={themeStyles.textSecondary}>No recent activity</Text>
            )}
        </View>
    </View>

       {/* Voice Control */}
       <TouchableOpacity 
         style={screenStyles.voiceButton}
         onPress={handleVoiceControl}
       >
        <Ionicons name="mic" size={24} color="white" />
        <Text style={homeStyles.voiceButtonText}>Voice Control</Text>
      </TouchableOpacity>

      
      <LeonVoiceAssistant 
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
      />

      {/* AI Smart Suggestions */}
      <AIDeviceSuggestions />

    </ScrollView>
  );
}