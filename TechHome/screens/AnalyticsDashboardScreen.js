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
    setLoadingDevices(true); setLoadingUsers(true); setLoadingFeed(true); setLoadingHourly(true); setLoadingErrors(true);
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
      .then(res => res.json()).then(data => { setDeviceHealth(data); setLoadingErrors(false); })
      .catch(() => { setDeviceHealth([]); setLoadingErrors(false); });

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
                        onPress={() => {
                          setSelectedErrorDevice(device);
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

      {/* Error Detail Modal */}
      {showErrorModal && selectedErrorDevice && (
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
            maxHeight: '80%',
            elevation: 5,
          }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10, color: theme.text }}>
              Device Error Details
            </Text>
            
            <View style={{ marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 4 }}>
                {selectedErrorDevice.name}
              </Text>
              {(() => {
                // Try to find the full device object to get entity ID
                const fullDevice = devices.find(d => 
                  d.id === selectedErrorDevice.device || 
                  d.entityId === selectedErrorDevice.device ||
                  d.name === selectedErrorDevice.name
                );
                if (fullDevice && fullDevice.entityId && fullDevice.entityId !== selectedErrorDevice.name) {
                  return (
                    <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                      {fullDevice.entityId}
                    </Text>
                  );
                }
                return null;
              })()}
            </View>
            
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 8 }}>
                Health Status: 
                <Text style={{ 
                  color: selectedErrorDevice.status === 'healthy' ? theme.success : 
                        selectedErrorDevice.status === 'warning' ? '#FFA500' : theme.danger,
                  fontWeight: 'bold'
                }}>
                  {' ' + selectedErrorDevice.status.toUpperCase()}
                </Text>
              </Text>
              
              <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 4 }}>
                Error Rate: {selectedErrorDevice.error_rate}%
              </Text>
              <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 4 }}>
                Failed Actions: {selectedErrorDevice.error_actions}
              </Text>
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                Total Actions: {selectedErrorDevice.total_actions}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowErrorModal(false)}
              style={{ 
                backgroundColor: theme.primary, 
                borderRadius: 6, 
                paddingVertical: 8, 
                paddingHorizontal: 24,
                alignSelf: 'center'
              }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
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
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
