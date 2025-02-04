import { StyleSheet } from 'react-native';

export const deviceManagementStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#fff'
  },
  section: {
    marginBottom: 20
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10
  },
  deviceInfo: {
    flex: 1
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500'
  },
  deviceType: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  removeButton: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 6,
    marginLeft: 10
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14
  },
  deviceDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
}
});