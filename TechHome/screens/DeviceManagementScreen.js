import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useDevices } from '../hooks/useDevices';
import { useHomeAssistantDevices } from '../hooks/useHomeAssistantDevices';
import { deviceManagementStyles } from '../styles/deviceManagementStyles';

export default function DeviceManagementScreen() {
  const { devices, rooms, error, isLoading, addDevice, removeDevice } = useDevices();
  const { haDevices, isLoading: haLoading, error: haError, fetchDevices: fetchHaDevices } = useHomeAssistantDevices();
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('light');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHaDevice, setSelectedHaDevice] = useState(null);
  const [showHaDevices, setShowHaDevices] = useState(false);

  if (isLoading || haLoading) return <LoadingSpinner />;
  if (error || haError) return <ErrorMessage message={error || haError} />;

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
              <Text style={deviceManagementStyles.deviceDetails}>
                {device.type} • {rooms.find(r => r.id === device.roomId)?.name || 'No Room'}
              </Text>
            </View>
            <TouchableOpacity 
              style={deviceManagementStyles.removeButton}
              onPress={() => removeDevice(device.id)}>
              <Text style={deviceManagementStyles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={deviceManagementStyles.section}>
        <TouchableOpacity 
          style={deviceManagementStyles.addButton}
          onPress={handleShowHaDevices}>
          <Text style={deviceManagementStyles.buttonText}>
            {showHaDevices ? 'Hide Home Assistant Devices' : 'Show Home Assistant Devices'}
          </Text>
        </TouchableOpacity>
        {showHaDevices && (
          <View>
            <TextInput
              style={deviceManagementStyles.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search Devices"
              placeholderTextColor="#566"
            />
            {filteredDevices.map(device => (
              <View key={device.entity_id} style={deviceManagementStyles.deviceItem}>
                <View style={deviceManagementStyles.deviceInfo}>
                  <Text style={deviceManagementStyles.deviceName}>{device.attributes.friendly_name}</Text>
                  <Text style={deviceManagementStyles.deviceDetails}>
                    {device.entity_id} • {device.state}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={deviceManagementStyles.addButton}
                  onPress={() => handleSelectHaDevice(device)}>
                  <Text style={deviceManagementStyles.buttonText}>Add to My Devices</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}