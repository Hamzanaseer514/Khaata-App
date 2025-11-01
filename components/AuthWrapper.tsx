import { useAuth } from '@/contexts/AuthContext';
import { router, useSegments } from 'expo-router';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Modal, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { getBiometricPreference, authenticateWithBiometric } from '@/utils/biometric';

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const segments = useSegments();
  const [isCheckingBiometric, setIsCheckingBiometric] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const biometricChecked = useRef(false);
  const appState = useRef(AppState.currentState);

  // Biometric check function
  const performBiometricCheck = useCallback(async (force = false) => {
    if (isLoading || !user) return;
    
    // Don't check if already checked unless forced (app coming to foreground)
    if (!force && biometricChecked.current) return;
    
    const currentSegments = segments;
    const inAuthScreens = currentSegments[0] === 'login' || currentSegments[0] === 'register' || currentSegments[0] === 'verify-otp';
    if (inAuthScreens) return; // Don't check biometric on auth screens

    try {
      const biometricEnabled = await getBiometricPreference();
      if (biometricEnabled) {
        if (force) {
          // Reset check flag when app comes to foreground
          biometricChecked.current = false;
        }
        
        biometricChecked.current = true;
        setIsCheckingBiometric(true);

        // Show biometric prompt directly
        const result = await authenticateWithBiometric();
        
        if (result.success) {
          // Biometric success - allow access
          setIsCheckingBiometric(false);
        } else {
          // Biometric failed or cancelled - show modal with retry option
          setIsCheckingBiometric(false);
          setShowBiometricModal(true);
        }
      }
    } catch (error) {
      console.error('Biometric check error:', error);
      setIsCheckingBiometric(false);
      // On error, still show modal to allow retry
      const biometricEnabled = await getBiometricPreference().catch(() => false);
      if (biometricEnabled) {
        setShowBiometricModal(true);
      }
    }
  }, [isLoading, user, segments]);

  // Check biometric authentication when user is authenticated (app opens)
  useEffect(() => {
    performBiometricCheck(false);
  }, [user, isLoading, segments, performBiometricCheck]);

  // Check biometric when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        user // Only check if user is logged in
      ) {
        // App has come to the foreground, check biometric
        performBiometricCheck(true);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user, performBiometricCheck]);

  // Reset biometric check flag when user logs out
  useEffect(() => {
    if (!user) {
      biometricChecked.current = false;
      setShowBiometricModal(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (isLoading) return;

    const inTabsGroup = segments[0] === 'dashboard';
    const inAuthScreens = segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'verify-otp';
    const inDashboard = segments[0] === 'dashboard';

    console.log('AuthWrapper - segments:', segments);   
    console.log('AuthWrapper - user:', user);
    console.log('AuthWrapper - inTabsGroup:', inTabsGroup);
    console.log('AuthWrapper - inAuthScreens:', inAuthScreens);
    console.log('AuthWrapper - inDashboard:', inDashboard); 

    if (!user && (inTabsGroup || inDashboard)) {
      // User is not authenticated but trying to access protected routes
      console.log('Redirecting to login');
      router.replace('/login');
    } else if (user && inAuthScreens) {
      // User is authenticated but on auth screens, redirect to main app
      console.log('Redirecting to dashboard');
      router.replace('/dashboard');
    }
  }, [user, isLoading, segments]);

  const handleBiometricRetry = async () => {
    setIsCheckingBiometric(true);
    const result = await authenticateWithBiometric();
    
    if (result.success) {
      setShowBiometricModal(false);
      setIsCheckingBiometric(false);
    } else {
      setIsCheckingBiometric(false);
      // If failed or cancelled, show logout option
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
    setShowBiometricModal(false);
    biometricChecked.current = false;
  };

  if (isLoading || isCheckingBiometric) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>
          {isCheckingBiometric ? 'Verifying identity...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  return (
    <>
      {children}
      
      {/* Biometric Authentication Modal */}
      <Modal
        visible={showBiometricModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}} // Prevent closing by back button
      >
        <View style={styles.modalOverlay}>
          <View style={styles.biometricModalContainer}>
            <Text style={styles.biometricModalTitle}>🔐 Authentication Required</Text>
            <Text style={styles.biometricModalMessage}>
              Please authenticate to access the app
            </Text>
            <View style={styles.biometricModalButtons}>
              <TouchableOpacity
                style={[styles.biometricModalButton, styles.retryButton]}
                onPress={handleBiometricRetry}
                disabled={isCheckingBiometric}
              >
                <Text style={styles.retryButtonText}>
                  {isCheckingBiometric ? 'Verifying...' : 'Try Again'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.biometricModalButton, styles.logoutButton]}
                onPress={handleLogout}
                disabled={isCheckingBiometric}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  biometricModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  biometricModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  biometricModalMessage: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 24,
    textAlign: 'center',
  },
  biometricModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  biometricModalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  retryButton: {
    backgroundColor: '#20B2AA',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
