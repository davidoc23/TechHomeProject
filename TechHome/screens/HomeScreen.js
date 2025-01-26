import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDevices } from '../hooks/useDevices';
import { homeStyles } from '../styles/homeStyles'; 
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';

export default function HomeScreen() {
  const { devices, activities, error, isLoading, fetchDevices, toggleDevice, toggleAllLights } = useDevices();


  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} retry={fetchDevices} />;
  
  // Calculate quick stats
  const activeDevices = devices.filter(d => d.isOn).length;
  const totalDevices = devices.length;

  const handleAllLights = () => {
    const lightDevices = devices.filter(device => device.type === 'light');
    const anyLightOn = lightDevices.some(light => light.isOn);
    toggleAllLights(!anyLightOn);  // If any light is on, turn all off. Otherwise, turn all on
};


  const handleThermostat = () => {
    const thermostat = devices.find(device => device.type === 'thermostat');
    if (thermostat) {
      toggleDevice(thermostat.id);
    }
  };

  return (
    <ScrollView style={homeStyles.container}>
      {/* Welcome Section */}
      <View style={homeStyles.welcomeSection}>
        <Text style={homeStyles.welcomeText}>Welcome Home</Text>
        <Text style={homeStyles.statsText}>
          {activeDevices} of {totalDevices} devices active
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={homeStyles.section}>
        <Text style={homeStyles.sectionTitle}>Quick Actions</Text>
        <View style={homeStyles.quickActions}>

          <TouchableOpacity 
            style={homeStyles.actionButton}
            onPress={handleAllLights}
          >
            <Ionicons name="bulb" size={24} color="#007AFF" />
            <Text style={homeStyles.actionText}>All Lights</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={homeStyles.actionButton}
            onPress={handleThermostat}
          >
            <Ionicons name="thermometer" size={24} color="#007AFF" />
            <Text style={homeStyles.actionText}>
              Thermostat ({devices.find(d => d.type === 'thermostat')?.temperature}°F)
            </Text>
          </TouchableOpacity>
          
        </View>
      </View>

      {/* Recent Activity section */}
    <View style={homeStyles.section}>
        <Text style={homeStyles.sectionTitle}>Recent Activity</Text>
        <View style={homeStyles.activityList}>
            {activities && activities.length > 0 ? (
                activities.map((activity) => (
                    <View key={activity.id} style={homeStyles.activityItem}>
                        <Ionicons name="time-outline" size={20} color="#666" />
                        <Text style={homeStyles.activityText}>
                            {activity.deviceName} {activity.action}
                        </Text>
                    </View>
                ))
            ) : (
                <Text style={homeStyles.activityText}>No recent activity</Text>
            )}
        </View>
    </View>

       {/* Voice Control */}
       <TouchableOpacity style={homeStyles.voiceButton}>
        <Ionicons name="mic" size={24} color="white" />
        <Text style={homeStyles.voiceButtonText}>Voice Control</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}