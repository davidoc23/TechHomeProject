// styles/automationStyles.js
import { StyleSheet } from 'react-native';

export const automationStyles = StyleSheet.create({
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
  automationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10
  },
  automationInfo: {
    flex: 1
  },
  automationName: {
    fontSize: 16,
    fontWeight: '500'
  },
  automationType: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  automationActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  toggleButton: {
    backgroundColor: '#666',
    padding: 8,
    borderRadius: 6,
    marginRight: 8
  },
  toggleButtonEnabled: {
    backgroundColor: '#4CD964'
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 14
  },
  removeButton: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 6
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14
  }
});