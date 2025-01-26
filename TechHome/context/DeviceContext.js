import React, { createContext, useContext, useState, useEffect } from 'react';

//Create a context for device-related data and actions
const DeviceContext = createContext();

/**
 * Provides the DeviceContext to all components within the application.
 * Manages the device list, activities, and error states while exposing
 * essential functions for fetching data and managing activities.
 */
export function DeviceProvider({ children }) {
    //State to store the list of devices
    const [devices, setDevices] = useState([]);
    //State to store recent user activities (e.g., device toggles)
    const [activities, setActivities] = useState([]);
    //State to store any error messages
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);


    //API endpoint for fetching device data
    const API_URL = 'http://localhost:5000/api/devices';


     /**
     * Fetches the list of devices from the backend API.
     * If the request is successful, it updates the devices state.
     * If an error occurs, it sets an appropriate error message.
     */
    const fetchDevices = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(API_URL);
            if (response.ok) {
                const data = await response.json();//Parse the JSON response
                setDevices(data);//Update the devices state
            }
        } catch (err) {
            setError('Failed to fetch devices');
        }  finally {
            setIsLoading(false);
        }
    };


    /**
     * useEffect to fetch the list of devices once on component mount.
     * Dependencies: Empty array means this effect runs only once.
     */
    useEffect(() => {
        fetchDevices();
    }, []);


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
    };

    // Context value containing state and actions exposed to components
    const value = {
        devices,       // Current list of devices
        activities,    // Recent activity log
        error,         // Error state, if any
        isLoading,     // Loading state
        fetchDevices,  // Function to fetch devices from the API
        addActivity,   // Function to add a user activity to the log
        setDevices,     // Exposed to allow external modification of the device list (if necessary)
        setError
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
