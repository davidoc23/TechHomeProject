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
     * Get the authentication token
     * @returns {Promise<string|null>} Authentication token or null if not found
     */
    const getAuthToken = async () => {
        try {
            // Check multiple token storage locations
            const token = 
                await AsyncStorage.getItem('userToken') || 
                localStorage?.getItem('accessToken') || 
                sessionStorage?.getItem('accessToken');
            
            if (!token) {
                console.warn('No authentication token found');
                setError('Authentication required');
                return null;
            }
            
            return token;
        } catch (err) {
            console.error('Error retrieving auth token:', err);
            setError('Authentication error');
            return null;
        }
    };

    /**
     * Makes an API call with proper error handling
     * @param {string} url - API endpoint
     * @param {Object} options - Fetch options
     * @param {boolean} requiresAuth - Whether authentication is required
     * @returns {Promise<Object|null>} Response data or null on error
     */
    const makeApiCall = async (url, options = {}, requiresAuth = true) => {
        try {
            const fetchOptions = { ...options };
            
            // Add authentication token if required
            if (requiresAuth) {
                const token = await getAuthToken();
                if (!token) return null;
                
                fetchOptions.headers = {
                    ...fetchOptions.headers,
                    'Authorization': `Bearer ${token}`
                };
                // DEBUG - console.log('Auth header sent:', fetchOptions.headers['Authorization']);
            }
            
            // Add timeout with AbortController
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            fetchOptions.signal = controller.signal;
            
            // Make the API call
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);
            
            // Parse JSON response
            let data;
            if (response.status !== 204) { // 204 No Content
                try {
                    data = await response.json();
                } catch (e) {
                    console.warn('Could not parse response as JSON:', e);
                    data = null;
                }
            }
            
            // Handle response
            if (response.ok) {
                return data;
            } else {
                if (response.status === 401) {
                    console.warn('Authentication error');
                    setError('Authentication error - please log in again');
                } else {
                    console.warn(`API error (${response.status}):`, data);
                    setError(data?.error || `Error: ${response.status}`);
                }
                return null;
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.error('API request timed out');
                setError('Request timed out');
            } else {
                console.error('API request error:', err);
                setError(err.message || 'API request failed');
            }
            return null;
        }
    };

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
        
        try {
            const updatedDevice = await makeApiCall(`${DEVICES_API_URL}/${id}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, true); // Devices don't require authentication in your current implementation
            
            if (updatedDevice) {
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
            }
            throw new Error('Failed to toggle device');
        } catch (err) {
            console.error('Error toggling device:', err);
            setError('Failed to toggle device');
            throw err;
        }
    };
    
    /**
     * Toggles all light devices
     * @param {boolean} desiredState - Target state for all lights
    */
    const toggleAllLights = async (desiredState) => {
        console.log(`Toggling all lights to ${desiredState ? 'ON' : 'OFF'}`);
    
        try {
            const updatedLights = await makeApiCall(`${DEVICES_API_URL}/toggle-all-lights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ desiredState })
            }, true); // Devices don't require authentication in your current implementation
            
            if (updatedLights) {
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
                
                return updatedLights;
            }
        } catch (err) {
            console.error('Error toggling all lights:', err);
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
            const updatedDevice = await makeApiCall(`${DEVICES_API_URL}/${id}/temperature`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ temperature: newTemp })
            }, true); // Devices don't require authentication in your current implementation
            
            if (updatedDevice) {
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
                
                return updatedDevice;
            }
        } catch (err) {
            console.error('Error setting temperature:', err);
            setError('Failed to set temperature');
        }
    };

    /**
     * Adds a new device
     * @param {Object} deviceData - Device information including name, type, and roomId
    */
    const addDevice = async (deviceData) => {
        try {
            const newDevice = await makeApiCall(DEVICES_API_URL, {
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
            }, true); // Devices don't require authentication in your current implementation
            
            if (newDevice) {
                await fetchDevices();
                addActivity(deviceData.name, 'added to system');
                return newDevice;
            }
        } catch (err) {
            console.error('Error adding device:', err);
            setError('Failed to add device');
        }
    };
    
    /**
     * Removes a device
     * @param {string} id - Device ID
    */
    const removeDevice = async (id) => {
        try {
            const device = devices.find(d => d.id === id);
            
            const result = await makeApiCall(`${DEVICES_API_URL}/${id}`, {
                method: 'DELETE'
            }, true); // Devices don't require authentication in your current implementation
            
            if (result) {
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
                
                return true;
            }
        } catch (err) {
            console.error('Error removing device:', err);
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

    /**
     * Adds a new room
     * @param {Object} roomData - Room data including name
     */
    const addRoom = async (roomData) => {
        try {
            const newRoom = await makeApiCall(ROOMS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roomData)
            }, true); // Requires authentication
            
            if (newRoom) {
                console.log('Room added successfully:', newRoom);
                await fetchRooms();
                addActivity('Room', `Added "${newRoom.name}"`);
                return newRoom;
            }
        } catch (err) {
            console.error('Error adding room:', err);
            setError('Failed to add room');
        }
    };
    
    /**
     * Removes a room
     * @param {string} id - Room ID
     */
    const removeRoom = async (id) => {
        try {
            const room = rooms.find(r => r.id === id);
            
            const result = await makeApiCall(`${ROOMS_API_URL}/${id}`, {
                method: 'DELETE'
            }, true); // Requires authentication
            
            if (result) {
                await fetchRooms();
                if (room) {
                    addActivity('Room', `Removed "${room.name}"`);
                }
                return true;
            }
        } catch (err) {
            console.error('Error removing room:', err);
            setError('Failed to remove room');
        }
    };
    
    /**
     * Edits a room
     * @param {string} id - Room ID
     * @param {Object} roomData - Updated room data
     */
    const editRoom = async (id, roomData) => {
        try {
            const updatedRoom = await makeApiCall(`${ROOMS_API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roomData)
            }, true); // Requires authentication
            
            if (updatedRoom) {
                console.log('Room updated successfully:', updatedRoom);
                await fetchRooms();
                addActivity('Room', `Updated "${updatedRoom.name}"`);
                return updatedRoom;
            }
        } catch (err) {
            console.error('Error editing room:', err);
            setError('Failed to edit room');
        }
    };
    
    /**
     * Adds a new automation
     * @param {Object} automationData - Automation data
     */
    const addAutomation = async (automationData) => {
        try {
            const newAutomation = await makeApiCall(AUTOMATIONS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(automationData)
            }, true); // Requires authentication
            
            if (newAutomation) {
                await fetchAutomations();
                addActivity('Automation', `Added "${automationData.name}"`);
                return newAutomation;
            }
        } catch (err) {
            console.error('Error adding automation:', err);
            setError('Failed to add automation');
        }
    };

    /**
     * Removes an automation
     * @param {string} id - Automation ID
     */
    const removeAutomation = async (id) => {
        try {
            const automation = automations.find(a => a.id === id);
            
            const result = await makeApiCall(`${AUTOMATIONS_API_URL}/${id}`, {
                method: 'DELETE'
            }, true); // Requires authentication
            
            if (result) {
                await fetchAutomations();
                if (automation) {
                    addActivity('Automation', `Removed "${automation.name}"`);
                }
                return true;
            }
        } catch (err) {
            console.error('Error removing automation:', err);
            setError('Failed to remove automation');
        }
    };

    /**
     * Toggles an automation
     * @param {string} id - Automation ID
     */
    const toggleAutomation = async (id) => {
        try {
            const automation = automations.find(a => a.id === id);
            
            const updatedAutomation = await makeApiCall(`${AUTOMATIONS_API_URL}/${id}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, true); // Requires authentication
            
            if (updatedAutomation) {
                await fetchAutomations();
                if (automation) {
                    addActivity('Automation', `${automation.name} ${automation.enabled ? 'disabled' : 'enabled'}`);
                }
                return updatedAutomation;
            }
        } catch (err) {
            console.error('Error toggling automation:', err);
            setError('Failed to toggle automation');
        }
    };

    // Return all functions and state
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