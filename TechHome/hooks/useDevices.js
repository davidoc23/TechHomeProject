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
let activityState = [];

export function useDevices() {
    const [devices, setDevices] = useState(deviceState);
    const [activities, setActivities] = useState(activityState );

    const addActivity = (deviceName, action) => {
        const newActivity = {
            id: Date.now(),
            deviceName,
            action,
            timestamp: new Date()
        };
        activityState = [newActivity, ...activityState].slice(0, 5);
    };


    const toggleDevice = (id) => {
        const updatedDevices = devices.map(device => {
            if (device.id === id) {
                const newState = !device.isOn;
                addActivity(
                    device.name, 
                    device.type === 'thermostat'
                        ? `${newState ? 'turned on' : 'turned off'} (${device.temperature}°F)`
                        : (newState ? 'turned on' : 'turned off')
                );
                return { ...device, isOn: newState };
            }
            return device;
        });
        
        deviceState = updatedDevices;
        setDevices(updatedDevices);
        setActivities(activityState);
        listeners.forEach(listener => listener(updatedDevices, activityState));
    };

    // Subscribe to changes
    useEffect(() => {
        const listener = (newDevices, newActivities) => {
            setDevices(newDevices);
            setActivities(newActivities);
        };
        listeners.push(listener);
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    }, []);

    return { devices, activities, toggleDevice };
}