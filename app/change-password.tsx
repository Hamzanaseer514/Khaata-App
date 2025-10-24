import { useAuth } from '@/contexts/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { router } from 'expo-router';
import { Formik } from 'formik';
import React, { useRef, useState } from 'react';
import {
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import * as Yup from 'yup';

const validationSchema = Yup.object().shape({
  currentPassword: Yup.string()
    .required('Current password is required'),
  newPassword: Yup.string()
    .min(6, 'New password must be at least 6 characters')
    .required('New password is required'),
  confirmNewPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your new password'),
});

export default function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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

  const handleChangePassword = async (values: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }) => {
    setIsLoading(true);
    
    try {
      const result = await changePassword(
        values.currentPassword,
        values.newPassword,
        values.confirmNewPassword
      );
      
      if (result.success) {
        showSuccess(result.message || 'Password changed');
        router.back();
      } else {
        showError(result.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        showError('Please check your internet connection and try again.', 'Network Error');
      } else if (error instanceof Error) {
        showError(error.message || 'An unexpected error occurred. Please try again.');
      } else {
        showError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
          <Text style={styles.headerTitle}>Change Password</Text>
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
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🔐 Password Security</Text>
            <Text style={styles.infoText}>
              For your security, please enter your current password and choose a new strong password.
            </Text>
          </View>

          {/* Form */}
          <Formik
            initialValues={{
              currentPassword: '',
              newPassword: '',
              confirmNewPassword: '',
            }}
            validationSchema={validationSchema}
            onSubmit={handleChangePassword}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <View style={styles.form}>
                {/* Current Password */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Current Password</Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.currentPassword && touched.currentPassword && styles.inputError
                    ]}
                    placeholder="Enter your current password"
                    placeholderTextColor="#999"
                    value={values.currentPassword}
                    onChangeText={handleChange('currentPassword')}
                    onBlur={handleBlur('currentPassword')}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {errors.currentPassword && touched.currentPassword && (
                    <Text style={styles.errorText}>{errors.currentPassword}</Text>
                  )}
                </View>

                {/* New Password */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.newPassword && touched.newPassword && styles.inputError
                    ]}
                    placeholder="Enter your new password"
                    placeholderTextColor="#999"
                    value={values.newPassword}
                    onChangeText={handleChange('newPassword')}
                    onBlur={handleBlur('newPassword')}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {errors.newPassword && touched.newPassword && (
                    <Text style={styles.errorText}>{errors.newPassword}</Text>
                  )}
                </View>

                {/* Confirm New Password */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.confirmNewPassword && touched.confirmNewPassword && styles.inputError
                    ]}
                    placeholder="Confirm your new password"
                    placeholderTextColor="#999"
                    value={values.confirmNewPassword}
                    onChangeText={handleChange('confirmNewPassword')}
                    onBlur={handleBlur('confirmNewPassword')}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {errors.confirmNewPassword && touched.confirmNewPassword && (
                    <Text style={styles.errorText}>{errors.confirmNewPassword}</Text>
                  )}
                </View>

                {/* Password Requirements */}
                <View style={styles.requirementsCard}>
                  <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                  <Text style={styles.requirementItem}>• At least 6 characters long</Text>
                  <Text style={styles.requirementItem}>• Mix of letters and numbers recommended</Text>
                  <Text style={styles.requirementItem}>• Avoid common passwords</Text>
                </View>

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => router.back()}
                    disabled={isLoading}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.changeButton, isLoading && styles.buttonDisabled]}
                    onPress={() => handleSubmit()}
                    disabled={isLoading}
                  >
                    <Text style={styles.changeButtonText}>
                      {isLoading ? 'Changing...' : 'Change Password'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Formik>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  infoCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#20B2AA',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 5,
  },
  requirementsCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  requirementItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  changeButton: {
    flex: 1,
    backgroundColor: '#20B2AA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginLeft: 10,
    shadowColor: '#20B2AA',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  changeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
});
