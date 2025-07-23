import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Dimensions, TouchableOpacity, Linking, Platform, Alert } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useTheme } from '../context/ThemeContext';

const screenWidth = Dimensions.get('window').width - 32;

function formatDate(date) {
  // Convert JS Date to YYYY-MM-DD string
  return date.toISOString().slice(0, 10);
}

export default function AnalyticsDashboardScreen() {
  // Date range filter state
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [endDate, setEndDate] = useState(formatDate(new Date()));
  const [appliedRange, setAppliedRange] = useState({
    start: formatDate(new Date()),
    end: formatDate(new Date()),
  });

  const [deviceUsage, setDeviceUsage] = useState([]);
  const [userUsage, setUserUsage] = useState([]);
  const [recentActions, setRecentActions] = useState([]);
  const [hourlyUsage, setHourlyUsage] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingHourly, setLoadingHourly] = useState(true);

  // Drill-down state
  const [selectedHour, setSelectedHour] = useState(null);
  const [hourActions, setHourActions] = useState([]);
  const [showHourModal, setShowHourModal] = useState(false);
  const [loadingHourActions, setLoadingHourActions] = useState(false);

  // Weekly/Monthly drill-down state
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [periodActions, setPeriodActions] = useState([]);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [loadingPeriodActions, setLoadingPeriodActions] = useState(false);
  const [periodType, setPeriodType] = useState(''); // 'week' or 'month'

  const { theme, isDarkMode } = useTheme();

  // No logs modal state
  const [showNoLogsModal, setShowNoLogsModal] = useState(false);

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);

  // User filter states
  const [users, setUsers] = useState([]); // List of users for dropdown
  const [selectedUser, setSelectedUser] = useState('ALL'); // all users
  const [appliedUser, setAppliedUser] = useState('ALL'); // Applied filter

  // Device filter states
  const [devices, setDevices] = useState([]); // List of devices for dropdown
  const [selectedDevice, setSelectedDevice] = useState('ALL'); // all devices
  const [appliedDevice, setAppliedDevice] = useState('ALL'); // Applied filter

  // Room filter states
  const [rooms, setRooms] = useState([]); // List of rooms for dropdown
  const [selectedRoom, setSelectedRoom] = useState('ALL'); // all rooms
  const [appliedRoom, setAppliedRoom] = useState('ALL'); // Applied filter

  // View mode states for trends
  const [viewMode, setViewMode] = useState('daily'); // 'daily', 'weekly', 'monthly'
  const [dailyData, setDailyData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // Error tracking state
  const [deviceErrors, setDeviceErrors] = useState([]);
  const [userErrors, setUserErrors] = useState([]);
  const [errorTypes, setErrorTypes] = useState([]);
  const [recentErrors, setRecentErrors] = useState([]);
  const [deviceHealth, setDeviceHealth] = useState([]);
  const [loadingErrors, setLoadingErrors] = useState(true);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [selectedErrorDevice, setSelectedErrorDevice] = useState(null);

  // Active Users & Streaks state
  const [activeUsers, setActiveUsers] = useState([]);
  const [loadingActiveUsers, setLoadingActiveUsers] = useState(true);

  // Helper: build query string for range, user, device, and room
  function dateQuery() {
    let query = '';
    if (appliedRange.start === appliedRange.end) {
      query += `?date=${appliedRange.start}`;
    } else {
      query += `?startDate=${appliedRange.start}&endDate=${appliedRange.end}`;
    }
    if (appliedUser && appliedUser !== 'ALL') query += `&user=${encodeURIComponent(appliedUser)}`;
    if (appliedDevice && appliedDevice !== 'ALL') query += `&device=${encodeURIComponent(appliedDevice)}`;
    if (appliedRoom && appliedRoom !== 'ALL') query += `&room=${encodeURIComponent(appliedRoom)}`;
    return query;
  }

  // Fetch users for filter dropdown
  useEffect(() => {
    fetch('http://localhost:5000/api/analytics/users')
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(() => setUsers([]));
  }, []);

  // Fetch devices for filter dropdown
  useEffect(() => {
    fetch('http://localhost:5000/api/analytics/devices')
      .then(res => res.json())
      .then(data => setDevices(data))
      .catch(() => setDevices([]));
  }, []);

  // Fetch rooms for filter dropdown
  useEffect(() => {
    fetch('http://localhost:5000/api/analytics/rooms')
      .then(res => res.json())
      .then(data => setRooms(data))
      .catch(() => setRooms([]));
  }, []);

  // Fetch analytics when range or user changes
  useEffect(() => {
    setLoadingDevices(true); setLoadingUsers(true); setLoadingFeed(true); setLoadingHourly(true); setLoadingErrors(true); setLoadingActiveUsers(true);
    fetch(`http://localhost:5000/api/analytics/usage-per-device${dateQuery()}`)
      .then(res => res.json()).then(data => { setDeviceUsage(data); setLoadingDevices(false); })
      .catch(() => setLoadingDevices(false));
    fetch(`http://localhost:5000/api/analytics/usage-per-user${dateQuery()}`)
      .then(res => res.json()).then(data => { setUserUsage(data); setLoadingUsers(false); })
      .catch(() => setLoadingUsers(false));
    fetch(`http://localhost:5000/api/analytics/recent-actions${dateQuery()}`)
      .then(res => res.json()).then(data => { setRecentActions(data); setLoadingFeed(false); })
      .catch(() => setLoadingFeed(false));
    fetch(`http://localhost:5000/api/analytics/usage-per-hour${dateQuery()}`)
      .then(res => res.json()).then(data => { setHourlyUsage(data); setLoadingHourly(false); })
      .catch(() => setLoadingHourly(false));

    // Fetch error data
    fetch(`http://localhost:5000/api/analytics/errors-per-device${dateQuery()}`)
      .then(res => res.json()).then(data => { setDeviceErrors(data); })
      .catch(() => setDeviceErrors([]));
    fetch(`http://localhost:5000/api/analytics/errors-per-user${dateQuery()}`)
      .then(res => res.json()).then(data => { setUserErrors(data); })
      .catch(() => setUserErrors([]));
    fetch(`http://localhost:5000/api/analytics/error-types${dateQuery()}`)
      .then(res => res.json()).then(data => { setErrorTypes(data); })
      .catch(() => setErrorTypes([]));
    fetch(`http://localhost:5000/api/analytics/recent-errors${dateQuery()}`)
      .then(res => res.json()).then(data => { setRecentErrors(data); })
      .catch(() => setRecentErrors([]));
    fetch(`http://localhost:5000/api/analytics/device-health${dateQuery()}`)
      .then(res => res.json()).then(data => { 
        setDeviceHealth(data); 
        setLoadingErrors(false);
        // Check for critical errors and show notifications
        const criticalDevices = data.filter(device => device.error_rate > 50 || device.error_actions > 5);
        if (criticalDevices.length > 0 && data.length > 0) {
          setTimeout(() => {
            Alert.alert(
              '⚠️ Critical Device Issues Detected',
              `${criticalDevices.length} device(s) have high error rates. Tap on the red device cards below to see details and get troubleshooting suggestions.`,
              [{ text: 'OK', style: 'default' }]
            );
          }, 1000);
        }
      })
      .catch(() => { setDeviceHealth([]); setLoadingErrors(false); });

    // Fetch active users and streaks data
    fetch(`http://localhost:5000/api/analytics/active-users-streaks${dateQuery()}`)
      .then(res => res.json()).then(data => { 
        setActiveUsers(data); 
        setLoadingActiveUsers(false); 
      })
      .catch(() => { setActiveUsers([]); setLoadingActiveUsers(false); });

    // Fetch weekly/monthly/daily data if needed
    if (viewMode === 'daily') {
      setLoadingDaily(true);
      fetch(`http://localhost:5000/api/analytics/usage-per-day${dateQuery()}`)
        .then(res => res.json()).then(data => { setDailyData(data); setLoadingDaily(false); })
        .catch(() => setLoadingDaily(false));
    } else if (viewMode === 'weekly') {
      setLoadingWeekly(true);
      fetch(`http://localhost:5000/api/analytics/usage-per-week${dateQuery()}`)
        .then(res => res.json()).then(data => { setWeeklyData(data); setLoadingWeekly(false); })
        .catch(() => setLoadingWeekly(false));
    } else if (viewMode === 'monthly') {
      setLoadingMonthly(true);
      fetch(`http://localhost:5000/api/analytics/usage-per-month${dateQuery()}`)
        .then(res => res.json()).then(data => { setMonthlyData(data); setLoadingMonthly(false); })
        .catch(() => setLoadingMonthly(false));
    }
  }, [appliedRange, appliedUser, appliedDevice, appliedRoom, viewMode]);

  // Close modals when switching view modes
  useEffect(() => {
    if (viewMode !== 'daily' && showHourModal) {
      setShowHourModal(false);
    }
    if ((viewMode !== 'weekly' && viewMode !== 'monthly') && showPeriodModal) {
      setShowPeriodModal(false);
    }
  }, [viewMode]);

  // Periodic auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setAppliedRange(prev => ({ ...prev }));
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Drill-down by hour (only works in daily mode)
  const handleHourPress = (hourIdx) => {
    if (viewMode !== 'daily') return; // Only allow hour drill-down in daily mode
    
    setSelectedHour(hourIdx);
    setShowHourModal(true);
    setLoadingHourActions(true);
    fetch(`http://localhost:5000/api/analytics/actions-in-hour/${hourIdx}${dateQuery()}`)
      .then(res => res.json())
      .then(data => { setHourActions(data); setLoadingHourActions(false); })
      .catch(() => setLoadingHourActions(false));
  };

  // Drill-down by day
  const handleDayPress = (dayIndex) => {
    if (viewMode !== 'daily' || !dailyData[dayIndex]) return;
    
    const dayData = dailyData[dayIndex];
    setSelectedPeriod(dayData.period || dayData.date);
    setPeriodType('day');
    setShowPeriodModal(true);
    setLoadingPeriodActions(true);
    
    // For daily breakdown, we'll get hourly data for that day
    const dateId = dayData.date; // Format: "2025-07-14"
    fetch(`http://localhost:5000/api/analytics/daily-breakdown/${encodeURIComponent(dateId)}${dateQuery()}`)
      .then(res => res.json())
      .then(data => { setPeriodActions(data); setLoadingPeriodActions(false); })
      .catch(() => setLoadingPeriodActions(false));
  };

  // Drill-down by week
  const handleWeekPress = (weekIndex) => {
    if (viewMode !== 'weekly' || !weeklyData[weekIndex]) return;
    
    const weekData = weeklyData[weekIndex];
    setSelectedPeriod(weekData.period || weekData.week);
    setPeriodType('week');
    setShowPeriodModal(true);
    setLoadingPeriodActions(true);
    
    // For weekly breakdown, we'll get daily data for that week
    const weekId = weekData.week; // Format: "2025-W28"
    fetch(`http://localhost:5000/api/analytics/week-breakdown/${encodeURIComponent(weekId)}${dateQuery()}`)
      .then(res => res.json())
      .then(data => { setPeriodActions(data); setLoadingPeriodActions(false); })
      .catch(() => setLoadingPeriodActions(false));
  };

  // Drill-down by month
  const handleMonthPress = (monthIndex) => {
    if (viewMode !== 'monthly' || !monthlyData[monthIndex]) return;
    
    const monthData = monthlyData[monthIndex];
    setSelectedPeriod(monthData.period || monthData.month);
    setPeriodType('month');
    setShowPeriodModal(true);
    setLoadingPeriodActions(true);
    
    // For monthly breakdown, we'll get daily data for that month
    const monthId = monthData.month; // Format: "2025-07"
    fetch(`http://localhost:5000/api/analytics/month-breakdown/${encodeURIComponent(monthId)}${dateQuery()}`)
      .then(res => res.json())
      .then(data => { setPeriodActions(data); setLoadingPeriodActions(false); })
      .catch(() => setLoadingPeriodActions(false));
  };

  // Chart configs
  const deviceChartConfig = {
    backgroundGradientFrom: theme.background,
    backgroundGradientTo: theme.background,
    color: (opacity = 1) => isDarkMode ? `rgba(56, 122, 238, ${opacity})` : `rgba(56, 122, 238, ${opacity})`,
    labelColor: (opacity = 1) => theme.text,
    barPercentage: 0.7,
    decimalPlaces: 0,
  };
  const userChartConfig = {
    ...deviceChartConfig,
    color: (opacity = 1) => isDarkMode ? `rgba(52, 168, 83, ${opacity})` : `rgba(52, 168, 83, ${opacity})`,
  };

  // Chart data
  const deviceData = {
    labels: deviceUsage.map(row => row.name.length > 8 ? row.name.slice(0, 8) + '…' : row.name),
    datasets: [{ data: deviceUsage.map(row => row.actions) }]
  };
  const userData = {
    labels: userUsage.map(row => row.user.length > 8 ? row.user.slice(0, 8) + '…' : row.user),
    datasets: [{ data: userUsage.map(row => row.actions) }]
  };
  const hourLabels = Array.from({ length: 24 }, (_, i) => i.toString());
  const barCount = 24;
  const barWidth = screenWidth / barCount;
  const hourlyData = {
    labels: hourLabels,
    datasets: [{
      data: hourLabels.map(hour => {
        const found = hourlyUsage.find(r => String(r.hour) === String(hour));
        return found ? found.actions : 0;
      })
    }]
  };

  useEffect(() => {
    if (!loadingFeed && recentActions.length === 0) {
      setShowNoLogsModal(true);
    } else {
      setShowNoLogsModal(false);
    }
  }, [loadingFeed, recentActions]);

  // Smart message helper for no data scenarios
  const getNoDataMessage = () => {
    let title = "No Activity Found";
    let message = "";
    let suggestions = [];

    // Check which filters are applied
    const hasUserFilter = appliedUser !== 'ALL';
    const hasDeviceFilter = appliedDevice !== 'ALL';
    const hasRoomFilter = appliedRoom !== 'ALL';
    const isToday = appliedRange.start === appliedRange.end && appliedRange.start === formatDate(new Date());
    
    if (hasDeviceFilter) {
      const deviceName = devices.find(d => d.id === appliedDevice)?.name || appliedDevice;
      title = `No Activity for ${deviceName}`;
      message = `No activity logs found for the device "${deviceName}" during the selected time period.`;
      suggestions = [
        "Try selecting a different date range",
        "Check if the device was active during this period",
        "Remove the device filter to see all activity"
      ];
    } else if (hasRoomFilter) {
      const roomName = rooms.find(r => r.id === appliedRoom)?.name || appliedRoom;
      title = `No Activity in ${roomName}`;
      message = `No activity logs found for devices in the "${roomName}" room during the selected time period.`;
      suggestions = [
        "Try selecting a different date range",
        "Check if any devices in this room were active",
        "Remove the room filter to see all activity"
      ];
    } else if (hasUserFilter) {
      title = `No Activity for ${appliedUser}`;
      message = `No activity logs found for user "${appliedUser}" during the selected time period.`;
      suggestions = [
        "Try selecting a different date range",
        "Check if this user was active during this period",
        "Remove the user filter to see all activity"
      ];
    } else if (isToday) {
      title = "No Activity Today";
      message = "No activity logs have been recorded for today yet.";
      suggestions = [
        "Try selecting yesterday or a previous date",
        "Check if any devices have been used today",
        "Activity logs may take a few minutes to appear"
      ];
    } else {
      title = "No Activity Found";
      message = `No activity logs found for the selected date range (${rangeDisplay}).`;
      suggestions = [
        "Try selecting a different date range",
        "Check if any devices were active during this period",
        "Verify that device logging is enabled"
      ];
    }

    return { title, message, suggestions };
  };

  // Range display helper
  const rangeDisplay = appliedRange.start === appliedRange.end
    ? appliedRange.start
    : `${appliedRange.start} – ${appliedRange.end}`;
  
  // Filter display helper
  const getFilterDisplay = () => {
    let filters = [];
    if (appliedUser !== 'ALL') filters.push(`User: ${appliedUser}`);
    if (appliedDevice !== 'ALL') {
      const deviceName = devices.find(d => d.id === appliedDevice)?.name || appliedDevice;
      filters.push(`Device: ${deviceName}`);
    }
    if (appliedRoom !== 'ALL') {
      const roomName = rooms.find(r => r.id === appliedRoom)?.name || appliedRoom;
      filters.push(`Room: ${roomName}`);
    }
    return filters.length > 0 ? ` (${filters.join(', ')})` : '';
  };

  // Helper function to get error suggestions and quick actions based on error type
  const getErrorSuggestions = (errorType, deviceName, isDeviceGroup = false) => {
    // Special handling for device groups
    if (isDeviceGroup) {
      return {
        icon: '',
        title: `${deviceName} Group Diagnostics`,
        suggestions: [
          'This represents multiple devices that may have individual issues',
          'Check individual devices in this group for specific problems',
          'Verify group-wide settings and automation rules',
          'Review Home Assistant group configuration'
        ],
        quickActions: ['analyze_group', 'refresh_all', 'check_individual']
      };
    }

    const suggestions = {
      'timeout': {
        icon: '',
        title: 'Response Timeout',
        suggestions: [
          'Device may be slow to respond - try waiting a moment',
          'Check network connectivity and signal strength',
          'Restart the device if physically accessible',
          'Verify device is not overloaded with requests'
        ],
        quickActions: ['retry', 'refresh', 'ping']
      },
      'connection_error': {
        icon: '',
        title: 'Connection Issue',
        suggestions: [
          'Check if device is powered on and connected',
          'Verify WiFi network connectivity',
          'Try toggling device manually to test',
          'Check Home Assistant connection status'
        ],
        quickActions: ['retry', 'ping', 'refresh']
      },
      'permission_denied': {
        icon: '',
        title: 'Permission Issue',
        suggestions: [
          'Check Home Assistant permissions for this device',
          'Verify user access rights and authentication',
          'Update authentication tokens if expired',
          'Contact system administrator for access'
        ],
        quickActions: ['refresh_auth', 'retry']
      },
      'device_unavailable': {
        icon: '',
        title: 'Device Unavailable',
        suggestions: [
          'Device appears to be offline or disconnected',
          'Check power supply and physical connections',
          'Verify device status in Home Assistant',
          'Device may need firmware update or restart'
        ],
        quickActions: ['ping', 'refresh', 'reset']
      },
      'unknown': {
        icon: '',
        title: 'Unknown Error',
        suggestions: [
          'Check device logs for more specific error details',
          'Try restarting the device if accessible',
          'Verify recent configuration changes',
          'Contact support if issue persists'
        ],
        quickActions: ['retry', 'logs', 'refresh', 'ping']
      },
      'network_error': {
        icon: '',
        title: 'Network Error',
        suggestions: [
          'Check internet connectivity and WiFi signal',
          'Verify router and network infrastructure',
          'Test with other devices on the same network',
          'Restart network equipment if needed'
        ],
        quickActions: ['ping', 'retry', 'refresh']
      },
      'offline': {
        icon: '',
        title: 'Device Offline',
        suggestions: [
          'Device appears to be completely offline',
          'Check power supply and cable connections',
          'Verify device is responsive to manual controls',
          'Device may have crashed or frozen'
        ],
        quickActions: ['ping', 'refresh', 'reset']
      },
      'communication_error': {
        icon: '',
        title: 'Communication Error',
        suggestions: [
          'Device is not responding to commands properly',
          'Check protocol compatibility and settings',
          'Verify device firmware is up to date',
          'Try re-establishing connection'
        ],
        quickActions: ['ping', 'retry', 'refresh', 'reset']
      }
    };

    return suggestions[errorType] || {
      ...suggestions['unknown'],
      title: `${errorType?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'} Error`,
    };
  };

  // Function to handle quick actions for device troubleshooting
  const handleQuickAction = async (action, deviceData, deviceName) => {
    try {
      const deviceId = deviceData.device || deviceData.name || deviceData.id;
      
      // Handle special device group actions
      if (deviceData.isDeviceGroup) {
        switch (action) {
          case 'analyze_group':
            if (window.confirm(`Analyze ${deviceName} group?\n\nThis will check the status of all devices in this group and provide a detailed breakdown.`)) {
              try {
                // Fetch individual device statuses for the group
                const response = await fetch(`http://localhost:5000/api/analytics/group-analysis/${encodeURIComponent(deviceId)}${dateQuery()}`);
                if (response.ok) {
                  const groupData = await response.json();
                  const healthyDevices = groupData.devices?.filter(d => d.status === 'healthy') || [];
                  const errorDevices = groupData.devices?.filter(d => d.status !== 'healthy') || [];
                  
                  let message = `Group Analysis for ${deviceName}:\n\n`;
                  message += `• Total devices: ${groupData.devices?.length || 0}\n`;
                  message += `• Healthy devices: ${healthyDevices.length}\n`;
                  message += `• Devices with issues: ${errorDevices.length}\n\n`;
                  
                  if (errorDevices.length > 0) {
                    message += `Devices with issues:\n`;
                    errorDevices.slice(0, 5).forEach(device => {
                      message += `• ${device.name}: ${device.last_error || 'Status issues'}\n`;
                    });
                    if (errorDevices.length > 5) {
                      message += `... and ${errorDevices.length - 5} more\n`;
                    }
                  }
                  
                  alert(message);
                } else {
                  alert(`Unable to analyze ${deviceName} group. The group may not support detailed analysis.`);
                }
              } catch (error) {
                alert(`Error analyzing ${deviceName} group: ${error.message}`);
              }
            }
            break;
            
          case 'refresh_all':
            if (window.confirm(`Refresh all devices in ${deviceName} group?\n\nThis will update the status of all devices in this group.`)) {
              alert(`Refreshing all devices in ${deviceName}...\n\nThis may take a moment to complete.`);
              try {
                await fetch(`http://localhost:5000/api/devices/group/${encodeURIComponent(deviceId)}/refresh`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                
                // Refresh the analytics data
                setTimeout(() => {
                  setAppliedRange(prev => ({ ...prev }));
                }, 2000);
                
                alert(`Group refresh initiated for ${deviceName}. Data will update shortly.`);
              } catch (error) {
                alert(`Error refreshing ${deviceName} group: ${error.message}`);
              }
            }
            break;
            
          case 'check_individual':
            alert(`Individual Device Check\n\nTo troubleshoot specific devices in ${deviceName}:\n\n1. Look at the device health status cards above\n2. Click on individual healthy devices (green cards) to see their details\n3. Check the Recent Errors section below for specific device issues\n4. Use device-specific quick actions for targeted troubleshooting`);
            break;
            
          default:
            alert(`Group action "${action}" is not yet implemented for device groups.`);
        }
        return;
      }
      
      // Check if this is a special device identifier that doesn't have API endpoints
      if (deviceId === 'all_lights' || deviceId === 'all_devices' || !deviceId || deviceId.length < 10) {
        alert(`Quick actions are not supported for special device groups like "${deviceName}". Please select individual devices for troubleshooting.`);
        return;
      }
      
      switch (action) {
        case 'retry':
          if (window.confirm(`Testing connectivity for ${deviceName}...\n\nClick OK to proceed with the test.`)) {
            try {
              // Use the test endpoint for connectivity testing
              const response = await fetch(`http://localhost:5000/api/devices/${encodeURIComponent(deviceId)}/test`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                }
              });
              
              if (response.ok) {
                const testResult = await response.json();
                if (testResult.status === 'passed') {
                  alert(`Device test successful for ${deviceName}.\n\nResults:\n• Reachable: ${testResult.tests.reachable ? 'Yes' : 'No'}\n• Responsive: ${testResult.tests.responsive ? 'Yes' : 'No'}\n• State Valid: ${testResult.tests.state_valid ? 'Yes' : 'No'}\n• Current State: ${testResult.current_state}`);
                } else {
                  alert(`Device test completed for ${deviceName}, but some issues detected.\n\nResults:\n• Reachable: ${testResult.tests.reachable ? 'Yes' : 'No'}\n• Responsive: ${testResult.tests.responsive ? 'Yes' : 'No'}\n• State Valid: ${testResult.tests.state_valid ? 'Yes' : 'No'}`);
                }
              } else {
                const errorData = await response.json();
                alert(`Device test failed for ${deviceName}: ${errorData.error || 'Unknown error'}`);
              }
            } catch (error) {
              alert(`Network error testing ${deviceName}: ${error.message}`);
            }
            
            // Refresh data after test
            setTimeout(() => {
              setAppliedRange(prev => ({ ...prev })); // Trigger data refresh
            }, 2000);
          }
          break;
          
        case 'refresh':
          alert(`Refreshing Data - Updating status for ${deviceName}...`);
          try {
            // Refresh device state from Home Assistant
            await fetch(`http://localhost:5000/api/devices/${encodeURIComponent(deviceId)}/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              }
            });
          } catch (error) {
            console.warn('Failed to refresh device state:', error);
          }
          setAppliedRange(prev => ({ ...prev })); // Trigger data refresh
          break;
          
        case 'ping':
          try {
            alert(`Network Test - Testing network connectivity to ${deviceName}...`);
            
            // Simulate a ping test by checking device availability
            const response = await fetch(`http://localhost:5000/api/devices/${encodeURIComponent(deviceId)}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            
            if (response.ok) {
              const deviceInfo = await response.json();
              const isOnline = deviceInfo.state !== 'unavailable' && deviceInfo.state !== 'unknown';
              alert(`${isOnline ? 'SUCCESS' : 'FAILED'} - Ping test complete for ${deviceName}. Device is ${isOnline ? 'online and responding' : 'offline or not responding'}.`);
            } else {
              alert(`Ping test failed for ${deviceName}. Device may be offline.`);
            }
          } catch (error) {
            alert(`Network error during ping test for ${deviceName}: ${error.message}`);
          }
          break;
          
        case 'logs':
          if (window.confirm(`Would you like to view detailed error history for ${deviceName}?`)) {
            try {
              // Fetch detailed device logs
              const response = await fetch(`http://localhost:5000/api/analytics/device-errors/${encodeURIComponent(deviceId)}${dateQuery()}`);
              if (response.ok) {
                const logs = await response.json();
                console.log(`Device logs for ${deviceName}:`, logs);
                
                if (logs.length === 0) {
                  alert(`No error logs found for ${deviceName} in the selected time period.`);
                } else {
                  const logSummary = logs.slice(0, 5).map(log => 
                    `• ${log.error_type || 'Unknown error'} at ${new Date(log.timestamp).toLocaleString()}`
                  ).join('\n');
                  alert(`Recent error logs for ${deviceName}:\n\n${logSummary}${logs.length > 5 ? `\n\n... and ${logs.length - 5} more entries` : ''}`);
                }
              } else {
                alert('Failed to fetch device logs. Please try again.');
              }
            } catch (error) {
              alert(` Error fetching logs for ${deviceName}: ${error.message}`);
            }
          }
          break;
          
        case 'refresh_auth':
          if (window.confirm(`This will refresh authentication tokens for ${deviceName}. Continue?`)) {
            try {
              // Attempt to refresh device authentication/connection
              const response = await fetch(`http://localhost:5000/api/devices/${encodeURIComponent(deviceId)}/refresh-auth`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                }
              });
              
              if (response.ok) {
                alert(`Authentication refreshed successfully for ${deviceName}.`);
              } else {
                alert(`Failed to refresh authentication for ${deviceName}. Manual intervention may be required.`);
              }
            } catch (error) {
              alert(`Error refreshing authentication for ${deviceName}: ${error.message}`);
            }
            
            // Refresh data after auth refresh
            setTimeout(() => {
              setAppliedRange(prev => ({ ...prev }));
            }, 1000);
          }
          break;
          
        case 'reset':
          if (window.confirm(`Are you sure you want to attempt to reset ${deviceName}?\n\nThis may temporarily disconnect the device and could affect its current settings.`)) {
            try {
              // Attempt to reset/restart the device
              const response = await fetch(`http://localhost:5000/api/devices/${encodeURIComponent(deviceId)}/reset`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                }
              });
              
              if (response.ok) {
                alert(` Reset command sent to ${deviceName}. The device should restart shortly.`);
              } else {
                const errorData = await response.json();
                alert(`Failed to reset ${deviceName}: ${errorData.error || 'Reset command not supported'}`);
              }
            } catch (error) {
              alert(`Error sending reset command to ${deviceName}: ${error.message}`);
            }
            
            // Refresh data after reset attempt
            setTimeout(() => {
              setAppliedRange(prev => ({ ...prev }));
            }, 3000);
          }
          break;
          
        default:
          alert(`Action Not Available - The "${action}" troubleshooting action is not yet implemented.`);
      }
    } catch (error) {
      console.error('Error in handleQuickAction:', error);
      alert(`Action Failed - Unable to perform the requested action: ${error.message}`);
    }
  };

  // Function to fetch detailed error information for a specific device
  const fetchDeviceErrorDetails = async (deviceData) => {
    try {
      const deviceId = deviceData.device || deviceData.name;
      const response = await fetch(`http://localhost:5000/api/analytics/device-errors/${encodeURIComponent(deviceId)}${dateQuery()}`);
      if (response.ok) {
        const detailedErrors = await response.json();
        return detailedErrors;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch device error details:', error);
      return null;
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Simplified Filter Controls Row */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', margin: 16,
        marginBottom: 0, marginTop: 24, flexWrap: 'wrap', justifyContent: 'space-between'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <TouchableOpacity
            onPress={() => setShowFilterModal(true)}
            style={{
              backgroundColor: theme.primary, 
              borderRadius: 8, 
              paddingVertical: 10, 
              paddingHorizontal: 16, 
              marginRight: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>📅 Filters & Date Range</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const today = formatDate(new Date());
              setStartDate(today);
              setEndDate(today);
              setAppliedRange({ start: today, end: today });
              // Reset all filters to default
              setSelectedUser('ALL');
              setAppliedUser('ALL');
              setSelectedDevice('ALL');
              setAppliedDevice('ALL');
              setSelectedRoom('ALL');
              setAppliedRoom('ALL');
              // Reset view mode to daily
              setViewMode('daily');
            }}
            style={{
              backgroundColor: theme.secondary, 
              borderRadius: 8, 
              paddingVertical: 10, 
              paddingHorizontal: 16, 
              marginRight: 8
            }}>
            <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>Reset All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              const url = `http://localhost:5000/api/analytics/export-usage-csv-grouped${dateQuery()}&groupBy=${viewMode === 'daily' ? 'day' : viewMode === 'weekly' ? 'week' : 'month'}`;
              try {
                const response = await fetch(url);
                const contentType = response.headers.get('content-type');
                if (response.status === 404 || (contentType && contentType.includes('application/json'))) {
                  const data = await response.json();
                  setShowNoLogsModal(true); // Show modal instead of Alert
                  return;
                }
                if (typeof window !== 'undefined' && window.URL) {
                  const blob = await response.blob();
                  const downloadUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = downloadUrl;
                  a.download = `techhome_usage_logs_${viewMode === 'daily' ? 'day' : viewMode === 'weekly' ? 'week' : 'month'}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(downloadUrl);
                } else {
                  Linking.openURL(url);
                }
              } catch (err) {
                setShowNoLogsModal(true); // Show modal on error as well
              }
            }}
            style={{
              backgroundColor: theme.success,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 16
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
              Export {viewMode === 'daily' ? 'Daily' : viewMode === 'weekly' ? 'Weekly' : 'Monthly'} CSV
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Current Filters Display */}
      <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text, marginLeft: 16, marginTop: 16 }}>
        Viewing: {rangeDisplay}{getFilterDisplay()}
      </Text>

      {/* View Mode Toggle */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginHorizontal: 16, 
        marginTop: 16, 
        backgroundColor: theme.cardBackground, 
        borderRadius: 12, 
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text, marginRight: 12, marginLeft: 8 }}>
          View Mode:
        </Text>
        {['daily', 'weekly', 'monthly'].map((mode) => (
          <TouchableOpacity
            key={mode}
            onPress={() => setViewMode(mode)}
            style={{
              flex: 1,
              backgroundColor: viewMode === mode ? theme.primary : 'transparent',
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 12,
              marginHorizontal: 2,
            }}>
            <Text style={{ 
              color: viewMode === mode ? '#fff' : theme.text, 
              fontWeight: viewMode === mode ? 'bold' : 'normal',
              fontSize: 14,
              textAlign: 'center',
              textTransform: 'capitalize'
            }}>
              {mode}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Activity Feed */}
      <View style={{ backgroundColor: theme.cardBackground, borderRadius: 16, marginHorizontal: 15, marginTop: 32, padding: 16, marginBottom: 32, minHeight: 300 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: theme.text }}>
          Recent Activity Feed
        </Text>
        {loadingFeed ? (
          <Text style={{ textAlign: 'center', color: theme.text, margin: 20 }}>Loading activity feed...</Text>
        ) : recentActions.length === 0 ? (
          <Text style={{ textAlign: 'center', color: theme.textSecondary, margin: 20 }}>No recent activity.</Text>
        ) : (
          <View style={{ backgroundColor: theme.cardBackground, borderRadius: 8 }}>
            {recentActions.slice(0, 4).map((item, i, arr) => (
              <View
                key={i}
                style={{
                  borderBottomWidth: i === arr.length - 1 ? 0 : 1,
                  borderBottomColor: theme.border,
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  backgroundColor: i % 2 === 0 ? theme.cardBackground : (theme.feedAltBackground || theme.background),
                  borderTopLeftRadius: i === 0 ? 8 : 0,
                  borderTopRightRadius: i === 0 ? 8 : 0,
                  borderBottomLeftRadius: i === arr.length - 1 ? 8 : 0,
                  borderBottomRightRadius: i === arr.length - 1 ? 8 : 0,
                }}>
                {item.grouped ? (
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                      {item.user} toggled multiple devices
                    </Text>
                    <View style={{ marginTop: 4, marginLeft: 16 }}>
                      {item.devices && item.devices.length > 0 && (
                        item.devices.map((dev, idx) => (
                          <Text key={idx} style={{ fontSize: 15, color: theme.textSecondary }}>
                            • {dev}
                          </Text>
                        ))
                      )}
                    </View>
                    <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 2 }}>
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                    </Text>
                  </View>
                ) : (
                  <View>
                    <Text style={{ fontSize: 16, color: theme.text }}>
                      <Text style={{ fontWeight: 'bold', color: theme.text }}>{item.user || 'Unknown User'}</Text>
                      {" "}{item.action || 'did something'}{" "}
                      <Text style={{ fontWeight: 'bold', color: theme.text }}>{item.device_name || item.device || 'Unknown Device'}</Text>
                      {" "}
                      <Text style={{ 
                        color: item.result && (item.result.includes('error') || item.result.includes('failed')) 
                          ? theme.danger 
                          : theme.textTertiary 
                      }}>
                        {item.result && (item.result.includes('error') || item.result.includes('failed')) ? '❌ ' : ''}
                        {item.result || ''}
                      </Text>
                    </Text>
                    <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 2 }}>
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Devices & Users Charts Side by Side */}
      <View style={{ flexDirection: 'row', marginHorizontal: 8, marginTop: 24 }}>
        {/* Devices Chart */}
        <View style={{ flex: 1, marginRight: 8, backgroundColor: theme.cardBackground, borderRadius: 16, padding: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginLeft: 8, marginTop: 8, color: theme.text }}>
            Most-Used Devices
          </Text>
          {loadingDevices ? (
            <Text style={{ textAlign: 'center', color: theme.primary, margin: 20 }}>Loading device data…</Text>
          ) : deviceUsage.length === 0 ? (
            <Text style={{ textAlign: 'center', color: theme.danger, margin: 20 }}>No device usage data available.</Text>
          ) : (
            <BarChart
              data={deviceData}
              width={screenWidth / 2 - 16}
              height={220}
              fromZero
              chartConfig={deviceChartConfig}
              showValuesOnTopOfBars={true}
              style={{ marginVertical: 8, borderRadius: 16, alignSelf: 'center', backgroundColor: theme.cardBackground }}
            />
          )}
        </View>
        {/* Users Chart */}
        <View style={{ flex: 1, marginLeft: 8, backgroundColor: theme.cardBackground, borderRadius: 16, padding: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginLeft: 8, marginTop: 8, color: theme.text }}>
            Most Frequent Users
          </Text>
          {loadingUsers ? (
            <Text style={{ textAlign: 'center', color: theme.success, margin: 20 }}>Loading user data…</Text>
          ) : userUsage.length === 0 ? (
            <Text style={{ textAlign: 'center', color: theme.danger, margin: 20 }}>No user data available.</Text>
          ) : (
            <BarChart
              data={userData}
              width={screenWidth / 2 - 16}
              height={220}
              fromZero
              chartConfig={userChartConfig}
              showValuesOnTopOfBars={true}
              style={{ marginVertical: 8, borderRadius: 16, alignSelf: 'center', backgroundColor: theme.cardBackground }}
            />
          )}
        </View>
      </View>

      {/* Active Users & Usage Streaks Section */}
      <View style={{ marginHorizontal: 8, backgroundColor: theme.cardBackground, borderRadius: 16, padding: 16, marginTop: 32 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: theme.text }}>
          🏆 Active Users & Usage Streaks
        </Text>
        
        {loadingActiveUsers ? (
          <Text style={{ textAlign: 'center', color: theme.primary, margin: 20 }}>Loading user activity data…</Text>
        ) : activeUsers.length === 0 ? (
          <Text style={{ textAlign: 'center', color: theme.textSecondary, margin: 20 }}>
            No user activity data available for this period.
          </Text>
        ) : (
          <View>
            {/* Top 3 Users Highlight */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: theme.text }}>
                Top Active Users
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {activeUsers.slice(0, 3).map((user, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                      borderRadius: 12,
                      padding: 12,
                      flex: 1,
                      marginHorizontal: 4,
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                    }}>
                    <Text style={{ fontSize: 24, marginBottom: 4 }}>
                      #{index + 1}
                    </Text>
                    <Text style={{ 
                      color: '#000', 
                      fontWeight: 'bold', 
                      fontSize: 12, 
                      textAlign: 'center',
                      marginBottom: 2
                    }}>
                      {user.user.length > 8 ? user.user.slice(0, 8) + '…' : user.user}
                    </Text>
                    <Text style={{ color: '#000', fontSize: 10, fontWeight: 'bold' }}>
                      {user.total_actions} actions
                    </Text>
                    <Text style={{ color: '#000', fontSize: 9 }}>
                      {user.current_streak} day streak
                    </Text>
                    <Text style={{ color: '#000', fontSize: 10, marginTop: 2 }}>
                      {user.badge}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Detailed User Table */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: theme.text }}>
                📊 Detailed Activity Breakdown
              </Text>
              <ScrollView 
                style={{ 
                  maxHeight: 300, 
                  backgroundColor: theme.background, 
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.border
                }}
                showsVerticalScrollIndicator={true}
              >
                {activeUsers.map((user, index) => (
                  <View
                    key={index}
                    style={{
                      borderBottomWidth: index === activeUsers.length - 1 ? 0 : 1,
                      borderBottomColor: theme.border,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      backgroundColor: index % 2 === 0 ? theme.cardBackground : theme.background,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                    
                    {/* Rank and Badge */}
                    <View style={{ width: 50, alignItems: 'center' }}>
                      <Text style={{ 
                        fontSize: 14, 
                        fontWeight: 'bold', 
                        color: theme.text,
                        marginBottom: 2
                      }}>
                        #{user.rank}
                      </Text>
                      <Text style={{ 
                        fontSize: 10, 
                        color: theme.textSecondary,
                        textAlign: 'center'
                      }}>
                        {user.badge}
                      </Text>
                    </View>

                    {/* User Info */}
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={{ 
                        fontSize: 16, 
                        fontWeight: 'bold', 
                        color: theme.text,
                        marginBottom: 2
                      }}>
                        {user.user}
                      </Text>
                      <Text style={{ 
                        fontSize: 12, 
                        color: theme.textSecondary 
                      }}>
                        {user.badge}
                      </Text>
                    </View>

                    {/* Stats */}
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={{ 
                          fontSize: 12, 
                          color: theme.textSecondary,
                          marginRight: 4
                        }}>
                          Actions:
                        </Text>
                        <Text style={{ 
                          fontSize: 14, 
                          fontWeight: 'bold', 
                          color: theme.primary 
                        }}>
                          {user.total_actions}
                        </Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={{ 
                          fontSize: 12, 
                          color: theme.textSecondary,
                          marginRight: 4
                        }}>
                          Current:
                        </Text>
                        <Text style={{ 
                          fontSize: 14, 
                          fontWeight: 'bold', 
                          color: user.current_streak > 0 ? theme.success : theme.textSecondary 
                        }}>
                          {user.current_streak} days
                        </Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ 
                          fontSize: 12, 
                          color: theme.textSecondary,
                          marginRight: 4
                        }}>
                          Best:
                        </Text>
                        <Text style={{ 
                          fontSize: 14, 
                          fontWeight: 'bold', 
                          color: theme.warning 
                        }}>
                          {user.longest_streak} days
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Quick Stats Summary */}
            <View style={{ 
              backgroundColor: theme.background, 
              borderRadius: 12, 
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border
            }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
                📈 Activity Summary
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.primary }}>
                    {activeUsers.length}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'center' }}>
                    Active Users
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.success }}>
                    {activeUsers.filter(u => u.current_streak > 0).length}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'center' }}>
                    On Streak
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.warning }}>
                    {Math.max(...activeUsers.map(u => u.longest_streak), 0)}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'center' }}>
                    Longest Streak
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.primary }}>
                    {activeUsers.reduce((sum, u) => sum + u.total_actions, 0)}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'center' }}>
                    Total Actions
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Error Tracking & Device Health Section */}
      <View style={{ marginHorizontal: 8, backgroundColor: theme.cardBackground, borderRadius: 16, padding: 16, marginTop: 32 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: theme.text }}>
          Device Health & Error Tracking
        </Text>
        
        {loadingErrors ? (
          <Text style={{ textAlign: 'center', color: theme.primary, margin: 20 }}>Loading error data…</Text>
        ) : (
          <>
            {/* Device Health Status */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: theme.text }}>
                Device Health Status
              </Text>
              {deviceHealth.length === 0 ? (
                <Text style={{ textAlign: 'center', color: theme.success, margin: 20 }}>
                  All devices are healthy! No errors detected.
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', paddingHorizontal: 4 }}>
                    {deviceHealth.slice(0, 5).map((device, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={async () => {
                          const deviceId = device.device || device.name;
                          
                          // For special device groups, show group diagnostics
                          if (deviceId === 'all_lights' || deviceId === 'all_devices' || !deviceId || deviceId.length < 10) {
                            // Still fetch error details to show group-level diagnostics
                            const errorDetails = await fetchDeviceErrorDetails(device);
                            setSelectedErrorDevice({
                              ...device,
                              detailedErrors: errorDetails,
                              isDeviceGroup: true // Flag to handle differently in modal
                            });
                            setShowErrorModal(true);
                            return;
                          }
                          
                          // Fetch detailed error information for the device
                          const errorDetails = await fetchDeviceErrorDetails(device);
                          setSelectedErrorDevice({
                            ...device,
                            detailedErrors: errorDetails,
                            isDeviceGroup: false
                          });
                          setShowErrorModal(true);
                        }}
                        style={{
                          backgroundColor: device.status === 'healthy' ? theme.success : 
                                         device.status === 'warning' ? '#FFA500' : theme.danger,
                          borderRadius: 12,
                          padding: 12,
                          marginRight: 12,
                          minWidth: 120,
                          alignItems: 'center',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 3,
                        }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' }}>
                          {device.name.length > 12 ? device.name.slice(0, 12) + '…' : device.name}
                        </Text>
                        <Text style={{ color: '#fff', fontSize: 12, marginTop: 4 }}>
                          {device.error_rate}% errors
                        </Text>
                        <Text style={{ color: '#fff', fontSize: 10, marginTop: 2 }}>
                          {device.error_actions}/{device.total_actions} failed
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* Recent Errors */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: theme.text }}>
                Recent Errors
              </Text>
              {recentErrors.length === 0 ? (
                <Text style={{ textAlign: 'center', color: theme.success, margin: 20 }}>
                  No recent errors!
                </Text>
              ) : (
                <View style={{ backgroundColor: theme.background, borderRadius: 8, maxHeight: 200 }}>
                  <ScrollView>
                    {recentErrors.slice(0, 3).map((error, i) => (
                      <View
                        key={i}
                        style={{
                          borderBottomWidth: i === recentErrors.slice(0, 3).length - 1 ? 0 : 1,
                          borderBottomColor: theme.border,
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          backgroundColor: theme.danger + '15', // Light red background
                        }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 16, color: theme.danger, marginRight: 8 }}>⚠️</Text>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text, flex: 1 }}>
                            {error.device_name} - {error.action}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 24 }}>
                          {error.user} • {error.error_type || 'Unknown error'}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.textTertiary, marginLeft: 24, marginTop: 2 }}>
                          {error.timestamp ? new Date(error.timestamp).toLocaleString() : ''}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Error Types Distribution */}
            {errorTypes.length > 0 && (
              <View>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: theme.text }}>
                  Error Types Distribution
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {errorTypes.map((errorType, index) => (
                    <View
                      key={index}
                      style={{
                        backgroundColor: theme.danger + '20',
                        borderRadius: 8,
                        padding: 8,
                        marginRight: 8,
                        marginBottom: 8,
                        borderLeftWidth: 3,
                        borderLeftColor: theme.danger,
                      }}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>
                        {errorType.error_type?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                        {errorType.count} occurrences
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </View>

      {/* Usage Trends Chart - Conditional based on view mode */}
      <View style={{ marginHorizontal: 8, backgroundColor: theme.cardBackground, borderRadius: 16, padding: 16, marginTop: 32, paddingBottom: 20 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: theme.text }}>
          {viewMode === 'daily' ? 'Daily Usage Trends' :
           viewMode === 'weekly' ? 'Weekly Usage Trends' :
           'Monthly Usage Trends'}
        </Text>
        
        {/* Daily (Hourly) View */}
        {viewMode === 'daily' && (
          <>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
              Hourly activity trends - Click on any hour bar to see detailed breakdown
            </Text>
            {loadingHourly ? (
              <Text style={{ textAlign: 'center', color: theme.danger, margin: 20 }}>Loading hourly usage data…</Text>
            ) : hourlyUsage.length === 0 ? (
              <Text style={{ textAlign: 'center', color: theme.danger, margin: 20 }}>No hourly data available.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -8 }}>
                <View style={{ paddingHorizontal: 8, position: 'relative' }}>
                  <BarChart
                    data={hourlyData}
                    width={barWidth * barCount}
                    height={220}
                    fromZero
                    chartConfig={deviceChartConfig} // Blue for daily
                    showValuesOnTopOfBars={true}
                    style={{ marginVertical: 8, borderRadius: 16 }}
                    barPercentage={0.7}
                  />
                  {/* Transparent overlay for clickable bars */}
                  <View
                    pointerEvents="box-none"
                    style={{
                      position: 'absolute',
                      left: 8,
                      top: 8,
                      flexDirection: 'row',
                      width: barWidth * barCount,
                      height: 180, // Cover the bar area
                    }}
                  >
                    {hourLabels.map((label, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => handleHourPress(i)}
                        activeOpacity={0.15}
                        style={{ width: barWidth, height: 180 }}
                      />
                    ))}
                  </View>
                </View>
              </ScrollView>
            )}
          </>
        )}

        {/* Weekly View */}
        {viewMode === 'weekly' && (
          <>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
              Weekly activity trends - Click on any week bar to see daily breakdown
            </Text>
            {loadingWeekly ? (
              <Text style={{ textAlign: 'center', color: theme.danger, margin: 20 }}>Loading weekly usage data…</Text>
            ) : weeklyData.length === 0 ? (
              <Text style={{ textAlign: 'center', color: theme.danger, margin: 20 }}>No weekly data available.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -8 }}>
                <View style={{ paddingHorizontal: 8, position: 'relative' }}>
                  <BarChart
                    data={{
                      labels: weeklyData.map(item => {
                        // Truncate long week labels for better display
                        const label = item.period || item.week;
                        return label.length > 10 ? label.slice(0, 10) + '…' : label;
                      }),
                      datasets: [{ data: weeklyData.map(item => item.actions) }]
                    }}
                    width={Math.max(screenWidth, weeklyData.length * 80)}
                    height={220}
                    fromZero
                    chartConfig={{
                      ...deviceChartConfig,
                      color: (opacity = 1) => isDarkMode ? `rgba(255, 165, 0, ${opacity})` : `rgba(255, 140, 0, ${opacity})`, // Orange for weekly
                    }}
                    showValuesOnTopOfBars={true}
                    style={{ marginVertical: 8, borderRadius: 16 }}
                    barPercentage={0.7}
                  />
                  {/* Transparent overlay for clickable bars */}
                  <View
                    pointerEvents="box-none"
                    style={{
                      position: 'absolute',
                      left: 8,
                      top: 8,
                      flexDirection: 'row',
                      width: Math.max(screenWidth, weeklyData.length * 80),
                      height: 180, // Cover the bar area
                    }}
                  >
                    {weeklyData.map((_, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => handleWeekPress(i)}
                        activeOpacity={0.15}
                        style={{ 
                          width: (Math.max(screenWidth, weeklyData.length * 80)) / weeklyData.length, 
                          height: 180 
                        }}
                      />
                    ))}
                  </View>
                </View>
              </ScrollView>
            )}
          </>
        )}

        {/* Monthly View */}
        {viewMode === 'monthly' && (
          <>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
              Monthly activity trends - Click on any month bar to see daily breakdown
            </Text>
            {loadingMonthly ? (
              <Text style={{ textAlign: 'center', color: theme.danger, margin: 20 }}>Loading monthly usage data…</Text>
            ) : monthlyData.length === 0 ? (
              <Text style={{ textAlign: 'center', color: theme.danger, margin: 20 }}>No monthly data available.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -8 }}>
                <View style={{ paddingHorizontal: 8, position: 'relative' }}>
                  <BarChart
                    data={{
                      labels: monthlyData.map(item => {
                        // Truncate long month labels for better display
                        const label = item.period || item.month;
                        return label.length > 10 ? label.slice(0, 10) + '…' : label;
                      }),
                      datasets: [{ data: monthlyData.map(item => item.actions) }]
                    }}
                    width={Math.max(screenWidth, monthlyData.length * 100)}
                    height={220}
                    fromZero
                    chartConfig={{
                      ...deviceChartConfig,
                      color: (opacity = 1) => isDarkMode ? `rgba(156, 39, 176, ${opacity})` : `rgba(142, 36, 170, ${opacity})`, // Purple for monthly
                    }}
                    showValuesOnTopOfBars={true}
                    style={{ marginVertical: 8, borderRadius: 16 }}
                    barPercentage={0.7}
                  />
                  {/* Transparent overlay for clickable bars */}
                  <View
                    pointerEvents="box-none"
                    style={{
                      position: 'absolute',
                      left: 8,
                      top: 8,
                      flexDirection: 'row',
                      width: Math.max(screenWidth, monthlyData.length * 100),
                      height: 180, // Cover the bar area
                    }}
                  >
                    {monthlyData.map((_, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => handleMonthPress(i)}
                        activeOpacity={0.15}
                        style={{ 
                          width: (Math.max(screenWidth, monthlyData.length * 100)) / monthlyData.length, 
                          height: 180 
                        }}
                      />
                    ))}
                  </View>
                </View>
              </ScrollView>
            )}
          </>
        )}
      </View>

      {/* Enhanced Error Detail Modal with Troubleshooting */}
      {showErrorModal && selectedErrorDevice && (
        <View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 2000,
          backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: theme.cardBackground,
            borderRadius: 20,
            padding: 24,
            width: '95%',
            maxWidth: 500,
            maxHeight: '90%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 15,
            elevation: 10,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 20, color: theme.text }}>
                {selectedErrorDevice?.isDeviceGroup ? 'Device Group Diagnostics' : 'Device Diagnostics'}
              </Text>
              <TouchableOpacity onPress={() => setShowErrorModal(false)}>
                <Text style={{ fontSize: 28, color: theme.primary, fontWeight: 'bold' }}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '85%' }}>
              {/* Device Info Card */}
              <View style={{
                backgroundColor: theme.background,
                borderRadius: 15,
                padding: 18,
                marginBottom: 20,
                borderWidth: 2,
                borderColor: selectedErrorDevice.status === 'healthy' ? theme.success : 
                           selectedErrorDevice.status === 'warning' ? '#FFA500' : theme.danger,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>
                    {selectedErrorDevice.status === 'healthy' ? '✅' : 
                     selectedErrorDevice.status === 'warning' ? '⚠️' : '🚨'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>
                      {selectedErrorDevice.name}
                    </Text>
                    {selectedErrorDevice.isDeviceGroup ? (
                      <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
                        Device Group • Multiple devices managed together
                      </Text>
                    ) : (
                      (() => {
                        const fullDevice = devices.find(d => 
                          d.id === selectedErrorDevice.device || 
                          d.entityId === selectedErrorDevice.device ||
                          d.name === selectedErrorDevice.name
                        );
                        if (fullDevice && fullDevice.entityId && fullDevice.entityId !== selectedErrorDevice.name) {
                          return (
                            <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
                              Entity: {fullDevice.entityId}
                            </Text>
                          );
                        }
                        return null;
                      })()
                    )}
                  </View>
                </View>
                
                {/* Health Status Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  <View style={{ 
                    backgroundColor: selectedErrorDevice.status === 'healthy' ? theme.success + '20' : 
                                   selectedErrorDevice.status === 'warning' ? '#FFA50020' : theme.danger + '20',
                    borderRadius: 8, 
                    padding: 8,
                    minWidth: 80,
                    alignItems: 'center'
                  }}>
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>Health Status</Text>
                    <Text style={{ 
                      fontSize: 14, 
                      fontWeight: 'bold',
                      color: selectedErrorDevice.status === 'healthy' ? theme.success : 
                            selectedErrorDevice.status === 'warning' ? '#FFA500' : theme.danger
                    }}>
                      {selectedErrorDevice.status?.toUpperCase() || 'UNKNOWN'}
                    </Text>
                  </View>
                  
                  <View style={{ backgroundColor: theme.danger + '15', borderRadius: 8, padding: 8, minWidth: 80, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>Error Rate</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.danger }}>
                      {selectedErrorDevice.error_rate || 0}%
                    </Text>
                  </View>
                  
                  <View style={{ backgroundColor: theme.background, borderRadius: 8, padding: 8, minWidth: 80, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>Failed/Total</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text }}>
                      {selectedErrorDevice.error_actions || 0}/{selectedErrorDevice.total_actions || 0}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Recent Error Details Section */}
              {selectedErrorDevice.error_actions > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 16 }}>
                    Recent Error Analysis
                  </Text>
                  
                  {(() => {
                    const deviceErrors = recentErrors.filter(error => error.device_name === selectedErrorDevice.name);
                    
                    if (deviceErrors.length === 0) {
                      return (
                        <View style={{ 
                          backgroundColor: theme.success + '15', 
                          borderRadius: 12, 
                          padding: 16,
                          alignItems: 'center'
                        }}>
                          <Text style={{ fontSize: 16, color: theme.success, marginBottom: 4 }}>✅</Text>
                          <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center' }}>
                            No recent detailed errors available for this device.
                            {selectedErrorDevice.error_actions > 0 && ' Error data may have been cleared or occurred outside the current time range.'}
                          </Text>
                        </View>
                      );
                    }

                    // Show only the first error prominently
                    const firstError = deviceErrors[0];
                    const remainingErrors = deviceErrors.slice(1);
                    const firstErrorInfo = getErrorSuggestions(
                      firstError.error_type, 
                      selectedErrorDevice.name,
                      selectedErrorDevice.isDeviceGroup
                    );
                    
                    // Debug logging for troubleshooting
                    console.log('Device Diagnostics Debug:', {
                      deviceName: selectedErrorDevice.name,
                      deviceId: selectedErrorDevice.device || selectedErrorDevice.name || selectedErrorDevice.id,
                      errorType: firstError.error_type,
                      quickActions: firstErrorInfo.quickActions,
                      hasQuickActions: firstErrorInfo.quickActions && firstErrorInfo.quickActions.length > 0
                    });

                    return (
                      <View>
                        {/* First Error - Main Display */}
                        <View style={{
                          backgroundColor: theme.background,
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: remainingErrors.length > 0 ? 16 : 0,
                          borderLeftWidth: 4,
                          borderLeftColor: theme.danger,
                        }}>
                          {/* Error Header */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <Text style={{ fontSize: 20, marginRight: 10 }}>{firstErrorInfo.icon}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.danger }}>
                                {firstErrorInfo.title} (Latest)
                              </Text>
                              <Text style={{ fontSize: 12, color: theme.textTertiary }}>
                                {new Date(firstError.timestamp).toLocaleString()}
                              </Text>
                            </View>
                          </View>
                          
                          {/* Error Message */}
                          <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 12, fontStyle: 'italic' }}>
                            "{firstError.result || 'No specific error message'}"
                          </Text>
                          
                          {/* Troubleshooting Suggestions */}
                          <View style={{ backgroundColor: theme.cardBackground, borderRadius: 8, padding: 12, marginBottom: 12 }}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
                              💡 Troubleshooting Steps:
                            </Text>
                            {firstErrorInfo.suggestions.map((suggestion, idx) => (
                              <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                                <Text style={{ color: theme.primary, marginRight: 8, fontSize: 12 }}>•</Text>
                                <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1, lineHeight: 18 }}>
                                  {suggestion}
                                </Text>
                              </View>
                            ))}
                          </View>

                          {/* Quick Action Buttons */}
                          <View style={{ marginTop: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
                              Quick Actions
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                              {firstErrorInfo.quickActions && firstErrorInfo.quickActions.length > 0 ? (
                                firstErrorInfo.quickActions.map((action, idx) => (
                                  <TouchableOpacity
                                    key={idx}
                                    style={{
                                      backgroundColor: theme.primary,
                                      borderRadius: 8,
                                      paddingVertical: 8,
                                      paddingHorizontal: 12,
                                      shadowColor: '#000',
                                      shadowOffset: { width: 0, height: 2 },
                                      shadowOpacity: 0.1,
                                      shadowRadius: 4,
                                      elevation: 2,
                                    }}
                                    onPress={() => handleQuickAction(action, selectedErrorDevice, selectedErrorDevice.name)}
                                  >
                                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                                      {action.charAt(0).toUpperCase() + action.slice(1).replace('_', ' ')}
                                    </Text>
                                  </TouchableOpacity>
                                ))
                              ) : (
                                <Text style={{ fontSize: 12, color: theme.textSecondary, fontStyle: 'italic' }}>
                                  No automated actions available for this error type
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>

                        {/* Additional Errors - Scrollable List */}
                        {remainingErrors.length > 0 && (
                          <View>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
                              📋 Additional Errors ({remainingErrors.length})
                            </Text>
                            <ScrollView 
                              style={{ 
                                maxHeight: 200, 
                                backgroundColor: theme.cardBackground, 
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: theme.border
                              }}
                              showsVerticalScrollIndicator={true}
                            >
                              {remainingErrors.map((error, index) => {
                                const errorInfo = getErrorSuggestions(
                                  error.error_type, 
                                  selectedErrorDevice.name,
                                  selectedErrorDevice.isDeviceGroup
                                );
                                return (
                                  <View
                                    key={index}
                                    style={{
                                      borderBottomWidth: index === remainingErrors.length - 1 ? 0 : 1,
                                      borderBottomColor: theme.border,
                                      paddingVertical: 12,
                                      paddingHorizontal: 16,
                                      backgroundColor: index % 2 === 0 ? 'transparent' : theme.background + '30',
                                    }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                      <Text style={{ fontSize: 16, marginRight: 8 }}>{errorInfo.icon}</Text>
                                      <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.danger }}>
                                          {errorInfo.title}
                                        </Text>
                                        <Text style={{ fontSize: 11, color: theme.textTertiary }}>
                                          {new Date(error.timestamp).toLocaleString()}
                                        </Text>
                                      </View>
                                    </View>
                                    <Text style={{ fontSize: 12, color: theme.textSecondary, fontStyle: 'italic', marginLeft: 24 }}>
                                      "{error.result || 'No specific error message'}"
                                    </Text>
                                  </View>
                                );
                              })}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    );
                  })()}
                </View>
              )}
            </ScrollView>

            {/* Footer Actions */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setShowErrorModal(false)}
                style={{ 
                  backgroundColor: theme.secondary,
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  flex: 1
                }}>
                <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>
                  Close
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  alert(`Refreshing - Updating status for ${selectedErrorDevice.name}...`);
                  setAppliedRange(prev => ({ ...prev })); // Trigger refresh
                  setShowErrorModal(false);
                }}
                style={{ 
                  backgroundColor: theme.primary,
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  flex: 1
                }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>
                  🔄 Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Hour Modal Overlay - Only show in daily mode */}
      {showHourModal && viewMode === 'daily' && (
        <View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 999,
          backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: theme.cardBackground,
            borderRadius: 16,
            padding: 20,
            minWidth: 320,
            maxWidth: '90%',
            maxHeight: '80%',
            elevation: 4
          }}>
            <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 8, color: theme.text }}>
              Activity in Hour {selectedHour !== null ? `${selectedHour.toString().padStart(2, '0')}:00-${selectedHour.toString().padStart(2, '0')}:59` : ''} ({rangeDisplay})
            </Text>
            {loadingHourActions ? (
              <Text style={{ color: theme.text }}>Loading...</Text>
            ) : hourActions.length === 0 ? (
              <Text style={{ color: theme.textSecondary }}>No actions recorded for this hour.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {hourActions.map((item, i) => (
                  <View key={i} style={{ marginBottom: 10 }}>
                    <Text style={{ color: theme.text }}>
                      <Text style={{ fontWeight: 'bold', color: theme.text }}>{item.user}</Text>
                      {" "}{item.action}
                      {" "}<Text style={{ fontWeight: 'bold', color: theme.text }}>{item.device_name}</Text>
                      {" "}<Text style={{ color: theme.textTertiary }}>{item.result}</Text>
                    </Text>
                    <Text style={{ color: theme.textTertiary, fontSize: 12 }}>
                      {item.date ? `${item.date} ` : ''}{item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ''}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              onPress={() => setShowHourModal(false)}
              style={{ alignSelf: 'flex-end', marginTop: 10 }}>
              <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Period Modal Overlay - For weekly/monthly breakdown */}
      {showPeriodModal && (viewMode === 'weekly' || viewMode === 'monthly') && (
        <View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 999,
          backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: theme.cardBackground,
            borderRadius: 16,
            padding: 20,
            minWidth: 320,
            maxWidth: '90%',
            maxHeight: '80%',
            elevation: 4
          }}>
            <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 8, color: theme.text }}>
              {periodType === 'week' 
                ? `Daily Breakdown for ${selectedPeriod}` 
                : `Daily Breakdown for ${selectedPeriod}`}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 12 }}>
              {rangeDisplay}
            </Text>
            {loadingPeriodActions ? (
              <Text style={{ color: theme.text }}>Loading breakdown...</Text>
            ) : periodActions.length === 0 ? (
              <Text style={{ color: theme.textSecondary }}>No activity recorded for this {periodType}.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {periodActions.map((item, i) => (
                  <View key={i} style={{ 
                    marginBottom: 12, 
                    padding: 12, 
                    backgroundColor: theme.background, 
                    borderRadius: 8 
                  }}>
                    <Text style={{ fontWeight: 'bold', color: theme.text, marginBottom: 4 }}>
                      {item.date} - {item.actions} actions
                    </Text>
                    {item.topUsers && item.topUsers.length > 0 && (
                      <View style={{ marginTop: 4 }}>
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                          Top users: {item.topUsers.join(', ')}
                        </Text>
                      </View>
                    )}
                    {item.topDevices && item.topDevices.length > 0 && (
                      <View style={{ marginTop: 2 }}>
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                          Top devices: {item.topDevices.join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              onPress={() => setShowPeriodModal(false)}
              style={{ alignSelf: 'flex-end', marginTop: 10 }}>
              <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 1500,
          backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: theme.cardBackground,
            borderRadius: 20,
            padding: 24,
            width: '90%',
            maxWidth: 500,
            maxHeight: '80%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
          }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ 
                fontSize: 24, 
                fontWeight: 'bold', 
                color: theme.text, 
                marginBottom: 20,
                textAlign: 'center'
              }}>
                📅 Filters & Date Range
              </Text>

              {/* Date Range Section */}
              <View style={{
                backgroundColor: theme.background,
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
              }}>
                <Text style={{ 
                  fontSize: 18, 
                  fontWeight: 'bold', 
                  color: theme.text, 
                  marginBottom: 12,
                  textAlign: 'center'
                }}>
                  📅 Date Range
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontWeight: 'bold', marginRight: 8, color: theme.text, minWidth: 50 }}>Start:</Text>
                  <input
                    type="date"
                    value={startDate}
                    max={endDate}
                    onChange={e => setStartDate(e.target.value)}
                    style={{
                      border: `1px solid ${theme.border}`,
                      borderRadius: 8, 
                      padding: 10, 
                      fontSize: 16, 
                      flex: 1,
                      background: theme.cardBackground, 
                      color: theme.text
                    }}
                  />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontWeight: 'bold', marginRight: 8, color: theme.text, minWidth: 50 }}>End:</Text>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    max={formatDate(new Date())}
                    onChange={e => setEndDate(e.target.value)}
                    style={{
                      border: `1px solid ${theme.border}`,
                      borderRadius: 8, 
                      padding: 10, 
                      fontSize: 16, 
                      flex: 1,
                      background: theme.cardBackground, 
                      color: theme.text
                    }}
                  />
                </View>
              </View>

              {/* Filters Section */}
              <View style={{
                backgroundColor: theme.background,
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
              }}>
                <Text style={{ 
                  fontSize: 18, 
                  fontWeight: 'bold', 
                  color: theme.text, 
                  marginBottom: 12,
                  textAlign: 'center'
                }}>
                  🔍 Filters
                </Text>

                {/* User Filter */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontWeight: '600', marginBottom: 8, color: theme.text, fontSize: 16 }}>👤 User:</Text>
                  <select
                    value={selectedUser}
                    onChange={e => setSelectedUser(e.target.value)}
                    style={{ 
                      border: `1px solid ${theme.border}`, 
                      borderRadius: 8, 
                      padding: 12, 
                      fontSize: 16, 
                      width: '100%',
                      background: theme.cardBackground, 
                      color: theme.text,
                    }}
                  >
                    <option value="ALL">All Users</option>
                    {users.map((u, i) => (
                      <option key={i} value={u}>{u}</option>  
                    ))}
                  </select>
                </View>

                {/* Device Filter */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontWeight: '600', marginBottom: 8, color: theme.text, fontSize: 16 }}>📱 Device:</Text>
                  <select
                    value={selectedDevice}
                    onChange={e => {
                      setSelectedDevice(e.target.value);
                      // Clear room filter when device is selected
                      if (e.target.value !== 'ALL') {
                        setSelectedRoom('ALL');
                      }
                    }}
                    style={{ 
                      border: `1px solid ${theme.border}`, 
                      borderRadius: 8, 
                      padding: 12, 
                      fontSize: 16, 
                      width: '100%',
                      background: theme.cardBackground, 
                      color: theme.text,
                    }}
                  >
                    <option value="ALL">All Devices</option>
                    {devices.map((d, i) => (
                      <option key={i} value={d.id}>{d.name}</option>  
                    ))}
                  </select>
                </View>

                {/* Room Filter */}
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ fontWeight: '600', marginBottom: 8, color: theme.text, fontSize: 16 }}>🏠 Room:</Text>
                  <select
                    value={selectedRoom}
                    onChange={e => {
                      setSelectedRoom(e.target.value);
                      // Clear device filter when room is selected
                      if (e.target.value !== 'ALL') {
                        setSelectedDevice('ALL');
                      }
                    }}
                    style={{ 
                      border: `1px solid ${theme.border}`, 
                      borderRadius: 8, 
                      padding: 12, 
                      fontSize: 16, 
                      width: '100%',
                      background: theme.cardBackground, 
                      color: theme.text,
                    }}
                  >
                    <option value="ALL">All Rooms</option>
                    {rooms.map((r, i) => (
                      <option key={i} value={r.id}>{r.name}</option>  
                    ))}
                  </select>
                </View>

                {/* Note about mutually exclusive filters */}
                <Text style={{ 
                  fontSize: 12, 
                  color: theme.textSecondary, 
                  textAlign: 'center',
                  fontStyle: 'italic',
                  marginTop: 8
                }}>
                  Note: Device and Room filters are mutually exclusive
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setShowFilterModal(false)}
                  style={{ 
                    backgroundColor: theme.secondary, 
                    borderRadius: 12, 
                    paddingVertical: 12, 
                    paddingHorizontal: 20,
                    flex: 1,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}>
                  <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => {
                    // Clear all filters
                    setSelectedUser('ALL');
                    setSelectedDevice('ALL');
                    setSelectedRoom('ALL');
                    const today = formatDate(new Date());
                    setStartDate(today);
                    setEndDate(today);
                    // Reset view mode to daily
                    setViewMode('daily');
                  }}
                  style={{ 
                    backgroundColor: theme.danger, 
                    borderRadius: 12, 
                    paddingVertical: 12, 
                    paddingHorizontal: 20,
                    flex: 1,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>Clear All</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => {
                    // Apply all filters and date range
                    setAppliedRange({ start: startDate, end: endDate });
                    setAppliedUser(selectedUser);
                    setAppliedDevice(selectedDevice);
                    setAppliedRoom(selectedRoom);
                    setShowFilterModal(false);
                  }}
                  style={{ 
                    backgroundColor: theme.primary, 
                    borderRadius: 12, 
                    paddingVertical: 12, 
                    paddingHorizontal: 20,
                    flex: 1,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>Apply</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* No Logs Modal Popup */}
      {showNoLogsModal && (
        <View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 2000,
          backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: theme.cardBackground,
            borderRadius: 16,
            padding: 24,
            minWidth: 320,
            maxWidth: '90%',
            alignItems: 'center',
            elevation: 5,
          }}>
            {/* Smart Title based on filters */}
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10, color: theme.text }}>
              {(() => {
                const hasUser = appliedUser && appliedUser !== 'ALL';
                const hasDevice = appliedDevice && appliedDevice !== 'ALL';
                const hasRoom = appliedRoom && appliedRoom !== 'ALL';
                
                if (hasUser && hasDevice) {
                  return `No activity found for ${appliedUser} with ${devices.find(d => d.id === appliedDevice)?.name || 'this device'}`;
                } else if (hasUser && hasRoom) {
                  return `No activity found for ${appliedUser} in ${rooms.find(r => r.id === appliedRoom)?.name || 'this room'}`;
                } else if (hasUser) {
                  return `No activity found for ${appliedUser}`;
                } else if (hasDevice) {
                  return `No activity found for ${devices.find(d => d.id === appliedDevice)?.name || 'this device'}`;
                } else if (hasRoom) {
                  return `No activity found in ${rooms.find(r => r.id === appliedRoom)?.name || 'this room'}`;
                } else {
                  return 'No activity found';
                }
              })()}
            </Text>
            
            {/* Smart message based on filters */}
            <Text style={{ color: theme.textSecondary, marginBottom: 18, textAlign: 'center', lineHeight: 20 }}>
              {(() => {
                const hasUser = appliedUser && appliedUser !== 'ALL';
                const hasDevice = appliedDevice && appliedDevice !== 'ALL';
                const hasRoom = appliedRoom && appliedRoom !== 'ALL';
                const hasFilters = hasUser || hasDevice || hasRoom;
                
                if (hasFilters) {
                  let suggestions = [];
                  if (hasUser || hasDevice || hasRoom) {
                    suggestions.push('Try adjusting your filters');
                  }
                  suggestions.push('select a different date range');
                  suggestions.push('or check if devices are active');
                  
                  return `No logs match your current filters for ${rangeDisplay}.\n\n${suggestions.join(', ')}.`;
                } else {
                  return `No activity logs were recorded for ${rangeDisplay}.\n\nTry selecting a different date range or check if your smart home devices are connected and active.`;
                }
              })()}
            </Text>
            
            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {(appliedUser !== 'ALL' || appliedDevice !== 'ALL' || appliedRoom !== 'ALL') && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedUser('ALL');
                    setAppliedUser('ALL');
                    setSelectedDevice('ALL');
                    setAppliedDevice('ALL');
                    setSelectedRoom('ALL');
                    setAppliedRoom('ALL');
                    setViewMode('daily');
                    setShowNoLogsModal(false);
                  }}
                  style={{ 
                    backgroundColor: theme.secondary, 
                    borderRadius: 6, 
                    paddingVertical: 8, 
                    paddingHorizontal: 16,
                    marginRight: 8
                  }}>
                  <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 14 }}>Clear Filters</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setShowNoLogsModal(false)}
                style={{ backgroundColor: theme.primary, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 24 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
