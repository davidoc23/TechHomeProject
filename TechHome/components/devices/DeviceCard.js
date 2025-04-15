import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deviceStyles } from '../../styles/deviceStyles';
import { useDeviceContext, DEVICE_EVENTS } from '../../context/DeviceContext';
import { useTheme } from '../../context/ThemeContext';

export const DeviceCard = ({ device, onToggle, onTemperatureChange }) => {
    const [isOn, setIsOn] = useState(device.isOn);
    const [isToggling, setIsToggling] = useState(false);
    const { subscribeToDeviceEvents } = useDeviceContext();
    const { theme } = useTheme();

    // Update local state only if device prop changes and we're not in the middle of toggling
    useEffect(() => {
        if (!isToggling) {
            setIsOn(device.isOn);
        }
    }, [device.isOn, isToggling]);

    // Listen for device toggle events
    useEffect(() => {
        // Subscribe to device toggled events
        const unsubscribe = subscribeToDeviceEvents(DEVICE_EVENTS.DEVICE_TOGGLED, (updatedDevice) => {
            if (updatedDevice.id === device.id && !isToggling) {
                setIsOn(updatedDevice.isOn);
            }
        });
        
        // Cleanup subscription when component unmounts
        return () => {
            unsubscribe();
        };
    }, [device.id, subscribeToDeviceEvents, isToggling]);

    const handleToggle = useCallback(async () => {
        // Prevent toggling during an active toggle operation
        if (isToggling) return;
        
        try {
            // Start toggling state
            setIsToggling(true);
            
            // Immediately show toggle to make UI feel responsive
            // This makes the UI responsive while we wait for real state
            setIsOn(!isOn);
            
            // Call the toggle function
            await onToggle(device.id);
            
            // UI will correct itself if needed via device prop changes or event subscription
        } catch (error) {
            console.error("Error toggling device:", error);
            // Revert to original state if there was an error
            setIsOn(device.isOn);
        } finally {
            // Shorter delay before allowing another toggle
            setTimeout(() => {
                setIsToggling(false);
            }, 300);
        }
    }, [device.id, isToggling, onToggle, isOn, device.isOn]);

    return (
        <View style={[deviceStyles.deviceCard, { backgroundColor: theme.cardBackground }]}>
            <View style={deviceStyles.deviceInfo}>
                <Ionicons 
                    name={device.type === 'light' ? 'bulb' : 'thermometer'} 
                    size={24} 
                    color={isOn ? theme.primary : theme.textTertiary}
                />
                <View style={deviceStyles.deviceDetails}>
                    <Text style={[deviceStyles.deviceName, { color: theme.text }]}>{device.name}</Text>
                    <Text style={[deviceStyles.deviceStatus, { color: theme.textSecondary }]}>
                        {device.type === 'thermostat' 
                            ? `Temperature: ${device.temperature ?? '--'}°F`
                            : isOn ? 'On' : 'Off'}
                    </Text>
                </View>
            </View>
            <Switch
                value={isOn}
                disabled={isToggling}
                onValueChange={handleToggle}
                trackColor={{ false: theme.border, true: theme.primary + '80' }}
                thumbColor={isOn ? theme.primary : theme.border}
            />
        </View>
    );
};