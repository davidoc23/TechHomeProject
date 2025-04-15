// src/screens/DevicesScreen.js
import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { DeviceCard } from '../components/devices/DeviceCard';
import { deviceStyles } from '../styles/deviceStyles';
import { useDevices } from '../hooks/useDevices';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useTheme } from '../context/ThemeContext';

export default function DevicesScreen() {
  const { devices, rooms, error, isLoading, fetchDevices, toggleDevice, setTemperature, toggleAllLights } = useDevices();
  const { theme, isDarkMode } = useTheme();
  
  // Import theme utilities
  const { applyThemeToComponents } = require('../theme/utils');
  
  // Get common theme styles
  const themeStyles = applyThemeToComponents(theme);
  
  // Screen-specific styles
  const screenStyles = {
    header: {
      ...deviceStyles.header,
      backgroundColor: theme.cardBackground,
      ...theme.shadow,
    },
    roomSection: {
      ...deviceStyles.roomSection,
      backgroundColor: theme.cardBackground,
      ...theme.shadow,
    },
    toggleAllButton: {
      ...deviceStyles.toggleAllButton, 
      backgroundColor: theme.primary + '20',
    },
    toggleAllText: {
      ...deviceStyles.toggleAllText,
      color: theme.primary,
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} retry={fetchDevices} />;

  // Dynamically check the number of active devices
  const activeDevices = devices.filter(d => d.isOn).length;
  const lightDevices = devices.filter(d => d.type === 'light');
  const anyLightOn = lightDevices.some(d => d.isOn);

  // Group devices by room
  const devicesByRoom = rooms.map(room => ({
    ...room,
    devices: devices.filter(device => device.roomId === room.id),
  }));

  // Toggle all lights ON/OFF based on their current state
  const handleToggleAllLights = () => {
    // DEBUG - console.log(`🟢 Toggling all lights to ${anyLightOn ? "OFF" : "ON"}`);
    toggleAllLights(!anyLightOn);
  };

  return (
    <ScrollView style={themeStyles.screenContainer}>
      <StatusBar barStyle={theme.statusBar} />
      <View style={screenStyles.header}>
        <Text style={[deviceStyles.title, themeStyles.text]}>My Devices</Text>
        <Text style={[deviceStyles.subtitle, themeStyles.textSecondary]}>
          {activeDevices} devices turned on
        </Text>
        
        {lightDevices.length > 0 && (
          <TouchableOpacity 
            style={screenStyles.toggleAllButton}
            onPress={handleToggleAllLights}
          >
            <Text style={screenStyles.toggleAllText}>
              {anyLightOn ? 'Turn Off All Lights' : 'Turn On All Lights'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {devicesByRoom.map(room => (
        <View key={room.id} style={screenStyles.roomSection}>
          <Text style={[deviceStyles.roomTitle, themeStyles.text]}>{room.name}</Text>
          {room.devices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              onToggle={toggleDevice}
              onTemperatureChange={setTemperature}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
