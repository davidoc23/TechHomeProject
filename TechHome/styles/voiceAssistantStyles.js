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
    fontWeight: 'bold'
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1
  },
  micButtonActive: {
    // backgroundColor handled in component
  },
  micText: {
    fontSize: 16
  },
  responseContainer: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    minHeight: 100
  },
  commandText: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500'
  },
  responseText: {
    fontSize: 16
  },
  hintText: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 10
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorText: {
    marginTop: 10
  },
  
  // Connection styles
  connectingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30
  },
  connectingText: {
    marginTop: 16,
    fontSize: 16
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20
  },
  retryButton: {
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
    // Use theme.success in component
  },
  statusDisconnected: {
    // Use theme.danger in component
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5
  },
  statusText: {
    fontSize: 12
  }
});