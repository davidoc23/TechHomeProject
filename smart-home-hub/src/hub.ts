import axios from 'axios';

// Define the base URL for the backend server
// You can replace this ip with the actual IP address of your laptop (if needed)
const BACKEND_URL = 'http://192.168.1.144:5000';

// Function to fetch the list of devices from the backend
export async function getDevices() {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/devices`);
        return response.data;
    } catch (error) {
        console.error('Error fetching devices:', error);
        throw new Error('Failed to fetch devices');
    }
}

// Function to add a new device to the backend
export async function addDevice(device: { name: string; status: string; }) {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/devices`, device);
        return response.data;
    } catch (error) {
        const err = error as any;
        console.error('Error adding device:', err.response ? err.response.data : err.message);
        throw new Error('Failed to add device');
    }
}

// Function to update an existing device in the backend
export async function updateDevice(deviceId: any, updates: { status: string; }) {
    try {
        const response = await axios.put(`${BACKEND_URL}/api/devices/${deviceId}`, updates);
        return response.data;
    } catch (error) {
        console.error('Error updating device:', error);
        throw new Error('Failed to update device');
    }
}

// Function to delete a device from the backend
export async function deleteDevice(deviceId: any) {
    try {
        const response = await axios.delete(`${BACKEND_URL}/api/devices/${deviceId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting device:', error);
        throw new Error('Failed to delete device');
    }
}

// Function to manage a device
export function manageDevice(device: { id: number; name: string; status: string; room: string; }) {
    console.log(`Managing device: ${device.name} in room: ${device.room}`);
    // For example, turning on or off a light.
}

// Function to poll the backend for device updates at a specified interval
async function pollDevices(interval: number) {
    // Fetch the initial list of devices
    let previousDevices = await getDevices();
    console.log('Initial Devices:', previousDevices);

    // Set up a polling interval
    setInterval(async () => {
        try {
            // Fetch the current list of devices
            const currentDevices = await getDevices();
            // Check if the list of devices has changed
            if (JSON.stringify(currentDevices) !== JSON.stringify(previousDevices)) {
                console.log('Devices updated:', currentDevices);
                previousDevices = currentDevices;
            }
        } catch (error) {
            console.error('Error polling devices:', error);
        }
    }, interval);
}

// Main function to start the Smart Home Hub
async function main() {
    console.log('Starting Smart Home Hub...');
    try {
        // Start polling for device updates every 5 seconds
        await pollDevices(5000);
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error('An unknown error occurred');
        }
    }
}

// Call the main function to start the application
main();
