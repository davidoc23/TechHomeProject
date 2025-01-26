import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { loadingStyles } from '../../styles/ui/loadingStyles';

export const LoadingSpinner = () => (
    <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={loadingStyles.text}>Loading devices...</Text>
    </View>
);