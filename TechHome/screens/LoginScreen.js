import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  StyleSheet,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import LoginStyles from '../styles/LoginScreenStyle';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { theme } = useTheme();
  const [isLogin, setIsLogin] = useState(true); // Toggle between login and register
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  // Create animated values for particle positions (reduced number for better performance)
  const [positions] = useState(() => {
    const pos = [];
    // Reduced to 30 particles to improve performance and reduce CPU usage
    for (let i = 0; i < 30; i++) {
      pos.push({
        xPos: new Animated.Value(Math.random() * 100),
        yPos: new Animated.Value(Math.random() * 100),
        size: 2 + Math.random() * 4, // Slightly more size variation
        opacity: 0.4 + Math.random() * 0.6,
      });
    }
    return pos;
  });
  
  // Create a state to track if animations have been started
  const [animationStarted, setAnimationStarted] = useState(false);
  
  // Start animated particles when component mounts
  useEffect(() => {
    if (animationStarted) return; // Only start animations once
    
    const { Easing } = require('react-native');
    setAnimationStarted(true);
    
    // Create animation sequence for each particle
    positions.forEach((particle, index) => {
      // Function to animate a single particle
      const animateParticle = () => {
        // Get random target positions
        const xTarget = Math.random() * 100;
        const yTarget = Math.random() * 100;
        
        // Create sequential animation
        Animated.sequence([
          // Move to new position
          Animated.parallel([
            Animated.timing(particle.xPos, {
              toValue: xTarget,
              duration: 15000 + Math.random() * 10000, // Slower animation = less CPU usage
              useNativeDriver: false,
              easing: Easing.linear
            }),
            Animated.timing(particle.yPos, {
              toValue: yTarget,
              duration: 15000 + Math.random() * 10000, // Slower animation = less CPU usage
              useNativeDriver: false,
              easing: Easing.linear
            })
          ])
        ]).start(() => {
          // Loop animation when done
          animateParticle();
        });
      };
      
      // Start with slight delay to avoid synchronized movement
      setTimeout(() => {
        animateParticle();
      }, index * 100);
    });
    
    // No cleanup needed as animations will stop when component unmounts
  }, []);
  
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
      backgroundColor: 'transparent',
    },
    formContainer: {
      ...LoginStyles.formContainer,
      backgroundColor: 'rgba(255, 255, 255, 0.1)', // Much more transparent (10%)
      backdropFilter: 'blur(4px)', // Reduced blur for more transparency
      ...theme.shadow,
    },
    logoText: {
      ...LoginStyles.logoText,
      // Using the styles from LoginScreenStyle.js directly
    },
    tagline: {
      ...LoginStyles.tagline,
      // Using the styles from LoginScreenStyle.js directly 
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
      backgroundColor: `${theme.background}99`, // Added transparency (99 = 60%)
      color: theme.text,
      borderColor: `${theme.border}AA`, // Semi-transparent border
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

  // Create the rain effect with blue color instead of green
  const particleStyles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
      overflow: 'hidden',
    },
    background: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
    },
    particle: {
      position: 'absolute',
      backgroundColor: '#39b8ff', // Light blue for IoT devices
      borderRadius: 50,
      shadowColor: '#39b8ff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 5,
      elevation: 8,
    },
    gradientStyle: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    line: {
      position: 'absolute',
      backgroundColor: 'rgba(57, 184, 255, 0.2)', // Very subtle blue for connections
      height: 1,
      zIndex: -1,
    }
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#0056b3' }}>
      <StatusBar barStyle="light-content" />
      
      {/* Background with connected particle effect */}
      <View style={particleStyles.container}>
        <View style={particleStyles.background} />
        <LinearGradient
          colors={['#0a2e52', '#0056a6', '#001528']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={particleStyles.gradientStyle}
        />
        
        {/* Draw connection lines to simulate a network in the background */}
        <View style={[particleStyles.line, { width: '40%', transform: [{rotate: '45deg'}], left: '10%', top: '20%' }]} />
        <View style={[particleStyles.line, { width: '30%', transform: [{rotate: '-30deg'}], left: '50%', top: '40%' }]} />
        <View style={[particleStyles.line, { width: '50%', transform: [{rotate: '10deg'}], left: '30%', top: '60%' }]} />
        <View style={[particleStyles.line, { width: '45%', transform: [{rotate: '70deg'}], left: '60%', top: '30%' }]} />
        <View style={[particleStyles.line, { width: '35%', transform: [{rotate: '-60deg'}], left: '20%', top: '70%' }]} />
        
        {/* Additional connection lines */}
        <View style={[particleStyles.line, { width: '60%', transform: [{rotate: '15deg'}], left: '5%', top: '40%' }]} />
        <View style={[particleStyles.line, { width: '55%', transform: [{rotate: '-15deg'}], left: '40%', top: '15%' }]} />
        <View style={[particleStyles.line, { width: '45%', transform: [{rotate: '85deg'}], left: '75%', top: '50%' }]} />
        <View style={[particleStyles.line, { width: '38%', transform: [{rotate: '-50deg'}], left: '15%', top: '85%' }]} />
        <View style={[particleStyles.line, { width: '42%', transform: [{rotate: '35deg'}], left: '55%', top: '75%' }]} />
        
        {/* Floating IoT device particles */}
        {positions.map((particle, index) => (
          <Animated.View
            key={index}
            style={[
              particleStyles.particle,
              {
                left: particle.xPos.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%']
                }),
                top: particle.yPos.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%']
                }),
                height: particle.size,
                width: particle.size,
                opacity: particle.opacity,
                backgroundColor: index % 5 === 0 ? '#4fc3f7' : // Light blue
                               index % 7 === 0 ? '#5ebbff' : // Sky blue
                               index % 9 === 0 ? '#2196f3' : // Material blue
                               '#39b8ff', // Default blue
                borderRadius: index % 4 === 0 ? 2 : 50, // Some square, some round particles
              },
            ]}
          />
        ))}
      </View>
      
      {/* Form content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={screenStyles.container}>
        <View style={LoginStyles.logoContainer}>
          <Text style={screenStyles.logoText}>TechHome</Text>
          <Text style={LoginStyles.tagline}>Your Smart Home Control Center</Text>
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
                style={[LoginStyles.input, { backgroundColor: `${theme.background}99`, color: theme.text, borderColor: `${theme.border}AA` }]}
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
    </View>
  );
}