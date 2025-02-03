import { useDeviceContext } from '../context/DeviceContext';

const API_URL = 'http://localhost:5000/api/devices';

/**
 * Hook for managing device operations
 * Implements device-specific logic while using DeviceContext for state management
 */
export function useDevices() {
    const { devices, rooms, activities, error, fetchDevices, addActivity, setDevices, setError  } = useDeviceContext();

      /**
     * Toggles a device's state
     * @param {string} id - Device ID
     */
    const toggleDevice = async (id) => {
        try {
            const response = await fetch(`${API_URL}/${id}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const updatedDevice = await response.json();
                setDevices(prev => prev.map(device => 
                    device.id === id ? updatedDevice : device
                ));
                addActivity(
                    updatedDevice.name, 
                    updatedDevice.isOn ? 'turned on' : 'turned off'
                );
            }
        } catch (err) {
            console.error('Network error');
        }
    };

    /**
     * Toggles all light devices
     * @param {boolean} desiredState - Target state for all lights
     */
    const toggleAllLights = async (desiredState) => {
        try {
            const response = await fetch(`${API_URL}/toggle-all-lights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ desiredState })
            });
            
            if (response.ok) {
                const updatedLights = await response.json();
                setDevices(prev => prev.map(device => 
                    device.type === 'light' 
                        ? updatedLights.find(light => light.id === device.id) || device
                        : device
                ));
                
                updatedLights.forEach(device => {
                    addActivity(device.name, desiredState ? 'turned on' : 'turned off');
                });
            }
        } catch (err) {
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
            const response = await fetch(`${API_URL}/${id}/temperature`, {
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
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: deviceData.name,
                    type: deviceData.type,
                    roomId: deviceData.roomId  // Make sure this is included
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
            const response = await fetch(`${API_URL}/${id}`, {
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

    return { 
        devices, 
        rooms,    
        activities, 
        error,
        toggleDevice, 
        toggleAllLights, 
        setTemperature,
        addDevice,
        removeDevice, 
    };
}