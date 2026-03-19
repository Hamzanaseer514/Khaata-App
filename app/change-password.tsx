import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import config from '@/config/config';
import { showError, showSuccess } from '@/utils/toast';
import { goBack } from '@/utils/navigation';
import { router } from 'expo-router';
import { Formik } from 'formik';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Yup from 'yup';

const validationSchema = Yup.object().shape({
  currentPassword: Yup.string().required('Current password is required'),
  newPassword: Yup.string().min(6, 'Min 6 characters').required('New password is required'),
  confirmNewPassword: Yup.string().oneOf([Yup.ref('newPassword')], 'Passwords must match').required('Confirm your password'),
});

export default function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';
  const cardBg = isDarkMode ? COLORS.surface : '#ffffff';
  const inputBg = isDarkMode ? COLORS.background : '#f8fafc';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.06)' : '#e2e8f0';
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async (values: { currentPassword: string; newPassword: string; confirmNewPassword: string }) => {
    setIsLoading(true);
    try {
      const result = await changePassword(values.currentPassword, values.newPassword, values.confirmNewPassword);
      if (result.success) { showSuccess(result.message || 'Password changed!'); goBack(); }
      else showError(result.message || 'Failed');
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) showError('Check your internet connection');
      else showError('An error occurred. Try again.');
    } finally { setIsLoading(false); }
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1c1e1f' : accent, borderBottomWidth: isDarkMode ? 1 : 0, borderColor: 'rgba(34,211,238,0.2)' }]}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Info */}
          <View style={[styles.infoCard, { backgroundColor: isDarkMode ? 'rgba(34,211,238,0.06)' : '#f0f9ff', borderColor: isDarkMode ? 'rgba(34,211,238,0.15)' : '#bae6fd' }]}>
            <Ionicons name="shield-checkmark-outline" size={22} color={accent} />
            <Text style={[styles.infoText, { color: COLORS.textMuted }]}>Enter your current password and choose a strong new password.</Text>
          </View>

          <Formik initialValues={{ currentPassword: '', newPassword: '', confirmNewPassword: '' }} validationSchema={validationSchema} onSubmit={handleChangePassword}>
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <View>
                {[
                  { key: 'currentPassword', label: 'Current Password', icon: 'lock-closed-outline' as const, placeholder: 'Enter current password' },
                  { key: 'newPassword', label: 'New Password', icon: 'key-outline' as const, placeholder: 'Enter new password' },
                  { key: 'confirmNewPassword', label: 'Confirm Password', icon: 'checkmark-circle-outline' as const, placeholder: 'Confirm new password' },
                ].map((field) => (
                  <View key={field.key} style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: COLORS.textMuted }]}>{field.label}</Text>
                    <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: (errors as any)[field.key] && (touched as any)[field.key] ? '#ef4444' : borderColor }]}>
                      <Ionicons name={field.icon} size={18} color={COLORS.textMuted} />
                      <TextInput
                        style={[styles.input, { color: COLORS.text }]}
                        placeholder={field.placeholder}
                        placeholderTextColor={COLORS.textMuted}
                        value={(values as any)[field.key]}
                        onChangeText={handleChange(field.key)}
                        onBlur={handleBlur(field.key)}
                        secureTextEntry autoCapitalize="none" autoCorrect={false}
                      />
                    </View>
                    {(errors as any)[field.key] && (touched as any)[field.key] && (
                      <Text style={styles.errorText}>{(errors as any)[field.key]}</Text>
                    )}
                  </View>
                ))}

                {/* Requirements */}
                <View style={[styles.reqCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderColor }]}>
                  <Text style={[styles.reqTitle, { color: COLORS.text }]}>Requirements</Text>
                  {['At least 6 characters', 'Mix of letters and numbers', 'Avoid common passwords'].map((r, i) => (
                    <View key={i} style={styles.reqRow}>
                      <Ionicons name="checkmark-circle" size={14} color={accent} />
                      <Text style={[styles.reqText, { color: COLORS.textMuted }]}>{r}</Text>
                    </View>
                  ))}
                </View>

                {/* Buttons */}
                <View style={styles.btnRow}>
                  <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }]} onPress={() => goBack()} disabled={isLoading}>
                    <Text style={[styles.cancelBtnText, { color: COLORS.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: accent }, isLoading && { opacity: 0.6 }]}
                    onPress={() => handleSubmit()} disabled={isLoading}
                  >
                    <Text style={[styles.submitBtnText, { color: isDarkMode ? '#0a0a0c' : '#fff' }]}>{isLoading ? 'Changing...' : 'Change Password'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Formik>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  body: { padding: 20, paddingBottom: 40 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 24 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, paddingVertical: 14 },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  reqCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 24 },
  reqTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  reqText: { fontSize: 12 },
  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { fontSize: 15, fontWeight: '700' },
});
