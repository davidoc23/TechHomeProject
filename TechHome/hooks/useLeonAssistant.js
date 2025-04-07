import { useState, useEffect, useCallback } from 'react';
import { useDeviceContext } from '../context/DeviceContext';
import { LEON_API_KEY } from '../config';
import { Platform } from 'react-native';

/**
 * Hook for connecting to the Leon voice assistant running at localhost:1337
 */
export function useLeonAssistant() {
    const { addActivity } = useDeviceContext();
    const [isConnected, setIsConnected] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [lastCommand, setLastCommand] = useState('');
    const [lastResponse, setLastResponse] = useState('');
    const [error, setError] = useState(null);
    const [hasPermission, setHasPermission] = useState(true);
    const [recognitionInstance, setRecognitionInstance] = useState(null);
    
    // Check if Web Speech API is available (web platforms only)
    const speechRecognitionAvailable = Platform.OS === 'web' && 
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    
    // Leon server configuration
    const LEON_SERVER = 'http://localhost:1338'; // Using the proxy
    const LEON_API = `${LEON_SERVER}/api/v1`;

    // Initialize speech recognition if available
    useEffect(() => {
        if (Platform.OS === 'web' && speechRecognitionAvailable) {
            try {
                // Create speech recognition instance
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                const recognition = new SpeechRecognition();
                
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.lang = 'en-US';
                
                // Set up event handlers
                recognition.onresult = (event) => {
                    if (event.results && event.results.length > 0) {
                        const transcript = event.results[0][0].transcript;
                        setLastCommand(transcript);
                        sendTextCommand(transcript);
                    }
                };
                
                recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event);
                    setError(`Voice recognition error: ${event.error}`);
                    setIsListening(false);
                };
                
                recognition.onend = () => {
                    setIsListening(false);
                };
                
                setRecognitionInstance(recognition);
                setHasPermission(true);
            } catch (err) {
                console.error('Error initializing speech recognition:', err);
                setError('Speech recognition not available');
                setHasPermission(false);
            }
        } else {
            // Not on web or speech recognition not available
            if (Platform.OS === 'web') {
                setError('Speech recognition not supported in this browser');
                setHasPermission(false);
            } else {
                setError('Speech recognition not available on this platform');
                setHasPermission(false);
            }
        }
    }, []);

    /**
     * Connect to Leon server and check status
     */
    const checkConnection = useCallback(async () => {
        try {
            const response = await fetch(`${LEON_API}/info`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setIsConnected(true);
                setError(null);
                return true;
            } else {
                setIsConnected(false);
                setError('Failed to connect to Leon server');
                return false;
            }
        } catch (err) {
            console.error('Leon connection error:', err);
            setIsConnected(false);
            setError(`Cannot connect to Leon: ${err.message}`);
            return false;
        }
    }, []);

    // Check connection when the hook is first used
    useEffect(() => {
        checkConnection();
    }, [checkConnection]);

    /**
     * Send a text command to Leon
     * @param {string} text - The command text to send
     */
    const sendTextCommand = async (text) => {
        setLastCommand(text);
        setError(null);

        if (!isConnected) {
            const connected = await checkConnection();
            if (!connected) {
                setLastResponse('Cannot connect to Leon assistant');
                return;
            }
        }

        try {
            const response = await fetch(`${LEON_API}/utterance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': LEON_API_KEY
                },
                body: JSON.stringify({ utterance: text })
            });

            if (response.ok) {
                const data = await response.json();
                const responseText = data.answer || data.message || 'Command processed';
                setLastResponse(responseText);
                
                // Log the activity
                if (data.answer) {
                    addActivity('Leon', `responded: "${data.answer}"`);
                }
            } else {
                try {
                    const errorData = await response.json();
                    setError(`Leon error: ${errorData.message || 'Unknown error'}`);
                } catch (e) {
                    setError(`Leon error: ${response.statusText}`);
                }
                setLastResponse('Sorry, there was an error processing your command');
            }
        } catch (err) {
            console.error('Error sending command to Leon:', err);
            setError(`Failed to send command: ${err.message}`);
            setLastResponse('Sorry, there was an error communicating with Leon');
        }
    };

    /**
     * Start voice recognition if available, otherwise just update UI state
     */
    const startListening = async () => {
        if (!isConnected) {
            const connected = await checkConnection();
            if (!connected) {
                setLastResponse('Cannot connect to Leon assistant');
                return;
            }
        }

        if (recognitionInstance && speechRecognitionAvailable) {
            try {
                recognitionInstance.start();
                setIsListening(true);
                setLastResponse('Listening... Speak your command');
            } catch (err) {
                console.error('Error starting speech recognition:', err);
                setError(`Failed to start voice recognition: ${err.message}`);
                setIsListening(false);
            }
        } else {
            // Fallback for non-web platforms or if speech recognition isn't available
            setIsListening(true);
            setLastResponse('Listening... (Voice recognition not available. Please type your command)');
        }
    };

    /**
     * Stop voice recognition if running, otherwise just update UI state
     */
    const stopListening = async () => {
        if (recognitionInstance && isListening && speechRecognitionAvailable) {
            try {
                recognitionInstance.stop();
            } catch (err) {
                console.error('Error stopping speech recognition:', err);
            }
        }
        
        setIsListening(false);
        setLastResponse('Stopped listening');
    };

    // Reconnect if the connection is lost
    useEffect(() => {
        if (!isConnected) {
            const intervalId = setInterval(() => {
                checkConnection();
            }, 5000);

            return () => clearInterval(intervalId);
        }
    }, [isConnected, checkConnection]);

    return {
        isConnected,
        isListening,
        lastCommand,
        lastResponse,
        error,
        sendTextCommand,
        startListening,
        stopListening,
        checkConnection,
        hasPermission,
        voiceEnabled: speechRecognitionAvailable && hasPermission
    };
}