import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deviceStyles } from '../../styles/deviceStyles';

export const DeviceCard = ({ device, onToggle, onTemperatureChange }) => {
    const [isOn, setIsOn] = useState(device.isOn);

    // Update the toggle when `device.isOn` changes
    useEffect(() => {
        setIsOn(device.isOn);
    }, [device.isOn]);

    const handleToggle = () => {
        // DEBUG - console.log(`🟢 Switch toggled for device: ${device.id} (current state: ${isOn})`);
        setIsOn(prevState => !prevState); // Optimistically update UI
        onToggle(device.id);
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
