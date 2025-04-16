import { useState, useEffect, useCallback } from 'react';
import { useDeviceContext, DEVICE_EVENTS } from '../context/DeviceContext';
import { useDevices } from '../hooks/useDevices';
import { LEON_API_KEY } from '../config';
import { Platform } from 'react-native';

/**
 * Hook for connecting to the Leon voice assistant running at localhost:1337
 */
export function useLeonAssistant() {
    const { addActivity, devices, subscribeToDeviceEvents, emitDeviceEvent, setLastCommandTime } = useDeviceContext();
    const { toggleDevice, toggleAllLights } = useDevices();
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

    // Helper for finding devices by name
    const findDeviceByName = useCallback((name) => {
        if (!name || !devices || devices.length === 0) return null;

        // Convert to lowercase for case-insensitive matching
        const searchName = name.toLowerCase();

        console.log("Searching for device:", searchName);
        console.log("Available devices:", devices.map(d => d.name));

        // First try exact match
        let device = devices.find(d =>
            d.name.toLowerCase() === searchName
        );

        // If no exact match, try partial match
        if (!device) {
            device = devices.find(d =>
                d.name.toLowerCase().includes(searchName) ||
                searchName.includes(d.name.toLowerCase())
            );
        }

        console.log("Found device:", device);

        return device;
    }, [devices]);

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
                
                // We'll set up the onresult handler when we start listening
                
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
     * Process Home Assistant commands in voice commands
     * @param {string} text - The command text to look for HA patterns
     * @returns {Promise<boolean>} - Whether an HA command was processed
     */
    /**
     * Process a smart home command directly without relying on Leon
     * @param {string} text - The user's command text
     * @returns {boolean} True if command was handled, false if it should be sent to Leon
     */
    const processSmartHomeCommand = async (text) => {
        // Signal a new user command (for polling optimization)
        setLastCommandTime(Date.now());

        const command = text.toLowerCase().trim();

        // Handle turning devices on and off
        const turnOnMatch = command.match(/turn on (?:the )?(.+)/i);
        const turnOffMatch = command.match(/turn off (?:the )?(.+)/i);

        // Handle "all lights" command
        if (command.includes("all lights on") || command.includes("turn on all lights")) {
            try {
                await toggleAllLights(true);
                setLastResponse("Turning on all lights");
                addActivity('Leon', "turned on all lights");
                return true;
            } catch (err) {
                setLastResponse("Sorry, I couldn't control the lights");
                return true;
            }
        }

        if (command.includes("all lights off") || command.includes("turn off all lights")) {
            try {
                await toggleAllLights(false);
                setLastResponse("Turning off all lights");
                addActivity('Leon', "turned off all lights");
                return true;
            } catch (err) {
                setLastResponse("Sorry, I couldn't control the lights");
                return true;
            }
        }

        // Handle turning specific device on
        if (turnOnMatch) {
            const deviceName = turnOnMatch[1].trim();
            const device = findDeviceByName(deviceName);

            if (device) {
                try {
                    // Toggle the device directly through our context system
                    await toggleDevice(device.id);
                    setLastResponse(`Turning on ${device.name}`);
                    addActivity('Leon', `turned on ${device.name}`);
                    return true;
                } catch (err) {
                    setLastResponse(`Sorry, I couldn't turn on ${deviceName}`);
                    return true;
                }
            }
        }

        // Handle turning specific device off
        if (turnOffMatch) {
            const deviceName = turnOffMatch[1].trim();
            const device = findDeviceByName(deviceName);

            if (device) {
                try {
                    // Toggle the device directly through our context system
                    await toggleDevice(device.id);
                    setLastResponse(`Turning off ${device.name}`);
                    addActivity('Leon', `turned off ${device.name}`);
                    return true;
                } catch (err) {
                    setLastResponse(`Sorry, I couldn't turn off ${deviceName}`);
                    return true;
                }
            }
        }

        // If command wasn't handled by our direct system
        return false;
    };

    const processHomeAssistantCommand = async (text) => {
        // Normalize the text for easier matching
        const normalizedText = text.toLowerCase().trim();
        
        // Patterns for device control commands
        const turnOnPattern = /turn on (the )?(.*?)( light| lights)?$/i;
        const turnOffPattern = /turn off (the )?(.*?)( light| lights)?$/i;
        
        let haDevices = [];
        let connectionError = false;
        
        // Try to get devices from window object (prefetched in LeonVoiceAssistant.js)
        if (typeof window !== 'undefined' && window.homeAssistantState) {
            haDevices = window.homeAssistantState.haDevices || [];
            connectionError = window.homeAssistantState.connectionError || false;
            
            // Ensure haDevices is an array
            if (!Array.isArray(haDevices)) {
                console.warn('Home Assistant devices is not an array:', haDevices);
                haDevices = [];
            }
            
            // If there's a connection error, inform the user but still try to use local devices
            if (connectionError) {
                console.warn('Home Assistant connection error detected');
                // Try to process as a local device command instead
                const localResult = await processLocalDeviceCommand(text);
                if (localResult) {
                    return true;
                }
                setLastResponse("I'm unable to connect to Home Assistant, and couldn't find a matching local device");
                return true;
            }
        } else {
            // If not available, try to use local devices instead
            console.warn('No Home Assistant devices available for voice commands');
            const localResult = await processLocalDeviceCommand(text);
            if (localResult) {
                return true;
            }
            return false;
        }
        
        try {
            let matchedDevice = null;
            let targetState = null;
            
            // Debug log - what do we actually have?
            console.log(`Processing HA command. Device count: ${haDevices.length}`);
            
            // Since Home Assistant integration fails, let's fallback to local devices
            return false;
            
            // If we found a matching device, toggle it
            if (matchedDevice) {
                console.log(`Found matching device: ${matchedDevice.entity_id}`);
                
                // Check if Home Assistant is available before trying to control device
                if (window.homeAssistantState && window.homeAssistantState.connectionError) {
                    const authError = window.homeAssistantState.authError;
                    
                    if (authError) {
                        setLastResponse("I'm unable to control Home Assistant devices due to an authentication error. Please try logging in again.");
                    } else {
                        setLastResponse("I can't reach Home Assistant right now. Please check if it's online and try again later.");
                    }
                    return true;
                }
                
                // Get auth token
                const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
                
                if (!token) {
                    setLastResponse("I need you to log in before I can control smart home devices.");
                    return true;
                }
                
                // Determine if we need to toggle or set to specific state
                const currentState = matchedDevice.state === 'on';
                let endpoint = `http://localhost:5000/api/home-assistant/toggle/${matchedDevice.entity_id}`;
                
                // If current state matches desired state, no need to toggle
                if (currentState === targetState) {
                    console.log(`Device ${matchedDevice.entity_id} is already ${targetState ? 'ON' : 'OFF'}`);
                    setLastResponse(`The ${matchedDevice.attributes?.friendly_name} is already ${targetState ? 'on' : 'off'}`);
                    return true;
                }
                
                // Make the request with a short timeout
                console.log(`Toggling device ${matchedDevice.entity_id}`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1500);
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    setLastResponse(`${targetState ? 'Turned on' : 'Turned off'} the ${matchedDevice.attributes?.friendly_name}`);
                    addActivity('Leon', `${targetState ? 'turned on' : 'turned off'} ${matchedDevice.attributes?.friendly_name}`);
                    return true;
                } else {
                    console.error('Failed to toggle device:', await response.text());
                    setError('Failed to control device. Please try again.');
                    return true; // We still handled the command, even though it failed
                }
            }
            
            return false; // No device found
            
        } catch (err) {
            console.error('Error processing Home Assistant command:', err);
            if (err.name === 'AbortError') {
                setError('Device control timed out. Please try again.');
            } else {
                setError(`Error controlling device: ${err.message}`);
            }
            return true; // We tried to handle an HA command but it failed
        }
    };

    /**
     * Handle a recognized voice command directly within our hook
     */
    const handleVoiceCommand = async (transcript) => {
        console.log("Voice command recognized:", transcript);
        setLastCommand(transcript);

        // First try to process it locally for Home Assistant devices
        try {
            const handled = await processSmartHomeCommand(transcript);
            if (handled) {
                // Command was processed locally, no need to send to Leon
                console.log("Command handled locally by smart home processor");
                return;
            }
        } catch (err) {
            console.error("Error in local command processing:", err);
            // Continue to Leon if local processing fails
        }

        // If not handled locally, send to Leon
        sendTextCommand(transcript);
    };

    /**
     * Send a text command to Leon
     * @param {string} text - The command text to send
     */
    const sendTextCommand = async (text) => {
        setLastCommand(text);
        setError(null);

        // First try to process locally for faster response
        try {
            const handled = await processSmartHomeCommand(text);
            if (handled) {
                // Command was processed locally, no need to send to Leon
                return;
            }
        } catch (err) {
            console.error("Error in local command processing:", err);
            // Continue to Leon if local processing fails
        }

        // If not handled locally, send to Leon

        if (!isConnected) {
            const connected = await checkConnection();
            if (!connected) {
                setLastResponse('Cannot connect to Leon assistant');
                return;
            }
        }

        try {
            // Set a timeout to prevent UI freezing
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(`${LEON_API}/utterance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': LEON_API_KEY
                },
                body: JSON.stringify({ utterance: text }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

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
            if (err.name === 'AbortError') {
                setError('Leon request timed out. Please try again.');
            } else {
                setError(`Failed to send command: ${err.message}`);
            }
            setLastResponse('Sorry, there was an error communicating with Leon');
        }
    };

    /**
     * Start voice recognition (platform-specific implementation)
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
                // Set up event handler for speech recognition results
                recognitionInstance.onresult = (event) => {
                    if (event.results && event.results.length > 0) {
                        const transcript = event.results[0][0].transcript;
                        handleVoiceCommand(transcript);
                    }
                };

                recognitionInstance.start();
                setIsListening(true);
                setLastResponse('Listening... Speak your command');
            } catch (err) {
                console.error('Error starting speech recognition:', err);
                setError(`Failed to start voice recognition: ${err.message}`);
                setIsListening(false);
            }
        } else {
            setIsListening(true);
            setLastResponse('Listening... (Voice recognition not available. Please type your command)');
        }
    };

    /**
     * Stop voice recognition
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