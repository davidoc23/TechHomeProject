import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';

export default function AnalyticsDashboardScreen() {
  const [deviceUsage, setDeviceUsage] = useState([]);
  const [userUsage, setUserUsage] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Track which device/user is "open" 
  const [openDevice, setOpenDevice] = useState(null);
  const [openUser, setOpenUser] = useState(null);

  // Fetched details for device/user actions
  const [deviceActions, setDeviceActions] = useState({});
  const [userActions, setUserActions] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});

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

  // On click: fetch most frequent device action
  const handleDevicePress = (deviceId) => {
    setOpenDevice(openDevice === deviceId ? null : deviceId);

    if (!deviceActions[deviceId]) {
      setLoadingDetails(prev => ({ ...prev, [deviceId]: true }));
      fetch(`http://localhost:5000/api/analytics/device-actions/${deviceId}/top`)
        .then(res => res.json())
        .then(data => {
          setDeviceActions(prev => ({ ...prev, [deviceId]: data }));
          setLoadingDetails(prev => ({ ...prev, [deviceId]: false }));
        })
        .catch(() => setLoadingDetails(prev => ({ ...prev, [deviceId]: false })));
    }
  };

  // On click: fetch most frequent user action
  const handleUserPress = (username) => {
    setOpenUser(openUser === username ? null : username);

    if (!userActions[username]) {
      setLoadingDetails(prev => ({ ...prev, [username]: true }));
      fetch(`http://localhost:5000/api/analytics/user-actions/${username}/top`)
        .then(res => res.json())
        .then(data => {
          setUserActions(prev => ({ ...prev, [username]: data }));
          setLoadingDetails(prev => ({ ...prev, [username]: false }));
        })
        .catch(() => setLoadingDetails(prev => ({ ...prev, [username]: false })));
    }
  };

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
            <View key={i}>
              <TouchableOpacity
                onPress={() => handleDevicePress(row.device)}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  borderBottomColor: '#e0e0e0',
                  borderBottomWidth: i === deviceUsage.length - 1 ? 0 : 1,
                }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{row.name}</Text>
                <Text style={{ fontSize: 16 }}>{row.actions} actions</Text>
              </TouchableOpacity>
              {openDevice === row.device && (
                <View style={{ paddingLeft: 10, paddingBottom: 8 }}>
                  {loadingDetails[row.device] ? (
                    <ActivityIndicator size="small" color="#888" />
                  ) : deviceActions[row.device] && deviceActions[row.device].length > 0 ? (
                    <View>
                      <Text style={{ fontWeight: '600' }}>Top Actions:</Text>
                      {deviceActions[row.device].map((a, idx) => (
                        <Text key={idx} style={{ marginLeft: 8 }}>
                          {a.action} - {a.count} times
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <Text>No action breakdown available.</Text>
                  )}
                </View>
              )}
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
            <View key={i}>
              <TouchableOpacity
                onPress={() => handleUserPress(row.user)}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  borderBottomColor: '#e0e0e0',
                  borderBottomWidth: i === userUsage.length - 1 ? 0 : 1,
                }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{row.user}</Text>
                <Text style={{ fontSize: 16 }}>{row.actions} actions</Text>
              </TouchableOpacity>
              {openUser === row.user && (
                <View style={{ paddingLeft: 10, paddingBottom: 8 }}>
                  {loadingDetails[row.user] ? (
                    <ActivityIndicator size="small" color="#888" />
                  ) : userActions[row.user] && userActions[row.user].length > 0 ? (
                    <View>
                      <Text style={{ fontWeight: '600' }}>Top Actions:</Text>
                      {userActions[row.user].map((a, idx) => (
                        <Text key={idx} style={{ marginLeft: 8 }}>
                          {a.action} - {a.count} times
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <Text>No action breakdown available.</Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
