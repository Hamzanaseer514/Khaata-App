import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { showError, showSuccess } from '@/utils/toast';
import { router, useLocalSearchParams } from 'expo-router';
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

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | number | null>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const { isDarkMode, toggleTheme } = useTheme();
  const { resetPassword } = useAuth();
  
  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  const accentColor = isDarkMode ? '#22d3ee' : '#0a7ea4'; 
  const bgColor = themeColors.background;
  
  const otpInputs = useRef<Array<TextInput | null>>([]);
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

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== '' && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleResetPassword = async () => {
    const otpString = otp.join('');
    
    if (otpString.length < 6) {
      showError('Please enter the full 6-digit recovery code');
      return;
    }
    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword(email as string, otpString, newPassword);
      if (result.success) {
        showSuccess('Password reset successfully! Please login.');
        router.replace('/login');
      } else {
        showError(result.message || 'Failed to reset password');
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
    otpInput: {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff',
      color: themeColors.text,
    },
    inputContainer: {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff',
    },
    input: {
      color: themeColors.text,
    },
    button: {
      backgroundColor: accentColor,
      shadowColor: accentColor,
    },
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
          automaticallyAdjustKeyboardInsets={true}
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
                <Ionicons name="shield-checkmark-outline" size={32} color={accentColor} />
              </View>
              <Text style={[styles.title, dynamicStyles.title]}>Reset Password</Text>
              <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
                We've sent a 6-digit code to {email}. Enter it below along with your new password.
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={[styles.label, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>Recovery Code</Text>
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.otpInputBox, 
                      dynamicStyles.otpInput,
                      { borderColor: focusedField === index ? accentColor : (isDarkMode ? '#334155' : '#e5e7eb') }
                    ]}
                  >
                    <TextInput
                      ref={(instance) => { otpInputs.current[index] = instance; }}
                      style={[styles.otpInputText, dynamicStyles.otpInput]}
                      maxLength={1}
                      keyboardType="number-pad"
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value, index)}
                      onKeyPress={(e) => handleOtpKeyPress(e, index)}
                      onFocus={() => setFocusedField(index)}
                      onBlur={() => setFocusedField(null)}
                      selectionColor={accentColor}
                    />
                  </View>
                ))}
              </View>

              <Text style={[styles.label, { color: isDarkMode ? '#94a3b8' : '#64748b', marginTop: 10 }]}>New Password</Text>
              <View style={[styles.inputContainer, dynamicStyles.inputContainer, { borderColor: focusedField === 'password' ? accentColor : (isDarkMode ? '#334155' : '#e5e7eb') }]}>
                <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'password' ? accentColor : (isDarkMode ? '#64748b' : '#94a3b8')} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  placeholder="At least 6 characters"
                  placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  selectionColor={accentColor}
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

              <Text style={[styles.label, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>Confirm Password</Text>
              <View style={[styles.inputContainer, dynamicStyles.inputContainer, { borderColor: focusedField === 'confirm' ? accentColor : (isDarkMode ? '#334155' : '#e5e7eb') }]}>
                <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'confirm' ? accentColor : (isDarkMode ? '#64748b' : '#94a3b8')} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  placeholder="Repeat new password"
                  placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                  selectionColor={accentColor}
                />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color={isDarkMode ? '#94a3b8' : '#64748b'} 
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.button, dynamicStyles.button, isLoading && styles.buttonDisabled]} 
                onPress={handleResetPassword} 
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </Text>
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
    paddingVertical: 40,
  },
  inner: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpInputBox: {
    width: 45,
    height: 55,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpInputText: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  eyeButton: {
    padding: 8,
  },
  button: {
    width: '100%',
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
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
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
