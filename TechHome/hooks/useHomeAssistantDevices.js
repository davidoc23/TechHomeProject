import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useHomeAssistantDevices() {
  const [haDevices, setHaDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { logout } = useAuth();

  const getAuthToken = async () => {
    try {
      // Try AsyncStorage first as we confirmed it works
      const token = await AsyncStorage.getItem('accessToken');
      return token;
    } catch (err) {
      console.error('Error retrieving token:', err);
      return null;
    }
  };

  const forceLogout = async () => {
    console.log('Token expired - forcing logout');
    try {
      // First clear token to prevent further API calls
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      
      // Then call logout from context
      if (logout) {
        await logout();
        console.log('Logout completed successfully');
      } else {
        console.error('Logout function not available in context');
        // Fallback if context logout isn't working
        await AsyncStorage.removeItem('user');
        // Force reload the app to simulate logout
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    } catch (err) {
      console.error('Error during forced logout:', err);
      // Force reload as last resort
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  // Helper function to check if token is expired
  const isTokenExpired = (token) => {
    try {
      if (!token) return true;
      
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) return true;
      
      const payload = JSON.parse(atob(tokenParts[1]));
      if (!payload.exp) return true;
      
      // Add 30 second buffer to prevent edge cases
      return (Date.now() > (payload.exp * 1000 - 30000));
    } catch (err) {
      console.warn('Error checking token expiration:', err);
      return true; // Assume expired on error
    }
  };

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      // Get the actual token from storage directly
      const token = await getAuthToken();
      
      if (!token) {
        console.warn('No authentication token available');
        setError('Authentication required');
        setHaDevices([]);
        setIsLoading(false);
        
        // No token means we should force logout
        await forceLogout();
        return;
      }
      
      // Pre-emptively check token expiration before making API call
      if (isTokenExpired(token)) {
        console.log('Token already expired, forcing logout without API call');
        setError('Session expired - please log in again');
        setHaDevices([]);
        setIsLoading(false);
        await forceLogout();
        return;
      }
      
      console.log('Token found and valid, making API request');
      
      // Now we know we have a valid token, proceed with request
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
        if (response.status === 422) {
          console.warn('Home Assistant configuration error:', response.data);
          setError('Home Assistant configuration error');
        } else if (response.status === 401) {
          console.warn('Authentication error with Home Assistant:', response.data);
          
          // Check if error message specifically mentions token expiration
          const isExpiredToken = 
            response.data?.msg?.toLowerCase().includes('expired') || 
            response.data?.error?.toLowerCase().includes('expired') ||
            response.data?.detail?.toLowerCase().includes('expired');
          
          if (isExpiredToken) {
            console.warn('Token has expired, forcing logout');
            setError('Session expired - please log in again');
            
            // Force logout immediately
            await forceLogout();
          } else {
            setError('Authentication failed - please log in again');
          }
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
      
      // Check if the error is an Axios error with a 401 status
      if (err.response && err.response.status === 401) {
        console.warn('Authentication error (caught in catch block):', err.response.data);
        setError('Session expired - please log in again');
        
        // Force logout
        await forceLogout();
      } else {
        setError(err.message);
      }
      
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
      // Get the auth token directly from storage
      const token = await getAuthToken();
      
      if (!token) {
        console.warn('No authentication token available for device toggle');
        setError('Authentication required');
        await forceLogout();
        return null;
      }
      
      // Pre-emptively check token expiration before making API call
      if (isTokenExpired(token)) {
        console.log('Token already expired, forcing logout without API call');
        setError('Session expired - please log in again');
        await forceLogout();
        return null;
      }
      
      const response = await axios.post(
        `http://localhost:5000/api/home-assistant/toggle/${entityId}`, 
        {}, // Empty payload as we're just toggling
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 1500, // 1.5 second timeout for faster response
          validateStatus: function (status) {
            // Consider anything other than 5xx as resolved for better error handling
            return status < 500;
          }
        }
      );
      
      // Handle non-200 responses
      if (response.status !== 200) {
        if (response.status === 401) {
          console.warn('Authentication expired while toggling device:', response.data);
          setError('Session expired - please log in again');
          
          // Force logout
          await forceLogout();
          return null;
        } else if (response.status === 422) {
          console.warn('Home Assistant configuration error:', response.data);
          setError('Home Assistant configuration error');
          return null;
        } else {
          console.warn(`Error response (${response.status}):`, response.data);
          setError(response.data?.error || `Error: ${response.status}`);
          return null;
        }
      }
      
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
      
      // Check if the error is an Axios error with a 401 status
      if (err.response && err.response.status === 401) {
        console.warn('Authentication error while toggling device (caught in catch block):', err.response.data);
        setError('Session expired - please log in again');
        
        // Force logout
        await forceLogout();
      } else {
        setError(err.message);
      }
      
      // Refresh to ensure UI consistency even after error
      fetchDevices();
      return null;
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
  }, []); // Only run on mount

  return { haDevices, isLoading, error, fetchDevices, toggleDevice };
}