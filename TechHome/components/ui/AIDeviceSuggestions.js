import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useDevices } from '../../hooks/useDevices';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { API_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiSuggestionStyles } from '../../styles/aiSuggestionStyles';

export function AIDeviceSuggestions() {
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastFetchTime, setLastFetchTime] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const { toggleDevice, getRecentDevices } = useDevices();
    const { theme } = useTheme();

    // Check authentication status on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = await AsyncStorage.getItem('accessToken');
                setIsAuthenticated(!!token);
            } catch (err) {
                console.error('Error checking authentication:', err);
                setIsAuthenticated(false);
            }
        };
        
        checkAuth();
    }, []);

    // Get fresh token for API requests
    const getAuthHeaders = async () => {
        try {
            const token = await AsyncStorage.getItem('accessToken');
            
            if (!token) {
                return { 'Content-Type': 'application/json' };
            }
            
            // Check if token needs refresh
            const tokenExpiry = await AsyncStorage.getItem('tokenExpiry');
            const now = Date.now();
            
            if (tokenExpiry && parseInt(tokenExpiry) < now) {
                // Token expired, attempt refresh
                const refreshToken = await AsyncStorage.getItem('refreshToken');
                
                if (refreshToken) {
                    try {
                        const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ refresh_token: refreshToken })
                        });
                        
                        if (refreshResponse.ok) {
                            const tokenData = await refreshResponse.json();
                            
                            // Save new tokens
                            await AsyncStorage.setItem('accessToken', tokenData.access_token);
                            await AsyncStorage.setItem('refreshToken', tokenData.refresh_token);
                            
                            // Calculate expiry (subtract 30 seconds for safety margin)
                            const expiry = Date.now() + (tokenData.expires_in * 1000) - 30000;
                            await AsyncStorage.setItem('tokenExpiry', expiry.toString());
                            
                            setIsAuthenticated(true);
                            return {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${tokenData.access_token}`
                            };
                        } else {
                            // Refresh failed, user needs to login again
                            setIsAuthenticated(false);
                            return { 'Content-Type': 'application/json' };
                        }
                    } catch (err) {
                        console.error('Token refresh error:', err);
                        setIsAuthenticated(false);
                        return { 'Content-Type': 'application/json' };
                    }
                }
            } else {
                // Token valid, use it
                setIsAuthenticated(true);
                return {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                };
            }
        } catch (err) {
            console.error('Error getting auth headers:', err);
            return { 'Content-Type': 'application/json' };
        }
        
        return { 'Content-Type': 'application/json' };
    };

    // Fetch suggestions from the API
    const fetchSuggestions = async (force = false) => {
        // Don't refetch if we've fetched in the last minute (unless forced)
        const now = Date.now();
        if (!force && lastFetchTime && (now - lastFetchTime < 60000)) {
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            // Get fresh auth headers
            const headers = await getAuthHeaders();
            
            // Try to fetch from the API first
            try {
                const response = await fetch(`${API_URL}/ml/suggestions`, {
                    method: 'GET',
                    headers,
                    timeout: 5000
                });
            
                if (!response.ok) {
                    // If unauthorized, clear authenticated status
                    if (response.status === 401) {
                        setIsAuthenticated(false);
                    }
                    throw new Error('Failed to fetch AI suggestions');
                }
                
                const data = await response.json();
                setSuggestions(data.suggestions || []);
                setLastFetchTime(now);
                return;
            } catch (err) {
                // API fetch failed, fall back to local suggestions
                console.error('Error fetching AI suggestions:', err);
                
                // If not authenticated, don't show mock suggestions
                if (!isAuthenticated) {
                    setError('Please login to get smart device suggestions');
                    setSuggestions([]);
                    setLastFetchTime(now);
                    return;
                }
                
                // Generate mock suggestions from recent device history
                const mockSuggestions = [];
                const recentDevices = await getRecentDevices();
                
                if (recentDevices.length > 0) {
                    // Use most recently accessed device for a mock suggestion
                    const lastDevice = recentDevices[0];
                    mockSuggestions.push({
                        device_id: lastDevice.id,
                        name: lastDevice.name,
                        current_state: lastDevice.isOn,
                        suggested_state: !lastDevice.isOn, // Suggest opposite of current state
                        confidence: 0.85
                    });
                    
                    // If we have more than one recent device, occasionally suggest another one
                    if (recentDevices.length > 1 && Math.random() > 0.7) {
                        const secondDevice = recentDevices[1];
                        mockSuggestions.push({
                            device_id: secondDevice.id,
                            name: secondDevice.name,
                            current_state: secondDevice.isOn,
                            suggested_state: !secondDevice.isOn,
                            confidence: 0.75
                        });
                    }
                }
                
                setSuggestions(mockSuggestions);
                setLastFetchTime(now);
            }
        } catch (err) {
            console.error('Error in suggestion handling:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Send feedback about a suggestion
    const sendFeedback = async (deviceId, accepted) => {
        try {
            const headers = await getAuthHeaders();
            
            // Don't send feedback if not authenticated
            if (!isAuthenticated || !headers.Authorization) {
                console.warn('Not sending feedback - user not authenticated');
                return;
            }
            
            const response = await fetch(`${API_URL}/ml/feedback`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    device_id: deviceId,
                    accepted
                })
            });
            
            if (!response.ok) {
                console.warn('Failed to send feedback, status:', response.status);
            }
        } catch (err) {
            console.error('Error sending suggestion feedback:', err);
            // Silently fail - we don't want to interrupt UX for feedback failures
        }
    };
    
    // Handle suggestion acceptance
    const acceptSuggestion = async (deviceId, suggestedState) => {
        try {
            // Remove from suggestions immediately for better UX
            setSuggestions(prevSuggestions => 
                prevSuggestions.filter(s => s.device_id !== deviceId)
            );
            
            // Send positive feedback if authenticated
            if (isAuthenticated) {
                await sendFeedback(deviceId, true);
            }
            
            // Toggle device through our usual flow
            await toggleDevice(deviceId);
        } catch (err) {
            console.error('Error accepting suggestion:', err);
            // Show error but allow retrying
            setError('Failed to apply suggestion: ' + (err.message || 'Unknown error'));
            
            // Refetch suggestions to ensure UI is consistent
            fetchSuggestions(true);
        }
    };
    
    // Handle suggestion dismissal
    const dismissSuggestion = async (deviceId) => {
        // Remove from suggestions first for responsive UI
        setSuggestions(prevSuggestions => 
            prevSuggestions.filter(s => s.device_id !== deviceId)
        );
        
        // Send negative feedback if authenticated
        if (isAuthenticated) {
            try {
                await sendFeedback(deviceId, false);
            } catch (err) {
                console.warn('Failed to send dismiss feedback:', err);
            }
        }
    };
    
    // Refresh suggestions
    const refreshSuggestions = () => {
        fetchSuggestions(true);
    };
    
    // Login button handler
    const handleLogin = () => {
        // Navigate to login screen
        // This would be implemented by the parent component
        console.log('User should be directed to login screen');
    };
    
    // Fetch suggestions on component mount and every 5 minutes
    useEffect(() => {
        fetchSuggestions();
        
        const interval = setInterval(() => {
            fetchSuggestions();
        }, 5 * 60 * 1000);
        
        return () => clearInterval(interval);
    }, [isAuthenticated]); // Refetch when auth status changes
    
    // Authentication required but not logged in
    if (!isAuthenticated) {
        return (
            <View style={[aiSuggestionStyles.container, { backgroundColor: theme.cardBackground }]}>
                <Text style={[aiSuggestionStyles.title, { color: theme.textPrimary }]}>
                    <Ionicons name="bulb-outline" size={18} color={theme.primary} /> Smart Suggestions
                </Text>
                <Text style={[aiSuggestionStyles.messageText, { color: theme.textSecondary }]}>
                    Login to get personalized device suggestions based on your usage patterns.
                </Text>
                <TouchableOpacity 
                    style={[aiSuggestionStyles.loginButton, { backgroundColor: theme.primary }]}
                    onPress={handleLogin}
                >
                    <Text style={aiSuggestionStyles.buttonText}>Login</Text>
                </TouchableOpacity>
            </View>
        );
    }
    
    if (isLoading && suggestions.length === 0) {
        return (
            <View style={[aiSuggestionStyles.container, { backgroundColor: theme.cardBackground }]}>
                <Text style={[aiSuggestionStyles.title, { color: theme.textPrimary }]}>
                    <Ionicons name="bulb-outline" size={18} color={theme.primary} /> Smart Suggestions
                </Text>
                <View style={aiSuggestionStyles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <Text style={[aiSuggestionStyles.loadingText, { color: theme.textSecondary }]}>
                        Looking for suggestions...
                    </Text>
                </View>
            </View>
        );
    }
    
    if (error && suggestions.length === 0) {
        return (
            <View style={[aiSuggestionStyles.container, { backgroundColor: theme.cardBackground }]}>
                <Text style={[aiSuggestionStyles.title, { color: theme.textPrimary }]}>
                    <Ionicons name="bulb-outline" size={18} color={theme.primary} /> Smart Suggestions
                </Text>
                <Text style={[aiSuggestionStyles.errorText, { color: theme.error }]}>
                    {error}
                </Text>
                <TouchableOpacity 
                    style={[aiSuggestionStyles.retryButton, { borderColor: theme.border }]}
                    onPress={refreshSuggestions}
                >
                    <Text style={{ color: theme.primary }}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }
    
    if (suggestions.length === 0) {
        return null; // Don't render anything if no suggestions
    }
    
    return (
        <View style={[aiSuggestionStyles.container, { backgroundColor: theme.cardBackground }]}>
            <Text style={[aiSuggestionStyles.title, { color: theme.textPrimary }]}>
                <Ionicons name="bulb-outline" size={18} color={theme.primary} /> Smart Suggestions
            </Text>
            
            {suggestions.map(suggestion => (
                <View key={suggestion.device_id} style={aiSuggestionStyles.suggestionItem}>
                    <Text style={[aiSuggestionStyles.deviceName, { color: theme.textPrimary }]}>
                        {suggestion.name}
                    </Text>
                    <Text style={[aiSuggestionStyles.suggestionText, { color: theme.textSecondary }]}>
                        Suggested: Turn {suggestion.suggested_state ? 'ON' : 'OFF'}
                        {suggestion.confidence > 0.9 ? ' (Strong confidence)' : ''}
                    </Text>
                    
                    <View style={aiSuggestionStyles.actionButtons}>
                        <TouchableOpacity 
                            style={[aiSuggestionStyles.actionButton, aiSuggestionStyles.acceptButton, { backgroundColor: theme.primary }]}
                            onPress={() => acceptSuggestion(suggestion.device_id, suggestion.suggested_state)}
                        >
                            <Text style={aiSuggestionStyles.buttonText}>Accept</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[aiSuggestionStyles.actionButton, aiSuggestionStyles.dismissButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                            onPress={() => dismissSuggestion(suggestion.device_id)}
                        >
                            <Text style={[aiSuggestionStyles.buttonText, { color: theme.textSecondary }]}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ))}
        </View>
    );
}