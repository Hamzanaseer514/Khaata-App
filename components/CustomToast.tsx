import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/DarkModeContext';
import { BaseToastProps } from 'react-native-toast-message';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOAST_CONFIG = {
  success: {
    icon: 'checkmark-circle' as const,
    lightBg: '#ecfdf5',
    lightBorder: '#a7f3d0',
    lightIcon: '#059669',
    lightText: '#065f46',
    darkBg: '#0f2922',
    darkBorder: '#1a4a3a',
    darkIcon: '#34d399',
    darkText: '#a7f3d0',
    accentBar: '#10b981',
  },
  error: {
    icon: 'close-circle' as const,
    lightBg: '#fef2f2',
    lightBorder: '#fecaca',
    lightIcon: '#dc2626',
    lightText: '#991b1b',
    darkBg: '#2a1215',
    darkBorder: '#4a1d22',
    darkIcon: '#f87171',
    darkText: '#fecaca',
    accentBar: '#ef4444',
  },
  info: {
    icon: 'information-circle' as const,
    lightBg: '#eff6ff',
    lightBorder: '#bfdbfe',
    lightIcon: '#2563eb',
    lightText: '#1e40af',
    darkBg: '#0c1e2e',
    darkBorder: '#1a3a52',
    darkIcon: '#22d3ee',
    darkText: '#a5f3fc',
    accentBar: '#22d3ee',
  },
};

function ToastContent({ type, text1, text2 }: BaseToastProps & { type: 'success' | 'error' | 'info' }) {
  const { isDarkMode } = useTheme();
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const config = TOAST_CONFIG[type];

  const bg = isDarkMode ? config.darkBg : config.lightBg;
  const border = isDarkMode ? config.darkBorder : config.lightBorder;
  const iconColor = isDarkMode ? config.darkIcon : config.lightIcon;
  const textColor = isDarkMode ? config.darkText : config.lightText;
  const subtextColor = isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: opacityAnim,
          transform: [{ translateX: slideAnim }],
          shadowColor: isDarkMode ? '#000' : config.accentBar,
        },
      ]}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: config.accentBar }]} />

      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
        <Ionicons name={config.icon} size={22} color={iconColor} />
      </View>

      {/* Text */}
      <View style={styles.textContainer}>
        {text1 ? (
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={[styles.message, { color: subtextColor }]} numberOfLines={2}>
            {text2}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

export const toastConfig = {
  success: (props: BaseToastProps) => <ToastContent {...props} type="success" />,
  error: (props: BaseToastProps) => <ToastContent {...props} type="error" />,
  info: (props: BaseToastProps) => <ToastContent {...props} type="info" />,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 50,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 16,
    paddingLeft: 0,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: SCREEN_WIDTH - 32,
    minHeight: 56,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
  },
  textContainer: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 16,
  },
});
