import { StyleSheet } from 'react-native';

export const deviceStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
      },
      header: {
        marginBottom: 20,
      },
      title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f1f1f',
      },
      subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
      },
      deviceCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
      },
      deviceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      deviceDetails: {
        marginLeft: 12,
      },
      deviceName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1f1f1f',
      },
      deviceStatus: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
      },
      temperatureControls: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 12,
    },
    tempButton: {
        backgroundColor: '#007AFF',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tempButtonText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    tempDisplay: {
        fontSize: 16,
        fontWeight: '500',
        color: '#666',
    },
    });