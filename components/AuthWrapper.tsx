import { useAuth } from '@/contexts/AuthContext';
import { router, useSegments } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  React.useEffect(() => {
    if (isLoading) return;

    const inTabsGroup = segments[0] === 'dashboard';
    const inAuthScreens = segments[0] === 'login' || segments[0] === 'register';
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return <>{children}</>;
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
});
