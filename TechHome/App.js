import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import DevicesScreen from './screens/DevicesScreen';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import { DeviceProvider } from './context/DeviceContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import DeviceManagementScreen from './screens/DeviceManagementScreen';
import RoomManagementScreen from './screens/RoomManagementScreen';
import AutomationScreen from './screens/AutomationScreen';
import { LoadingSpinner } from './components/ui/LoadingSpinner';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Main tab navigator for authenticated users
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Devices') {
            iconName = focused ? 'bulb' : 'bulb-outline';
          } else if (route.name === 'Manage Devices') {
            iconName = focused ? 'hardware-chip' : 'hardware-chip-outline';
          } else if (route.name === 'Manage Rooms') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Automation') {
            iconName = focused ? 'options' : 'options-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Devices" component={DevicesScreen} />
      <Tab.Screen name="Manage Devices" component={DeviceManagementScreen} />
      <Tab.Screen name="Manage Rooms" component={RoomManagementScreen} />
      <Tab.Screen name="Automation" component={AutomationScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// Auth navigator for unauthenticated users
function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

// Root navigator that decides which flow to show based on auth state
function RootNavigator() {
  const { isAuthenticated, loading, user, accessToken } = useAuth();
  
  // Log authentication state changes
  React.useEffect(() => {
    console.log("🔐 Auth state changed:", { 
      isAuthenticated, 
      hasUser: !!user, 
      hasToken: !!accessToken,
      loading
    });
    
    // This will help see if the auth state is changing properly
    console.log("Showing screen:", isAuthenticated ? "MAIN APP" : "LOGIN");
  }, [isAuthenticated, user, accessToken, loading]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

function App() {
  return (
    <AuthProvider>
      <DeviceProvider>
        <RootNavigator />
      </DeviceProvider>
    </AuthProvider>
  );
}

export default App;