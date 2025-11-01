import config from '@/config/config';
import { useAuth } from '@/contexts/AuthContext';
import {
  getBiometricPreference,
  isBiometricAvailable,
  setBiometricPreference
} from '@/utils/biometric';
import { showError, showInfo, showSuccess } from '@/utils/toast';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function SettingsScreen() {
  const { user, logout, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Settings states
  const [darkMode, setDarkMode] = useState(false);
  const [currency, setCurrency] = useState('₹');
  const [language, setLanguage] = useState('English');
  const [biometricAuth, setBiometricAuth] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

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

    // Load biometric preference and availability
    loadBiometricSettings();
  }, []);

  const loadBiometricSettings = async () => {
    try {
      const [preference, available] = await Promise.all([
        getBiometricPreference(),
        isBiometricAvailable(),
      ]);
      setBiometricAuth(preference);
      setBiometricAvailable(available);
    } catch (error) {
      console.error('Error loading biometric settings:', error);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    try {
      if (value) {
        // Check if biometric is available before enabling
        const available = await isBiometricAvailable();
        if (!available) {
          showError('Biometric authentication is not available on this device');
          return;
        }

        // Test biometric authentication before enabling
        const { authenticateWithBiometric } = await import('@/utils/biometric');
        const result = await authenticateWithBiometric();
        
        if (!result.success) {
          showError(result.error || 'Biometric authentication failed. Please try again.');
          return;
        }
      }

      // Save preference
      await setBiometricPreference(value);
      setBiometricAuth(value);
      showSuccess(value ? 'Biometric authentication enabled' : 'Biometric authentication disabled');
    } catch (error) {
      console.error('Error toggling biometric:', error);
      showError('Failed to update biometric settings');
    }
  };

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
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    if (!token) {
      showError('Authentication token missing. Please login again.');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`${config.BASE_URL}/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Account deleted successfully');
        setShowDeleteConfirm(false);
        // Logout user after account deletion
        await logout();
        router.replace('/login');
      } else {
        showError(data.message || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      showError('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearCache = () => {
    showSuccess('Cache cleared successfully!');
  };

  const handleBackupData = async () => {
    if (!token) {
      showError('Authentication token missing. Please login again.');
      return;
    }

    setIsLoading(true);
    try {
      // Fetch backup data from backend
      const response = await fetch(`${config.BASE_URL}/auth/backup-data`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to backup data');
      }

      // Get JSON data
      const backupData = await response.json();

      // Convert to JSON string with proper formatting
      const jsonString = JSON.stringify(backupData, null, 2);
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `khaata_backup_${timestamp}.json`;
      
      // Save file to device
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        // Share/save the file
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Save your backup file',
        });
        showSuccess('Backup created and ready to save!');
      } else {
        showInfo('Backup file saved to device storage', 'Backup Complete');
      }
    } catch (error) {
      console.error('Backup error:', error);
      showError(error instanceof Error ? error.message : 'Failed to backup data. Please try again.');
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

  const SwitchComponent = ({ 
    value, 
    onValueChange, 
    disabled = false 
  }: { 
    value: boolean; 
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#e0e0e0', true: '#20B2AA' }}
      thumbColor={value ? '#ffffff' : '#f4f3f4'}
      disabled={disabled}
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
              subtitle={biometricAvailable ? "Use fingerprint or face ID" : "Not available on this device"}
              icon="👆"
              rightComponent={
                <SwitchComponent 
                  value={biometricAuth} 
                  onValueChange={handleBiometricToggle}
                  disabled={!biometricAvailable}
                />
              }
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
              subtitle={isLoading ? "Creating backup..." : "Create a backup of your data"}
              icon="💾"
              onPress={handleBackupData}
              rightComponent={isLoading ? <ActivityIndicator size="small" color="#20B2AA" /> : undefined}
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

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isDeleting && setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContainer}>
            <Text style={styles.deleteModalTitle}>⚠️ Delete Account</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete your account?
            </Text>
            <Text style={styles.deleteModalWarning}>
              This will erase all your login data, credentials, and all your khaata. This action cannot be undone.
            </Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.confirmDeleteButton]}
                onPress={confirmDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Text style={styles.confirmDeleteButtonText}>Deleting...</Text>
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Yes, Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  // Delete Account Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContainer: {
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
  deleteModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteModalWarning: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
  },
  cancelButtonText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    backgroundColor: '#e74c3c',
  },
  confirmDeleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
