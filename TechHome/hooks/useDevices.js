import { useDeviceContext, DEVICE_EVENTS } from '../context/DeviceContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

//const API_URL = 'http://localhost:5000/api';
const ROOMS_API_URL = 'http://localhost:5000/api/rooms';
const AUTOMATIONS_API_URL = 'http://localhost:5000/api/automations';
const DEVICES_API_URL = 'http://localhost:5000/api/devices';


/**
 * Hook for managing device operations
 * Implements device-specific logic while using DeviceContext for state management
*/
export function useDevices() {
    const { 
        devices, 
        rooms, 
        automations, 
        activities, 
        error, 
        fetchDevices,
        fetchAutomations, 
        fetchRooms, 
        addActivity, 
        setDevices, 
        setError, 
        updateDevice,
        subscribeToDeviceEvents,
        emitDeviceEvent,
        setLastCommandTime
    } = useDeviceContext();

    /**
     * Toggles a device's state
     * @param {string} id - Device ID
    */
    const toggleDevice = async (id) => {
        // Signal that a toggle is about to happen
        setLastCommandTime(Date.now());
        
        // Find the device first
        const device = devices.find(d => d.id === id);
        if (!device) {
            throw new Error('Device not found');
        }
        
        // For Home Assistant devices
        const isHomeAssistant = device.isHomeAssistant;
        const expectedNewState = !device.isOn;
        
        try {
            // Make the API call with a faster timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
            
            const response = await fetch(`${DEVICES_API_URL}/${id}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
    
            if (response.ok) {
                const updatedDevice = await response.json();
                
                // Apply the update from the server immediately
                updateDevice(id, { isOn: updatedDevice.isOn });
                
                // Store this device in recent devices list for ML purposes
                try {
                    const recentDevices = JSON.parse(await AsyncStorage.getItem('recentDevices') || '[]');
                    const deviceIndex = recentDevices.findIndex(d => d.id === id);
                    
                    // Remove if exists
                    if (deviceIndex >= 0) {
                        recentDevices.splice(deviceIndex, 1);
                    }
                    
                    // Add to front
                    recentDevices.unshift(updatedDevice);
                    
                    // Keep only last 5
                    const trimmedRecent = recentDevices.slice(0, 5);
                    await AsyncStorage.setItem('recentDevices', JSON.stringify(trimmedRecent));
                } catch (storageErr) {
                    console.warn('Failed to update recent devices:', storageErr);
                }
                
                // Broadcast the device toggle event to all components
                emitDeviceEvent(DEVICE_EVENTS.DEVICE_TOGGLED, updatedDevice);
    
                addActivity(updatedDevice.name, updatedDevice.isOn ? 'turned on' : 'turned off');
                
                // For Home Assistant devices, minimize but ensure state consistency
                if (isHomeAssistant) {
                    // Quick refresh for state consistency
                    setTimeout(() => fetchDevices(), 500);
                }
                
                return updatedDevice;
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to toggle device');
                throw new Error(errorData.error || 'Failed to toggle device');
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.error('Toggle request timed out');
                setError('Request timed out');
            } else {
                console.error('Network error toggling device:', err);
                setError('Failed to toggle device');
            }
            throw err;
        }
    };
    
    /**
     * Toggles all light devices
     * @param {boolean} desiredState - Target state for all lights
    */
    const toggleAllLights = async (desiredState) => {
        // DEBUG - console.log(`🔄 Toggling all lights to ${desiredState ? 'ON' : 'OFF'}`);
    
        try {
            const response = await fetch(`${DEVICES_API_URL}/toggle-all-lights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ desiredState })
            });
    
            if (response.ok) {
                const updatedLights = await response.json();
                //DEBUG - console.log(`✅ Lights toggled successfully:`, updatedLights);
    
                // Update only light devices in state
                setDevices(prevDevices =>
                    prevDevices.map(device =>
                        device.type === 'light'
                            ? { ...device, isOn: updatedLights.find(light => light.id === device.id)?.isOn ?? device.isOn }
                            : device
                    )
                );
    
                updatedLights.forEach(device => {
                    addActivity(device.name, desiredState ? 'turned on' : 'turned off');
                });
                
                // Update recent devices list for all affected lights
                try {
                    const recentDevices = JSON.parse(await AsyncStorage.getItem('recentDevices') || '[]');
                    let updated = false;
                    
                    // Update any lights that are already in recent devices
                    for (let light of updatedLights) {
                        const deviceIndex = recentDevices.findIndex(d => d.id === light.id);
                        if (deviceIndex >= 0) {
                            recentDevices[deviceIndex] = {...recentDevices[deviceIndex], isOn: light.isOn};
                            updated = true;
                        }
                    }
                    
                    if (updated) {
                        await AsyncStorage.setItem('recentDevices', JSON.stringify(recentDevices));
                    }
                } catch (storageErr) {
                    console.warn('Failed to update recent devices:', storageErr);
                }
            } else {
                const errorData = await response.json();
                // DEBUG - console.error(`❌ Error toggling all lights: ${errorData.error}`);
                setError(errorData.error || 'Failed to toggle all lights');
            }
        } catch (err) {
            // DEBUG - console.error('❌ Network error:', err);
            setError('Failed to toggle all lights');
        }
    };
    
    /**
     * Sets the temperature for a thermostat
     * @param {string} id - Device ID
     * @param {number} newTemp - New temperature value
    */
    const setTemperature = async (id, newTemp) => {
        try {
            const response = await fetch(`${DEVICES_API_URL}/${id}/temperature`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ temperature: newTemp })
            });
            
            if (response.ok) {
                const updatedDevice = await response.json();
                setDevices(prev => prev.map(device => 
                    device.id === id ? updatedDevice : device
                ));
                addActivity(updatedDevice.name, `temperature set to ${newTemp}°F`);
                
                // Update in recent devices if present
                try {
                    const recentDevices = JSON.parse(await AsyncStorage.getItem('recentDevices') || '[]');
                    const deviceIndex = recentDevices.findIndex(d => d.id === id);
                    
                    if (deviceIndex >= 0) {
                        recentDevices[deviceIndex] = {...recentDevices[deviceIndex], temperature: newTemp};
                        await AsyncStorage.setItem('recentDevices', JSON.stringify(recentDevices));
                    }
                } catch (storageErr) {
                    console.warn('Failed to update recent devices:', storageErr);
                }
            }
        } catch (err) {
            setError('Failed to set temperature');
        }
    };

    /**
     * Adds a new device
     * @param {Object} deviceData - Device information including name, type, and roomId
    */

      const addDevice = async (deviceData) => {
        try {
            const response = await fetch(DEVICES_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: deviceData.name,
                    type: deviceData.type,
                    roomId: deviceData.roomId,  // Make sure this is included
                    isHomeAssistant: deviceData.isHomeAssistant,
                    entityId: deviceData.entityId || null,
                    attributes: deviceData.attributes || {}
                })
            });
            
            if (response.ok) {
                await fetchDevices();
                addActivity(deviceData.name, 'added to system');
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to add device');
            }
        } catch (err) {
            setError('Failed to add device');
        }
    };
    
    /**
     * Removes a device
     * @param {string} id - Device ID
    */
    const removeDevice = async (id) => {
        try {
            const response = await fetch(`${DEVICES_API_URL}/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                const device = devices.find(d => d.id === id);
                await fetchDevices();
                if (device) {
                    addActivity(device.name, 'removed from system');
                }
                
                // Remove from recent devices if present
                try {
                    const recentDevices = JSON.parse(await AsyncStorage.getItem('recentDevices') || '[]');
                    const updatedRecent = recentDevices.filter(d => d.id !== id);
                    
                    if (updatedRecent.length !== recentDevices.length) {
                        await AsyncStorage.setItem('recentDevices', JSON.stringify(updatedRecent));
                    }
                } catch (storageErr) {
                    console.warn('Failed to update recent devices:', storageErr);
                }
            }
        } catch (err) {
            setError('Failed to remove device');
        }
    };

    /**
     * Gets the user's recent devices from AsyncStorage
     * @returns {Promise<Array>} Array of recent devices or empty array if none
     */
    const getRecentDevices = async () => {
        try {
            const recentDevices = await AsyncStorage.getItem('recentDevices');
            return recentDevices ? JSON.parse(recentDevices) : [];
        } catch (err) {
            console.warn('Failed to get recent devices:', err);
            return [];
        }
    };

    const addRoom = async (roomData) => {
        try {
            const response = await fetch(ROOMS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roomData)
            });
            
            if (response.ok) {
                await fetchRooms();
            }
        } catch (err) {
            setError('Failed to add room');
        }
    };

    const removeRoom = async (id) => {
        try {
            const response = await fetch(`${ROOMS_API_URL}/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                await fetchRooms();
            }
        } catch (err) {
            setError('Failed to remove room');
        }
    };

    const editRoom = async (id, roomData) => {
        try {
            const response = await fetch(`${ROOMS_API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roomData)
            });
            
            if (response.ok) {
                await fetchRooms();
            }
        } catch (err) {
            setError('Failed to edit room');
        }
    };

    const addAutomation = async (automationData) => {
        try {
            const response = await fetch(AUTOMATIONS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(automationData)
            });
            
            if (response.ok) {
                await fetchAutomations();
                addActivity('Automation', `Added "${automationData.name}"`);
            }
        } catch (err) {
            setError('Failed to add automation');
        }
    };

    const removeAutomation = async (id) => {
        try {
            const response = await fetch(`${AUTOMATIONS_API_URL}/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                const automation = automations.find(a => a.id === id);
                await fetchAutomations();
                if (automation) {
                    addActivity('Automation', `Removed "${automation.name}"`);
                }
            }
        } catch (err) {
            setError('Failed to remove automation');
        }
    };

    const toggleAutomation = async (id) => {
        try {
            const response = await fetch(`${AUTOMATIONS_API_URL}/${id}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                await fetchAutomations();
                const automation = automations.find(a => a.id === id);
                if (automation) {
                    addActivity(
                        'Automation',
                        `${automation.name} ${automation.enabled ? 'disabled' : 'enabled'}`
                    );
                }
            }
        } catch (err) {
            setError('Failed to toggle automation');
        }
    };

    return { 
        devices, 
        rooms,
        automations,     
        activities, 
        error,
        toggleDevice, 
        toggleAllLights, 
        setTemperature,
        addDevice,
        removeDevice, 
        addRoom,
        removeRoom,
        editRoom,
        addAutomation,
        removeAutomation,
        toggleAutomation,
        getRecentDevices
    };
}