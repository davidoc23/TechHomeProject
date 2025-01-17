import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDevices } from '../hooks/useDevices';
import { homeStyles } from '../styles/homeStyles'; 

export default function HomeScreen() {
  const { devices, toggleDevice } = useDevices();

  // Calculate quick stats
  const activeDevices = devices.filter(d => d.isOn).length;
  const totalDevices = devices.length;

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
          <TouchableOpacity style={homeStyles.actionButton}>
            <Ionicons name="bulb" size={24} color="#007AFF" />
            <Text style={homeStyles.actionText}>All Lights</Text>
          </TouchableOpacity>
          <TouchableOpacity style={homeStyles.actionButton}>
            <Ionicons name="thermometer" size={24} color="#007AFF" />
            <Text style={homeStyles.actionText}>Thermostat</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={homeStyles.section}>
        <Text style={homeStyles.sectionTitle}>Recent Activity</Text>
        <View style={homeStyles.activityList}>
          <View style={homeStyles.activityItem}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={homeStyles.activityText}>Living Room Lights turned on</Text>
          </View>
          <View style={homeStyles.activityItem}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={homeStyles.activityText}>Thermostat set to 72°F</Text>
          </View>
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