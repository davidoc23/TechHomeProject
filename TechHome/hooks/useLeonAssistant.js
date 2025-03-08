import { useState, useEffect, useCallback } from 'react';
import { useDeviceContext } from '../context/DeviceContext';

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

    // Leon server configuration
    const LEON_SERVER = 'http://localhost:1338'; // Using the proxy
    const LEON_API = `${LEON_SERVER}/api/v1`;

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
                    'X-API-Key': LEON_API_KEY // Include the API key
                },
                body: JSON.stringify({ utterance: text })
            });

            if (response.ok) {
                const data = await response.json();
                setLastResponse(data.message || 'Command processed');
                
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
     * Start Leon's voice recognition (simulation for UI)
     */
    const startListening = async () => {
        if (!isConnected) {
            const connected = await checkConnection();
            if (!connected) {
                setLastResponse('Cannot connect to Leon assistant');
                return;
            }
        }

        setIsListening(true);
        setLastResponse('Listening... (Please speak your command)');
    };

    /**
     * Stop Leon's voice recognition (simulation for UI)
     */
    const stopListening = async () => {
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
        checkConnection
    };
}

