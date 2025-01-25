import { useDeviceContext } from '../context/DeviceContext';

const API_URL = 'http://localhost:5000/api/devices';

export function useDevices() {
    const { devices, activities, error, fetchDevices, addActivity, setDevices } = useDeviceContext();

    const toggleDevice = async (id) => {
        try {
            const response = await fetch(`${API_URL}/${id}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const updatedDevice = await response.json();
                await fetchDevices();
                addActivity(
                    updatedDevice.name, 
                    updatedDevice.isOn ? 'turned on' : 'turned off'
                );
            }
        } catch (err) {
            console.error('Network error');
        }
    };

    const toggleAllLights = async (desiredState) => {
        try {
            const response = await fetch(`${API_URL}/toggle-all-lights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ desiredState })
            });
            
            if (response.ok) {
                const updatedDevices = await response.json();
                setDevices(updatedDevices);
                
                updatedDevices
                    .filter(d => d.type === 'light')
                    .forEach(device => {
                        addActivity(device.name, desiredState ? 'turned on' : 'turned off');
                    });
            }
        } catch (err) {
            console.error('Network error');
        }
    };

    const setTemperature = async (id, newTemp) => {
        try {
            const response = await fetch(`${API_URL}/${id}/temperature`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ temperature: newTemp })
            });
            
            if (response.ok) {
                const updatedDevice = await response.json();
                await fetchDevices();
                addActivity(updatedDevice.name, `temperature set to ${newTemp}°F`);
            }
        } catch (err) {
            console.error('Network error');
        }
    };

    return { 
        devices, 
        activities, 
        error,
        toggleDevice, 
        toggleAllLights, 
        setTemperature 
    };
}