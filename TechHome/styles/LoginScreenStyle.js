import { StyleSheet } from 'react-native';

const LoginStyles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 5,
  },
  tagline: {
    fontSize: 18,
    color: '#ffffff', // Already white
    marginTop: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 5,
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Extremely transparent (10%)
    padding: 20,
    borderRadius: 10,
    shadowColor: 'transparent', // Removed shadow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0, // Removed elevation
    position: 'relative',
    zIndex: 2, // Ensure form appears on top of the background
    borderWidth: 0,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#FFFFFF', // White text for contrast against the blue background
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  inputGroup: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Extremely transparent (15%)
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'transparent', // Completely transparent
    color: '#FFFFFF', // White text for contrast against the blue background
  },
  visibilityIcon: {
    padding: 10,
  },
  submitButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.6)', // More transparent (60%)
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)', // Subtle border
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 15,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 14,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchText: {
    color: '#777',
    fontSize: 14,
  },
  switchButton: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 235, 238, 0.7)', // Semi-transparent light red
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.3)', // Subtle red border
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
});

export default LoginStyles;