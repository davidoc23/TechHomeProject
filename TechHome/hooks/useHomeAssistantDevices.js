import { useState, useEffect } from 'react';
import axios from 'axios';

export function useHomeAssistantDevices() {
  const [haDevices, setHaDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/home-assistant/states');
      setHaDevices(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDevice = async (entityId) => {
    try {
      await axios.post(`http://localhost:5000/api/home-assistant/toggle/${entityId}`);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  return { haDevices, isLoading, error, fetchDevices, toggleDevice };
}
