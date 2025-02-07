// screens/AutomationScreen.js
import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useDevices } from '../hooks/useDevices';
import { automationStyles } from '../styles/automationStyles';

export default function AutomationScreen() {
  const { devices, rooms, automations, error, isLoading, addAutomation, removeAutomation, toggleAutomation } = useDevices();
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
    <ScrollView style={automationStyles.container}>
      <View style={automationStyles.section}>
        <Text style={automationStyles.title}>Add New Automation</Text>
        
        <TextInput
          style={automationStyles.input}
          value={automationName}
          onChangeText={setAutomationName}
          placeholder="Automation Name"
          placeholderTextColor="#666"
        />

        <Picker
          selectedValue={automationType}
          onValueChange={setAutomationType}
          style={automationStyles.picker}>
          <Picker.Item label="Time-based" value="time" />
          <Picker.Item label="Device-linked" value="device-link" />
        </Picker>

        
      </View>
    </ScrollView>
  );
}