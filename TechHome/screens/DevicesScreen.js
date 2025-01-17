// src/screens/DevicesScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DeviceCard } from '../components/devices/DeviceCard';
import { deviceStyles } from '../styles/deviceStyles';

export default function DevicesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Devices</Text>
      <Text>Testing if render works</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});