import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width - 32;

export default function AnalyticsDashboardScreen() {
  const [deviceUsage, setDeviceUsage] = useState([]);
  const [userUsage, setUserUsage] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [recentActions, setRecentActions] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  // Fetch device usage
  useEffect(() => {
    fetch('http://localhost:5000/api/analytics/usage-per-device')
      .then(res => res.json())
      .then(data => {
        setDeviceUsage(data);
        setLoadingDevices(false);
      })
      .catch(err => {
        setLoadingDevices(false);
        console.error("Error fetching device usage:", err);
      });
  }, []);

  // Fetch user usage
  useEffect(() => {
    fetch('http://localhost:5000/api/analytics/usage-per-user')
      .then(res => res.json())
      .then(data => {
        setUserUsage(data);
        setLoadingUsers(false);
      })
      .catch(err => {
        setLoadingUsers(false);
        console.error("Error fetching user usage:", err);
      });
  }, []);

    // Fetch recent actions
  useEffect(() => {
    fetch('http://localhost:5000/api/analytics/recent-actions')
      .then(res => res.json())
      .then(data => {
        setRecentActions(data);
        setLoadingFeed(false);
      })
      .catch(err => {
        setLoadingFeed(false);
        console.error("Error fetching recent actions:", err);
      });
  }, []);

  // Chart configs
  const deviceChartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    color: (opacity = 1) => `rgba(56, 122, 238, ${opacity})`, // blue
    labelColor: (opacity = 1) => `#111`,
    barPercentage: 0.7,
    decimalPlaces: 0,
    propsForLabels: { fontSize: 12 },
  };

  const userChartConfig = {
    ...deviceChartConfig,
    color: (opacity = 1) => `rgba(52, 168, 83, ${opacity})`, // green
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

  // Helper for rendering values above bars
  function renderValuesAboveBars(data) {
    return data.map((val, idx) => (
      <Text
        key={idx}
        style={{
          position: 'absolute',
          left: (screenWidth / data.length) * idx + 20,
          top: 4,
          fontSize: 12,
          fontWeight: 'bold',
          color: '#444',
        }}
      >
        {val}
      </Text>
    ));
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
        {/* Recent Activity */}
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
            //verticalLabelRotation={-25}
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
            //verticalLabelRotation={-25}
          />
         
        </View>
      )}

    </ScrollView>
  );
}
