import { useState } from 'react';

export const useDevices = () => {
  const [devices, setDevices] = useState([
    { id: 1, name: 'Living Room Light', type: 'light', isOn: false },
    { id: 2, name: 'Kitchen Light', type: 'light', isOn: false },
    { id: 3, name: 'Bedroom Light', type: 'light', isOn: false },
    { id: 4, name: 'Living Room Thermostat', type: 'thermostat', temperature: 20, isOn: true },
  ]);

  const toggleDevice = (id) => {
    setDevices(devices.map(device => 
      device.id === id ? { ...device, isOn: !device.isOn } : device
    ));
  };

  return { devices, toggleDevice };
};