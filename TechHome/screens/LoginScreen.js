import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import LoginStyles from '../styles/LoginScreenStyle';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={LoginStyles.container}>
        <View style={LoginStyles.logoContainer}>
          <Text style={LoginStyles.logoText}>TechHome</Text>
          <Text style={LoginStyles.tagline}>Your Smart Home Control Center</Text>
        </View>

        <View style={LoginStyles.formContainer}>
          <Text style={LoginStyles.formTitle}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
          
          {error && (
            <View style={LoginStyles.errorContainer}>
              <Text style={LoginStyles.errorText}>{error}</Text>
            </View>
          )}

          <View style={LoginStyles.inputGroup}>
            <Ionicons name="person-outline" size={22} color="#777" style={LoginStyles.inputIcon} />
            <TextInput
              style={LoginStyles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          {!isLogin && (
            <View style={LoginStyles.inputGroup}>
              <Ionicons name="mail-outline" size={22} color="#777" style={LoginStyles.inputIcon} />
              <TextInput
                style={LoginStyles.input}
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
              style={LoginStyles.input}
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
                <Ionicons name="person-outline" size={22} color="#777" style={LoginStyles.inputIcon} />
                <TextInput
                  style={LoginStyles.input}
                  placeholder="First Name (Optional)"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>

              <View style={LoginStyles.inputGroup}>
                <Ionicons name="person-outline" size={22} color="#777" style={LoginStyles.inputIcon} />
                <TextInput
                  style={LoginStyles.input}
                  placeholder="Last Name (Optional)"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </>
          )}

          <TouchableOpacity style={LoginStyles.submitButton} onPress={handleSubmit}>
            <Text style={LoginStyles.submitButtonText}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </Text>
          </TouchableOpacity>
          
          {isLogin && (
            <TouchableOpacity style={LoginStyles.forgotPassword}>
              <Text style={LoginStyles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}
          
          <View style={LoginStyles.switchContainer}>
            <Text style={LoginStyles.switchText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity onPress={toggleForm}>
              <Text style={LoginStyles.switchButton}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}