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


        {automationType === 'time' && (
          <TextInput
            style={automationStyles.input}
            value={timeCondition}
            onChangeText={setTimeCondition}
            placeholder="Time (HH:MM)"
            placeholderTextColor="#666"
          />
        )}

        <Picker
          selectedValue={selectedDevice}
          onValueChange={setSelectedDevice}
          style={automationStyles.picker}>
          <Picker.Item label="Select Device" value="" />
          {devices.map(device => (
            <Picker.Item 
              key={device.id} 
              label={`${device.name} (${rooms.find(r => r.id === device.roomId)?.name})`}
              value={device.id} 
            />
          ))}
        </Picker>

        <Picker
          selectedValue={selectedAction}
          onValueChange={setSelectedAction}
          style={automationStyles.picker}>
          <Picker.Item label="Toggle" value="toggle" />
          <Picker.Item label="Turn On" value="turn_on" />
          <Picker.Item label="Turn Off" value="turn_off" />
          {selectedDevice && devices.find(d => d.id === selectedDevice)?.type === 'thermostat' && (
            <Picker.Item label="Set Temperature" value="set_temperature" />
          )}
        </Picker>

        <TouchableOpacity 
          style={automationStyles.addButton}
          onPress={handleAddAutomation}>
          <Text style={automationStyles.buttonText}>Add Automation</Text>
        </TouchableOpacity>
      </View>

      <View style={automationStyles.section}>
        <Text style={automationStyles.title}>Current Automations</Text>
        {automations?.map(automation => (
          <View key={automation.id} style={automationStyles.automationItem}>
            <View style={automationStyles.automationInfo}>
              <Text style={automationStyles.automationName}>{automation.name}</Text>
              <Text style={automationStyles.automationType}>
                {automation.type === 'time' ? 'Time-based' : 'Device-linked'}
              </Text>
            </View>
            <View style={automationStyles.automationActions}>
              <TouchableOpacity 
                style={[
                  automationStyles.toggleButton,
                  automation.enabled && automationStyles.toggleButtonEnabled
                ]}
                onPress={() => toggleAutomation(automation.id)}>
                <Text style={automationStyles.toggleButtonText}>
                  {automation.enabled ? 'Enabled' : 'Disabled'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={automationStyles.removeButton}
                onPress={() => removeAutomation(automation.id)}>
                <Text style={automationStyles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        
      </View>
    </ScrollView>
  );
}