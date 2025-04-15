// styles/automationStyles.js
import { StyleSheet } from 'react-native';

export const automationStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15
  },
  section: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 8
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16
  },
  picker: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    color: 'inherit' // This helps with web compatibility
  },
  darkPicker: {
    // Additional styles specific to dark mode
    color: 'white',
    backgroundColor: '#121212'
  },
  addButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600'
  },
  automationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
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
    marginTop: 4
  },
  automationActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  toggleButton: {
    padding: 8,
    borderRadius: 6,
    marginRight: 8
  },
  toggleButtonText: {
    fontSize: 14
  },
  removeButton: {
    padding: 8,
    borderRadius: 6
  },
  removeButtonText: {
    fontSize: 14
  }
});