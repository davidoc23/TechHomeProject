import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useDevices } from '../hooks/useDevices';
import { deviceManagementStyles } from '../styles/deviceManagementStyles';

export default function DeviceManagementScreen() {
  const { devices, rooms, error, isLoading, addDevice, removeDevice } = useDevices();
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('light');
  const [selectedRoomId, setSelectedRoomId] = useState('');

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  const handleAddDevice = () => {
    if (deviceName.trim() && selectedRoomId) {
      addDevice({
        name: deviceName,
        type: deviceType,
        roomId: selectedRoomId
      });
      setDeviceName('');
      setDeviceType('light');
      setSelectedRoomId('');
    }
  };

  return (
    <ScrollView style={deviceManagementStyles.container}>
      <View style={deviceManagementStyles.section}>
        <Text style={deviceManagementStyles.title}>Add New Device</Text>
        
        <TextInput
          style={deviceManagementStyles.input}
          value={deviceName}
          onChangeText={setDeviceName}
          placeholder="Device Name"
          placeholderTextColor="#566"
        />

        <Picker
          selectedValue={deviceType}
          onValueChange={setDeviceType}
          style={deviceManagementStyles.picker}>
          <Picker.Item label="Light" value="light" />
          <Picker.Item label="Thermostat" value="thermostat" />
        </Picker>

        <Picker
          selectedValue={selectedRoomId}
          onValueChange={setSelectedRoomId}
          style={deviceManagementStyles.picker}>
          <Picker.Item label="Select a room" value="" />
          {rooms.map(room => (
            <Picker.Item 
              key={room.id} 
              label={room.name} 
              value={room.id} 
            />
          ))}
        </Picker>

        <TouchableOpacity 
          style={[
            deviceManagementStyles.addButton,
            (!deviceName.trim() || !selectedRoomId) && deviceManagementStyles.addButtonDisabled
          ]}
          onPress={handleAddDevice}
          disabled={!deviceName.trim() || !selectedRoomId}>
          <Text style={deviceManagementStyles.buttonText}>Add Device</Text>
        </TouchableOpacity>
      </View>

      <View style={deviceManagementStyles.section}>
        <Text style={deviceManagementStyles.title}>Current Devices</Text>
        {devices.map(device => (
          <View key={device.id} style={deviceManagementStyles.deviceItem}>
            <View style={deviceManagementStyles.deviceInfo}>
              <Text style={deviceManagementStyles.deviceName}>{device.name}</Text>
              <Text style={deviceManagementStyles.deviceType}>{device.type}</Text>
            </View>
            <TouchableOpacity 
              style={deviceManagementStyles.removeButton}
              onPress={() => removeDevice(device.id)}>
              <Text style={deviceManagementStyles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}