import { StyleSheet } from 'react-native';

export const aiSuggestionStyles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 16,
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12
    },
    suggestionItem: {
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eaeaea'
    },
    deviceName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4
    },
    suggestionText: {
        fontSize: 14,
        marginBottom: 12
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end'
    },
    actionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
        marginLeft: 8,
        borderWidth: 1,
        borderColor: 'transparent'
    },
    acceptButton: {
        backgroundColor: '#4CAF50'
    },
    dismissButton: {
        backgroundColor: 'transparent',
        borderColor: '#ccc'
    },
    buttonText: {
        color: 'white',
        fontWeight: '500'
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
    },
    loadingText: {
        marginLeft: 8,
        fontSize: 14
    },
    errorText: {
        fontSize: 14,
        marginBottom: 12,
        textAlign: 'center'
    },
    retryButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
        borderWidth: 1,
        alignSelf: 'center'
    }
});