import { useState } from 'react';
import { useDeviceContext } from '../context/DeviceContext';
import { useDevices } from './useDevices';

/**
 * Hook for voice control functionality
 * Integrates with DeviceContext and useDevices for consistent state management
 */

export function useVoiceAssistant() {
    const { addActivity } = useDeviceContext();
    const { devices, toggleDevice, toggleAllLights, setTemperature, fetchDevices } = useDevices();

    const [isListening, setIsListening] = useState(false);
    const [lastCommand, setLastCommand] = useState('');
    const [lastResponse, setLastResponse] = useState('');
    const [error, setError] = useState(null);
};