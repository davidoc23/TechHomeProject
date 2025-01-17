import React from 'react';
import { View, Text, Switch, TouchableOpacity} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deviceStyles } from '../../styles/deviceStyles';

export const DeviceCard = ({ device, onToggle, onTemperatureChange }) => (
  <View style={deviceStyles.deviceCard}>
  <View style={deviceStyles.deviceInfo}>
      <Ionicons 
          name={device.type === 'light' ? 'bulb' : 'thermometer'} 
          size={24} 
          color={device.isOn ? '#007AFF' : '#666'}
      />
      <View style={deviceStyles.deviceDetails}>
          <Text style={deviceStyles.deviceName}>{device.name}</Text>
          <Text style={deviceStyles.deviceStatus}>
              {device.type === 'thermostat' 
                  ? `Temperature: ${device.temperature}°F` 
                  : device.isOn ? 'On' : 'Off'}
          </Text>
          {device.type === 'thermostat' && (
              <View style={deviceStyles.temperatureControls}>
                  <TouchableOpacity 
                      style={deviceStyles.tempButton}
                      onPress={() => onTemperatureChange(device.id, device.temperature - 1)}
                  >
                      <Text style={deviceStyles.tempButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={deviceStyles.tempDisplay}>{device.temperature}°F</Text>
                  <TouchableOpacity 
                      style={deviceStyles.tempButton}
                      onPress={() => onTemperatureChange(device.id, device.temperature + 1)}
                  >
                      <Text style={deviceStyles.tempButtonText}>+</Text>
                  </TouchableOpacity>
              </View>
          )}
      </View>
  </View>
  <Switch
      value={device.isOn}
      onValueChange={() => onToggle(device.id)}
      trackColor={{ false: '#767577', true: '#81b0ff' }}
      thumbColor={device.isOn ? '#007AFF' : '#f4f3f4'}
  />
</View>
);