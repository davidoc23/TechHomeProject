// src/screens/DevicesScreen.js
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { DeviceCard } from '../components/devices/DeviceCard';
import { deviceStyles } from '../styles/deviceStyles';
import { useDevices } from '../hooks/useDevices';

export default function DevicesScreen() {
  const { devices, toggleDevice, setTemperature } = useDevices();
  
  return (
    <ScrollView style={deviceStyles.container}>
      <View style={deviceStyles.header}>
        <Text style={deviceStyles.title}>My Devices</Text>
        <Text style={deviceStyles.subtitle}>
          {devices.filter(d => d.isOn).length} devices turned on
        </Text>
      </View>
      
      {devices.map(device => (
        <DeviceCard 
          key={device.id} 
          device={device} 
          onToggle={toggleDevice} 
          onTemperatureChange={setTemperature}
        />
      ))}
    </ScrollView>
  );
}