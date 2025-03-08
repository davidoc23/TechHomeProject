import { StyleSheet } from 'react-native';

export const voiceAssistantStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333'
  },
  closeButton: {
    padding: 5
  },
  micContainer: {
    alignItems: 'center',
    marginVertical: 20
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  micButtonActive: {
    backgroundColor: '#007AFF'
  },
  micText: {
    fontSize: 16,
    color: '#666'
  },
  responseContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    minHeight: 100
  },
  commandText: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
    color: '#333'
  },
  responseText: {
    fontSize: 16,
    color: '#555'
  },
  hintText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 10
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorText: {
    color: 'red',
    marginTop: 10
  },
  
  // New styles for Leon connection
  connectingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30
  },
  connectingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
    marginTop: 10,
    marginBottom: 5
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5
  },
  statusConnected: {
    backgroundColor: 'green'
  },
  statusDisconnected: {
    backgroundColor: 'red'
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5
  },
  statusText: {
    fontSize: 12,
    color: '#666'
  }
});