import { useState, useEffect } from 'react';
import axios from 'axios';

export function useHomeAssistantDevices() {
  const [haDevices, setHaDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/home-assistant/states');
        setHaDevices(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDevices();
  }, []);

  return { haDevices, isLoading, error };
}
