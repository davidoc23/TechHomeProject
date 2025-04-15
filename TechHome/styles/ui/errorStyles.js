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
        textAlign: 'center',
        marginBottom: 15
    },
    button: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8
    },
    buttonText: {
        fontSize: 16
    }
});