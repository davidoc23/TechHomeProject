import { useState, useEffect } from 'react';
import axios from 'axios';

export function useHomeAssistantDevices() {
  const [haDevices, setHaDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      // Get the auth token from storage
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      if (!token) {
        console.warn('No authentication token available');
        setError('Authentication required');
        setHaDevices([]);
        setIsLoading(false);
        return;
      }
      
      const response = await axios.get('http://localhost:5000/api/home-assistant/states', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 2000, // 2 second timeout to prevent UI freezing
        validateStatus: function (status) {
          // Consider anything other than 5xx server errors as resolved
          // This lets us handle 401/422 errors more gracefully
          return status < 500;
        }
      });
      
      if (response.status !== 200) {
        if (response.status === 422 || response.status === 401) {
          console.warn('Authentication error with Home Assistant:', response.data);
          setError('Home Assistant authentication failed');
        } else {
          console.warn('Error response from Home Assistant API:', response.status, response.data);
          setError(`Home Assistant error: ${response.status}`);
        }
        
        // Set empty devices array when there's an error
        setHaDevices([]);
        
        // Store empty array in window object for voice command access
        if (typeof window !== 'undefined') {
          window.homeAssistantState = { haDevices: [], connectionError: true };
        }
        return;
      }
      
      // Success case - we have devices
      setHaDevices(response.data);
      setError(null);
      
      // Store in window object for voice command access
      if (typeof window !== 'undefined') {
        window.homeAssistantState = { haDevices: response.data, connectionError: false };
      }
    } catch (err) {
      console.error('Error fetching HA devices:', err);
      setError(err.message);
      setHaDevices([]);
      
      // Store empty array with error flag in window object
      if (typeof window !== 'undefined') {
        window.homeAssistantState = { haDevices: [], connectionError: true };
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDevice = async (entityId) => {
    try {
      // Get the auth token from storage
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      const response = await axios.post(
        `http://localhost:5000/api/home-assistant/toggle/${entityId}`, 
        {}, // Empty payload as we're just toggling
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 1500 // 1.5 second timeout for faster response
        }
      );
      
      // Update local state immediately with optimistic update
      setHaDevices(prev => {
        return prev.map(device => {
          if (device.entity_id === entityId) {
            // If the device state is "on", change to "off" and vice versa
            const newState = device.state === "on" ? "off" : "on";
            return {...device, state: newState};
          }
          return device;
        });
      });
      
      // Refresh device states after a short delay to ensure accuracy
      setTimeout(() => {
        fetchDevices();
      }, 500);
      
      return response.data;
    } catch (err) {
      console.error('Error toggling device:', err);
      setError(err.message);
      // Refresh to ensure UI consistency even after error
      fetchDevices();
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchDevices();
    
    // Set up periodic refresh (every 60 seconds)
    const intervalId = setInterval(() => {
      fetchDevices();
    }, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  return { haDevices, isLoading, error, fetchDevices, toggleDevice };
}
