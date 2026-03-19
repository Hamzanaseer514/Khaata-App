import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import { Colors } from '@/constants/theme';
import { showError, showSuccess } from '@/utils/toast';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/utils/navigation';
import { Formik } from 'formik';
import React, { useState, useRef, useEffect } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    StatusBar,
    Animated,
    Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Yup from 'yup';
import * as ImagePicker from 'expo-image-picker';
import * as Contacts from 'expo-contacts';
import { Image } from 'expo-image';
import config from '../../config/config';

const validationSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .required('Name is required'),
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required'),
  phone: Yup.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number cannot exceed 15 digits')
    .required('Phone number is required'),
});

export default function AddContactScreen() {
  const { token } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const { contactId, editMode } = useLocalSearchParams();
  const isEdit = editMode === 'true';

  const [initialValues, setInitialValues] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  const accentColor = isDarkMode ? '#22d3ee' : '#0a7ea4';
  const placeholderColor = isDarkMode ? '#475569' : '#94a3b8';

  const formikRef = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    if (isEdit && contactId) {
      fetchContactData();
    }
  }, [isEdit, contactId]);

  const fetchContactData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${config.BASE_URL}/contacts/${contactId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        setInitialValues({
          name: data.data.name || '',
          email: data.data.email || '',
          phone: data.data.phone || ''
        });
        if (data.data.profilePicture) {
          setProfileImage(data.data.profilePicture);
        }
      } else {
        showError(data.message || 'Failed to load contact');
      }
    } catch (error) {
      showError('Error loading contact details');
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      showError('Permission to access gallery is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true, // We might need this for simple uploads
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const importFromContacts = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      showError('Permission to access contacts is required');
      return;
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Image],
    });

    if (!data || data.length === 0) {
      showError('No contacts found on this device');
      return;
    }

    // Present contact picker using expo-contacts presentContactPickerAsync if available,
    // otherwise use a simple approach - pick first match or show list
    try {
      const contact = await Contacts.presentContactPickerAsync();
      if (contact) {
        const name = contact.name || '';
        const phone = contact.phoneNumbers?.[0]?.number?.replace(/[\s\-()]/g, '') || '';
        const email = contact.emails?.[0]?.email || '';

        if (formikRef.current) {
          formikRef.current.setFieldValue('name', name);
          if (phone) formikRef.current.setFieldValue('phone', phone);
          if (email) formikRef.current.setFieldValue('email', email);
        }

        if (contact.image?.uri) {
          setProfileImage(contact.image.uri);
        }
      }
    } catch {
      // presentContactPickerAsync not available on this platform, fallback
      // Just open contacts and pick the first one with a name
      showError('Contact picker not supported, please enter details manually');
    }
  };

  const handleFormSubmit = async (values: {
    name: string;
    email: string;
    phone: string;
  }) => {
    setIsLoading(true);
    
    try {
      const url = isEdit ? `${config.BASE_URL}/contacts/${contactId}` : `${config.BASE_URL}/contacts`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          profilePicture: profileImage,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess(isEdit ? 'Contact updated successfully!' : 'Contact added successfully!');
        goBack();
      } else {
        showError(data.message || `Failed to ${isEdit ? 'update' : 'add'} contact`);
      }
    } catch (error) {
      console.error('Contact submission error:', error);
      showError(`Failed to ${isEdit ? 'update' : 'add'} contact. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    headerBackground: {
      backgroundColor: isDarkMode ? '#1c1e1f' : accentColor,
      paddingTop: 60,
      paddingBottom: 20,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: isDarkMode ? 1 : 0,
      borderColor: 'rgba(34, 211, 238, 0.2)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
    },
    headerTitle: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '700',
    },
    pageTitleSection: {
      paddingHorizontal: 24,
      paddingTop: 30,
      paddingBottom: 10,
    },
    pageTitleText: {
      color: themeColors.text,
      fontSize: 34,
      fontWeight: '800',
    },
    accentLine: {
      backgroundColor: accentColor,
      width: 40,
      height: 4,
      borderRadius: 2,
      marginTop: 8,
    },
    input: {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f9fafb',
      borderColor: isDarkMode ? '#334155' : '#e5e7eb',
      color: themeColors.text,
    },
    inputLabel: {
      color: isDarkMode ? '#94a3b8' : '#64748b',
    },
    createButton: {
      backgroundColor: accentColor,
      shadowColor: accentColor,
    },
    profilePlaceholder: {
      backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.1)' : 'rgba(10, 126, 164, 0.1)',
      borderColor: isDarkMode ? 'rgba(34, 211, 238, 0.3)' : 'rgba(10, 126, 164, 0.2)',
    }
  });

  return (
    <View style={dynamicStyles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={isKeyboardVisible || contentHeight > containerHeight}
          bounces={false}
          overScrollMode="never"
          onContentSizeChange={(w, h) => setContentHeight(h)}
          onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.inner}>
            {/* Compact Header */}
            <View style={dynamicStyles.headerBackground}>
              <TouchableOpacity 
                onPress={() => goBack()}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Ionicons name="chevron-back" size={28} color="#ffffff" />
              </TouchableOpacity>
              
              <Text style={dynamicStyles.headerTitle}>{isEdit ? 'Edit Contact' : 'Add Contact'}</Text>

              {!isEdit && (
                <TouchableOpacity
                  onPress={importFromContacts}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 }}
                >
                  <Ionicons name="phone-portrait-outline" size={16} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '600' }}>Import</Text>
                </TouchableOpacity>
              )}
              {isEdit && <View style={{ width: 28 }} />}
            </View>

            {/* Main Page Title (Outside Header) */}
            <Animated.View 
              style={[
                dynamicStyles.pageTitleSection,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
              ]}
            >
              <Text style={dynamicStyles.pageTitleText}>{isEdit ? 'Edit Contact' : 'Create New'}</Text>
              <View style={dynamicStyles.accentLine} />
            </Animated.View>

            {/* Optional Profile Picture Section */}
            <Animated.View 
              style={[
                styles.profileSection,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }], marginBottom: 10 }
              ]}
            >
              <TouchableOpacity 
                activeOpacity={0.8}
                style={[styles.profileCircle, dynamicStyles.profilePlaceholder]}
                onPress={pickImage}
              >
                {profileImage ? (
                  <Image 
                    source={{ uri: profileImage }} 
                    style={styles.selectedImage} 
                    contentFit="cover"
                  />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={40} color={accentColor} />
                    <View style={[styles.addIconBadge, { backgroundColor: accentColor }]}>
                      <Ionicons name="add" size={18} color="#ffffff" />
                    </View>
                  </>
                )}
              </TouchableOpacity>
              <Text style={[styles.optionalText, { color: isDarkMode ? '#64748b' : '#94a3b8' }]}>
                {profileImage ? 'Change Photo' : 'Add Photo (Optional)'}
              </Text>
            </Animated.View>


            {/* Form Section */}
            <Animated.View
              style={[
                styles.formContainer,
                { 
                  opacity: fadeAnim, 
                  transform: [{ translateY: slideAnim }],
                  marginTop: 20,
                  paddingHorizontal: 32,
                }
              ]}
            >
              <Formik
                innerRef={formikRef}
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleFormSubmit}
                enableReinitialize={true}
              >
                {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                  <View style={styles.form}>
                    {/* Name Field */}
                    <View style={styles.inputWrapper}>
                      <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Full Name</Text>
                      <TextInput
                        style={[
                          styles.input,
                          dynamicStyles.input,
                          focusedField === 'name' && { borderColor: accentColor },
                          errors.name && touched.name && styles.inputError
                        ]}
                        placeholder="John Doe"
                        placeholderTextColor={placeholderColor}
                        value={values.name}
                        onChangeText={handleChange('name')}
                        onBlur={(e) => {
                          handleBlur('name')(e);
                          setFocusedField(null);
                        }}
                        onFocus={() => setFocusedField('name')}
                        autoCapitalize="words"
                      />
                      {errors.name && touched.name && (
                        <Text style={styles.errorText}>{errors.name}</Text>
                      )}
                    </View>

                    {/* Phone Field */}
                    <View style={styles.inputWrapper}>
                      <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Phone Number</Text>
                      <TextInput
                        style={[
                          styles.input,
                          dynamicStyles.input,
                          focusedField === 'phone' && { borderColor: accentColor },
                          errors.phone && touched.phone && styles.inputError
                        ]}
                        placeholder="+92 300 1234567"
                        placeholderTextColor={placeholderColor}
                        value={values.phone}
                        onChangeText={handleChange('phone')}
                        onBlur={(e) => {
                          handleBlur('phone')(e);
                          setFocusedField(null);
                        }}
                        onFocus={() => setFocusedField('phone')}
                        keyboardType="phone-pad"
                      />
                      {errors.phone && touched.phone && (
                        <Text style={styles.errorText}>{errors.phone}</Text>
                      )}
                    </View>

                    {/* Email Field */}
                    <View style={styles.inputWrapper}>
                      <Text style={[styles.inputLabel, dynamicStyles.inputLabel]}>Email Address</Text>
                      <TextInput
                        style={[
                          styles.input,
                          dynamicStyles.input,
                          focusedField === 'email' && { borderColor: accentColor },
                          errors.email && touched.email && styles.inputError
                        ]}
                        placeholder="john.doe@example.com"
                        placeholderTextColor={placeholderColor}
                        value={values.email}
                        onChangeText={handleChange('email')}
                        onBlur={(e) => {
                          handleBlur('email')(e);
                          setFocusedField(null);
                        }}
                        onFocus={() => setFocusedField('email')}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      {errors.email && touched.email && (
                        <Text style={styles.errorText}>{errors.email}</Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[styles.createButton, dynamicStyles.createButton, isLoading && styles.buttonDisabled]}
                      onPress={() => handleSubmit()}
                      activeOpacity={0.8}
                      disabled={isLoading}
                    >
                      <Text style={styles.createButtonText}>
                        {isLoading ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Contact')}
                      </Text>
                    </TouchableOpacity>
                    
                    {/* Extra space below button */}
                    <View style={{ height: 40 }} />
                  </View>
                )}
              </Formik>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
  },
  backButtonContainer: {
    zIndex: 10,
  },
  profileSection: {
    alignItems: 'center',
    marginVertical: 15,
  },
  profileCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  addIconBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionalText: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
    paddingTop: 5,
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    borderWidth: 1,
  },
  inputError: {
    borderColor: '#f43f5e',
  },
  errorText: {
    color: '#f43f5e',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  createButton: {
    height: 56,
    borderRadius: 16,
    marginTop: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
