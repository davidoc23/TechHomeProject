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

  const { theme, isDarkMode } = useTheme();

  // No logs modal state
  const [showNoLogsModal, setShowNoLogsModal] = useState(false);

  // Helper: build query string for range
  function dateQuery() {
    if (appliedRange.start === appliedRange.end) {
      return `?date=${appliedRange.start}`;
    }
    return `?startDate=${appliedRange.start}&endDate=${appliedRange.end}`;
  }

  // Fetch analytics when range changes
  useEffect(() => {
    setLoadingDevices(true); setLoadingUsers(true); setLoadingFeed(true); setLoadingHourly(true);
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
  }, [appliedRange]);

  // Periodic auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setAppliedRange(prev => ({ ...prev }));
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Drill-down by hour
  const handleHourPress = (hourIdx) => {
    setSelectedHour(hourIdx);
    setShowHourModal(true);
    setLoadingHourActions(true);
    fetch(`http://localhost:5000/api/analytics/actions-in-hour/${hourIdx}${dateQuery()}`)
      .then(res => res.json())
      .then(data => { setHourActions(data); setLoadingHourActions(false); })
      .catch(() => setLoadingHourActions(false));
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

  // Range display helper
  const rangeDisplay = appliedRange.start === appliedRange.end
    ? appliedRange.start
    : `${appliedRange.start} – ${appliedRange.end}`;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Date Range Picker */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', margin: 16,
        marginBottom: 0, marginTop: 24, flexWrap: 'wrap'
      }}>
        <Text style={{ fontWeight: 'bold', marginRight: 8, color: theme.text }}>Start:</Text>
        <input
          type="date"
          value={startDate}
          max={endDate}
          onChange={e => setStartDate(e.target.value)}
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: 4, padding: 4, fontSize: 16, marginRight: 12,
            background: theme.cardBackground, color: theme.text
          }}
        />
        <Text style={{ fontWeight: 'bold', marginRight: 8, color: theme.text }}>End:</Text>
        <input
          type="date"
          value={endDate}
          min={startDate}
          max={formatDate(new Date())}
          onChange={e => setEndDate(e.target.value)}
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: 4, padding: 4, fontSize: 16, marginRight: 12,
            background: theme.cardBackground, color: theme.text
          }}
        />
        <TouchableOpacity
          onPress={() => setAppliedRange({ start: startDate, end: endDate })}
          style={{
            backgroundColor: theme.primary, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8
          }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Apply</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            const today = formatDate(new Date());
            setStartDate(today);
            setEndDate(today);
            setAppliedRange({ start: today, end: today });
          }}
          style={{
            backgroundColor: theme.primary, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8
          }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            const url = `http://localhost:5000/api/analytics/export-usage-csv${dateQuery()}`;
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
                a.download = 'techhome_usage_logs.csv';
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
            backgroundColor: theme.primary,
            borderRadius: 4,
            paddingVertical: 6,
            paddingHorizontal: 14
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Export as CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Range Display */}
      <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text, marginLeft: 16, marginTop: 4 }}>
        Viewing: {rangeDisplay}
      </Text>

      {/* Recent Activity Feed */}
      <View style={{ flex: 1, backgroundColor: theme.cardBackground, borderRadius: 16, marginHorizontal: 15, marginTop: 32, padding: 4, marginBottom: 32, paddingBottom: 45, minHeight: 300 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginLeft: 8, marginTop: 8, color: theme.text, marginHorizontal: 14 }}>
          Recent Activity Feed
        </Text>
        {loadingFeed ? (
          <Text style={{ textAlign: 'center', color: theme.text, margin: 20 }}>Loading activity feed...</Text>
        ) : recentActions.length === 0 ? (
          <Text style={{ textAlign: 'center', color: theme.textSecondary, margin: 20 }}>No recent activity.</Text>
        ) : (
          <View style={{ margin: 12, backgroundColor: theme.cardBackground, borderRadius: 8, padding: 0 }}>
            {recentActions.slice(0, 4).map((item, i, arr) => (
              <View
                key={i}
                style={{
                  borderBottomWidth: i === arr.length - 1 ? 0 : 1,
                  borderBottomColor: theme.border,
                  marginHorizontal: 14,
                  marginBottom: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  marginHorizontal: 4,
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
                      <Text style={{ color: theme.textTertiary }}>{item.result || ''}</Text>
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

      {/* Hourly Usage Trends Chart */}
      <View style={{ flex: 1, marginLeft: 8, backgroundColor: theme.cardBackground, borderRadius: 16, padding: 4, marginTop: 32, paddingBottom: 45 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginLeft: 8, marginTop: 8, color: theme.text }}>
          Hourly Usage Trends
        </Text>
        {loadingHourly ? (
          <Text style={{ textAlign: 'center', color: theme.danger, margin: 20 }}>Loading hourly usage data…</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <BarChart
                data={hourlyData}
                width={barWidth * barCount}
                height={220}
                fromZero
                chartConfig={deviceChartConfig}
                showValuesOnTopOfBars={true}
                style={{ marginVertical: 8, borderRadius: 16, alignSelf: 'center', backgroundColor: theme.cardBackground }}
                barPercentage={0.7}
              />
              {/* Transparent overlay for making the x-axis numbers clickable */}
              <View
                pointerEvents="box-none"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 196,
                  flexDirection: 'row',
                  width: barWidth * barCount,
                  height: 24,
                }}
              >
                {hourLabels.map((label, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handleHourPress(i)}
                    activeOpacity={0.15}
                    style={{ width: barWidth, height: 24 }}
                  />
                ))}
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Hour Modal Overlay */}
      {showHourModal && (
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
            minWidth: 280,
            maxWidth: '90%',
            alignItems: 'center',
            elevation: 5,
          }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10, color: theme.text }}>
              No logs found for this date
            </Text>
            <Text style={{ color: theme.textSecondary, marginBottom: 18, textAlign: 'center' }}>
              There are no activity logs for the selected date or date range.
            </Text>
            <TouchableOpacity
              onPress={() => setShowNoLogsModal(false)}
              style={{ backgroundColor: theme.primary, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 24 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
