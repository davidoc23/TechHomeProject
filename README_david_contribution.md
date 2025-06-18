# Individual Contribution – [David]

## Overview

This file details my individual contributions to the TechHomeProject Final Year Project, with a focus on backend integration, Raspberry Pi & Home Assistant setup, and automated testing.

---

## Key Responsibilities & Achievements

- **Set up Raspberry Pi 3 and Home Assistant**
  - Installed and configured Home Assistant to run as the local smart home hub on Raspberry Pi 3.
  - Connected real smart devices (e.g., bulbs) to Home Assistant for live system testing.

- **Integrated Home Assistant with Backend (Flask API)**
  - Implemented API endpoints for toggling Home Assistant devices and fetching device state.
  - Developed secure authentication and robust error handling for Home Assistant integration.
  - Ensured device state changes are synchronized between Home Assistant and MongoDB.
  - Supported device discovery, control, and state management in the backend logic.

- **Device and Automation Management**
  - Developed logic to toggle all smart lights (including Home Assistant devices) via backend endpoints.
  - Maintained and improved automation execution for Home Assistant devices in `scheduler.py`.

- **Automated Testing**
  - Authored the entire backend test suite (`tests/`), including:
    - Authentication (`test_auth_routes.py`)
    - Automation (`test_automation_routes.py`)
    - Device management (`test_device_routes.py`)
    - Home Assistant API integration (`test_home_assistant_routes.py`)
    - Integration flow (`test_integration_flow.py`)
    - Room management (`test_room_routes.py`)
    - ML routes baseline tests (`test_ml_routes.py`)
  - Tests cover core API features, error handling, and edge cases to ensure system robustness.

- **Frontend (React Native) Integration**
  - Built or extended custom hooks (`useHomeAssistantDevices.js`) for managing Home Assistant devices in the mobile app.
  - Contributed to device management UI (`DeviceManagementScreen.js`) for displaying and adding Home Assistant devices.

---

## Key Files

- `backend/app.py`, `routes/device_routes.py` – Main endpoints and device logic
- `backend/scheduler.py` – Automation scheduling for Home Assistant devices
- `backend/tests/` – Complete backend test suite
- `TechHome/hooks/useHomeAssistantDevices.js` – Home Assistant device logic in React Native
- `TechHome/screens/DeviceManagementScreen.js` – Device management UI

---

## Evidence of Contribution

- All test files in `backend/tests/` authored by me.
- Git commit history and this document demonstrate the timeline and scope of my work.

---

## Contact

- [oconnordavid18@gmail.com]  
- [G00400530]  
- B.Sc. (Hons) in Computing in Software Development, ATU Galway

