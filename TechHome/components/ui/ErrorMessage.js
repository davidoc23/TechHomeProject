import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { errorStyles } from '../../styles/ui/errorStyles';

export const ErrorMessage = ({ message, retry }) => (
    <View style={errorStyles.container}>
        <Text style={errorStyles.text}>{message}</Text>
        <TouchableOpacity onPress={retry} style={errorStyles.button}>
            <Text style={errorStyles.buttonText}>Retry</Text>
        </TouchableOpacity>
    </View>
);