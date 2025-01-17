import { useState, useEffect } from 'react';

// Shared initial state
const initialDevices = [
    { id: 1, name: 'Living Room Light', type: 'light', isOn: false },
    { id: 2, name: 'Kitchen Light', type: 'light', isOn: false },
    { id: 3, name: 'Bedroom Light', type: 'light', isOn: false },
    { id: 4, name: 'Living Room Thermostat', type: 'thermostat', temperature: 20, isOn: true },
];

//Single instance of state
let deviceState = initialDevices;
let listeners = [];

export function useDevices() {
    const [devices, setDevices] = useState(deviceState);

    const toggleDevice = (id) => {
        const updatedDevices = devices.map(device => 
            device.id === id ? { ...device, isOn: !device.isOn } : device
        );
        deviceState = updatedDevices;
        setDevices(updatedDevices);
        // Update all other components
        listeners.forEach(listener => listener(updatedDevices));
    };

    // Subscribe to changes
    useEffect(() => {
        const listener = (newDevices) => {
            if (newDevices !== devices) {
                setDevices(newDevices);
            }
        };
        listeners.push(listener);
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    }, [devices]); // Add devices as dependency

    return { devices, toggleDevice };
}