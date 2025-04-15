import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { loadingStyles } from '../../styles/ui/loadingStyles';
import { useTheme } from '../../context/ThemeContext';

export const LoadingSpinner = () => {
    const { theme } = useTheme();
    
    return (
        <View style={[loadingStyles.container, { backgroundColor: theme.background }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[loadingStyles.text, { color: theme.textSecondary }]}>Loading devices...</Text>
        </View>
    );
};