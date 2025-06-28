import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width - 32;

export default function AnalyticsDashboardScreen() {
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

  // Device usage
  useEffect(() => {
    fetch('http://localhost:5000/api/analytics/usage-per-device')
      .then(res => res.json())
      .then(data => { setDeviceUsage(data); setLoadingDevices(false); })
      .catch(() => setLoadingDevices(false));
  }, []);

  // User usage
  useEffect(() => {
    fetch('http://localhost:5000/api/analytics/usage-per-user')
      .then(res => res.json())
      .then(data => { setUserUsage(data); setLoadingUsers(false); })
      .catch(() => setLoadingUsers(false));
  }, []);

  // Recent actions
  useEffect(() => {
    fetch('http://localhost:5000/api/analytics/recent-actions')
      .then(res => res.json())
      .then(data => { setRecentActions(data); setLoadingFeed(false); })
      .catch(() => setLoadingFeed(false));
  }, []);

  // Hourly usage
  useEffect(() => {
    fetch('http://localhost:5000/api/analytics/usage-per-hour')
      .then(res => res.json())
      .then(data => { setHourlyUsage(data); setLoadingHourly(false); })
      .catch(() => setLoadingHourly(false));
  }, []);

  // Drill-down by hour
  const handleHourPress = (hourIdx) => {
    setSelectedHour(hourIdx);
    setShowHourModal(true);
    setLoadingHourActions(true);
    fetch(`http://localhost:5000/api/analytics/actions-in-hour/${hourIdx}`)
      .then(res => res.json())
      .then(data => { setHourActions(data); setLoadingHourActions(false); })
      .catch(() => setLoadingHourActions(false));
  };

  // Chart configs
  const deviceChartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    color: (opacity = 1) => `rgba(56, 122, 238, ${opacity})`,
    labelColor: (opacity = 1) => `#111`,
    barPercentage: 0.7,
    decimalPlaces: 0,
  };
  const userChartConfig = {
    ...deviceChartConfig,
    color: (opacity = 1) => `rgba(52, 168, 83, ${opacity})`,
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
  const hourlyData = {
    labels: hourLabels,
    datasets: [{
      data: hourLabels.map(hour => {
        const found = hourlyUsage.find(r => String(r.hour) === String(hour));
        return found ? found.actions : 0;
      })
    }]
  };

  // Overlay bar width
  const barCount = 24;
  const barWidth = screenWidth / barCount;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Recent Activity Feed */}
      <Text style={{ fontSize: 24, fontWeight: 'bold', margin: 16, marginTop: 32 }}>
        Recent Activity Feed
      </Text>
      {loadingFeed ? (
        <Text style={{ textAlign: 'center' }}>Loading activity feed...</Text>
      ) : recentActions.length === 0 ? (
        <Text style={{ textAlign: 'center' }}>No recent activity.</Text>
      ) : (
        <View style={{ margin: 20, backgroundColor: '#fafafa', borderRadius: 8, padding: 12 }}>
          {recentActions.map((item, i) => (
            <View
              key={i}
              style={{
                borderBottomWidth: i === recentActions.length - 1 ? 0 : 1,
                borderBottomColor: '#eee',
                paddingVertical: 10,
              }}>
              {item.grouped ? (
                <View>
                  <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                    {item.user} toggled multiple devices
                  </Text>
                  <View style={{ marginTop: 4, marginLeft: 16 }}>
                    {item.devices && item.devices.length > 0 && (
                      item.devices.map((dev, idx) => (
                        <Text key={idx} style={{ fontSize: 15, color: '#333' }}>
                          • {dev}
                        </Text>
                      ))
                    )}
                  </View>
                  <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
                    {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={{ fontSize: 16 }}>
                    <Text style={{ fontWeight: 'bold' }}>{item.user || 'Unknown User'}</Text>
                    {" "}{item.action || 'did something'}{" "}
                    <Text style={{ fontWeight: 'bold' }}>{item.device_name || item.device || 'Unknown Device'}</Text>
                    {" "}
                    <Text style={{ color: '#888' }}>{item.result || ''}</Text>
                  </Text>
                  <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
                    {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Devices Chart */}
      <Text style={{ fontSize: 24, fontWeight: 'bold', margin: 16 }}>
        Most-Used Devices
      </Text>
      {loadingDevices ? (
        <Text style={{ textAlign: 'center', color: '#1976d2', margin: 20 }}>Loading device data…</Text>
      ) : deviceUsage.length === 0 ? (
        <Text style={{ textAlign: 'center', color: '#d32f2f', margin: 20 }}>No device usage data available.</Text>
      ) : (
        <View>
          <BarChart
            data={deviceData}
            width={screenWidth}
            height={220}
            fromZero
            chartConfig={deviceChartConfig}
            showValuesOnTopOfBars={true}
            style={{ marginVertical: 8, borderRadius: 16, alignSelf: 'center' }}
          />
        </View>
      )}

      {/* Users Chart */}
      <Text style={{ fontSize: 24, fontWeight: 'bold', margin: 16, marginTop: 32 }}>
        Most Frequent Users
      </Text>
      {loadingUsers ? (
        <Text style={{ textAlign: 'center', color: '#388e3c', margin: 20 }}>Loading user data…</Text>
      ) : userUsage.length === 0 ? (
        <Text style={{ textAlign: 'center', color: '#d32f2f', margin: 20 }}>No user data available.</Text>
      ) : (
        <View>
          <BarChart
            data={userData}
            width={screenWidth}
            height={220}
            fromZero
            chartConfig={userChartConfig}
            showValuesOnTopOfBars={true}
            style={{ marginVertical: 8, borderRadius: 16, alignSelf: 'center' }}
          />
        </View>
      )}

      {/* Hourly Usage Trends Chart */}
      <Text style={{ fontSize: 24, fontWeight: 'bold', margin: 16, marginTop: 32 }}>
        Hourly Usage Trends
      </Text>
      {loadingHourly ? (
        <Text style={{ textAlign: 'center', color: '#d32f2f', margin: 20 }}>Loading hourly usage data…</Text>
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
            style={{ marginVertical: 8, borderRadius: 16, alignSelf: 'center' }}
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
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 20,
            minWidth: 320,
            maxWidth: '90%',
            maxHeight: '80%',
            elevation: 4
          }}>
            <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 8 }}>
              Activity in Hour {selectedHour}
            </Text>
            {loadingHourActions ? (
              <Text>Loading...</Text>
            ) : hourActions.length === 0 ? (
              <Text>No actions recorded for this hour.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {hourActions.map((item, i) => (
                  <View key={i} style={{ marginBottom: 10 }}>
                    <Text>
                      <Text style={{ fontWeight: 'bold' }}>{item.user}</Text>
                      {" "}{item.action}
                      {" "}<Text style={{ fontWeight: 'bold' }}>{item.device_name}</Text>
                      {" "}<Text style={{ color: '#888' }}>{item.result}</Text>
                    </Text>
                    <Text style={{ color: '#888', fontSize: 12 }}>
                      {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ''}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              onPress={() => setShowHourModal(false)}
              style={{ alignSelf: 'flex-end', marginTop: 10 }}>
              <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
