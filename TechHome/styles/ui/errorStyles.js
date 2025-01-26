import { StyleSheet } from 'react-native';

export const errorStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    text: {
        fontSize: 16,
        color: '#FF3B30',
        textAlign: 'center',
        marginBottom: 15
    },
    button: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8
    },
    buttonText: {
        color: 'white',
        fontSize: 16
    }
});