import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StatusBar } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useDevices } from '../hooks/useDevices';
import { useHomeAssistantDevices } from '../hooks/useHomeAssistantDevices';
import { useTheme } from '../context/ThemeContext';
import { deviceManagementStyles } from '../styles/deviceManagementStyles';
import { applyThemeToComponents } from '../theme/utils';

export default function DeviceManagementScreen() {
  const { devices, rooms, error, isLoading, addDevice, removeDevice } = useDevices();
  const { haDevices, isLoading: haLoading, error: haError, fetchDevices: fetchHaDevices } = useHomeAssistantDevices();
  const { theme, isDarkMode } = useTheme();
  
  // Get theme styles
  const themeStyles = applyThemeToComponents(theme);
  
  // Screen-specific styles
  const screenStyles = {
    deviceItem: {
      ...deviceManagementStyles.deviceItem,
      borderColor: theme.border,
    },
    deviceInfo: {
      ...deviceManagementStyles.deviceInfo,
    },
    deviceDetails: {
      ...deviceManagementStyles.deviceDetails,
      color: theme.textSecondary,
    },
    removeButton: {
      ...deviceManagementStyles.removeButton,
      backgroundColor: theme.danger + '20',
    },
    removeButtonText: {
      color: theme.danger,
    },
    modalContent: {
      ...deviceManagementStyles.modalContent,
      backgroundColor: theme.cardBackground,
    },
  };
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('light');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHaDevice, setSelectedHaDevice] = useState(null);
  const [showHaDevices, setShowHaDevices] = useState(false);

  if (isLoading || haLoading) return <LoadingSpinner />;
  if (error || haError) return <ErrorMessage message={error || haError} />;

  const handleAddDevice = async () => {
    if (deviceName.trim() && selectedRoomId) {
      const newDevice = {
        name: deviceName,
        type: deviceType,
        roomId: selectedRoomId,
        isHomeAssistant: !!selectedHaDevice,  // Ensure boolean
        entityId: selectedHaDevice ? selectedHaDevice.entity_id : null,
        attributes: selectedHaDevice ? selectedHaDevice.attributes : {}
      };
  
      await addDevice(newDevice);
      setDeviceName('');
      setDeviceType('light');
      setSelectedRoomId('');
      setSelectedHaDevice(null);
    }
  };
  
  

  const handleSelectHaDevice = (device) => {
    setSelectedHaDevice(device);
    setDeviceName(device.attributes.friendly_name);
    setDeviceType(device.entity_id.split('.')[0]);
  };

  const toggleDevice = async (entityId) => {
    // Implement the logic to toggle the device state using Home Assistant API
  };

  const filteredDevices = haDevices.filter(device =>
    device.attributes.friendly_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleShowHaDevices = () => {
    setShowHaDevices(!showHaDevices);
    if (!showHaDevices) {
      fetchHaDevices();
    }
  };

  return (
    <ScrollView style={themeStyles.screenContainer}>
      <StatusBar barStyle={theme.statusBar} />
      <View style={themeStyles.cardSection}>
        <Text style={[deviceManagementStyles.title, themeStyles.text]}>Add New Device</Text>
        
        <TextInput
          style={themeStyles.input}
          value={deviceName}
          onChangeText={setDeviceName}
          placeholder="Device Name"
          placeholderTextColor={theme.textTertiary}
        />

        <View style={themeStyles.pickerContainer}>
          <Picker
            selectedValue={deviceType}
            onValueChange={setDeviceType}
            dropdownIconColor={theme.text}
            style={{ color: theme.text }}
            itemStyle={{ color: theme.isDark ? 'white' : theme.text }}>
            <Picker.Item label="Light" value="light" color={theme.isDark ? 'white' : theme.text} />
            <Picker.Item label="Thermostat" value="thermostat" color={theme.isDark ? 'white' : theme.text} />
          </Picker>
        </View>

        <View style={[deviceManagementStyles.picker, { borderColor: theme.border, backgroundColor: theme.isDarkMode ? theme.cardBackground : theme.background }]}>
          <Picker
            selectedValue={selectedRoomId}
            onValueChange={setSelectedRoomId}
            dropdownIconColor={theme.text}
            style={{ color: theme.text }}
            itemStyle={{ color: theme.text, backgroundColor: theme.isDarkMode ? '#000000' : theme.cardBackground }}>
            <Picker.Item label="Select a room" value="" color={theme.isDarkMode ? 'white' : theme.text} />
            {rooms.map(room => (
              <Picker.Item 
                key={room.id} 
                label={room.name} 
                value={room.id}
                color={theme.isDarkMode ? 'white' : theme.text}
              />
            ))}
          </Picker>
        </View>

        <TouchableOpacity 
          style={[
            themeStyles.primaryButton,
            (!deviceName.trim() || !selectedRoomId) && { opacity: 0.5 }
          ]}
          onPress={handleAddDevice}
          disabled={!deviceName.trim() || !selectedRoomId}>
          <Text style={themeStyles.buttonText}>Add Device</Text>
        </TouchableOpacity>
      </View>

      <View style={themeStyles.cardSection}>
        <Text style={[deviceManagementStyles.title, themeStyles.text]}>Current Devices</Text>
        {devices.map(device => (
          <View key={device.id} style={[themeStyles.listItem, { borderRadius: 8, marginBottom: 10 }]}>
            <View style={screenStyles.deviceInfo}>
              <Text style={themeStyles.text}>{device.name}</Text>
              <Text style={themeStyles.textSecondary}>
                {device.type} • {rooms.find(r => r.id === device.roomId)?.name || 'No Room'}
              </Text>
            </View>
            <TouchableOpacity 
              style={screenStyles.removeButton}
              onPress={() => removeDevice(device.id)}>
              <Text style={screenStyles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={themeStyles.cardSection}>
        <TouchableOpacity 
          style={themeStyles.primaryButton}
          onPress={handleShowHaDevices}>
          <Text style={themeStyles.buttonText}>
            {showHaDevices ? 'Hide Home Assistant Devices' : 'Show Home Assistant Devices'}
          </Text>
        </TouchableOpacity>
        {showHaDevices && (
          <View style={{ marginTop: 15 }}>
            <TextInput
              style={themeStyles.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search Devices"
              placeholderTextColor={theme.textTertiary}
            />
            {filteredDevices.map(device => (
              <View key={device.entity_id} style={[themeStyles.listItem, { borderRadius: 8, marginBottom: 10 }]}>
                <View style={screenStyles.deviceInfo}>
                  <Text style={themeStyles.text}>{device.attributes.friendly_name}</Text>
                  <Text style={themeStyles.textSecondary}>
                    {device.entity_id} • {device.state}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={themeStyles.primaryButton}
                  onPress={() => handleSelectHaDevice(device)}>
                  <Text style={themeStyles.buttonText}>Add</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}