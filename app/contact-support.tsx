import { showError } from '@/utils/toast';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ContactSupportScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [message, setMessage] = useState('');

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
    const defaultMessage = message || 'Hello! I need help with Khaata app.';
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(defaultMessage)}`;
    Linking.openURL(url);
  };

  const handleEmail = () => {
    const email = 'ameerhamzauet1026@gmail.com';
    const subject = 'Khaata App - Support Request';
    const body = message || 'Hello,\n\nI need assistance with the following:\n\n';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url);
  };

  const handleCall = () => {
    const phoneNumber = '03274025364';
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url);
  };

  const handleSubmitMessage = () => {
    if (!message.trim()) {
      showError('Please enter your message before sending.');
      return;
    }
    
    // For simplicity, default to email; UI can add buttons for choices
    handleEmail();
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
        <Text style={styles.headerTitle}>Contact Support</Text>
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
          <Text style={styles.sectionTitle}>Get Help</Text>
          <Text style={styles.sectionText}>
            We're here to help! If you're experiencing any issues with Khaata or have questions about using the app, please don't hesitate to reach out to us. Our support team is available to assist you.
          </Text>
        </View>

        {/* Contact Methods */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contact Methods</Text>
          
          <TouchableOpacity style={styles.contactMethod} onPress={handleWhatsApp}>
            <View style={styles.contactIconContainer}>
              <Text style={styles.contactIcon}>📱</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>WhatsApp</Text>
              <Text style={styles.contactSubtitle}>03274025364</Text>
              <Text style={styles.contactDescription}>Quick responses, best for urgent issues</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactMethod} onPress={handleEmail}>
            <View style={styles.contactIconContainer}>
              <Text style={styles.contactIcon}>📧</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Email</Text>
              <Text style={styles.contactSubtitle}>ameerhamzauet1026@gmail.com</Text>
              <Text style={styles.contactDescription}>Detailed support, best for complex issues</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactMethod} onPress={handleCall}>
            <View style={styles.contactIconContainer}>
              <Text style={styles.contactIcon}>📞</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Phone Call</Text>
              <Text style={styles.contactSubtitle}>03274025364</Text>
              <Text style={styles.contactDescription}>Direct voice support</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Message Form */}
        <View style={styles.messageSection}>
          <Text style={styles.sectionTitle}>Send a Message</Text>
          <Text style={styles.sectionText}>
            Describe your issue or question below, and we'll help you resolve it quickly.
          </Text>
          
          <View style={styles.messageContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Describe your issue or question here..."
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            
            <TouchableOpacity style={styles.sendButton} onPress={handleSubmitMessage}>
              <Text style={styles.sendButtonText}>Send Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I reset my password?</Text>
            <Text style={styles.faqAnswer}>
              Go to Settings → Change Password and follow the instructions. If you're locked out, contact us directly.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I add a new contact?</Text>
            <Text style={styles.faqAnswer}>
              Navigate to Contacts → Add Contact and enter the person's details. You can also import from your phone's contacts.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I create a group transaction?</Text>
            <Text style={styles.faqAnswer}>
              Go to Group Khaata → Create Group, add members, and start tracking shared expenses and payments.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Is my financial data secure?</Text>
            <Text style={styles.faqAnswer}>
              Yes, we use industry-standard encryption and security measures to protect your data. See our Privacy Policy for details.
            </Text>
          </View>
        </View>

        {/* Response Time */}
        <View style={styles.responseSection}>
          <Text style={styles.sectionTitle}>Response Times</Text>
          <Text style={styles.sectionText}>
            We aim to respond to all inquiries within 24 hours. WhatsApp messages typically receive faster responses during business hours (9 AM - 6 PM PKT).
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for using Khaata! We appreciate your feedback and are committed to providing excellent support.
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
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f8f9fa',
  },
  contactIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#20B2AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactIcon: {
    fontSize: 24,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 16,
    color: '#20B2AA',
    fontWeight: '500',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 14,
    color: '#666',
  },
  messageSection: {
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
  messageContainer: {
    marginTop: 15,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#f8f9fa',
    minHeight: 120,
    marginBottom: 15,
  },
  sendButton: {
    backgroundColor: '#20B2AA',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  faqSection: {
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
  faqItem: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  responseSection: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 15,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#20B2AA',
  },
  footer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});