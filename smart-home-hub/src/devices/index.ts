export interface Device {
    id: number;
    name: string;
    status: string;
}

export function manageDevice(device: Device) {
    console.log(`Managing device: ${device.name}`);
    // Add logic to manage the device
}