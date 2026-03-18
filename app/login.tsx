import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import { Colors } from '@/constants/theme';
import { showError, showSuccess } from '@/utils/toast';
import { router } from 'expo-router';
import { Formik } from 'formik';
import React, { useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  ScrollView,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Yup from 'yup';
import { LinearGradient } from 'expo-linear-gradient';

const validationSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required'),
});

export default function LoginScreen() {
  const { login } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  
  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  const accentColor = isDarkMode ? '#22d3ee' : '#0a7ea4'; // Cyan for dark, Blue for light
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 10,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleLogin = async (values: { email: string; password: string }) => {
    setIsLoading(true);

    try {
      const result = await login(values.email, values.password);

      if (result.success) {
        const isAdmin = result.user?.role === 'admin';
        showSuccess(result.message || (isAdmin ? 'Welcome admin' : 'Logged in'));
        router.replace(isAdmin ? '/admin' : '/dashboard');
      } else {
        showError(result.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        showError('Please check your internet connection and try again.', 'Network Error');
      } else if (error instanceof Error) {
        showError(error.message || 'An unexpected error occurred. Please try again.');
      } else {
        showError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    headerBackground: {
      backgroundColor: isDarkMode ? '#1c1e1f' : accentColor,
      borderBottomLeftRadius: 40,
      borderBottomRightRadius: 40,
      paddingTop: 60,
      paddingBottom: 40,
      alignItems: 'center',
      borderBottomWidth: isDarkMode ? 2 : 0,
      borderLeftWidth: isDarkMode ? 0.5 : 0,
      borderRightWidth: isDarkMode ? 0.5 : 0,
      borderColor: isDarkMode ? accentColor : 'transparent',
      shadowColor: accentColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.6 : 0.3,
      shadowRadius: isDarkMode ? 12 : 15,
      elevation: 10,
    },
    logoCircle: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderColor: 'rgba(255,255,255,0.3)',
    },
    brandText: {
      color: 'rgba(255,255,255,0.8)',
    },
    welcomeBackText: {
      color: '#ffffff',
    },
    backTextBold: {
      color: '#ffffff',
    },
    accentLine: {
      backgroundColor: '#ffffff',
    },
    input: {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f9fafb',
      borderColor: isDarkMode ? '#334155' : '#e5e7eb',
      color: themeColors.text,
    },
    inputLabel: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
    },
    loginButton: {
      backgroundColor: accentColor,
      shadowColor: accentColor,
    }
  });

  return (
    <View style={dynamicStyles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={isKeyboardVisible || contentHeight > containerHeight}
          bounces={false}
          overScrollMode="never"
          onContentSizeChange={(w, h) => setContentHeight(h)}
          onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.inner}>
            {/* Header with Background */}
            <View style={dynamicStyles.headerBackground}>
              {/* Logo section */}
              <Animated.View 
                style={[
                  styles.headerContainer, 
                  { opacity: fadeAnim, transform: [{ scale: logoScale }] }
                ]}
              >
                <View style={[styles.logoCircle, dynamicStyles.logoCircle]}>
                  <View style={styles.logoIconBg}>
                    <Text style={styles.logoEmoji}>👛</Text>
                  </View>
                </View>
                <Text style={[styles.brandText, dynamicStyles.brandText]}>K H A A T A</Text>
              </Animated.View>

              {/* Welcome Text Section inside Header */}
              <Animated.View 
                style={[
                  styles.welcomeContainer, 
                  { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                ]}
              >
                <Text style={[styles.welcomeBackText, dynamicStyles.welcomeBackText]}>Welcome</Text>
                <Text style={[styles.backTextBold, dynamicStyles.backTextBold]}>Back</Text>
                <View style={[styles.accentLine, dynamicStyles.accentLine]} />
              </Animated.View>
            </View>

            {/* Form Section */}
            <Animated.View
              style={[
                styles.formContainer,
                { 
                  opacity: fadeAnim, 
                  transform: [{ translateY: slideAnim }],
                  marginTop: 30, // Space from header
                  paddingHorizontal: 32,
                }
              ]}
            >
              <Formik
                initialValues={{ email: '', password: '' }}
                validationSchema={validationSchema}
                onSubmit={handleLogin}
              >
                {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                  <View style={styles.form}>
                    <View style={styles.inputWrapper}>
                      <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Email</Text>
                      <TextInput
                        style={[
                          styles.input,
                          dynamicStyles.input,
                          focusedField === 'email' && { borderColor: accentColor },
                          errors.email && touched.email && styles.inputError
                        ]}
                        placeholder="your@email.com"
                        placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                        value={values.email}
                        onChangeText={handleChange('email')}
                        onBlur={(e) => {
                          handleBlur('email')(e);
                          setFocusedField(null);
                        }}
                        onFocus={() => setFocusedField('email')}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.inputWrapper}>
                      <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Password</Text>
                      <View style={[
                        styles.passwordContainer,
                        dynamicStyles.input,
                        focusedField === 'password' && { borderColor: accentColor },
                        errors.password && touched.password && styles.inputError
                      ]}>
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="••••••••"
                          placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                          value={values.password}
                          onChangeText={handleChange('password')}
                          onBlur={(e) => {
                            handleBlur('password')(e);
                            setFocusedField(null);
                          }}
                          onFocus={() => setFocusedField('password')}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity 
                          style={styles.eyeButton}
                          onPress={() => setShowPassword(!showPassword)}
                          activeOpacity={0.7}
                        >
                          <Ionicons 
                            name={showPassword ? "eye-off-outline" : "eye-outline"} 
                            size={20} 
                            color={isDarkMode ? '#94a3b8' : '#64748b'} 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity 
                      style={styles.forgotPassword}
                      onPress={() => router.push('/forgot-password')}
                    >
                      <Text style={[styles.forgotText, { color: accentColor }]}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.loginButton, dynamicStyles.loginButton, isLoading && styles.buttonDisabled]}
                      onPress={() => handleSubmit()}
                      activeOpacity={0.8}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Text style={styles.loginButtonText}>Signing in...</Text>
                      ) : (
                        <Text style={styles.loginButtonText}>Sign In</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </Formik>
            </Animated.View>

            {/* Footer */}
            <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
              <Text style={[styles.footerText, { color: isDarkMode ? '#64748b' : '#94a3b8' }]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={[styles.signupLink, { color: accentColor }]}>Sign Up</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Theme Toggle for Testing */}
      <TouchableOpacity 
        style={[styles.floatingToggle, { backgroundColor: isDarkMode ? '#1c1e1f' : '#fff' }]} 
        onPress={toggleTheme}
        activeOpacity={0.8}
      >
        <Ionicons 
          name={isDarkMode ? "sunny" : "moon"} 
          size={24} 
          color={isDarkMode ? "#fbbf24" : "#475569"} 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 8,
  },
  logoIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 20,
  },
  brandText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 4,
  },
  welcomeContainer: {
    alignItems: 'center',
  },
  welcomeBackText: {
    fontSize: 40,
    fontWeight: '300',
    letterSpacing: -1,
  },
  backTextBold: {
    fontSize: 52,
    fontWeight: '800',
    marginTop: -10,
    letterSpacing: -2,
  },
  accentLine: {
    width: 50,
    height: 4,
    borderRadius: 2,
    marginTop: 12,
  },
  formContainer: {
    width: '100%',
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    borderWidth: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 18,
    fontSize: 16,
    color: 'inherit',
  },
  eyeButton: {
    padding: 10,
  },
  inputError: {
    borderColor: '#f43f5e',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginRight: 4,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 15,
  },
  signupLink: {
    fontSize: 15,
    fontWeight: '700',
  },
  floatingToggle: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
});
