import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import { getAvatarUrl, pickAndUploadAvatar } from '@/lib/avatar';
import { getProfile as getUserProfile, updateProfile as updateUserProfile } from '@/services/profileService';
import {
  getActiveServiceCategories,
  getMyProviderServices,
} from '@/services/providerCatalogService';
import {
  getProviderProfileDraft,
  saveProviderProfileDraft,
} from '@/services/providerProfileService';

const formatTagInput = (values: string[]) => values.join(', ');

const SectionHeader = ({ title }: { title: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const ReadonlyChip = ({ label }: { label: string }) => (
  <View style={styles.readonlyChip}>
    <Text style={styles.readonlyChipText}>{label}</Text>
  </View>
);

export default function ProviderEditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [serviceAreasText, setServiceAreasText] = useState('');
  const [languagesText, setLanguagesText] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setAvatarUri(`${getAvatarUrl(user.id)}?t=${Date.now()}`);

      try {
        const [userResp, profileResp, servicesResp, categoryRows] = await Promise.all([
          getUserProfile(user.id),
          getProviderProfileDraft(user.id),
          getMyProviderServices(),
          getActiveServiceCategories(),
        ]);

        if (!mounted) return;

        const userData = userResp;
        const profile = profileResp;
        const services = servicesResp;
        const categoryMap = new Map(
          categoryRows.map((row) => [String(row.id), String(row.name)]),
        );

        setFullName(userData?.full_name || '');
        setBusinessName(profile?.business_name || '');
        setBio(profile?.bio || profile?.service_description || '');
        setServiceAreasText(formatTagInput(profile?.service_areas || []));
        setLanguagesText(formatTagInput(profile?.languages || []));
        setYearsExperience(String(profile?.years_experience ?? ''));
        setFacebookUrl(profile?.facebook_url || '');
        setInstagramHandle(profile?.instagram_handle || '');
        setWebsiteUrl(profile?.website_url || '');

        const cats = (services || [])
          .map((s: any) => categoryMap.get(String(s.category_id || '')))
          .filter(Boolean);
        setServiceCategories([...new Set(cats)] as string[]);
      } catch (err) {
        if (mounted) {
          console.error('[ProviderProfile] Load error:', err);
          Alert.alert('Error', getErrorMessage(err, 'Failed to load profile details.'));
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void load();
    return () => { mounted = false; };
  }, [user?.id]);

  const handlePickAvatar = async () => {
    if (!user) return;
    const url = await pickAndUploadAvatar(user.id);
    if (url) {
      setAvatarUri(url);
    }
  };

  const onSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      await updateUserProfile(user.id, { full_name: fullName.trim() });
      await saveProviderProfileDraft(user.id, {
        business_name: businessName.trim(),
        service_description: bio.trim(),
      });

      // MODIFIED: Removed router.back() so user stays on this page
      Alert.alert('Profile Updated', 'Your changes have been saved.', [
        { text: 'OK' }, 
      ]);
    } catch (err) {
      Alert.alert('Save Failed', getErrorMessage(err, 'Could not save provider profile.'));
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="small" color="#00B761" />
          <Text style={styles.stateText}>Loading provider profile...</Text>
        </View>
      );
    }

    if (!user) {
      return (
        <View style={styles.stateWrap}>
          <Text style={styles.errorText}>You must be logged in to edit your profile.</Text>
        </View>
      );
    }

    return (
      <View style={styles.formContent}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} onError={() => setAvatarUri(null)} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{fullName.charAt(0).toUpperCase() || 'P'}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.cameraButton} onPress={handlePickAvatar}>
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <SectionHeader title="Basic Information" />
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Enter full name" />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business Name</Text>
          <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} placeholder="Enter business name" />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio / Description</Text>
          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textArea}
              value={bio}
              onChangeText={(text) => setBio(text.slice(0, 500))}
              placeholder="Describe your services..."
              multiline
              numberOfLines={4}
            />
            <Text style={styles.charCount}>{bio.length}/500</Text>
          </View>
        </View>

        <SectionHeader title="Professional Background" />
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Years of Experience</Text>
          <TextInput style={styles.input} value={yearsExperience} onChangeText={setYearsExperience} keyboardType="numeric" />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Service Areas (comma separated)</Text>
          <TextInput style={styles.input} value={serviceAreasText} onChangeText={setServiceAreasText} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Languages (comma separated)</Text>
          <TextInput style={styles.input} value={languagesText} onChangeText={setLanguagesText} />
        </View>

        <Text style={styles.label}>Service Categories</Text>
        <View style={styles.chipRow}>
          {serviceCategories.map((c) => <ReadonlyChip key={c} label={c} />)}
        </View>
        
        <SectionHeader title="Links" />
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Facebook</Text>
          <TextInput style={styles.input} value={facebookUrl} onChangeText={setFacebookUrl} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Instagram</Text>
          <TextInput style={styles.input} value={instagramHandle} onChangeText={setInstagramHandle} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Website</Text>
          <TextInput style={styles.input} value={websiteUrl} onChangeText={setWebsiteUrl} />
        </View>

        <TouchableOpacity 
          style={[styles.saveActionButton, isSaving && styles.saveActionButtonDisabled]} 
          onPress={() => void onSave()} 
          disabled={isSaving}
        >
          <Text style={styles.saveActionButtonText}>{isSaving ? 'Saving...' : 'Save Profile'}</Text>
        </TouchableOpacity>
        <View style={styles.footerSpacer} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {renderContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  headerButtonText: { fontSize: 15, color: '#8E8E93', fontWeight: '500' },
  saveText: { color: '#00B761', fontWeight: '700' },
  disabledText: { opacity: 0.5 },
  stateWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 20 },
  stateText: { color: '#64748B' },
  errorText: { color: '#C62828', paddingHorizontal: 20, paddingTop: 16 },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  formContent: { paddingHorizontal: 20 },
  avatarSection: { alignItems: 'center', marginTop: 24, marginBottom: 8 },
  avatarContainer: { position: 'relative' },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#00B761',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 40, fontWeight: 'bold', color: '#fff' },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00B761',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    marginTop: 28,
    marginBottom: 18,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F4',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8 },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 52,
    fontSize: 15,
    color: '#0D1B2A',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  textAreaContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  textArea: { fontSize: 15, color: '#0D1B2A', minHeight: 110, textAlignVertical: 'top' },
  charCount: { alignSelf: 'flex-end', marginTop: 8, fontSize: 12, color: '#8E8E93' },
  helperText: { marginTop: 8, fontSize: 12, color: '#8E8E93' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  readonlyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E8FBF2',
  },
  readonlyChipText: { color: '#00B761', fontWeight: '600', fontSize: 13 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  linkText: { color: '#00B761', fontWeight: '700' },
  saveActionButton: {
    marginTop: 20,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#00B761',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveActionButtonDisabled: { opacity: 0.6 },
  saveActionButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  footerSpacer: { height: 28 },
});
