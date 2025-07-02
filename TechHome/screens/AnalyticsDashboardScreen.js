import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useTheme } from '../context/ThemeContext';

const screenWidth = Dimensions.get('window').width - 32;

function formatDate(date) {
  // Convert JS Date to YYYY-MM-DD string
  return date.toISOString().slice(0, 10);
}

export default function AnalyticsDashboardScreen() {
  // Date filter states
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [appliedDate, setAppliedDate] = useState(formatDate(new Date()));

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

  // Helper: build query string
  function dateQuery() {
    return appliedDate ? `?date=${appliedDate}` : '';
  }

  // Fetch all analytics data when date changes
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
  }, [appliedDate]);

  // Drill-down by hour
  const handleHourPress = (hourIdx) => {
    setSelectedHour(hourIdx);
    setShowHourModal(true);
    setLoadingHourActions(true);
    // Pass date to actions-in-hour endpoint!
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Date Picker */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', margin: 16,
        marginBottom: 0, marginTop: 24
      }}>
        <Text style={{ fontWeight: 'bold', marginRight: 8, color: theme.text }}>Date:</Text>
        {/* For web - use <input type="date" /> */}
        <input
          type="date"
          value={selectedDate}
          max={formatDate(new Date())}
          onChange={e => setSelectedDate(e.target.value)}
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: 4, padding: 4, fontSize: 16, marginRight: 12,
            background: theme.cardBackground, color: theme.text
          }}
        />
        <TouchableOpacity
          onPress={() => setAppliedDate(selectedDate)}
          style={{
            backgroundColor: theme.primary, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 14
          }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Apply</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity Feed */}
      <Text style={{ fontSize: 24, fontWeight: 'bold', margin: 16, marginTop: 32, color: theme.text }}>
        Recent Activity Feed
      </Text>
      {loadingFeed ? (
        <Text style={{ textAlign: 'center', color: theme.text }}>Loading activity feed...</Text>
      ) : recentActions.length === 0 ? (
        <Text style={{ textAlign: 'center', color: theme.textSecondary }}>No recent activity.</Text>
      ) : (
        <View style={{ margin: 20, backgroundColor: theme.cardBackground, borderRadius: 8, padding: 12 }}>
          {recentActions.map((item, i) => (
            <View
              key={i}
              style={{
                borderBottomWidth: i === recentActions.length - 1 ? 0 : 1,
                borderBottomColor: theme.border,
                paddingVertical: 10,
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

      {/* Devices Chart */}
      <Text style={{ fontSize: 24, fontWeight: 'bold', margin: 16, color: theme.text }}>
        Most-Used Devices
      </Text>
      {loadingDevices ? (
        <Text style={{ textAlign: 'center', color: theme.primary, margin: 20 }}>Loading device data…</Text>
      ) : deviceUsage.length === 0 ? (
        <Text style={{ textAlign: 'center', color: theme.danger, margin: 20 }}>No device usage data available.</Text>
      ) : (
        <View>
          <BarChart
            data={deviceData}
            width={screenWidth}
            height={220}
            fromZero
            chartConfig={deviceChartConfig}
            showValuesOnTopOfBars={true}
            style={{ marginVertical: 8, borderRadius: 16, alignSelf: 'center', backgroundColor: theme.cardBackground }}
          />
        </View>
      )}

      {/* Users Chart */}
      <Text style={{ fontSize: 24, fontWeight: 'bold', margin: 16, marginTop: 32, color: theme.text }}>
        Most Frequent Users
      </Text>
      {loadingUsers ? (
        <Text style={{ textAlign: 'center', color: theme.success, margin: 20 }}>Loading user data…</Text>
      ) : userUsage.length === 0 ? (
        <Text style={{ textAlign: 'center', color: theme.danger, margin: 20 }}>No user data available.</Text>
      ) : (
        <View>
          <BarChart
            data={userData}
            width={screenWidth}
            height={220}
            fromZero
            chartConfig={userChartConfig}
            showValuesOnTopOfBars={true}
            style={{ marginVertical: 8, borderRadius: 16, alignSelf: 'center', backgroundColor: theme.cardBackground }}
          />
        </View>
      )}

      {/* Hourly Usage Trends Chart */}
      <Text style={{ fontSize: 24, fontWeight: 'bold', margin: 16, marginTop: 32, color: theme.text }}>
        Hourly Usage Trends
      </Text>
      {loadingHourly ? (
        <Text style={{ textAlign: 'center', color: theme.danger, margin: 20 }}>Loading hourly usage data…</Text>
      ) : (
        <View style={{ position: 'relative', minHeight: 240 }}>
          {/* The BarChart */}
          <BarChart
            data={hourlyData}
            width={screenWidth}
            height={220}
            fromZero
            chartConfig={deviceChartConfig}
            showValuesOnTopOfBars={true}
            style={{ marginVertical: 8, borderRadius: 16, alignSelf: 'center', backgroundColor: theme.cardBackground }}
          />
          {/* Transparent overlay for making the x-axis numbers clickable */}
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: 0,
              top: 196,
              flexDirection: 'row',
              width: screenWidth,
              height: 24,
            }}
          >
            {hourLabels.map((label, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleHourPress(i)}
                activeOpacity={0.15}
                style={{
                  width: barWidth,
                  height: 24,
                  // transparent area, clickable
                }}
              />
            ))}
          </View>
        </View>
      )}

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
              Activity in Hour {selectedHour} ({appliedDate})
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
                      {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ''}
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
    </ScrollView>
  );
}
