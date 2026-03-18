import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useTheme } from '@/contexts/DarkModeContext';
import config from '@/config/config';

const { LIGHT_COLORS, DARK_COLORS } = config;

export default function BottomNav() {
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? DARK_COLORS : LIGHT_COLORS;
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { icon: 'settings-outline', activeIcon: 'settings', label: 'Settings', path: '/settings' },
    { icon: 'time-outline', activeIcon: 'time', label: 'History', path: '/reports' },
    { icon: 'home-outline', activeIcon: 'home', label: 'Home', path: '/dashboard', isCenter: true },
    { icon: 'people-outline', activeIcon: 'people', label: 'Contacts', path: '/contacts' },
    { icon: 'restaurant-outline', activeIcon: 'restaurant', label: 'Mess', path: '/mess' },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.navBar, { backgroundColor: isDarkMode ? 'rgba(22, 22, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
        {navItems.map((item, index) => {
          const active = isActive(item.path);
          if (item.isCenter) {
            return (
              <View key={index} style={styles.centerButtonContainer}>
                <TouchableOpacity
                  style={[styles.centerButton, { backgroundColor: COLORS.primary }]}
                  onPress={() => router.push(item.path as any)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={active ? item.activeIcon as any : item.icon as any} size={30} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={[styles.navLabel, { color: active ? COLORS.primary : COLORS.textMuted }]}>
                  {item.label}
                </Text>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={index}
              style={styles.navItem}
              onPress={() => router.push(item.path as any)}
              activeOpacity={0.6}
            >
              <Ionicons
                name={active ? item.activeIcon as any : item.icon as any}
                size={24}
                color={active ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.navLabel, { color: active ? COLORS.primary : COLORS.textMuted }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  navBar: {
    flexDirection: 'row',
    width: '92%',
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  centerButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    top: -20,
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
