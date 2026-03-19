import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useTheme } from '@/contexts/DarkModeContext';
import config from '@/config/config';

const { LIGHT_COLORS, DARK_COLORS } = config;

const NAV_ITEMS = [
  { icon: 'settings-outline', activeIcon: 'settings', label: 'Settings', path: '/settings' },
  { icon: 'people-outline', activeIcon: 'people', label: 'Contacts', path: '/contacts' },
  { icon: 'home-outline', activeIcon: 'home', label: 'Home', path: '/dashboard', isCenter: true },
  { icon: 'restaurant-outline', activeIcon: 'restaurant', label: 'Mess', path: '/mess' },
  { icon: 'wallet-outline', activeIcon: 'wallet', label: 'Khaata', path: '/personal-khaata' },
];

function BottomNav() {
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? DARK_COLORS : LIGHT_COLORS;
  const pathname = usePathname();
  const activeColor = isDarkMode ? COLORS.primary : '#0a7ea4';

  const navigate = useCallback((path: string) => {
    if (pathname === path) return; // already on this page
    router.replace(path as any);
  }, [pathname]);

  return (
    <View style={styles.container}>
      <View style={[styles.navBar, { backgroundColor: isDarkMode ? 'rgba(22, 22, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
        {NAV_ITEMS.map((item, index) => {
          const active = pathname === item.path;
          if (item.isCenter) {
            return (
              <View key={index} style={styles.centerButtonContainer}>
                <TouchableOpacity
                  style={[styles.centerButton, { backgroundColor: activeColor }]}
                  onPress={() => navigate(item.path)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={active ? item.activeIcon as any : item.icon as any} size={30} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={[styles.navLabel, { color: active ? activeColor : COLORS.textMuted }]}>
                  {item.label}
                </Text>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={index}
              style={styles.navItem}
              onPress={() => navigate(item.path)}
              activeOpacity={0.6}
            >
              <Ionicons
                name={active ? item.activeIcon as any : item.icon as any}
                size={24}
                color={active ? activeColor : COLORS.textMuted}
              />
              <Text style={[styles.navLabel, { color: active ? activeColor : COLORS.textMuted }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default React.memo(BottomNav);

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
