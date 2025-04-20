import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
    const { toggleDevice, getRecentDevices } = useDevices();
    const { theme } = useTheme();

    // Fetch suggestions from the API
    const fetchSuggestions = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const token = await AsyncStorage.getItem('accessToken');
            
            if (!token) {
                console.warn('No access token, using mock suggestions');
                // Generate mock suggestion from recent devices
                const recentDevices = await getRecentDevices();
                if (recentDevices.length > 0) {
                    const mockSuggestions = [{
                        device_id: recentDevices[0].id,
                        name: recentDevices[0].name,
                        current_state: recentDevices[0].isOn,
                        suggested_state: !recentDevices[0].isOn,
                        confidence: 0.92
                    }];
                    setSuggestions(mockSuggestions);
                }
                setIsLoading(false);
                return;
            }
            
            // For testing/development - return mock suggestions if ML endpoint fails
            try {
                // For testing, don't require token
                const headers = {
                    'Content-Type': 'application/json'
                };
                
                // Add token if available
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                const response = await fetch(`${API_URL}/ml/suggestions`, {
                    method: 'GET',
                    headers,
                    // Add short timeout to prevent hanging
                    timeout: 3000
                });
            
                if (!response.ok) {
                    throw new Error('Failed to fetch AI suggestions');
                }
                
                const data = await response.json();
                setSuggestions(data.suggestions || []);
            } catch (err) {
                console.error('Error fetching AI suggestions:', err);
                // Provide mock suggestions for testing when ML service is unavailable
                const mockSuggestions = [];
                
                // Use recent devices to generate relevant suggestions
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
            const token = await AsyncStorage.getItem('accessToken');
            
            // Headers for request
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add token if available
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            await fetch(`${API_URL}/ml/feedback`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    device_id: deviceId,
                    accepted
                })
            });
        } catch (err) {
            console.error('Error sending suggestion feedback:', err);
        }
    };
    
    // Handle suggestion acceptance
    const acceptSuggestion = async (deviceId, suggestedState) => {
        try {
            // Toggle device through our usual flow
            await toggleDevice(deviceId);
            
            // Remove from suggestions
            setSuggestions(suggestions.filter(s => s.device_id !== deviceId));
            
            // Send positive feedback
            await sendFeedback(deviceId, true);
        } catch (err) {
            console.error('Error accepting suggestion:', err);
        }
    };
    
    // Handle suggestion dismissal
    const dismissSuggestion = async (deviceId) => {
        // Remove from suggestions
        setSuggestions(suggestions.filter(s => s.device_id !== deviceId));
        
        // Send negative feedback
        await sendFeedback(deviceId, false);
    };
    
    // Fetch suggestions on component mount and every 5 minutes
    useEffect(() => {
        fetchSuggestions();
        
        const interval = setInterval(() => {
            fetchSuggestions();
        }, 5 * 60 * 1000);
        
        return () => clearInterval(interval);
    }, []);
    
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