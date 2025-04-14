import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deviceStyles } from '../../styles/deviceStyles';
import { useDeviceContext, DEVICE_EVENTS } from '../../context/DeviceContext';

export const DeviceCard = ({ device, onToggle, onTemperatureChange }) => {
    const [isOn, setIsOn] = useState(device.isOn);
    const { subscribeToDeviceEvents } = useDeviceContext();

    // Update the toggle when `device.isOn` changes
    useEffect(() => {
        setIsOn(device.isOn);
    }, [device.isOn]);

    // Listen for device toggle events
    useEffect(() => {
        // Subscribe to device toggled events
        const unsubscribe = subscribeToDeviceEvents(DEVICE_EVENTS.DEVICE_TOGGLED, (updatedDevice) => {
            if (updatedDevice.id === device.id) {
                setIsOn(updatedDevice.isOn);
            }
        });
        
        // Also listen for all devices updates
        const unsubscribeAll = subscribeToDeviceEvents(DEVICE_EVENTS.DEVICES_UPDATED, (devices) => {
            const updatedDevice = devices.find(d => d.id === device.id);
            if (updatedDevice) {
                setIsOn(updatedDevice.isOn);
            }
        });
        
        // Cleanup subscription when component unmounts
        return () => {
            unsubscribe();
            unsubscribeAll();
        };
    }, [device.id, subscribeToDeviceEvents]);

    const handleToggle = async () => {
        try {
            // Call the toggle function
            await onToggle(device.id);
            // No need to manually update state here as the event listeners will catch changes
        } catch (error) {
            console.error("Error toggling device:", error);
        }
    };

    return (
        <View style={deviceStyles.deviceCard}>
            <View style={deviceStyles.deviceInfo}>
                <Ionicons 
                    name={device.type === 'light' ? 'bulb' : 'thermometer'} 
                    size={24} 
                    color={isOn ? '#007AFF' : '#666'}
                />
                <View style={deviceStyles.deviceDetails}>
                    <Text style={deviceStyles.deviceName}>{device.name}</Text>
                    <Text style={deviceStyles.deviceStatus}>
                        {device.type === 'thermostat' 
                            ? `Temperature: ${device.temperature ?? '--'}°F`
                            : isOn ? 'On' : 'Off'}
                    </Text>
                </View>
            </View>
            <Switch
                value={isOn}
                onValueChange={handleToggle}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={isOn ? '#007AFF' : '#f4f3f4'}
            />
        </View>
    );
};