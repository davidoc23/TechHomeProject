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

    const generateDeviceId = () => {
        const existingIds = devices.map(d => d.id);
        let newId = 1;
        while (existingIds.includes(newId)) {
            newId++;
        }
        return newId;
    };

    const addDevice = async (deviceData) => {
        try {
            const newDevice = {
                ...deviceData,
                id: generateDeviceId(),
                isOn: false
            };
    
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDevice)
            });
            
            if (response.ok) {
                await fetchDevices();
                addActivity(deviceData.name, 'added to system');
            }
        } catch (err) {
            setError('Failed to add device');
        }
    };

    
    const removeDevice = async (id) => {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                const device = devices.find(d => d.id === id);
                await fetchDevices();
                if (device) {
                    addActivity(device.name, 'removed from system');
                }
            }
        } catch (err) {
            setError('Failed to remove device');
        }
    };

    return { 
        devices, 
        activities, 
        error,
        toggleDevice, 
        toggleAllLights, 
        setTemperature,
        addDevice,
        removeDevice, 
    };
}