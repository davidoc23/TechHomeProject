import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config';

// Create the Authentication Context
const AuthContext = createContext();

// Custom hook to access the Auth Context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to initialize auth state from storage
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        const accessTokenData = await AsyncStorage.getItem('accessToken');
        const refreshTokenData = await AsyncStorage.getItem('refreshToken');

        if (userData && accessTokenData) {
          setUser(JSON.parse(userData));
          setAccessToken(accessTokenData);
          setRefreshToken(refreshTokenData);

          // Set auth header for future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessTokenData}`;
        }
      } catch (error) {
        console.error('Error loading auth state', error);
      } finally {
        setLoading(false);
      }
    };

    loadAuthState();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user && !!accessToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};