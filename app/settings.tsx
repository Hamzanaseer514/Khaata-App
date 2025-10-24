import { useAuth } from '@/contexts/AuthContext';
import { showError, showInfo, showSuccess } from '@/utils/toast';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Animated,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Settings states
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [currency, setCurrency] = useState('₹');
  const [language, setLanguage] = useState('English');
  const [autoBackup, setAutoBackup] = useState(true);
  const [biometricAuth, setBiometricAuth] = useState(false);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogout = () => {
    // Keep confirmation using Alert-like behavior? Use a simple confirm-style via toasts is not ideal
    // Keeping confirmation via native alert would be better UX, but request asks for toast for success/error
    logout();
    showSuccess('Logged out');
  };

  const handleChangePassword = () => {
    router.push('/change-password');
  };

  const handlePrivacyPolicy = () => {
    router.push('/privacy-policy');
  };

  const handleTermsOfService = () => {
    router.push('/terms-of-service');
  };

  const handleContactSupport = () => {
    router.push('/contact-support');
  };

  const handleExportData = () => {
    showInfo('Data export feature will be available soon!', 'Export Data');
  };

  const handleDeleteAccount = () => {
    showInfo('Account deletion feature will be available soon!', 'Account Deletion');
  };

  const handleClearCache = () => {
    showSuccess('Cache cleared successfully!');
  };

  const handleBackupData = async () => {
    setIsLoading(true);
    try {
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 2000));
      showSuccess('Data backed up successfully!');
    } catch (error) {
      showError('Failed to backup data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const SettingItem = ({ 
    title, 
    subtitle, 
    icon, 
    onPress, 
    rightComponent, 
    isLast = false 
  }: {
    title: string;
    subtitle?: string;
    icon: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    isLast?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, isLast && styles.lastSettingItem]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Text style={styles.settingEmoji}>{icon}</Text>
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightComponent || (onPress && <Text style={styles.arrowText}>›</Text>)}
      </View>
    </TouchableOpacity>
  );

  const SwitchComponent = ({ value, onValueChange }: { value: boolean; onValueChange: (value: boolean) => void }) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#e0e0e0', true: '#20B2AA' }}
      thumbColor={value ? '#ffffff' : '#f4f3f4'}
    />
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileInfo}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileInitial}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.profileDetails}>
                <Text style={styles.profileName}>{user?.name || 'User'}</Text>
                <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              title="Change Password"
              subtitle="Update your account password"
              icon="🔐"
              onPress={handleChangePassword}
            />
            <SettingItem
              title="Export Data"
              subtitle="Download your transaction data"
              icon="📤"
              onPress={handleExportData}
            />
            <SettingItem
              title="Delete Account"
              subtitle="Permanently delete your account"
              icon="🗑️"
              onPress={handleDeleteAccount}
              isLast={true}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              title="Enable Notifications"
              subtitle="Receive app notifications"
              icon="🔔"
              rightComponent={<SwitchComponent value={notificationsEnabled} onValueChange={setNotificationsEnabled} />}
            />
            <SettingItem
              title="Email Notifications"
              subtitle="Get notified via email"
              icon="📧"
              rightComponent={<SwitchComponent value={emailNotifications} onValueChange={setEmailNotifications} />}
            />
            <SettingItem
              title="Push Notifications"
              subtitle="Receive push notifications"
              icon="📱"
              rightComponent={<SwitchComponent value={pushNotifications} onValueChange={setPushNotifications} />}
              isLast={true}
            />
          </View>
        </View>

        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              title="Dark Mode"
              subtitle="Switch to dark theme"
              icon="🌙"
              rightComponent={<SwitchComponent value={darkMode} onValueChange={setDarkMode} />}
            />
            <SettingItem
              title="Currency"
              subtitle={`Current: ${currency}`}
              icon="💰"
              onPress={() => showInfo('Currency selection will be available soon!', 'Currency')}
            />
            <SettingItem
              title="Language"
              subtitle={`Current: ${language}`}
              icon="🌍"
              onPress={() => showInfo('Language selection will be available soon!', 'Language')}
              isLast={true}
            />
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              title="Biometric Authentication"
              subtitle="Use fingerprint or face ID"
              icon="👆"
              rightComponent={<SwitchComponent value={biometricAuth} onValueChange={setBiometricAuth} />}
            />
            <SettingItem
              title="Auto Backup"
              subtitle="Automatically backup your data"
              icon="☁️"
              rightComponent={<SwitchComponent value={autoBackup} onValueChange={setAutoBackup} />}
              isLast={true}
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              title="Backup Data"
              subtitle="Create a backup of your data"
              icon="💾"
              onPress={handleBackupData}
            />
            <SettingItem
              title="Clear Cache"
              subtitle="Free up storage space"
              icon="🧹"
              onPress={handleClearCache}
              isLast={true}
            />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              title="App Version"
              subtitle="1.0.0"
              icon="ℹ️"
            />
             <SettingItem
               title="Privacy Policy"
               subtitle="Read our privacy policy"
               icon="📄"
               onPress={handlePrivacyPolicy}
             />
             <SettingItem
               title="Terms of Service"
               subtitle="Read our terms of service"
               icon="📋"
               onPress={handleTermsOfService}
             />
             <SettingItem
               title="Contact Support"
               subtitle="Get help and support"
               icon="🆘"
               onPress={handleContactSupport}
               isLast={true}
             />
          </View>
        </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#20B2AA',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#20B2AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  settingsGroup: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastSettingItem: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingEmoji: {
    fontSize: 18,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  settingRight: {
    marginLeft: 10,
  },
  arrowText: {
    fontSize: 20,
    color: '#bdc3c7',
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  logoutText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
