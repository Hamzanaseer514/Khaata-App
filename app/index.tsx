import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import config from '../config/config';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { user, isLoading } = useAuth();
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;
  
  const [hasAnimated, setHasAnimated] = useState(false);

  const styles = createStyles(COLORS, isDarkMode);

  useEffect(() => {
    // Background orbs animation
    const animateOrb = (anim: Animated.Value, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateOrb(orb1Anim, 4000);
    animateOrb(orb2Anim, 6000);

    // Main content animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setHasAnimated(true);
    });
  }, []);

  // Navigate based on auth state
  useEffect(() => {
    if (!hasAnimated) return;
    
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (user) {
        if (user.role === 'admin') {
          router.replace('/admin');
        } else {
          router.replace('/dashboard');
        }
      } else {
        router.replace('/login');
      }
    }, 1500); // Slightly longer for premium feel

    return () => clearTimeout(timer);
  }, [user, isLoading, hasAnimated]);

  const orb1TranslateX = orb1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.2, width * 0.2],
  });

  const orb2TranslateY = orb2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [height * 0.1, -height * 0.1],
  });

  return (
    <View style={styles.container}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      {/* Decorative Background Orbs */}
      <Animated.View style={[
        styles.orb, 
        styles.orb1, 
        { transform: [{ translateX: orb1TranslateX }] }
      ]} />
      <Animated.View style={[
        styles.orb, 
        styles.orb2, 
        { transform: [{ translateY: orb2TranslateY }] }
      ]} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* App Logo with Glowing Container */}
        <View style={styles.logoOuter}>
          <View style={styles.logoInner}>
            <Ionicons name="wallet-outline" size={60} color="#fff" />
          </View>
        </View>

        {/* App Branding */}
        <View style={styles.textContainer}>
          <Text style={styles.appName}>KHAATA</Text>
          <Text style={styles.wiseText}>WISE</Text>
          <View style={styles.glowLine} />
          <Text style={styles.tagline}>Smart Ledger. Clear Records.</Text>
        </View>

        {/* Loading Indicator */}
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {isLoading ? 'Verifying Session...' : 'Opening Ledger...'}
          </Text>
        </View>
      </Animated.View>

      <Text style={styles.footerText}>Version 2.0 • Premium Experience</Text>
    </View>
  );
}

const createStyles = (COLORS: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orb: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    opacity: isDarkMode ? 0.15 : 0.08,
  },
  orb1: {
    top: -width * 0.2,
    left: -width * 0.1,
    backgroundColor: '#25d1f4',
  },
  orb2: {
    bottom: -width * 0.1,
    right: -width * 0.2,
    backgroundColor: isDarkMode ? '#c084fc' : '#38bdf8',
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  logoOuter: {
    width: 120,
    height: 120,
    borderRadius: 40,
    backgroundColor: isDarkMode ? 'rgba(37, 209, 244, 0.15)' : 'rgba(37, 209, 244, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37, 209, 244, 0.3)',
    shadowColor: '#25d1f4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isDarkMode ? 0.5 : 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  logoInner: {
    width: 100,
    height: 100,
    borderRadius: 34,
    backgroundColor: '#25d1f4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  textContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  appName: {
    fontSize: 52,
    fontWeight: '900',
    color: isDarkMode ? '#fff' : '#0f172a',
    letterSpacing: 6,
    textShadowColor: isDarkMode ? 'rgba(37, 209, 244, 0.4)' : 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    lineHeight: 52,
  },
  wiseText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#25d1f4',
    letterSpacing: 20,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  glowLine: {
    height: 2,
    width: 40,
    backgroundColor: '#25d1f4',
    marginVertical: 10,
    borderRadius: 1,
    shadowColor: '#25d1f4',
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 5,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(15, 23, 42, 0.6)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  loadingWrapper: {
    marginTop: 80,
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    flexDirection: 'row',
  },
  loadingText: {
    color: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(15, 23, 42, 0.5)',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  footerText: {
    position: 'absolute',
    bottom: 40,
    fontSize: 10,
    fontWeight: '800',
    color: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.2)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

