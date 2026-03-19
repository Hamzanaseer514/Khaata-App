import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { showError, showSuccess } from '@/utils/toast';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/utils/navigation';
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
  Animated
} from 'react-native';

export default function VerifyOtpScreen() {
  const { verifySignupOtp } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  
  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  const accentColor = isDarkMode ? '#22d3ee' : '#0a7ea4'; 
  const bgColor = themeColors.background;
  
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
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
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next field if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onVerify = async () => {
    const otpString = otp.join('');
    if (!email) {
      showError('Missing email for verification');
      return;
    }
    if (otpString.length < 6) {
      showError('Please enter the 6-digit code');
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await verifySignupOtp(email as string, otpString);
      if (res.success) {
        showSuccess('Account verified successfully!');
        router.replace('/dashboard');
      } else {
        showError(res.message || 'Invalid verification code');
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
    otpBox: {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff',
      borderColor: isDarkMode ? '#334155' : '#e5e7eb',
      color: themeColors.text,
    },
    verifyButton: {
      backgroundColor: accentColor,
      shadowColor: accentColor,
    },
    resendButtonText: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
    }
  });

  return (
    <View style={dynamicStyles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View 
            style={[
              styles.inner,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.header}>
              <Text style={[styles.title, dynamicStyles.title]}>Verify Email</Text>
              <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
                We've sent a 6-digit code to{'\n'}
                <Text style={{ fontWeight: '600', color: themeColors.text }}>{email}</Text>
              </Text>
            </View>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[
                    styles.otpBox, 
                    dynamicStyles.otpBox,
                    digit !== '' && { borderColor: accentColor, borderWidth: 2 }
                  ]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  autoFocus={index === 0}
                  selectionColor={accentColor}
                />
              ))}
            </View>

            <TouchableOpacity 
              style={styles.resendButton} 
              onPress={() => {}}
            >
              <Text style={[styles.resendButtonText, dynamicStyles.resendButtonText]}>
                Didn't receive code? <Text style={{ color: accentColor, fontWeight: '700' }}>Resend</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.verifyButton, dynamicStyles.verifyButton, isLoading && styles.buttonDisabled]} 
              onPress={onVerify} 
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.verifyButtonText}>
                {isLoading ? 'Verifying...' : 'Verify & Continue'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => goBack()}
            >
              <Text style={[styles.backButtonText, { color: isDarkMode ? '#64748b' : '#94a3b8' }]}>
                Back to Sign Up
              </Text>
            </TouchableOpacity>
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  resendButton: {
    marginBottom: 40,
  },
  resendButtonText: {
    fontSize: 15,
  },
  verifyButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 20,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
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


