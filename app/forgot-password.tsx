import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { showError, showSuccess } from '@/utils/toast';
import { router } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import { 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  StatusBar,
  ScrollView,
  Animated,
  Keyboard
} from 'react-native';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const { forgotPassword } = useAuth();
  const [isFocused, setIsFocused] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  
  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  const accentColor = isDarkMode ? '#22d3ee' : '#0a7ea4'; 
  const bgColor = themeColors.background;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
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
    ]).start();

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleResetRequest = async () => {
    if (!email || !email.includes('@')) {
      showError('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await forgotPassword(email);
      if (result.success) {
        showSuccess('Recovery code sent to your email!');
        router.push({
          pathname: '/reset-password',
          params: { email }
        });
      } else {
        showError(result.message || 'Failed to send recovery code');
      }
    } catch (err) {
      showError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bgColor,
    },
    title: {
      color: themeColors.text,
    },
    subtitle: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
    },
    inputContainer: {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff',
      borderColor: isFocused ? accentColor : (isDarkMode ? '#334155' : '#e5e7eb'),
    },
    input: {
      color: themeColors.text,
    },
    button: {
      backgroundColor: accentColor,
      shadowColor: accentColor,
    },
    backButtonText: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
    }
  });

  return (
    <View style={dynamicStyles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
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
          <Animated.View 
            style={[
              styles.inner,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.1)' : 'rgba(10, 126, 164, 0.1)' }]}>
                <Ionicons name="key-outline" size={32} color={accentColor} />
              </View>
              <Text style={[styles.title, dynamicStyles.title]}>Forgot Password?</Text>
              <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
                Enter your email address and we'll send you a code to reset your password.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
                <Ionicons 
                  name="mail-outline" 
                  size={20} 
                  color={isFocused ? accentColor : (isDarkMode ? '#64748b' : '#94a3b8')} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  placeholder="name@example.com"
                  placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  selectionColor={accentColor}
                />
              </View>

              <TouchableOpacity 
                style={[styles.button, dynamicStyles.button, isLoading && styles.buttonDisabled]} 
                onPress={handleResetRequest} 
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Sending Code...' : 'Send Reset Code'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <View style={styles.backButtonContent}>
                  <Ionicons name="arrow-back" size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                  <Text style={[styles.backButtonText, dynamicStyles.backButtonText]}>
                    Back to Login
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>
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
    justifyContent: 'center',
  },
  inner: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  backButton: {
    padding: 10,
    alignSelf: 'center',
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
