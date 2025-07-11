# Individual Contribution – David O' Connor

## Overview

This file details my individual contributions to the TechHomeProject Final Year Project, with a focus on backend integration, Raspberry Pi & Home Assistant setup, automated testing, user-based device action logging, analytics endpoints, and the new web analytics dashboard for real-time system monitoring.


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
  - Developed logic to toggle all Home Assistant smart lights via backend endpoints.
  - Maintained and improved automation execution for Home Assistant devices in `scheduler.py`.

- **Device Action Logging and User-Based Analytics**
  - Designed and integrated a robust device action logging system.
    - Every device action (toggle, add, remove, set temperature, toggle all) is logged with the authenticated username, device, action, result, and timestamp.
    - Logging works for both successful and failed attempts, ensuring a complete audit trail.
  - Added JWT authentication and required tokens to device endpoints to enable user attribution.
  - Built `/api/analytics/usage-per-user` and `/api/analytics/usage-per-device` endpoints to aggregate and report device actions by user and by device, supporting usage analytics and security auditing.
  - Developed analytics endpoints for top actions, device/user drilldown, and grouped activity logs.
  - Developed automated test cases to verify logging works as expected, including user attribution and database cleanup after each test.
  - Addressed challenges such as missing JWTs, 404 errors, and log verification by iteratively debugging both backend and frontend, adding cleanup steps, and adjusting test setup to match real-world API flows.

- **Web Analytics Dashboard**
  - Built a React Native (Expo) dashboard for web:
    - **Device Usage Chart:** Bar chart showing most-used devices, with friendly device names (from both local Mongo and Home Assistant).
    - **User Activity Chart:** Bar chart of most frequent users (real user attribution thanks to JWTs).
    - **Recent Activity Feed:** Feed of latest device actions, grouping "toggle all" actions together for clarity, with device lists as sub-items.
    - **Live API Integration:** Dashboard pulls from real backend analytics endpoints.
    - **Date Picker & Filtering** – Select a date to view analytics for that day only.
    - **Hourly Drill-Down** – Click any hour in the usage chart to see a detailed modal of all actions/devices in that hour.
    - **Handles loading, empty, and error states.**
    - **Dark Mode Theming:** The analytics dashboard now fully supports dark mode. All backgrounds, cards, text, and charts adapt dynamically using the app’s theme. Modal overlays, activity feeds, and charts automatically update when the user switches between light and dark mode.
    - **Improved Hour Display:** Hourly activity modals now display the hour as a full range (e.g., “17:00–17:59”) for clarity. This small UI fix improves time comprehension for end users.
    - **Timestamp & Timezone Handling:** Substantial work to ensure timestamps/logs display consistently in the user’s local time. All logs are stored in UTC and the frontend attempts to render using local timezone. However, a known issue remains where times may appear one hour behind Ireland local time due to subtle daylight saving handling.
    - **CSV Export Functionality:** Users and admins can now export/download usage logs as CSV files for offline review, audits, or external reporting.
    - **No Logs Modal:** A modal now displays clearly when no logs are found for a selected date/filter, improving user feedback.
    - **Manual and Auto-Refresh:** Added a manual Refresh button to immediately reload analytics for today. The dashboard auto-refreshes every 5 minutes for up-to-date data without user action.
    - **User Filtering:** Added a user filter dropdown and "Apply User" button to the analytics dashboard, allowing filtering of all analytics, charts, activity feed, hourly modal, and CSV export by user or all users. Backend endpoints were updated to support a `user` query parameter for all analytics and export routes. The user filter UI is positioned on the right for improved layout.

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
  - Built custom hooks (`useHomeAssistantDevices.js`) for managing Home Assistant devices in the mobile app.
  - Contributed to device management UI (`DeviceManagementScreen.js`) for displaying and adding Home Assistant devices.
  - Updated all device-related frontend calls to send authentication tokens for secure user attribution.

---

## Key Files

- `backend/app.py`, `routes/device_routes.py` – Main endpoints, device logic, device action logging, JWT checks
- `backend/routes/analytics_routes.py` – Analytics endpoints for user and device stats, activity feeds
- `backend/scheduler.py` – Automation scheduling for Home Assistant devices
- `backend/tests/` – Complete backend test suite
- `TechHome/hooks/useHomeAssistantDevices.js` – Home Assistant device logic in React Native
- `TechHome/screens/DeviceManagementScreen.js` – Device management UI
- `TechHome/screens/AnalyticsDashboardScreen.js` – New analytics dashboard for web/mobile

---

## Device Action Logging & Analytics Example

**Device log schema:**
```json
{
  "user": "username",
  "device": "device_id or entity_id",
  "action": "toggle | add | remove | set_temperature | toggle_all",
  "result": "on | off | success | error: ...",
  "timestamp": "<ISO datetime>"
}
```

**Analytics endpoint output (output from Postman):**
```json
[
  {"user": "David", "actions": 4},
  {"user": "mike", "actions": 12},
  {"user": "system", "actions": 17}
]
```

**Example log entry:**
```json
{
  "user": "David",
  "device": "680d337b4c5947f7fcc3fc19",
  "action": "toggle_all",
  "result": "on",
  "timestamp": "2025-06-20T22:10:10.333+00:00"
}
```
## Key Challenges & Solutions

- **User attribution in logs:**  
  Initially, all device actions logged as `"system"`. Solved by ensuring JWT tokens were sent from the frontend and adding `@jwt_required()` on backend routes.

- **API test setup:**  
  Early tests failed with 404 or missing data. Solved by programmatically creating test users, rooms, and devices via the API before running assertions.

- **Database cleanliness:**  
  Added teardown steps to remove test users, devices, rooms, and logs after each test to prevent polluting the development database.

- **Deprecation warnings:**  
  Updated datetime code to be timezone-aware to avoid future issues.

- **Date-Based Analytics & Drilldown**
Built per-day analytics and hour-by-hour activity breakdowns, making analytics highly interactive and audit-friendly.

- **Timezone Handling (Attempted)**
Spent significant time trying to fix a bug where times/logs show one hour behind local time (Ireland):

  - Made all logs timezone-aware (stored in UTC).

  - Used pytz to convert all backend date filters and queries to/from Europe/Dublin local time.

  - Ensured frontend displays times using browser/device’s local time zone.

  - Cross-checked all logic in both backend and frontend.

  **Result:**
    - The dashboard still shows analytics times one hour behind Ireland's local time, even after these changes. This may be a subtle bug in timestamp conversion, daylight saving time logic, or frontend Date rendering.

- **UI/UX and Theming Enhancements**

  - Added dark mode support for all charts, modals, and activity feeds.

  - Improved time range display for hourly analytics.

  - Added CSV export and “no logs” modal for better feedback and usability.


## Evidence of Contribution

- All test files in `backend/tests/` authored by me.
- Git commit history and this document demonstrate the timeline and scope of my work.

---

## Contact

- Email: oconnordavid18@gmail.com  
- Student Number: G00400530
- B.Sc. (Hons) in Computing in Software Development, ATU Galway
