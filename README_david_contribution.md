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
  - Developed comprehensive analytics endpoints for multi-view trend analysis:
    - `/api/analytics/usage-per-week` - Weekly trend aggregation with readable week labels
    - `/api/analytics/usage-per-month` - Monthly trend aggregation with readable month labels
    - `/api/analytics/week-breakdown/<week_id>` - Daily breakdown for specific weeks
    - `/api/analytics/month-breakdown/<month_id>` - Daily breakdown for specific months
    - `/api/analytics/daily-breakdown/<date_str>` - Hourly breakdown for specific days
    - `/api/analytics/export-usage-csv-grouped` - CSV export with time period grouping support
  - Enhanced all endpoints with comprehensive filter support (user, device, room) and timezone-aware date handling.
  - Developed analytics endpoints for top actions, device/user drilldown, and grouped activity logs.
  - Developed automated test cases to verify logging works as expected, including user attribution and database cleanup after each test.
  - Addressed challenges such as missing JWTs, 404 errors, and log verification by iteratively debugging both backend and frontend, adding cleanup steps, and adjusting test setup to match real-world API flows.

- **Web Analytics Dashboard**
  - Built a comprehensive React Native (Expo) dashboard for web with advanced analytics capabilities:
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
    
    **Advanced Filtering & Modal System:**
    - **Unified Filter Modal:** Comprehensive filtering interface combining date range, user, device, and room filters with single apply action
    - **Smart Contextual Messaging:** Intelligent "no data found" modal with filter-specific messages and actionable suggestions
    - **Mutual Exclusivity Logic:** Device and room filters are mutually exclusive with clear visual feedback
    - **Enhanced CSV Export:** Displays readable device names instead of device IDs with grouping support for different time periods
    
    **Multi-View Trend Analysis:**
    - **Three-Tier View System:** 
      * **Daily View:** Hourly breakdown (0-23 hours) with blue color coding
      * **Weekly View:** Weekly trends with orange color coding
      * **Monthly View:** Monthly trends with purple color coding
    - **Interactive Drill-Down Functionality:**
      * Daily mode: Click hour bars → detailed hourly activity breakdown
      * Weekly mode: Click week bars → daily breakdown for selected week  
      * Monthly mode: Click month bars → daily breakdown for selected month
    - **Smart Modal Management:** Period-specific breakdown modals showing top users and devices with auto-close when switching views
    
    **UX & Design Enhancements:**
    - **Streamlined Interface:** Clean three-button layout (Filters & Date Range, Reset All, Export CSV)
    - **Modern Responsive Modals:** Scrollable content with intuitive button layouts and proper mobile responsiveness
    - **Color-Coded Chart System:** Consistent visual distinction between time periods with unified BarChart components
    - **Dynamic Export Button:** Text changes based on current view mode (daily/weekly/monthly)
    
    **Enhanced Technical Features:**
    - **Chart Consistency:** Fixed data validation and loading states across all view modes for reliable user experience
    - **Filter State Management:** Proper mutual exclusivity logic with auto-reset functionality
    - **Enhanced Error States:** Comprehensive handling of loading, empty, and error states with helpful user guidance
    
    **Device Error Tracking & Health Management System:**
    - **Backend Error Infrastructure:**
      * Added `is_error` and `error_type` fields to device log model for automatic error detection
      * Implemented comprehensive error analytics endpoints:
        - `/api/analytics/errors-per-device` - Device-specific error statistics
        - `/api/analytics/errors-per-user` - User-specific error patterns  
        - `/api/analytics/error-types` - Error type distribution analysis
        - `/api/analytics/recent-errors` - Latest error occurrences
        - `/api/analytics/device-health` - Overall device health status
      * Enhanced data processing to return device health metrics with both local and Home Assistant device names
    
    - **Frontend Error Tracking Dashboard:**
      * **Device Health Cards:** Color-coded health status indicators (healthy/warning/critical) with error rates and failure counts
      * **Recent Errors List:** Scrollable list of latest errors with visual highlighting and indicators in activity feed
      * **Error Types Distribution:** Visual breakdown of different error categories with occurrence counts
      * **Activity Feed Integration:** Automatic error highlighting in main activity feed for immediate visibility
    
    - **Advanced Error Detail Modal:**
      * **Comprehensive Device Diagnostics:** Full-featured modal showing device health status, error rates, and detailed error analysis
      * **Single Error Focus with Scrollable Additional Errors:** Latest error displayed prominently with full troubleshooting details, while additional errors are accessible via scrollable list (max 200px height)
      * **Intelligent Error Suggestions:** Context-aware troubleshooting steps based on error types:
        - Timeout errors → Network connectivity suggestions
        - Connection errors → Power/WiFi verification steps  
        - Permission errors → Authentication refresh guidance
        - Device unavailable → Physical connectivity checks
        - Unknown errors → General troubleshooting fallback
      * **Quick Action Buttons:** Immediate resolution options including Retry, Refresh, Ping, Reset, View Logs, and Refresh Authentication
      * **Progressive Disclosure UI:** Most important error information shown first, with additional details accessible through intuitive scrolling
    
    - **Error Management Features:**
      * **Real-time Error Detection:** Automatic categorization of device failures during actions
      * **User-Friendly Error Resolution:** Actionable troubleshooting steps with one-click quick actions
      * **Comprehensive Error Audit Trail:** Full history of device errors with timestamps and user attribution
      * **Device Health Monitoring:** Continuous tracking of device reliability and performance metrics

    **Active Users & Usage Streaks System:**
    - **Backend Streak Analytics:**
      * Added `/api/analytics/active-users-streaks` endpoint for comprehensive user engagement metrics
      * Implemented intelligent streak calculation algorithm:
        - Current streak tracking (consecutive days with activity)
        - Longest streak calculation across date ranges
        - Daily activity aggregation with timezone-aware date handling
        - Activity percentage calculation relative to selected time period
      * Advanced user ranking system with performance-based badge assignment
      * Full integration with existing filter system (date range, user, device, room filters)
    
    - **Frontend User Engagement Dashboard:**
      * **Medal Podium Display:** Visual top 3 users with gold/silver/bronze medal representation
      * **Detailed Activity Table:** Comprehensive scrollable table showing:
        - User rankings and performance badges (Bronze/Silver/Gold/Platinum)
        - Total actions count with visual emphasis
        - Current streak with fire emoji indicator 🔥
        - Longest streak achievement with calendar emoji 📅
        - Badge tier visualization with emoji icons
      * **Activity Summary Cards:** Quick stats overview displaying:
        - Total active users in period
        - Users currently maintaining streaks
        - Longest streak achieved across all users
        - Total actions aggregate across all users
    
    - **Gamification & User Engagement Features:**
      * **Progressive Badge System:** Four-tier achievement system:
        - Bronze: Basic activity (default tier)
        - Silver: 20+ actions + 3+ day streak
        - Gold: 50+ actions + 5+ day streak  
        - Platinum: 100+ actions + 7+ day streak
      * **Streak Intelligence:** Smart current streak detection handles both same-day and previous-day activity
      * **Real-time Ranking:** Dynamic user rankings based on total actions and current streak performance
      * **Visual Engagement Elements:** Medal podium, streak fire indicators, and achievement badges
    
    - **Technical Implementation:**
      * **Advanced Date Processing:** Intelligent handling of consecutive day detection across timezone boundaries
      * **Performance Optimization:** Efficient aggregation pipeline reducing database queries
      * **Responsive Design:** Adaptive layout supporting both mobile and desktop viewing
      * **Seamless Integration:** Full compatibility with existing analytics filter and refresh systems

- **Automated Testing**
  - Authored the entire backend test suite (`tests/`), including:
    - Authentication (`test_auth_routes.py`)
    - Automation (`test_automation_routes.py`)
    - Device management (`test_device_routes.py`)
    - Home Assistant API integration (`test_home_assistant_routes.py`)
    - Integration flow (`test_integration_flow.py`)
    - Room management (`test_room_routes.py`)
    - ML routes baseline tests (`test_ml_routes.py`)
    - Analytics comprehensive testing (`test_analytics_routes.py`) - 30 comprehensive test cases covering all analytics functionality including:
      * Basic analytics endpoints (usage-per-user, usage-per-device, recent-actions)
      * Multi-view trend analysis (daily/weekly/monthly breakdowns with drill-downs)
      * Error tracking analytics (errors-per-device, errors-per-user, error-types, device-health)
      * Active users & streaks system (user engagement metrics with badge system)
      * CSV export functionality (both basic and grouped exports)
      * Advanced filtering (date range, user, device, room filters with combinations)
      * Edge cases and error handling (invalid dates, no data scenarios, large datasets)
      * Performance testing (100+ log entries) and timezone handling
  - Tests cover core API features, error handling, and edge cases to ensure system robustness.

- **Frontend (React Native) Integration**
  - Built custom hooks (`useHomeAssistantDevices.js`) for managing Home Assistant devices in the mobile app.
  - Contributed to device management UI (`DeviceManagementScreen.js`) for displaying and adding Home Assistant devices.
  - Updated all device-related frontend calls to send authentication tokens for secure user attribution.


## Key Files
- `backend/tests/` – Complete backend test suite including comprehensive analytics testing.
- `backend/app.py`, `routes/device_routes.py` – Main endpoints, device logic, device action logging, JWT checks, error logging integration
- `backend/routes/analytics_routes.py` – Comprehensive analytics endpoints including user/device stats, activity feeds, multi-view trends (daily/weekly/monthly), drill-down breakdowns, grouped CSV exports, and complete error tracking analytics
- `backend/models/device_log.py` – Enhanced device logging model with error detection fields and automatic error categorization
- `backend/scheduler.py` – Automation scheduling for Home Assistant devices
- `TechHome/hooks/useHomeAssistantDevices.js` – Home Assistant device logic in React Native
- `TechHome/screens/DeviceManagementScreen.js` – Device management UI
- `TechHome/screens/AnalyticsDashboardScreen.js` – Advanced analytics dashboard with comprehensive error tracking, device health monitoring, and actionable error resolution system


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

**Enhanced error tracking log entry:**
```json
{
  "user": "David",
  "device": "light.living_room_lamp",
  "device_name": "Living Room Lamp",
  "action": "toggle",
  "result": "error: Connection timeout",
  "is_error": true,
  "error_type": "timeout",
  "timestamp": "2025-07-16T14:30:15.123+00:00"
}
```

**Device health analytics output:**
```json
[
  {
    "name": "Living Room Lamp",
    "status": "warning",
    "error_rate": 15.2,
    "error_actions": 8,
    "total_actions": 52
  },
  {
    "name": "Kitchen Light",
    "status": "healthy", 
    "error_rate": 2.1,
    "error_actions": 1,
    "total_actions": 48
  }
]
```

**Active users & streaks analytics output:**
```json
[
  {
    "user": "David",
    "rank": 1,
    "total_actions": 156,
    "days_active": 12,
    "current_streak": 5,
    "longest_streak": 8,
    "activity_percentage": 85.7,
    "badge": "Platinum",
    "last_activity": "2025-07-22T14:30:15.123Z",
    "first_activity": "2025-07-10T09:15:22.456Z"
  },
  {
    "user": "mike",
    "rank": 2,
    "total_actions": 89,
    "days_active": 8,
    "current_streak": 3,
    "longest_streak": 6,
    "activity_percentage": 57.1,
    "badge": "Gold",
    "last_activity": "2025-07-22T12:45:30.789Z",
    "first_activity": "2025-07-11T16:20:11.234Z"
  }
]
```
## Key Challenges & Solutions

- **User attribution in logs:**  
  Initially, all device actions logged as `"system"`. Solved by ensuring JWT tokens were sent from the frontend and adding `@jwt_required()` on backend routes.

- **API test setup:**  
  Early tests failed with 404 or missing data. Solved by programmatically creating test users, rooms, and devices via the API before running assertions.

- **Database cleanliness:**  
  Added teardown steps to remove test users, devices, rooms, and logs after each test to prevent polluting the development database.

- **JWT Authentication in Tests:**  
  Initially device route tests failed with 401 (Unauthorized) errors. Solved by implementing proper `auth_headers` fixtures that register test users and obtain JWT tokens for authenticated API calls.

- **Analytics Test Coverage:**  
  Created comprehensive test suite for analytics functionality with 30 test cases covering all endpoints, filtering combinations, error scenarios, and edge cases to ensure robust analytics system validation.

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


## Contact

- Email: oconnordavid18@gmail.com  
- Student Number: G00400530
- B.Sc. (Hons) in Computing in Software Development, ATU Galway
