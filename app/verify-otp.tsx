import { useAuth } from '@/contexts/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function VerifyOtpScreen() {
  const { verifySignupOtp } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || '';
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onVerify = async () => {
    if (!email) {
      showError('Missing email for verification');
      return;
    }
    if (otp.trim().length < 4) {
      showError('Enter the 6-digit code sent to your email');
      return;
    }
    setIsLoading(true);
    const res = await verifySignupOtp(email as string, otp.trim());
    setIsLoading(false);
    if (res.success) {
      showSuccess('Account created');
      router.replace('/dashboard');
    } else {
      showError(res.message || 'Invalid code');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.card}>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>Enter the code sent to {email}</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="6-digit code"
          value={otp}
          onChangeText={setOtp}
        />
        <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={onVerify} disabled={isLoading}>
          <Text style={styles.buttonText}>{isLoading ? 'Verifying…' : 'Verify & Create Account'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 16, backgroundColor: '#fff' },
  button: { backgroundColor: '#20B2AA', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { backgroundColor: '#9ca3af' },
});


