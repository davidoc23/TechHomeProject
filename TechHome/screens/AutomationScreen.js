// screens/AutomationScreen.js
import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StatusBar } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useDevices } from '../hooks/useDevices';
import { useTheme } from '../context/ThemeContext';
import { automationStyles } from '../styles/automationStyles';
import { applyThemeToComponents } from '../theme/utils';

export default function AutomationScreen() {
  const { devices, rooms, automations, error, isLoading, addAutomation, removeAutomation, toggleAutomation } = useDevices();
  const { theme, isDarkMode } = useTheme();
  
  // Get shared component styles from theme
  const themeStyles = applyThemeToComponents(theme);
  
  // Create screen-specific dynamic styles
  const dynamicStyles = {
    ...themeStyles,
    automationItem: {
      ...automationStyles.automationItem,
      borderColor: theme.border,
    },
    toggleButton: {
      ...automationStyles.toggleButton,
      backgroundColor: theme.primary + '20',
    },
    toggleButtonText: {
      color: theme.primary
    },
    activeToggleButton: {
      backgroundColor: theme.success + '20',
    },
    activeToggleText: {
      color: theme.success
    },
    removeButton: {
      ...automationStyles.removeButton,
      backgroundColor: theme.danger + '20',
    },
    removeButtonText: {
      color: theme.danger
    },
    automationItem: {
      ...automationStyles.automationItem,
      borderColor: theme.border,
    },
    toggleButton: {
      ...automationStyles.toggleButton,
      backgroundColor: theme.primary + '20',
    },
    toggleButtonText: {
      color: theme.primary
    },
    activeToggleButton: {
      backgroundColor: theme.success + '20',
    },
    activeToggleText: {
      color: theme.success
    },
    removeButton: {
      ...automationStyles.removeButton,
      backgroundColor: theme.danger + '20',
    },
    removeButtonText: {
      color: theme.danger
    }
  };
  const [automationName, setAutomationName] = useState('');
  const [automationType, setAutomationType] = useState('time');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedAction, setSelectedAction] = useState('toggle');
  const [timeCondition, setTimeCondition] = useState('');

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  const handleAddAutomation = () => {
    if (!automationName.trim() || !selectedDevice) return;

    const newAutomation = {
      name: automationName,
      type: automationType,
      condition: automationType === 'time' 
        ? { time: timeCondition }
        : { deviceId: selectedDevice, state: 'on' },
      action: {
        deviceId: selectedDevice,
        command: selectedAction,
        value: true
      }
    };

    addAutomation(newAutomation);
    setAutomationName('');
    setSelectedDevice('');
  };

  return (
    <ScrollView style={themeStyles.screenContainer}>
      <StatusBar barStyle={theme.statusBar} />
      <View style={themeStyles.cardSection}>
        <Text style={[automationStyles.title, themeStyles.text]}>Add New Automation</Text>
        
        <TextInput
          style={themeStyles.input}
          value={automationName}
          onChangeText={setAutomationName}
          placeholderTextColor={theme.textTertiary}
          placeholder="Automation Name"
        />

        <View style={themeStyles.pickerContainer}>
          <Picker
            selectedValue={automationType}
            onValueChange={setAutomationType}
            dropdownIconColor={theme.text}
            style={{ color: theme.text }}
            itemStyle={{ color: theme.isDark ? 'white' : theme.text }}>
            <Picker.Item label="Time-based" value="time" color={theme.isDark ? 'white' : theme.text} />
            <Picker.Item label="Device-linked" value="device-link" color={theme.isDark ? 'white' : theme.text} />
          </Picker>
        </View>


        {automationType === 'time' && (
          <TextInput
            style={themeStyles.input}
            value={timeCondition}
            onChangeText={setTimeCondition}
            placeholder="Time (HH:MM)"
            placeholderTextColor={theme.textTertiary}
            keyboardType="numbers-and-punctuation"
          />
        )}

        <View style={themeStyles.pickerContainer}>
          <Picker
            selectedValue={selectedDevice}
            onValueChange={setSelectedDevice}
            dropdownIconColor={theme.text}
            style={{ color: theme.text }}
            itemStyle={{ color: theme.isDark ? 'white' : theme.text }}>
            <Picker.Item label="Select Device" value="" color={theme.isDark ? 'white' : theme.text} />
            {devices.map(device => (
              <Picker.Item 
                key={device.id} 
                label={`${device.name} (${rooms.find(r => r.id === device.roomId)?.name})`}
                value={device.id}
                color={theme.isDark ? 'white' : theme.text}
              />
            ))}
          </Picker>
        </View>

        <View style={themeStyles.pickerContainer}>
          <Picker
            selectedValue={selectedAction}
            onValueChange={setSelectedAction}
            dropdownIconColor={theme.text}
            style={{ color: theme.text }}
            itemStyle={{ color: theme.isDark ? 'white' : theme.text }}>
            <Picker.Item label="Toggle" value="toggle" color={theme.isDark ? 'white' : theme.text} />
            <Picker.Item label="Turn On" value="turn_on" color={theme.isDark ? 'white' : theme.text} />
            <Picker.Item label="Turn Off" value="turn_off" color={theme.isDark ? 'white' : theme.text} />
            {selectedDevice && devices.find(d => d.id === selectedDevice)?.type === 'thermostat' && (
              <Picker.Item label="Set Temperature" value="set_temperature" color={theme.isDark ? 'white' : theme.text} />
            )}
          </Picker>
        </View>

        <TouchableOpacity 
          style={themeStyles.primaryButton}
          onPress={handleAddAutomation}>
          <Text style={themeStyles.buttonText}>Add Automation</Text>
        </TouchableOpacity>
      </View>

      <View style={[themeStyles.cardSection, { marginTop: 10 }]}>
        <Text style={[automationStyles.title, themeStyles.text]}>Current Automations</Text>
        {automations?.map(automation => (
          <View key={automation.id} style={[themeStyles.listItem, { borderRadius: 8, marginBottom: 10 }]}>
            <View style={automationStyles.automationInfo}>
              <Text style={[automationStyles.automationName, themeStyles.text]}>{automation.name}</Text>
              <Text style={[automationStyles.automationType, themeStyles.textSecondary]}>
                {automation.type === 'time' ? 'Time-based' : 'Device-linked'}
              </Text>
            </View>
            <View style={automationStyles.automationActions}>
              <TouchableOpacity 
                style={[
                  dynamicStyles.toggleButton,
                  automation.enabled && dynamicStyles.activeToggleButton
                ]}
                onPress={() => toggleAutomation(automation.id)}>
                <Text style={[
                  automation.enabled ? dynamicStyles.activeToggleText : dynamicStyles.toggleButtonText
                ]}>
                  {automation.enabled ? 'Enabled' : 'Disabled'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={dynamicStyles.removeButton}
                onPress={() => removeAutomation(automation.id)}>
                <Text style={dynamicStyles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        
      </View>
    </ScrollView>
  );
}