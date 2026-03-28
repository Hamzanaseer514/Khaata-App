import { useAuth } from '@/contexts/AuthContext';
import { authenticateWithBiometric, getBiometricPreference } from '@/utils/biometric';
import { useTheme } from '@/contexts/DarkModeContext';
import config from '@/config/config';
import { router, useSegments } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet, Text, TouchableOpacity, View, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const segments = useSegments();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';

  const [biometricLocked, setBiometricLocked] = useState(false);
  const [biometricFailed, setBiometricFailed] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const biometricChecked = useRef(false);
  const appState = useRef(AppState.currentState);

  const isAuthScreen = segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'verify-otp' || segments[0] === 'forgot-password' || segments[0] === 'reset-password';

  const performBiometricCheck = useCallback(async () => {
    if (isLoading || !user || isAuthScreen) return;

    try {
      const enabled = await getBiometricPreference();
      if (!enabled) {
        setBiometricLocked(false);
        return;
      }

      setBiometricLocked(true);
      setBiometricFailed(false);
      setIsAuthenticating(true);

      const result = await authenticateWithBiometric();

      if (result.success) {
        setBiometricLocked(false);
        setBiometricFailed(false);
        biometricChecked.current = true;
      } else {
        setBiometricFailed(true);
      }
    } catch (error) {
      console.error('Biometric check error:', error);
      setBiometricFailed(true);
    } finally {
      setIsAuthenticating(false);
    }
  }, [isLoading, user, isAuthScreen]);

  // Initial biometric check
  useEffect(() => {
    if (!biometricChecked.current && user && !isLoading && !isAuthScreen) {
      performBiometricCheck();
    }
  }, [user, isLoading, isAuthScreen, performBiometricCheck]);

  // App foreground check
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active' && user && !isAuthScreen) {
        biometricChecked.current = false;
        performBiometricCheck();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [user, isAuthScreen, performBiometricCheck]);

  // Reset on logout
  useEffect(() => {
    if (!user) {
      biometricChecked.current = false;
      setBiometricLocked(false);
      setBiometricFailed(false);
    }
  }, [user]);

  // Navigation logic
  useEffect(() => {
    if (isLoading) return;
    const inDashboard = segments[0] === 'dashboard';
    const inAdmin = segments[0] === 'admin';
    const inProtected = inDashboard || inAdmin;

    if (!user && inProtected) {
      router.replace('/login');
    } else if (user && isAuthScreen) {
      if (user.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, isLoading, segments]);

  const handleRetry = async () => {
    setIsAuthenticating(true);
    setBiometricFailed(false);
    const result = await authenticateWithBiometric();
    if (result.success) {
      setBiometricLocked(false);
      biometricChecked.current = true;
    } else {
      setBiometricFailed(true);
    }
    setIsAuthenticating(false);
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
    setBiometricLocked(false);
    setBiometricFailed(false);
    biometricChecked.current = false;
  };

  // Show loading
  if (isLoading) {
    return (
      <View style={[styles.lockScreen, { backgroundColor: COLORS.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={[styles.lockIcon, { backgroundColor: accent + '15' }]}>
          <Ionicons name="wallet-outline" size={40} color={accent} />
        </View>
        <Text style={[styles.lockBrand, { color: COLORS.text }]}>Khaata<Text style={{ color: accent }}>Wise</Text></Text>
      </View>
    );
  }

  // Biometric lock screen - BLOCKS everything
  if (biometricLocked) {
    return (
      <View style={[styles.lockScreen, { backgroundColor: COLORS.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        <View style={[styles.lockIcon, { backgroundColor: accent + '15' }]}>
          <Ionicons name="lock-closed" size={40} color={accent} />
        </View>

        <Text style={[styles.lockBrand, { color: COLORS.text }]}>Khaata<Text style={{ color: accent }}>Wise</Text></Text>
        <Text style={[styles.lockTitle, { color: COLORS.text }]}>App Locked</Text>
        <Text style={[styles.lockSubtitle, { color: COLORS.textMuted }]}>
          {isAuthenticating ? 'Verifying your identity...' : biometricFailed ? 'Authentication failed. Try again.' : 'Authenticate to continue'}
        </Text>

        {biometricFailed && !isAuthenticating && (
          <View style={styles.lockActions}>
            <TouchableOpacity style={[styles.lockBtn, { backgroundColor: accent }]} onPress={handleRetry}>
              <Ionicons name="finger-print-outline" size={22} color="#fff" />
              <Text style={styles.lockBtnText}>Unlock with Biometric</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.lockBtnOutline, { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={[styles.lockBtnOutlineText, { color: '#ef4444' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}

        {isAuthenticating && (
          <View style={[styles.pulseCircle, { borderColor: accent + '40' }]}>
            <Ionicons name="finger-print" size={50} color={accent} />
          </View>
        )}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  lockScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  lockBrand: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  lockActions: {
    width: '100%',
    gap: 12,
  },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  lockBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  lockBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  lockBtnOutlineText: {
    fontSize: 15,
    fontWeight: '700',
  },
  pulseCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
});
