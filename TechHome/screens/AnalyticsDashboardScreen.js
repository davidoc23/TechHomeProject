import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';

export default function AnalyticsDashboardScreen() {
  const [deviceUsage, setDeviceUsage] = useState([]);
  const [userUsage, setUserUsage] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

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

  return (
    <ScrollView>
      {/* Device Usage Section */}
      <Text style={{ fontSize: 24, fontWeight: 'bold', margin: 16 }}>
        Most-Used Devices (by Actions)
      </Text>
      {loadingDevices ? (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>Loading...</Text>
      ) : deviceUsage.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>
          No device usage data available.
        </Text>
      ) : (
        <View style={{ margin: 20, backgroundColor: '#f8f8f8', borderRadius: 8, padding: 12 }}>
          {deviceUsage.map((row, i) => (
            <View key={i} style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomColor: '#e0e0e0',
                borderBottomWidth: i === deviceUsage.length - 1 ? 0 : 1,
            }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{row.name}</Text>
                <Text style={{ fontSize: 16 }}>{row.actions} actions</Text>
            </View>
          ))}
        </View>
      )}

      {/* User Usage Section */}
      <Text style={{ fontSize: 24, fontWeight: 'bold', margin: 16, marginTop: 24 }}>
        Most Frequent Users
      </Text>
      {loadingUsers ? (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>Loading...</Text>
      ) : userUsage.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>
          No user usage data available.
        </Text>
      ) : (
        <View style={{ margin: 20, backgroundColor: '#f8f8f8', borderRadius: 8, padding: 12 }}>
          {userUsage.map((row, i) => (
            <View key={i} style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomColor: '#e0e0e0',
                borderBottomWidth: i === userUsage.length - 1 ? 0 : 1,
            }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{row.user}</Text>
                <Text style={{ fontSize: 16 }}>{row.actions} actions</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
