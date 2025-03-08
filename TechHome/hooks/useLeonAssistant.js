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

    return {
        isConnected,
        isListening,
        lastCommand,
        lastResponse,
        error,
        checkConnection
    };
}

