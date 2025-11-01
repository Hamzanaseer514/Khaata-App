import { showError } from '@/utils/toast';
import { router } from 'expo-router';
import React, { useRef } from 'react';
import {
    Animated,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function PrivacyPolicyScreen() {
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

  const handleWhatsApp = () => {
    const phoneNumber = '03274025364';
    const message = 'Hello! I have a question about Khaata app privacy policy.';
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      showError('WhatsApp is not installed on your device');
    });
  };

  const handleEmail = () => {
    const email = 'khaataapp.co@gmail.com';
    const subject = 'Khaata App - Privacy Policy Query';
    const body = 'Hello,\n\nI have a question about the privacy policy:\n\n';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() => {
      showError('Unable to open email client. Please try again.');
    });
  };

  return (
    <ScrollView style={styles.container}>
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
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
        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Introduction</Text>
          <Text style={styles.sectionText}>
            At Khaata, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our financial management application.
          </Text>
          <Text style={styles.lastUpdated}>Last Updated: December 2024</Text>
        </View>

        {/* Information We Collect */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information We Collect</Text>
          
          <Text style={styles.subsectionTitle}>Personal Information</Text>
          <Text style={styles.sectionText}>
            We collect information you provide directly to us, such as when you create an account, including your name, email address, and account credentials. All passwords are encrypted and stored securely.
          </Text>

          <Text style={styles.subsectionTitle}>Financial Data</Text>
          <Text style={styles.sectionText}>
            To provide our financial management services, we collect transaction records, contact information for bill splitting, and payment details. This data is essential for the core functionality of our app.
          </Text>

          <Text style={styles.subsectionTitle}>Device Information</Text>
          <Text style={styles.sectionText}>
            We automatically collect certain information about your device, including device type, operating system, app usage statistics, and crash reports to improve our service quality.
          </Text>
        </View>

        {/* How We Use Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          <Text style={styles.sectionText}>
            We use your information to provide and maintain our financial management services, process transactions, manage your accounts, and send important notifications. We also use this data to improve our app's functionality, ensure security, prevent fraud, and comply with legal obligations.
          </Text>
        </View>

        {/* Data Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Security</Text>
          <Text style={styles.sectionText}>
            We implement industry-standard security measures to protect your data, including end-to-end encryption for sensitive information, secure cloud storage with regular backups, multi-factor authentication options, and regular security audits. Access to your data is limited to authorized personnel only.
          </Text>
        </View>

        {/* Data Sharing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sharing</Text>
          <Text style={styles.sectionText}>
            We do not sell, trade, or rent your personal information to third parties. We may share data only with your explicit consent, to comply with legal requirements, to protect our rights and prevent fraud, or with trusted service providers under strict confidentiality agreements.
          </Text>
        </View>

        {/* Your Rights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.sectionText}>
            You have the right to access your personal data, correct inaccurate information, delete your account and data, export your transaction data, opt-out of non-essential communications, and withdraw consent at any time. You can exercise these rights through the app settings or by contacting us directly.
          </Text>
        </View>

        {/* Contact Information */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.sectionText}>
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </Text>
          
          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.contactButton} onPress={handleWhatsApp}>
              <Text style={styles.contactIcon}>📱</Text>
              <Text style={styles.contactText}>WhatsApp: 03274025364</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactButton} onPress={handleEmail}>
              <Text style={styles.contactIcon}>📧</Text>
              <Text style={styles.contactText}>Email: khaataapp.co@gmail.com</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Changes to Policy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to This Policy</Text>
          <Text style={styles.sectionText}>
            We may update this Privacy Policy from time to time. We will notify you of any significant changes through the app or via email. Your continued use of the app after changes constitutes acceptance of the updated policy.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using Khaata, you acknowledge that you have read and understood this Privacy Policy.
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34495e',
    marginTop: 15,
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
    textAlign: 'justify',
  },
  lastUpdated: {
    fontSize: 14,
    color: '#20B2AA',
    fontWeight: '500',
    marginTop: 10,
    fontStyle: 'italic',
  },
  contactSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactButtons: {
    marginTop: 15,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flex: 1,
  },
  contactIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  contactText: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 1,
    flexWrap: 'wrap',
  },
  footer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 15,
    marginBottom: 40,
    borderLeftWidth: 4,
    borderLeftColor: '#20B2AA',
  },
  footerText: {
    fontSize: 14,
    color: '#2c3e50',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});