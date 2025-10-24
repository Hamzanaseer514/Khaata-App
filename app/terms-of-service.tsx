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

export default function TermsOfServiceScreen() {
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
    const message = 'Hello! I have a question about Khaata app terms of service.';
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      showError('WhatsApp is not installed on your device');
    });
  };

  const handleEmail = () => {
    const email = 'ameerhamzauet1026@gmail.com';
    const subject = 'Khaata App - Terms of Service Query';
    const body = 'Hello,\n\nI have a question about the terms of service:\n\n';
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
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
          <Text style={styles.sectionTitle}>Agreement to Terms</Text>
          <Text style={styles.sectionText}>
            By accessing and using the Khaata mobile application, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this app.
          </Text>
          <Text style={styles.lastUpdated}>Last Updated: December 2024</Text>
        </View>

        {/* Use License */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Use License</Text>
          <Text style={styles.sectionText}>
            Permission is granted to temporarily download one copy of Khaata for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not modify or copy the materials, use the materials for any commercial purpose or for any public display, attempt to reverse engineer any software contained in the app, or remove any copyright or other proprietary notations from the materials.
          </Text>
        </View>

        {/* User Accounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Accounts</Text>
          <Text style={styles.sectionText}>
            To access certain features of Khaata, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
          </Text>
        </View>

        {/* Financial Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Transactions</Text>
          <Text style={styles.sectionText}>
            Khaata facilitates financial tracking and bill splitting among users. You are solely responsible for all transactions you initiate through the app. We do not guarantee the accuracy of financial calculations and recommend verifying all transactions independently. Users are responsible for settling debts and payments outside of the app.
          </Text>
        </View>

        {/* Prohibited Uses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prohibited Uses</Text>
          <Text style={styles.sectionText}>
            You may not use Khaata for any unlawful purpose or to solicit others to perform unlawful acts. You may not violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances. You may not infringe upon or violate our intellectual property rights or the intellectual property rights of others. You may not harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate based on gender, sexual orientation, religion, ethnicity, race, age, national origin, or disability.
          </Text>
        </View>

        {/* Privacy Policy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Policy</Text>
          <Text style={styles.sectionText}>
            Your privacy is important to us. Please review our Privacy Policy, which also governs your use of Khaata, to understand our practices. By using our app, you consent to the collection and use of information in accordance with our Privacy Policy.
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disclaimer</Text>
          <Text style={styles.sectionText}>
            The materials on Khaata are provided on an 'as is' basis. Khaata makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </Text>
        </View>

        {/* Limitations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Limitations</Text>
          <Text style={styles.sectionText}>
            In no event shall Khaata or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use Khaata, even if Khaata or a Khaata authorized representative has been notified orally or in writing of the possibility of such damage.
          </Text>
        </View>

        {/* Accuracy of Materials */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accuracy of Materials</Text>
          <Text style={styles.sectionText}>
            The materials appearing on Khaata could include technical, typographical, or photographic errors. Khaata does not warrant that any of the materials on its app are accurate, complete, or current. Khaata may make changes to the materials contained on its app at any time without notice.
          </Text>
        </View>

        {/* Termination */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Termination</Text>
          <Text style={styles.sectionText}>
            We may terminate or suspend your account and bar access to Khaata immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms. If you wish to terminate your account, you may simply discontinue using the app.
          </Text>
        </View>

        {/* Governing Law */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Governing Law</Text>
          <Text style={styles.sectionText}>
            These terms and conditions are governed by and construed in accordance with the laws of Pakistan and you irrevocably submit to the exclusive jurisdiction of the courts in that state or location.
          </Text>
        </View>

        {/* Contact Information */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.sectionText}>
            If you have any questions about these Terms of Service, please contact us:
          </Text>
          
          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.contactButton} onPress={handleWhatsApp}>
              <Text style={styles.contactIcon}>📱</Text>
              <Text style={styles.contactText}>WhatsApp: 03274025364</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactButton} onPress={handleEmail}>
              <Text style={styles.contactIcon}>📧</Text>
              <Text style={styles.contactText}>Email: ameerhamzauet1026@gmail.com</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Changes to Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to Terms</Text>
          <Text style={styles.sectionText}>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. Your continued use of Khaata after any such changes constitutes your acceptance of the new Terms.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using Khaata, you acknowledge that you have read and understood these Terms of Service.
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