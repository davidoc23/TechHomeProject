import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLeonAssistant } from '../../hooks/useLeonAssistant';
import { voiceAssistantStyles } from '../../styles/voiceAssistantStyles';

/**
 * Voice Assistant Modal Component that connects to Leon
 * Appears when the user presses the voice control button on HomeScreen
 */
export const LeonVoiceAssistant = ({ visible, onClose }) => {
  const { 
    isConnected,
    isListening, 
    lastCommand, 
    lastResponse, 
    error,
    voiceEnabled,
    sendTextCommand, 
    startListening, 
    stopListening,
    checkConnection
  } = useLeonAssistant();
  
  const [commandInput, setCommandInput] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Try to connect when modal becomes visible
  useEffect(() => {
    if (visible && !isConnected) {
      setConnecting(true);
      checkConnection().finally(() => setConnecting(false));
    }
  }, [visible, isConnected, checkConnection]);

  const handleSubmit = () => {
    if (commandInput.trim()) {
      sendTextCommand(commandInput);
      setCommandInput('');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={voiceAssistantStyles.modalOverlay}>
        <View style={voiceAssistantStyles.modalContent}>
          <View style={voiceAssistantStyles.header}>
            <Text style={voiceAssistantStyles.title}>Leon Voice Assistant</Text>
            <TouchableOpacity onPress={onClose} style={voiceAssistantStyles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {connecting ? (
            <View style={voiceAssistantStyles.connectingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={voiceAssistantStyles.connectingText}>Connecting to Leon...</Text>
            </View>
          ) : !isConnected ? (
            <View style={voiceAssistantStyles.errorContainer}>
              <Ionicons name="warning" size={40} color="#f44336" />
              <Text style={voiceAssistantStyles.errorTitle}>Cannot connect to Leon</Text>
              <Text style={voiceAssistantStyles.errorText}>
                Make sure Leon is running at http://localhost:1337
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setConnecting(true);
                  checkConnection().finally(() => setConnecting(false));
                }}
                style={voiceAssistantStyles.retryButton}
              >
                <Text style={voiceAssistantStyles.retryButtonText}>Retry Connection</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={voiceAssistantStyles.micContainer}>
                <TouchableOpacity 
                  onPress={toggleListening}
                  style={[
                    voiceAssistantStyles.micButton, 
                    isListening && voiceAssistantStyles.micButtonActive
                  ]}
                >
                  <Ionicons name="mic" size={36} color={isListening ? "#fff" : "#007AFF"} />
                </TouchableOpacity>
                <Text style={voiceAssistantStyles.micText}>
                  {isListening 
                    ? "Listening..." 
                    : voiceEnabled 
                      ? "Tap to speak" 
                      : "Voice input not available"
                  }
                </Text>
              </View>

              <View style={voiceAssistantStyles.responseContainer}>
                {lastCommand ? (
                  <>
                    <Text style={voiceAssistantStyles.commandText}>You said: "{lastCommand}"</Text>
                    <Text style={voiceAssistantStyles.responseText}>Leon: {lastResponse}</Text>
                  </>
                ) : (
                  <Text style={voiceAssistantStyles.hintText}>
                    Try saying "Turn on the porch light" or "Set thermostat to 72 degrees"
                  </Text>
                )}
              </View>

              <View style={voiceAssistantStyles.inputContainer}>
                <TextInput
                  style={voiceAssistantStyles.input}
                  value={commandInput}
                  onChangeText={setCommandInput}
                  placeholder="Or type a command..."
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity onPress={handleSubmit} style={voiceAssistantStyles.sendButton}>
                  <Ionicons name="send" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {error && <Text style={voiceAssistantStyles.errorText}>{error}</Text>}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};