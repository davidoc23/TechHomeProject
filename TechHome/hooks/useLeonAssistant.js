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
    const LEON_API_KEY = 'fc33214308bb45e1f5d73f690a15b27a89d31952'; 

};