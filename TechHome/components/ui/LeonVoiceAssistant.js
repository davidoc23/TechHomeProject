import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLeonAssistant } from '../../hooks/useLeonAssistant';
import { voiceAssistantStyles } from '../../styles/voiceAssistantStyles';
import { useTheme } from '../../context/ThemeContext';

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
    checkConnection,
    hasPermission
  } = useLeonAssistant();
  
  const { theme } = useTheme();
  const [commandInput, setCommandInput] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Try to connect when modal becomes visible and prefetch HA devices
  useEffect(() => {
    if (visible) {
      // Always ensure Home Assistant devices are available for voice commands
      if (typeof window !== 'undefined' && (!window.homeAssistantState || !window.homeAssistantState.haDevices.length)) {
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        fetch('http://localhost:5000/api/home-assistant/states', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
          .then(response => response.json())
          .then(data => {
            window.homeAssistantState = { haDevices: data };
            console.log('Prefetched Home Assistant devices for voice commands');
          })
          .catch(err => console.error('Error prefetching HA devices:', err));
      }
      
      // Connect to Leon if needed
      if (!isConnected) {
        setConnecting(true);
        checkConnection().finally(() => setConnecting(false));
      }
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

  const renderMicrophonePermissionError = () => (
    <View style={voiceAssistantStyles.errorContainer}>
      <Ionicons name="mic-off" size={40} color={theme.danger} />
      <Text style={[voiceAssistantStyles.errorTitle, { color: theme.danger }]}>Microphone Access Required</Text>
      <Text style={[voiceAssistantStyles.errorText, { color: theme.textSecondary }]}>
        Please grant microphone permissions to use the voice assistant.
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={voiceAssistantStyles.modalOverlay}>
        <View style={[voiceAssistantStyles.modalContent, { backgroundColor: theme.cardBackground }]}>
          <View style={voiceAssistantStyles.header}>
            <Text style={[voiceAssistantStyles.title, { color: theme.text }]}>Leon Voice Assistant</Text>
            <TouchableOpacity onPress={onClose} style={voiceAssistantStyles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {connecting ? (
            <View style={voiceAssistantStyles.connectingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[voiceAssistantStyles.connectingText, { color: theme.textSecondary }]}>Connecting to Leon...</Text>
            </View>
          ) : !isConnected ? (
            <View style={voiceAssistantStyles.errorContainer}>
              <Ionicons name="warning" size={40} color={theme.danger} />
              <Text style={[voiceAssistantStyles.errorTitle, { color: theme.danger }]}>Cannot connect to Leon</Text>
              <Text style={[voiceAssistantStyles.errorText, { color: theme.textSecondary }]}>
                Make sure Leon is running at http://localhost:1337
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setConnecting(true);
                  checkConnection().finally(() => setConnecting(false));
                }}
                style={[voiceAssistantStyles.retryButton, { backgroundColor: theme.primary }]}
              >
                <Text style={voiceAssistantStyles.retryButtonText}>Retry Connection</Text>
              </TouchableOpacity>
            </View>
          ) : !hasPermission ? (
            renderMicrophonePermissionError()
          ) : (
            <>
              <View style={voiceAssistantStyles.micContainer}>
                <TouchableOpacity 
                  onPress={toggleListening}
                  style={[
                    voiceAssistantStyles.micButton, 
                    { borderColor: theme.primary },
                    isListening && [voiceAssistantStyles.micButtonActive, { backgroundColor: theme.primary }]
                  ]}
                >
                  <Ionicons name="mic" size={36} color={isListening ? "#fff" : theme.primary} />
                </TouchableOpacity>
                <Text style={[voiceAssistantStyles.micText, { color: theme.textSecondary }]}>
                  {isListening 
                    ? "Listening..." 
                    : voiceEnabled 
                      ? "Tap to speak" 
                      : "Voice input not available"
                  }
                </Text>
              </View>

              <View style={[voiceAssistantStyles.responseContainer, { backgroundColor: theme.isDarkMode ? theme.cardBackground : '#f8f8f8' }]}>
                {lastCommand ? (
                  <>
                    <Text style={[voiceAssistantStyles.commandText, { color: theme.text }]}>You said: "{lastCommand}"</Text>
                    <Text style={[voiceAssistantStyles.responseText, { color: theme.textSecondary }]}>Leon: {lastResponse}</Text>
                  </>
                ) : (
                  <Text style={[voiceAssistantStyles.hintText, { color: theme.textTertiary }]}>
                    Try saying "Turn on the porch light" or "Set thermostat to 72 degrees"
                  </Text>
                )}
              </View>

              <View style={voiceAssistantStyles.inputContainer}>
                <TextInput
                  style={[voiceAssistantStyles.input, { backgroundColor: theme.isDarkMode ? theme.border : '#f0f0f0', color: theme.text }]}
                  value={commandInput}
                  onChangeText={setCommandInput}
                  placeholder="Or type a command..."
                  placeholderTextColor={theme.textTertiary}
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity onPress={handleSubmit} style={[voiceAssistantStyles.sendButton, { backgroundColor: theme.primary }]}>
                  <Ionicons name="send" size={24} color="white" />
                </TouchableOpacity>
              </View>

              {error && <Text style={[voiceAssistantStyles.errorText, { color: theme.danger }]}>{error}</Text>}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};