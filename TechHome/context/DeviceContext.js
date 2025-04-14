import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { API_URL } from '../config';

//Create a context for device-related data and actions
const DeviceContext = createContext();

// Create an event bus to communicate device changes app-wide
const DeviceEvents = {
    listeners: new Map(),
    
    subscribe: (event, callback) => {
        if (!DeviceEvents.listeners.has(event)) {
            DeviceEvents.listeners.set(event, new Set());
        }
        DeviceEvents.listeners.get(event).add(callback);
        return () => DeviceEvents.listeners.get(event).delete(callback);
    },
    
    emit: (event, data) => {
        if (DeviceEvents.listeners.has(event)) {
            DeviceEvents.listeners.get(event).forEach(callback => callback(data));
        }
    }
};

// Event types
export const DEVICE_EVENTS = {
    DEVICE_TOGGLED: 'DEVICE_TOGGLED',
    DEVICES_UPDATED: 'DEVICES_UPDATED'
};

/**
 * Provides the DeviceContext to all components within the application.
 * Manages the device list, activities, and error states while exposing
 * essential functions for fetching data and managing activities.
 */
export function DeviceProvider({ children }) {
    //State Management
    //State to store the list of devices
    const [devices, setDevices] = useState([]);
    //State to store recent user activities (e.g., device toggles)
    const [activities, setActivities] = useState([]);
    //State to store any error messages
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [automations, setAutomations] = useState([]);
    const [lastCommandTime, setLastCommandTime] = useState(Date.now());  

    // Get auth token for API requests
    const { accessToken, isAuthenticated, refreshAuth } = useAuth() || {};

    /**
     * Creates authorization headers for API requests
     */
    const getAuthHeaders = () => {
        return {
            'Content-Type': 'application/json',
            'Authorization': accessToken ? `Bearer ${accessToken}` : ''
        };
    };


     /**
     * Fetches the list of devices from the backend API.
     * If the request is successful, it updates the devices state.
     * If an error occurs, it sets an appropriate error message.
     */
    const fetchDevices = async () => {
        // First, try to fetch with authentication
        setIsLoading(true);
        setError(null);
        try {
            // For testing, use the debug endpoint that doesn't require authentication
            // TEMPORARY SOLUTION UNTIL AUTH IS WORKING
            const debugResponse = await fetch(`${API_URL}/debug/devices`);
            
            if (debugResponse.ok) {
                const data = await debugResponse.json();
                setDevices(data);
                // Emit an event that devices have been updated
                DeviceEvents.emit(DEVICE_EVENTS.DEVICES_UPDATED, data);
                setIsLoading(false);
                return;
            }
            
            // If debug endpoint doesn't work, try the normal endpoint with auth
            if (!isAuthenticated) {
                setIsLoading(false);
                return;
            }
            
            const response = await fetch(`${API_URL}/devices`, {
                headers: getAuthHeaders()
            });
            
            if (response.status === 401) {
                // Try to refresh the token
                const refreshed = refreshAuth && await refreshAuth();
                if (refreshed) {
                    // Retry with new token
                    const retryResponse = await fetch(`${API_URL}/devices`, {
                        headers: getAuthHeaders()
                    });
                    if (retryResponse.ok) {
                        const data = await retryResponse.json();
                        setDevices(data);
                        // Emit an event that devices have been updated
                        DeviceEvents.emit(DEVICE_EVENTS.DEVICES_UPDATED, data);
                    } else {
                        setError('Authentication error');
                    }
                } else {
                    console.log('Session expired or token refresh failed');
                }
            } else if (response.ok) {
                const data = await response.json();
                setDevices(data);
                // Emit an event that devices have been updated
                DeviceEvents.emit(DEVICE_EVENTS.DEVICES_UPDATED, data);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to fetch devices');
            }
        } catch (err) {
            console.error('Error fetching devices:', err);
            setError('Failed to fetch devices');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Fetches the list of rooms from the backend API.
     */
    const fetchRooms = async () => {
        try {
            // For testing, use the debug endpoint that doesn't require authentication
            // TEMPORARY SOLUTION UNTIL AUTH IS WORKING
            const debugResponse = await fetch(`${API_URL}/debug/rooms`);
            
            if (debugResponse.ok) {
                const data = await debugResponse.json();
                setRooms(data);
                return;
            }
            
            // If debug endpoint doesn't work, try the normal endpoint with auth
            if (!isAuthenticated) return;
            
            const response = await fetch(`${API_URL}/rooms`, {
                headers: getAuthHeaders()
            });
            
            if (response.status === 401) {
                // Try to refresh the token
                const refreshed = refreshAuth && await refreshAuth();
                if (refreshed) {
                    // Retry with new token
                    const retryResponse = await fetch(`${API_URL}/rooms`, {
                        headers: getAuthHeaders()
                    });
                    if (retryResponse.ok) {
                        const data = await retryResponse.json();
                        setRooms(data);
                    }
                }
            } else if (response.ok) {
                const data = await response.json();
                setRooms(data);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to fetch rooms');
            }
        } catch (err) {
            console.error('Error fetching rooms:', err);
            setError('Failed to fetch rooms');
        }
    };


    const fetchAutomations = async () => {
        try {
            // For testing, use the debug endpoint that doesn't require authentication
            // TEMPORARY SOLUTION UNTIL AUTH IS WORKING
            const debugResponse = await fetch(`${API_URL}/debug/automations`);
            
            if (debugResponse.ok) {
                const data = await debugResponse.json();
                setAutomations(data);
                return;
            }
            
            // If debug endpoint doesn't work, try the normal endpoint with auth
            if (!isAuthenticated) return;
            
            const response = await fetch(`${API_URL}/automations`, {
                headers: getAuthHeaders()
            });
            
            if (response.status === 401) {
                // Try to refresh the token
                const refreshed = refreshAuth && await refreshAuth();
                if (refreshed) {
                    // Retry with new token
                    const retryResponse = await fetch(`${API_URL}/automations`, {
                        headers: getAuthHeaders()
                    });
                    if (retryResponse.ok) {
                        const data = await retryResponse.json();
                        setAutomations(data);
                    }
                }
            } else if (response.ok) {
                const data = await response.json();
                setAutomations(data);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to fetch automations');
            }
        } catch (err) {
            console.error('Error fetching automations:', err);
            setError('Failed to fetch automations');
        }
    };

    /**
     * useEffect to fetch the list of devices when mounted or auth state changes
     */
    useEffect(() => {
        if (isAuthenticated) {
            fetchRooms();
            fetchDevices();
            fetchAutomations();
        }
    }, [isAuthenticated, accessToken]);

    // Dynamic polling interval based on recent activity
    useEffect(() => {
        if (!isAuthenticated) return;
        
        // Very fast polling (500ms) immediately after a command
        const immediateInterval = setInterval(() => {
            if (Date.now() - lastCommandTime < 3000) {
                fetchDevices();
            }
        }, 500);
        
        // Regular polling (5s) for ongoing active sessions
        const regularInterval = setInterval(() => {
            if (Date.now() - lastCommandTime >= 3000 && Date.now() - lastCommandTime < 30000) {
                fetchDevices();
            }
        }, 5000);
        
        // Background polling (30s) for idle sessions
        const backgroundInterval = setInterval(() => {
            if (Date.now() - lastCommandTime >= 30000) {
                fetchDevices();
            }
        }, 30000);
        
        return () => {
            clearInterval(immediateInterval);
            clearInterval(regularInterval);
            clearInterval(backgroundInterval);
        };
    }, [lastCommandTime, isAuthenticated]);

    /**
     * Adds a new activity to the activities log.
     * Activities represent user actions on devices, e.g., toggling a light.
     * Only the latest 5 activities are retained.
     * 
     * @param {string} deviceName - Name of the device being acted upon.
     * @param {string} action - Description of the action performed (e.g., "turned on").
     */
    const addActivity = (deviceName, action) => {
        const newActivity = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            deviceName,
            action,
            timestamp: new Date()
        };
        setActivities(prev => [newActivity, ...prev].slice(0, 5));
        setLastCommandTime(Date.now()); // Update last command time to trigger more frequent polling
    };

    /**
     * Gets devices for a specific room
     * @param {string} roomId - ID of the room
     */
    const getDevicesByRoom = (roomId) => {
        return devices.filter(device => device.roomId === roomId);
    };
    
    /**
     * Updates a single device in the state
     * @param {string} deviceId - ID of the device to update
     * @param {object} updatedFields - Fields to update
     */
    const updateDevice = (deviceId, updatedFields) => {
        const updatedDevices = devices.map(device => 
            device.id === deviceId ? { ...device, ...updatedFields } : device
        );
        
        // Update the devices state
        setDevices(updatedDevices);
        
        // Emit a device toggled event
        const updatedDevice = updatedDevices.find(d => d.id === deviceId);
        if (updatedDevice) {
            DeviceEvents.emit(DEVICE_EVENTS.DEVICE_TOGGLED, updatedDevice);
        }
        
        // Update last command time for polling
        setLastCommandTime(Date.now());
    };

    // Context value containing state and actions exposed to components
    const value = {
        // State
        devices,       // Current list of devices
        rooms,         // Current list of rooms
        automations,   // Current list of automations
        activities,    // Recent activity log
        error,         // Error state, if any
        isLoading,     // Loading state
        // Functions
        fetchDevices,  // Function to fetch devices from the API
        fetchRooms,    // Function to fetch rooms from the API
        fetchAutomations, // Function to fetch automations from the API
        addActivity,   // Function to add a user activity to the log
        getDevicesByRoom, // Function to get devices for a specific room
        updateDevice,  // Function to update a single device
        // Event system
        subscribeToDeviceEvents: DeviceEvents.subscribe,
        emitDeviceEvent: DeviceEvents.emit,
        // State setters
        setDevices,     // Exposed to allow external modification of the device list (if necessary)
        setRooms,       // Exposed to allow external modification of the room list (if necessary)
        setError,       // Set error state
        setLastCommandTime // Update last command time
    };

    /**
     * Provides the context to all children wrapped by DeviceProvider.
     * This makes device-related data and actions accessible via `useDeviceContext`.
     */
    return (
        <DeviceContext.Provider value={value}>
            {children}
        </DeviceContext.Provider>
    );
}

export const useDeviceContext = () => useContext(DeviceContext);