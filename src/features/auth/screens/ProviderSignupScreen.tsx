import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ScrollView,
  Dimensions,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { TOKENS } from '@/constants/tokens';
import { AppButton } from '@/src/components/common/AppButton';
import { AppTextInput } from '@/src/components/common/AppTextInput';
import { AppPressable } from '@/src/components/common/AppPressable';
import { getErrorMessage } from '@/lib/error-handling';
import { registerProvider } from '@/services/authService';

const CheckItem = ({ label, met }: { label: string; met: boolean }) => (
  <View style={styles.criteriaItem}>
    <Ionicons 
      name={met ? "checkmark-circle" : "ellipse-outline"} 
      size={20} 
      color={met ? "#10B981" : "#CBD5E1"} 
    />
    <Text style={[styles.criteriaText, met && styles.criteriaTextMet]}>{label}</Text>
  </View>
);

const { width } = Dimensions.get('window');

export function ProviderSignupScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successAnim = useRef(new Animated.Value(0)).current;
  const otpRefs = useRef<(TextInput | null)[]>([]);
  
  // Dropdown states
  const [showPrimaryDropdown, setShowPrimaryDropdown] = useState(false);
  const [showSubDropdown, setShowSubDropdown] = useState(false);
  const [showExpDropdown, setShowExpDropdown] = useState(false);
  const [showIdDropdown, setShowIdDropdown] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    password: '',
    confirmPassword: '',
    primaryCategory: '',
    subCategory: '',
    experienceLevel: '',
    streetAddress: '',
    city: '',
    province: '',
    zipCode: '',
    radius: 10,
    idType: '',
    idDocument: null as any,
    otp: ['', '', '', '', '', ''],
  });

  const [timeLeft, setTimeLeft] = useState(295);

  useEffect(() => {
    if (step === 5 && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  const categories = [
    "Home Maintenance & Repair",
    "Beauty, Wellness & Personal Care",
    "Education & Professional Services",
    "Domestic & Cleaning Services",
    "Pet Services",
    "Events & Entertainment",
    "Automotive & Tech Support"
  ];

  const subCategories: Record<string, string[]> = {
    "Home Maintenance & Repair": ["Plumbing", "Electrical", "Carpentry", "Painting", "Other"],
    "Beauty, Wellness & Personal Care": ["Hair Styling", "Makeup Artist", "Massage Therapy", "Nails", "Other"],
    "Education & Professional Services": ["Academic Tutor", "Language Teacher", "Music Lessons", "Other"],
    "Domestic & Cleaning Services": ["House Cleaning", "Laundry", "Ironing", "Deep Cleaning", "Other"],
    "Pet Services": ["Grooming", "Walking", "Training", "Sitting"],
    "Events & Entertainment": ["Photography", "DJ", "Host", "Catering"],
    "Automotive & Tech Support": ["Car Wash", "Mechanic", "Computer Repair", "Mobile Repair"]
  };

  const idTypes = [
    "UMID",
    "Driver's License",
    "Philippine National ID (PhilID)",
    "Passport",
    "Postal ID"
  ];

  const expLevels = ["Less than 1 year", "1-2 years", "3-5 years", "5-10 years", "More than 10 years"];

  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });

  useEffect(() => {
    const { password } = formData;
    setPasswordCriteria({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      specialChar: /[@$!%*?&]/.test(password),
    });
  }, [formData.password]);

  const handleDobChange = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    let formatted = '';
    if (cleaned.length > 0) {
      formatted = cleaned.substring(0, 2);
      if (cleaned.length > 2) {
        formatted += '/' + cleaned.substring(2, 4);
        if (cleaned.length > 4) {
          formatted += '/' + cleaned.substring(4, 8);
        }
      }
    }
    setFormData({ ...formData, dob: formatted.substring(0, 10) });
  };

  const showSuccessOverlay = () => {
    setShowSuccess(true);
    Animated.timing(successAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      router.replace('/provider-login' as any);
    }, 2500);
  };

  const handlePicker = async (useScanner = false) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        setFormData({ ...formData, idDocument: result.assets[0] });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const validateStep = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return (
          formData.fullName.trim() !== "" &&
          formData.email.trim() !== "" &&
          formData.phone.trim() !== "" &&
          formData.dob !== "" &&
          formData.password.length >= 8 &&
          formData.password === formData.confirmPassword
        );
      case 2:
        return (
          formData.primaryCategory !== "" &&
          formData.subCategory !== "" &&
          formData.experienceLevel !== ""
        );
      case 3:
        return (
          formData.streetAddress.trim() !== "" &&
          formData.city.trim() !== "" &&
          formData.province.trim() !== "" &&
          formData.zipCode.trim() !== ""
        );
      case 4:
        return formData.idType !== "" && formData.idDocument !== null;
      case 5:
        return formData.otp.every(digit => digit !== "");
      default:
        return true;
    }
  };

  const handleNextStep = async () => {
    if (!validateStep(step)) {
      Alert.alert(
        'Incomplete Information', 
        'Please ensure all required fields are filled out correctly before proceeding.'
      );
      return;
    }

    if (step < 5) {
      setStep(step + 1);
    } else {
      // Final Submit
      setIsSubmitting(true);
      try {
        const multipartBody = new FormData();
        
        // --- Required Fields according to RegisterProviderDto ---
        multipartBody.append('full_name', formData.fullName.trim());
        multipartBody.append('email', formData.email.trim().toLowerCase());
        multipartBody.append('contact_number', formData.phone.trim());
        multipartBody.append('password', formData.password);
        multipartBody.append('date_of_birth', formData.dob); // Critical: was missing
        
        // Role and Business Name (Defaulted for premium provider experience)
        multipartBody.append('role', 'provider');
        multipartBody.append('business_name', formData.fullName.trim());
        
        // --- Address Fields (Corrected keys) ---
        multipartBody.append('street_address', formData.streetAddress);
        multipartBody.append('city', formData.city);
        multipartBody.append('province', formData.province);
        multipartBody.append('zip_code', formData.zipCode);
        
        // --- Service Categories ---
        multipartBody.append('primary_category', formData.primaryCategory);
        multipartBody.append('sub_category', formData.subCategory);
        multipartBody.append('experience_level', formData.experienceLevel);
        
        // --- Document Selection & Mapping ---
        // Map UI labels to backend 'government_id' or equivalent DocumentType enum
        const docType = formData.idType.toLowerCase().includes('permit') ? 'business_permit' : 'government_id';
        multipartBody.append('document_type', docType);

        if (formData.idDocument) {
          const uri = formData.idDocument.uri;
          const filename = uri.split('/').pop() || 'upload.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;
          
          multipartBody.append('document_file', {
            uri,
            name: filename,
            type,
          } as any);
        }

        await registerProvider(multipartBody);
        showSuccessOverlay();
      } catch (err: any) {
        const message = getErrorMessage(err, 'Unable to create provider account.');
        const normalized = message.toLowerCase();

        if (
          normalized.includes('already registered') ||
          normalized.includes('already exists')
        ) {
          Alert.alert(
            'Already Registered',
            'An account with this email already exists. Would you like to log in instead?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Login', onPress: () => router.replace('/provider-login' as any) }
            ]
          );
          return;
        }

        Alert.alert('Signup Failed', message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  const SuccessOverlay = () => {
    if (!showSuccess) return null;
    const AnimatedView = Animated.View as any;
    return (
      <Modal transparent visible={showSuccess}>
        <View style={styles.successContainer}>
          <AnimatedView style={[styles.successCard, { opacity: successAnim, transform: [{ scale: successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={60} color="#FFF" />
            </View>
            <Text style={styles.successTitle}>Verified!</Text>
            <Text style={styles.successSubtitle}>Welcome to ServEase. Your provider journey starts now.</Text>
          </AnimatedView>
        </View>
      </Modal>
    );
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Enter your personal information to start your provider journey.</Text>
      </View>
      
      <View style={styles.form}>
        <AppTextInput
          label="Full Name"
          placeholder="e.g. John Doe"
          value={formData.fullName}
          onChangeText={(text) => setFormData({...formData, fullName: text})}
          leftIcon="person-outline"
        />

        <AppTextInput
          label="Email Address"
          placeholder="email@example.com"
          value={formData.email}
          onChangeText={(text) => setFormData({...formData, email: text})}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail-outline"
        />

        <AppTextInput
          label="Contact Number"
          placeholder="912 345 6789"
          value={formData.phone}
          onChangeText={(text) => setFormData({...formData, phone: text.replace(/\D/g, '').slice(0, 10)})}
          keyboardType="phone-pad"
          leftIcon="call-outline"
          maxLength={10}
        />

        <AppTextInput
          label="Date of Birth"
          placeholder="MM / DD / YYYY"
          value={formData.dob}
          onChangeText={handleDobChange}
          keyboardType="numeric"
          maxLength={10}
          leftIcon="calendar-outline"
        />

        <AppTextInput
          label="Password"
          placeholder="Create a strong password"
          value={formData.password}
          onChangeText={(text) => setFormData({...formData, password: text})}
          isPassword
          leftIcon="lock-closed-outline"
        />

        <View style={styles.criteriaContainer}>
          <Text style={styles.criteriaHeader}>Password Requirements</Text>
          <View style={styles.criteriaGrid}>
            <CheckItem label="8+ characters" met={passwordCriteria.length} />
            <CheckItem label="Uppercase" met={passwordCriteria.uppercase} />
            <CheckItem label="Lowercase" met={passwordCriteria.lowercase} />
            <CheckItem label="Number" met={passwordCriteria.number} />
            <CheckItem label="Special char" met={passwordCriteria.specialChar} />
          </View>
        </View>

        <AppTextInput
          label="Confirm Password"
          placeholder="Repeat your password"
          value={formData.confirmPassword}
          onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
          isPassword
          leftIcon="lock-closed-outline"
        />
      </View>
    </View>
  );

  const renderStep2 = () => {
    const currentSubCategories = formData.primaryCategory ? subCategories[formData.primaryCategory] || [] : [];
    
    return (
      <View style={styles.stepContent}>
        <View style={styles.stepHeader}>
          <Text style={styles.title}>Service Profile</Text>
          <Text style={styles.subtitle}>Tell us about your expertise and what you offer.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Primary Category</Text>
            <AppPressable 
              style={styles.pickerButton} 
              onPress={() => setShowPrimaryDropdown(true)}
            >
              <Text style={[styles.pickerText, !formData.primaryCategory && { color: '#94A3B8' }]}>
                {formData.primaryCategory || "Select Category"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </AppPressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Sub-category</Text>
            <AppPressable 
              style={[styles.pickerButton, !formData.primaryCategory && styles.pickerButtonDisabled]} 
              onPress={() => formData.primaryCategory && setShowSubDropdown(true)}
              disabled={!formData.primaryCategory}
            >
              <Text style={[styles.pickerText, !formData.subCategory && { color: '#94A3B8' }]}>
                {formData.subCategory || "Select Sub-category"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </AppPressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Experience Level</Text>
            <AppPressable 
              style={styles.pickerButton} 
              onPress={() => setShowExpDropdown(true)}
            >
              <Text style={[styles.pickerText, !formData.experienceLevel && { color: '#94A3B8' }]}>
                {formData.experienceLevel || "Select Level"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </AppPressable>
          </View>
        </View>

        {/* Categories Modal */}
        <Modal visible={showPrimaryDropdown} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Category</Text>
                <AppPressable onPress={() => setShowPrimaryDropdown(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </AppPressable>
              </View>
              <ScrollView>
                {categories.map((cat) => (
                  <AppPressable 
                    key={cat} 
                    style={[styles.modalOption, formData.primaryCategory === cat && styles.modalOptionSelected]} 
                    onPress={() => { setFormData({...formData, primaryCategory: cat, subCategory: ''}); setShowPrimaryDropdown(false); }}
                  >
                    <Text style={[styles.modalOptionText, formData.primaryCategory === cat && styles.modalOptionTextSelected]}>{cat}</Text>
                    {formData.primaryCategory === cat && <Ionicons name="checkmark" size={20} color={TOKENS.colors.primary} />}
                  </AppPressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Sub-categories Modal */}
        <Modal visible={showSubDropdown} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Sub-category</Text>
                <AppPressable onPress={() => setShowSubDropdown(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </AppPressable>
              </View>
              <ScrollView>
                {currentSubCategories.map((sub) => (
                  <AppPressable 
                    key={sub} 
                    style={[styles.modalOption, formData.subCategory === sub && styles.modalOptionSelected]} 
                    onPress={() => { setFormData({...formData, subCategory: sub}); setShowSubDropdown(false); }}
                  >
                    <Text style={[styles.modalOptionText, formData.subCategory === sub && styles.modalOptionTextSelected]}>{sub}</Text>
                    {formData.subCategory === sub && <Ionicons name="checkmark" size={20} color={TOKENS.colors.primary} />}
                  </AppPressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Experience Modal */}
        <Modal visible={showExpDropdown} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Experience Level</Text>
                <AppPressable onPress={() => setShowExpDropdown(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </AppPressable>
              </View>
              <ScrollView>
                {expLevels.map((lvl) => (
                  <AppPressable 
                    key={lvl} 
                    style={[styles.modalOption, formData.experienceLevel === lvl && styles.modalOptionSelected]} 
                    onPress={() => { setFormData({...formData, experienceLevel: lvl}); setShowExpDropdown(false); }}
                  >
                    <Text style={[styles.modalOptionText, formData.experienceLevel === lvl && styles.modalOptionTextSelected]}>{lvl}</Text>
                    {formData.experienceLevel === lvl && <Ionicons name="checkmark" size={20} color={TOKENS.colors.primary} />}
                  </AppPressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.title}>Your Address</Text>
        <Text style={styles.subtitle}>Where do you provide your services?</Text>
      </View>
      <View style={styles.form}>
        <AppTextInput label="Street Address" placeholder="e.g. 123 Main St" value={formData.streetAddress} onChangeText={(text) => setFormData({...formData, streetAddress: text})} />
        <AppTextInput label="Province" placeholder="e.g. Metro Manila" value={formData.province} onChangeText={(text) => setFormData({...formData, province: text})} />
        <View style={styles.row}>
          <View style={{ flex: 1.5, marginRight: 12 }}>
            <AppTextInput label="City" placeholder="City" value={formData.city} onChangeText={(text) => setFormData({...formData, city: text})} />
          </View>
          <View style={{ flex: 1 }}>
            <AppTextInput label="Zip Code" placeholder="Zip" value={formData.zipCode} onChangeText={(text) => setFormData({...formData, zipCode: text})} keyboardType="numeric" maxLength={4} />
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.title}>Verify Identity</Text>
        <Text style={styles.subtitle}>Upload a valid ID for security verification.</Text>
      </View>
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>ID Type</Text>
          <AppPressable
            style={styles.pickerButton}
            onPress={() => setShowIdDropdown(true)}
          >
            <Text style={[styles.pickerText, !formData.idType && { color: '#94A3B8' }]}>
              {formData.idType || 'Select ID Type'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748B" />
          </AppPressable>
        </View>

        <View style={styles.idTypesHeader}>
          <Text style={styles.idTypesTitle}>Accepted IDs:</Text>
          <Text style={styles.idTypesSubtitle}>UMID, Driver&apos;s License, Passport, PhilID</Text>
        </View>
        
        <AppPressable 
          style={[styles.uploadCard, formData.idDocument && styles.uploadCardActive]} 
          onPress={() => handlePicker()}
        >
          {formData.idDocument ? (
            <View style={styles.uploadCardContent}>
              <View style={styles.successBadge}>
                <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              </View>
              <Text style={styles.uploadCardTitle}>ID Uploaded Successfully</Text>
              <Text style={styles.uploadCardSubtitle}>Tap to replace with another photo</Text>
            </View>
          ) : (
            <View style={styles.uploadCardContent}>
              <View style={styles.uploadIconCircle}>
                <Ionicons name="cloud-upload-outline" size={32} color={TOKENS.colors.primary} />
              </View>
              <Text style={styles.uploadCardTitle}>Upload ID Photo</Text>
              <Text style={styles.uploadCardSubtitle}>Maximum file size: 5MB (JPG, PNG)</Text>
            </View>
          )}
        </AppPressable>

        <Modal visible={showIdDropdown} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose ID Type</Text>
                <AppPressable onPress={() => setShowIdDropdown(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </AppPressable>
              </View>
              <ScrollView>
                {idTypes.map((idType) => (
                  <AppPressable
                    key={idType}
                    style={[styles.modalOption, formData.idType === idType && styles.modalOptionSelected]}
                    onPress={() => {
                      setFormData({ ...formData, idType });
                      setShowIdDropdown(false);
                    }}
                  >
                    <Text style={[styles.modalOptionText, formData.idType === idType && styles.modalOptionTextSelected]}>
                      {idType}
                    </Text>
                    {formData.idType === idType && <Ionicons name="checkmark" size={20} color={TOKENS.colors.primary} />}
                  </AppPressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.title}>Verification</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code sent to your email address.</Text>
      </View>
      <View style={styles.form}>
        <View style={styles.otpContainer}>
          {formData.otp.map((digit, i) => (
            <TextInput 
              key={i} 
              ref={(ref) => { otpRefs.current[i] = ref; }}
              style={[styles.otpInput, formData.otp[i] !== "" && styles.otpInputActive]} 
              maxLength={1} 
              keyboardType="numeric" 
              value={digit}
              onChangeText={(text: string) => {
                const newOtp = [...formData.otp];
                newOtp[i] = text;
                setFormData({ ...formData, otp: newOtp });
                if (text && i < 5) {
                  otpRefs.current[i + 1]?.focus();
                }
              }}
              onKeyPress={({ nativeEvent }: any) => {
                if (nativeEvent.key === 'Backspace' && !formData.otp[i] && i > 0) {
                  otpRefs.current[i - 1]?.focus();
                }
              }}
            />
          ))}
        </View>
        <AppPressable style={styles.resendButton}>
          <Text style={styles.resendText}>Didn&apos;t receive a code? <Text style={styles.resendAction}>Resend</Text></Text>
        </AppPressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <SuccessOverlay />
      
      <View style={styles.absoluteProgressBar}>
        <View style={[styles.progressFill, { width: `${(step / 5) * 100}%` }]} />
      </View>

      <View style={styles.header}>
        <AppPressable onPress={handlePrevStep} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#1E293B" />
        </AppPressable>
        <Text style={styles.stepText}>Step {step} of 5</Text>
      </View>
      
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </ScrollView>

      <View style={styles.footer}>
        <AppButton 
          label={step === 5 ? "Complete Registration" : "Continue"} 
          onPress={handleNextStep} 
          isLoading={isSubmitting} 
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { 
    paddingHorizontal: 20, 
    paddingTop: 24,
    paddingBottom: 16,
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  absoluteProgressBar: { 
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4, 
    backgroundColor: '#F1F5F9', 
    zIndex: 10,
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: TOKENS.colors.primary,
    borderBottomRightRadius: 2,
    borderTopRightRadius: 2,
  },
  stepText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  stepContent: { flex: 1 },
  stepHeader: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '900', color: '#1E293B', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#64748B', marginBottom: 8, lineHeight: 24 },
  form: { gap: 20 },
  criteriaContainer: { 
    backgroundColor: '#F8FAFC', 
    padding: 16, 
    borderRadius: 20, 
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  criteriaHeader: { 
    fontSize: 12, 
    fontWeight: '800', 
    color: '#94A3B8', 
    textTransform: 'uppercase', 
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4
  },
  criteriaGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12 
  },
  criteriaItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    minWidth: '45%'
  },
  criteriaText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  criteriaTextMet: { color: '#0F172A', fontWeight: '600' },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginLeft: 4 },
  required: { color: '#EF4444' },
  pickerButton: { 
    height: 56, 
    backgroundColor: '#F8FAFC', 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    borderWidth: 2, 
    borderColor: 'transparent' 
  },
  pickerButtonDisabled: { opacity: 0.5 },
  pickerText: { fontSize: 15, color: '#1E293B', fontWeight: '500' },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.5)', 
    justifyContent: 'flex-end' 
  },
  modalCard: { 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    paddingTop: 24, 
    paddingBottom: 40,
    maxHeight: '80%'
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    marginBottom: 20 
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  modalOption: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8
  },
  modalOptionSelected: { backgroundColor: '#F0FDF4' },
  modalOptionText: { fontSize: 16, color: '#475569', fontWeight: '500' },
  modalOptionTextSelected: { color: '#0F172A', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  idTypesHeader: { marginBottom: 4, marginLeft: 4 },
  idTypesTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  idTypesSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  uploadCard: { 
    height: 200, 
    borderRadius: 24, 
    borderWidth: 2, 
    borderColor: '#E2E8F0', 
    borderStyle: 'dashed', 
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  uploadCardActive: { 
    borderColor: '#10B981', 
    backgroundColor: '#F0FDF4',
    borderStyle: 'solid'
  },
  uploadCardContent: { alignItems: 'center', gap: 12 },
  uploadIconCircle: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: '#F0FDF4', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  uploadCardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  uploadCardSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center' },
  successBadge: { marginBottom: 4 },
  footer: { padding: 24, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#FFF' },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  otpInput: { 
    width: 48, 
    height: 64, 
    borderWidth: 2, 
    borderColor: '#E2E8F0', 
    borderRadius: 16, 
    textAlign: 'center', 
    fontSize: 24, 
    fontWeight: '800',
    backgroundColor: '#F8FAFC',
    color: '#1E293B'
  },
  otpInputActive: { 
    borderColor: TOKENS.colors.primary, 
    backgroundColor: '#FFF' 
  },
  resendButton: { marginTop: 12, alignItems: 'center' },
  resendText: { fontSize: 14, color: '#64748B' },
  resendAction: { color: TOKENS.colors.primary, fontWeight: '700' },
  successContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.8)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24 
  },
  successCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 36, 
    padding: 40, 
    alignItems: 'center', 
    width: '100%', 
    maxWidth: 400,
    ...TOKENS.shadows.glow
  },
  successIconCircle: { 
    width: 110, 
    height: 110, 
    borderRadius: 55, 
    backgroundColor: '#10B981', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 32,
    ...TOKENS.shadows.soft
  },
  successTitle: { fontSize: 32, fontWeight: '900', color: '#1E293B', marginBottom: 12 },
  successSubtitle: { fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 26, fontWeight: '500' },
  uploadedPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#ECFDF5', borderRadius: 12, marginTop: 10 },
  uploadedText: { color: '#059669', fontWeight: '600' }
});
