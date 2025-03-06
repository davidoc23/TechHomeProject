import { useDeviceContext } from '../context/DeviceContext';

//const API_URL = 'http://localhost:5000/api';
const ROOMS_API_URL = 'http://localhost:5000/api/rooms';
const AUTOMATIONS_API_URL = 'http://localhost:5000/api/automations';
const DEVICES_API_URL = 'http://localhost:5000/api/devices';


/**
 * Hook for managing device operations
 * Implements device-specific logic while using DeviceContext for state management
*/
export function useDevices() {
    const { devices, rooms,  automations, activities, error, fetchDevices, fetchAutomations, fetchRooms, addActivity, setDevices, setError  } = useDeviceContext();

    /**
     * Toggles a device's state
     * @param {string} id - Device ID
    */
    const toggleDevice = async (id) => {
        // DEBUG - console.log(`🔄 Toggling device: ${id}`);
    
        try {
            const response = await fetch(`${DEVICES_API_URL}/${id}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
    
            if (response.ok) {
                const updatedDevice = await response.json();  // ✅ Ensure we receive a response
                // DEBUG - console.log(`✅ Device toggled successfully: ${JSON.stringify(updatedDevice)}`);
    
                // Update state properly
                setDevices(prevDevices =>
                    prevDevices.map(device =>
                        device.id === id ? { ...device, isOn: updatedDevice.isOn } : device
                    )
                );
    
                addActivity(updatedDevice.name, updatedDevice.isOn ? 'turned on' : 'turned off');
            } else {
                const errorData = await response.json();
                // DEBUG - console.error(`❌ Error toggling device: ${errorData.error}`);
                setError(errorData.error || 'Failed to toggle device');
            }
        } catch (err) {
            // DEBUG - console.error('❌ Network error:', err);
            setError('Failed to toggle device');
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
            }
        } catch (err) {
            setError('Failed to remove device');
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
        toggleAutomation

    };
}