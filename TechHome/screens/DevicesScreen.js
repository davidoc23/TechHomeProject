// src/screens/DevicesScreen.js
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { DeviceCard } from '../components/devices/DeviceCard';
import { deviceStyles } from '../styles/deviceStyles';
import { useDevices } from '../hooks/useDevices';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';

export default function DevicesScreen() {
  const { devices, rooms, error, isLoading, fetchDevices, toggleDevice, setTemperature, toggleAllLights } = useDevices();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} retry={fetchDevices} />;

  const activeDevices = devices.filter(d => d.isOn).length;
  const lightDevices = devices.filter(d => d.type === 'light');
  const anyLightOn = lightDevices.some(d => d.isOn);

  const handleToggleAllLights = () => {
    toggleAllLights(!anyLightOn);
  };
  
   return (
    <ScrollView style={deviceStyles.container}>
      <View style={deviceStyles.header}>
        <Text style={deviceStyles.title}>My Devices</Text>
        <Text style={deviceStyles.subtitle}>
          {activeDevices} devices turned on
        </Text>
        {lightDevices.length > 0 && (
          <TouchableOpacity 
            style={deviceStyles.toggleAllButton}
            onPress={handleToggleAllLights}
          >
            <Text style={deviceStyles.toggleAllText}>
              {anyLightOn ? 'Turn Off All Lights' : 'Turn On All Lights'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {devices.map(device => (
        <View key={device.id}>
          <Text style={deviceStyles.roomLabel}>
            {rooms.find(r => r.id === device.roomId)?.name || 'No Room'}
          </Text>
          <DeviceCard 
            device={device}
            onToggle={toggleDevice}
            onTemperatureChange={setTemperature}
          />
        </View>
      ))}
    </ScrollView>
  );
}