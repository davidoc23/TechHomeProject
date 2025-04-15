import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import LoginStyles from '../styles/LoginScreenStyle';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { theme } = useTheme();
  const [isLogin, setIsLogin] = useState(true); // Toggle between login and register
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const { login, register, loading, error } = useAuth();

  const handleSubmit = async () => {
    try {
      if (isLogin) {
        // Login functionality
        if (!username || !password) {
          Alert.alert('Error', 'Please enter both username and password');
          return;
        }
        
        await login(username, password);
      } else {
        // Register functionality
        if (!username || !password || !email) {
          Alert.alert('Error', 'Please fill in all required fields');
          return;
        }
        
        await register(username, email, password, firstName, lastName);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    // Clear form fields
    setUsername('');
    setPassword('');
    setEmail('');
    setFirstName('');
    setLastName('');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Import theme utilities
  const { applyThemeToComponents } = require('../theme/utils');
  
  // Get common theme styles
  const themeStyles = applyThemeToComponents(theme);
  
  // Screen-specific styles
  const screenStyles = {
    container: {
      ...LoginStyles.container,
      backgroundColor: theme.background,
    },
    formContainer: {
      ...LoginStyles.formContainer,
      backgroundColor: theme.cardBackground,
      ...theme.shadow,
    },
    logoText: {
      ...LoginStyles.logoText,
      color: theme.primary,
    },
    tagline: {
      ...LoginStyles.tagline, 
      color: theme.textSecondary,
    },
    formTitle: {
      ...LoginStyles.formTitle,
      color: theme.text,
    },
    errorContainer: {
      ...LoginStyles.errorContainer,
      backgroundColor: theme.danger + '20',
    },
    errorText: {
      ...LoginStyles.errorText,
      color: theme.danger,
    },
    input: {
      ...LoginStyles.input,
      backgroundColor: theme.background,
      color: theme.text,
      borderColor: theme.border,
    },
    submitButton: {
      ...LoginStyles.submitButton,
      backgroundColor: theme.primary,
    },
    forgotPasswordText: {
      ...LoginStyles.forgotPasswordText,
      color: theme.primary,
    },
    switchText: {
      ...LoginStyles.switchText, 
      color: theme.textSecondary,
    },
    switchButton: {
      ...LoginStyles.switchButton, 
      color: theme.primary,
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={theme.statusBar} />
      <ScrollView contentContainerStyle={screenStyles.container}>
        <View style={LoginStyles.logoContainer}>
          <Text style={screenStyles.logoText}>TechHome</Text>
          <Text style={screenStyles.tagline}>Your Smart Home Control Center</Text>
        </View>

        <View style={screenStyles.formContainer}>
          <Text style={screenStyles.formTitle}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
          
          {error && (
            <View style={screenStyles.errorContainer}>
              <Text style={screenStyles.errorText}>{error}</Text>
            </View>
          )}

          <View style={LoginStyles.inputGroup}>
            <Ionicons name="person-outline" size={22} color={theme.textSecondary} style={LoginStyles.inputIcon} />
            <TextInput
              style={screenStyles.input}
              placeholderTextColor={theme.textTertiary}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          {!isLogin && (
            <View style={LoginStyles.inputGroup}>
              <Ionicons name="mail-outline" size={22} color={theme.textSecondary} style={LoginStyles.inputIcon} />
              <TextInput
                style={[LoginStyles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholderTextColor={theme.textTertiary}
              placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          )}

          <View style={LoginStyles.inputGroup}>
            <Ionicons name="lock-closed-outline" size={22} color="#777" style={LoginStyles.inputIcon} />
            <TextInput
              style={[LoginStyles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholderTextColor={theme.textTertiary}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={LoginStyles.visibilityIcon} 
              onPress={() => setPasswordVisible(!passwordVisible)}
            >
              <Ionicons 
                name={passwordVisible ? "eye-off-outline" : "eye-outline"} 
                size={22} 
                color="#777" 
              />
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <>
              <View style={LoginStyles.inputGroup}>
                <Ionicons name="person-outline" size={22} color={theme.textSecondary} style={LoginStyles.inputIcon} />
                <TextInput
                  style={[LoginStyles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholderTextColor={theme.textTertiary}
              placeholder="First Name (Optional)"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>

              <View style={LoginStyles.inputGroup}>
                <Ionicons name="person-outline" size={22} color={theme.textSecondary} style={LoginStyles.inputIcon} />
                <TextInput
                  style={[LoginStyles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholderTextColor={theme.textTertiary}
              placeholder="Last Name (Optional)"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </>
          )}

          <TouchableOpacity 
            style={screenStyles.submitButton}
            onPress={handleSubmit}
          >
            <Text style={LoginStyles.submitButtonText}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </Text>
          </TouchableOpacity>
          
          {isLogin && (
            <TouchableOpacity style={LoginStyles.forgotPassword}>
              <Text style={screenStyles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}
          
          <View style={LoginStyles.switchContainer}>
            <Text style={screenStyles.switchText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity onPress={toggleForm}>
              <Text style={screenStyles.switchButton}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}