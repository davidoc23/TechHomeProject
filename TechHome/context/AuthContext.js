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
  const [tokenExpiry, setTokenExpiry] = useState(null); // Track token expiration time
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to decode JWT and extract expiration time
  const decodeToken = (token) => {
    try {
      if (!token) return null;
      
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = atob(base64);
      const { exp } = JSON.parse(jsonPayload);
      
      return exp ? exp * 1000 : null; // Convert to milliseconds
    } catch (err) {
      console.error('Error decoding token:', err);
      return null;
    }
  };

  // Function to check if token is expired
  const isTokenExpired = () => {
    if (!tokenExpiry) return true;
    
    // Add a 30-second buffer to ensure we refresh before actual expiration
    return Date.now() > (tokenExpiry - 30000);
  };

  // Function to validate current token
  const validateToken = async () => {
    if (!accessToken || isTokenExpired()) {
      // If no token or token is expired, try to refresh
      return await refreshAuth();
    }
    return true;
  };

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
          
          // Set token expiry time
          const expiry = decodeToken(accessTokenData);
          setTokenExpiry(expiry);

          // Set auth header for future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessTokenData}`;
          
          // If token is already expired, try refresh immediately
          if (expiry && Date.now() > expiry) {
            refreshAuth();
          }
        }
      } catch (error) {
        console.error('Error loading auth state', error);
      } finally {
        setLoading(false);
      }
    };

    loadAuthState();
  }, []);

  // Function to register a new user
  const register = async (username, email, password, firstName = "", lastName = "") => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName
      });

      const { user_id, access_token, refresh_token } = response.data;

      // Store user data and tokens
      const userData = {
        id: user_id,
        username,
        email,
        firstName,
        lastName
      };

      // Set token expiry
      const expiry = decodeToken(access_token);
      setTokenExpiry(expiry);

      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('accessToken', access_token);
      await AsyncStorage.setItem('refreshToken', refresh_token);

      // Update state
      setUser(userData);
      setAccessToken(access_token);
      setRefreshToken(refresh_token);

      // Set auth header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      return userData;
    } catch (error) {
      console.error('Registration error', error);
      const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Function to login a user
  const login = async (username, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password
      });

      const { user_id, username: userName, access_token, refresh_token } = response.data;

      // Set token expiry
      const expiry = decodeToken(access_token);
      setTokenExpiry(expiry);

      // Get user details
      const userDetailResponse = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      const userData = {
        id: user_id,
        username: userName,
        email: userDetailResponse.data.email,
        firstName: userDetailResponse.data.first_name,
        lastName: userDetailResponse.data.last_name,
        role: userDetailResponse.data.role
      };

      // Store user data and tokens
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('accessToken', access_token);
      await AsyncStorage.setItem('refreshToken', refresh_token);

      // Update state
      setUser(userData);
      setAccessToken(access_token);
      setRefreshToken(refresh_token);

      // Set auth header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      return userData;
    } catch (error) {
      console.error('Login error', error);
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Function to logout the user - simplified for reliability
  const logout = async () => {
    console.log("Logout function called - SIMPLIFIED VERSION"); // Debug log
    
    // Just clear everything without trying server logout
    try {
      // 1. Clear AsyncStorage first
      await Promise.all([
        AsyncStorage.removeItem('user'),
        AsyncStorage.removeItem('accessToken'),
        AsyncStorage.removeItem('refreshToken')
      ]);
      console.log("AsyncStorage cleared successfully");
      
      // 2. Clear auth header
      delete axios.defaults.headers.common['Authorization'];
      console.log("Auth header cleared");
      
      // 3. Finally clear state variables (this triggers UI update)
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      setTokenExpiry(null);
      console.log("State variables cleared");
      
      // Explicit return to confirm completion
      return true;
    } catch (e) {
      console.error("Error during simplified logout:", e);
      // Even if there's an error, try to clear state
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      setTokenExpiry(null);
      return false;
    }
  };

  // Function to refresh the access token
  const refreshAuth = async () => {
    if (!refreshToken) {
      await logout();
      return false;
    }

    try {
      // Set up refresh token in Authorization header - this is key!
      const config = {
        headers: {
          'Authorization': `Bearer ${refreshToken}`
        }
      };
      
      // Send the request with the refresh token in the Authorization header
      const response = await axios.post(`${API_URL}/auth/refresh`, {}, config);
      const { access_token } = response.data;

      // Set token expiry
      const expiry = decodeToken(access_token);
      setTokenExpiry(expiry);

      // Update storage
      await AsyncStorage.setItem('accessToken', access_token);

      // Update state
      setAccessToken(access_token);

      // Set auth header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      return true;
    } catch (error) {
      console.error('Token refresh failed', error);
      // If refresh fails due to invalid/expired refresh token, logout
      if (error.response?.status === 401) {
        await logout();
      }
      return false;
    }
  };

  // Axios interceptor to handle token expiry
  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        
        // If the error is due to an expired token and we haven't already tried to refresh
        if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
          originalRequest._retry = true;
          
          try {
            const refreshSuccess = await refreshAuth();
            if (refreshSuccess) {
              // Update the auth header in the original request
              originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            console.error('Error refreshing token', refreshError);
            await logout();
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );

    // Add request interceptor to check token validity before each request
    const requestInterceptor = axios.interceptors.request.use(
      async config => {
        // Skip auth check for login and refresh requests
        if (
          config.url.includes(`${API_URL}/auth/login`) || 
          config.url.includes(`${API_URL}/auth/refresh`)
        ) {
          return config;
        }
        
        // For other requests requiring auth, check token validity
        if (config.headers.Authorization || config.url.includes('/api/home-assistant/')) {
          // If token is expired, try to refresh before proceeding
          if (isTokenExpired() && refreshToken) {
            try {
              const refreshed = await refreshAuth();
              if (!refreshed) {
                // If refresh failed, force logout
                await logout();
                throw new Error('Session expired');
              }
              
              // Update request with new token
              config.headers.Authorization = `Bearer ${accessToken}`;
            } catch (error) {
              console.error('Auth validation error:', error);
              // Force logout on any auth error
              await logout();
              throw error;
            }
          }
        }
        
        return config;
      },
      error => Promise.reject(error)
    );

    return () => {
      axios.interceptors.response.eject(responseInterceptor);
      axios.interceptors.request.eject(requestInterceptor);
    };
  }, [refreshToken, accessToken, tokenExpiry]);

  // Update user profile data
  const updateProfile = async (updateData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.patch(`${API_URL}/auth/me`, updateData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      // Get updated user details
      const userDetailResponse = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const updatedUserData = {
        ...user,
        email: userDetailResponse.data.email,
        firstName: userDetailResponse.data.first_name,
        lastName: userDetailResponse.data.last_name
      };

      // Update storage
      await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));

      // Update state
      setUser(updatedUserData);

      return updatedUserData;
    } catch (error) {
      console.error('Profile update error', error);
      const errorMessage = error.response?.data?.error || 'Profile update failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);

    try {
      await axios.patch(`${API_URL}/auth/me`, {
        current_password: currentPassword,
        new_password: newPassword
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return true;
    } catch (error) {
      console.error('Password change error', error);
      const errorMessage = error.response?.data?.error || 'Password change failed. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user && !!accessToken && !isTokenExpired(),
        register,
        login,
        logout,
        updateProfile,
        changePassword,
        refreshAuth,
        validateToken,  // Expose this function for direct token validation
        isTokenExpired  // Expose for components to check token status
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};