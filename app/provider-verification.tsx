import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import {
  assessProviderVerification,
  formatVerificationLevelLabel,
  formatVerificationStatusLabel,
  getProviderVerificationDraft,
  saveProviderVerificationDraft,
} from '@/services/providerVerificationService';
import { getErrorMessage } from '@/lib/error-handling';

const EXPERIENCE_OPTIONS = ['Less than 1 year', '1-2 years', '3-5 years', '5-10 years', '10+ years'];
const ID_TYPES = ['PhilSys ID', 'Passport', "Driver's License", 'Postal ID', 'UMID'];

const splitTags = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const ProgressRow = ({ label, complete }: { label: string; complete: boolean }) => (
  <View style={styles.progressRow}>
    <Ionicons
      name={complete ? 'checkmark-circle' : 'ellipse-outline'}
      size={18}
      color={complete ? '#00B761' : '#94A3B8'}
    />
    <Text style={[styles.progressLabel, complete && styles.progressLabelComplete]}>{label}</Text>
  </View>
);

export default function ProviderVerificationScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [governmentIdType, setGovernmentIdType] = useState(ID_TYPES[0]);
  const [governmentIdNumber, setGovernmentIdNumber] = useState('');
  const [nbiClearanceNumber, setNbiClearanceNumber] = useState('');
  const [prcLicenseNumber, setPrcLicenseNumber] = useState('');
  const [businessPermitNumber, setBusinessPermitNumber] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [proofOfAddressNotes, setProofOfAddressNotes] = useState('');
  const [serviceAreasText, setServiceAreasText] = useState('');
  const [languagesText, setLanguagesText] = useState('English, Tagalog');
  const [yearsExperience, setYearsExperience] = useState(EXPERIENCE_OPTIONS[2]);
  const [portfolioSummary, setPortfolioSummary] = useState('');
  const [referenceContacts, setReferenceContacts] = useState('');
  const [hasInsurance, setHasInsurance] = useState(false);
  const [statusLabel, setStatusLabel] = useState('Not started');
  const [submittedAtLabel, setSubmittedAtLabel] = useState('');

  const formAssessment = useMemo(
    () =>
      assessProviderVerification({
        businessName,
        governmentIdType,
        governmentIdNumber,
        nbiClearanceNumber,
        prcLicenseNumber,
        businessPermitNumber,
        tinNumber,
        proofOfAddressNotes,
        serviceAreas: splitTags(serviceAreasText),
        languages: splitTags(languagesText),
        yearsExperience,
        portfolioSummary,
        referenceContacts,
        hasInsurance,
      }),
    [
      businessName,
      businessPermitNumber,
      governmentIdNumber,
      governmentIdType,
      hasInsurance,
      languagesText,
      nbiClearanceNumber,
      portfolioSummary,
      prcLicenseNumber,
      proofOfAddressNotes,
      referenceContacts,
      serviceAreasText,
      tinNumber,
      yearsExperience,
    ]
  );

  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;

      async function load() {
        if (!user?.id) {
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setError('');
        try {
          const draft = await getProviderVerificationDraft(user.id);
          if (!mounted) return;
          setBusinessName(draft.businessName);
          setGovernmentIdType(draft.governmentIdType || ID_TYPES[0]);
          setGovernmentIdNumber(draft.governmentIdNumber);
          setNbiClearanceNumber(draft.nbiClearanceNumber);
          setPrcLicenseNumber(draft.prcLicenseNumber);
          setBusinessPermitNumber(draft.businessPermitNumber);
          setTinNumber(draft.tinNumber);
          setProofOfAddressNotes(draft.proofOfAddressNotes);
          setServiceAreasText(draft.serviceAreas.join(', '));
          setLanguagesText(draft.languages.join(', ') || 'English, Tagalog');
          setYearsExperience(draft.yearsExperience || EXPERIENCE_OPTIONS[2]);
          setPortfolioSummary(draft.portfolioSummary);
          setReferenceContacts(draft.referenceContacts);
          setHasInsurance(draft.hasInsurance);
          setStatusLabel(formatVerificationStatusLabel(draft.status));
          setSubmittedAtLabel(
            draft.submittedAt
              ? new Date(draft.submittedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : ''
          );
        } catch (loadError) {
          if (mounted) setError(getErrorMessage(loadError, 'Failed to load verification profile.'));
        } finally {
          if (mounted) setIsLoading(false);
        }
      }

      void load();
      return () => {
        mounted = false;
      };
    }, [user?.id])
  );

  const persist = async (submit: boolean) => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please sign in again before editing verification details.');
      return;
    }

    if (!businessName.trim()) {
      Alert.alert('Business Name Required', 'Please enter your business or display name.');
      return;
    }

    if (submit && (!governmentIdNumber.trim() || !nbiClearanceNumber.trim())) {
      Alert.alert('Missing Requirements', 'Government ID and NBI clearance are required before submission.');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveProviderVerificationDraft(
        user.id,
        {
          businessName,
          governmentIdType,
          governmentIdNumber,
          nbiClearanceNumber,
          prcLicenseNumber,
          businessPermitNumber,
          tinNumber,
          proofOfAddressNotes,
          serviceAreas: splitTags(serviceAreasText),
          languages: splitTags(languagesText),
          yearsExperience,
          portfolioSummary,
          referenceContacts,
          hasInsurance,
        },
        { submit }
      );

      setStatusLabel(formatVerificationStatusLabel(saved.status));
      setSubmittedAtLabel(
        saved.submittedAt
          ? new Date(saved.submittedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : ''
      );

      Alert.alert(
        submit ? 'Verification Submitted' : 'Draft Saved',
        submit
          ? 'Your verification packet is now marked ready for review.'
          : 'Your verification details were saved.'
      );
    } catch (saveError) {
      Alert.alert('Save Failed', getErrorMessage(saveError, 'Could not save verification details.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile & Verification</Text>
      </View>

      {isLoading ? <ActivityIndicator size="large" color="#00B761" style={{ marginTop: 32 }} /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!isLoading ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>CURRENT STATUS</Text>
            <Text style={styles.heroTitle}>{statusLabel}</Text>
            <Text style={styles.heroSub}>Readiness score: {formAssessment.score}/100</Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{formatVerificationLevelLabel(formAssessment.verificationLevel)}</Text>
              </View>
              {submittedAtLabel ? (
                <Text style={styles.heroDate}>Submitted {submittedAtLabel}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Readiness Checklist</Text>
            <ProgressRow label="Government ID submitted" complete={Boolean(governmentIdNumber.trim())} />
            <ProgressRow label="NBI clearance entered" complete={Boolean(nbiClearanceNumber.trim())} />
            <ProgressRow label="Business permit or PRC details added" complete={Boolean(businessPermitNumber.trim() || prcLicenseNumber.trim())} />
            <ProgressRow label="Service coverage and languages defined" complete={splitTags(serviceAreasText).length > 0 && splitTags(languagesText).length > 0} />
            <ProgressRow label="Proof of work or references included" complete={Boolean(portfolioSummary.trim() || referenceContacts.trim())} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Identity</Text>
            <Text style={styles.label}>Business Name</Text>
            <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} placeholder="Juan's Home Services" />

            <Text style={styles.label}>Government ID Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {ID_TYPES.map((item) => {
                const active = governmentIdType === item;
                return (
                  <TouchableOpacity key={item} style={[styles.choiceChip, active && styles.choiceChipActive]} onPress={() => setGovernmentIdType(item)}>
                    <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Government ID Number</Text>
            <TextInput style={styles.input} value={governmentIdNumber} onChangeText={setGovernmentIdNumber} placeholder="Enter ID number" />

            <Text style={styles.label}>NBI Clearance Number</Text>
            <TextInput style={styles.input} value={nbiClearanceNumber} onChangeText={setNbiClearanceNumber} placeholder="Enter clearance number" />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Professional Credentials</Text>
            <Text style={styles.label}>PRC License Number (Optional)</Text>
            <TextInput style={styles.input} value={prcLicenseNumber} onChangeText={setPrcLicenseNumber} placeholder="If applicable" />

            <Text style={styles.label}>Business Permit Number</Text>
            <TextInput style={styles.input} value={businessPermitNumber} onChangeText={setBusinessPermitNumber} placeholder="DTI / Mayor's Permit reference" />

            <Text style={styles.label}>TIN</Text>
            <TextInput style={styles.input} value={tinNumber} onChangeText={setTinNumber} placeholder="BIR TIN" />

            <Text style={styles.label}>Years of Experience</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {EXPERIENCE_OPTIONS.map((option) => {
                const active = yearsExperience === option;
                return (
                  <TouchableOpacity key={option} style={[styles.choiceChip, active && styles.choiceChipActive]} onPress={() => setYearsExperience(option)}>
                    <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Operations & Coverage</Text>
            <Text style={styles.label}>Service Areas</Text>
            <TextInput
              style={styles.input}
              value={serviceAreasText}
              onChangeText={setServiceAreasText}
              placeholder="Makati, Pasig, Quezon City"
            />

            <Text style={styles.label}>Languages</Text>
            <TextInput
              style={styles.input}
              value={languagesText}
              onChangeText={setLanguagesText}
              placeholder="English, Tagalog"
            />

            <Text style={styles.label}>Proof of Address Notes</Text>
            <TextInput
              style={styles.textArea}
              value={proofOfAddressNotes}
              onChangeText={setProofOfAddressNotes}
              placeholder="Describe the address proof you will provide"
              multiline
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Trust Signals</Text>
            <Text style={styles.label}>Portfolio Summary</Text>
            <TextInput
              style={styles.textArea}
              value={portfolioSummary}
              onChangeText={setPortfolioSummary}
              placeholder="Describe projects, certifications, or before/after proof"
              multiline
            />

            <Text style={styles.label}>Reference Contacts</Text>
            <TextInput
              style={styles.textArea}
              value={referenceContacts}
              onChangeText={setReferenceContacts}
              placeholder="Add 2-3 references with contact context"
              multiline
            />

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchTitle}>Insured Provider</Text>
                <Text style={styles.switchHint}>Insurance helps unlock the premium verification tier.</Text>
              </View>
              <Switch value={hasInsurance} onValueChange={setHasInsurance} trackColor={{ false: '#D4DCE5', true: '#00B761' }} />
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.secondaryButton, isSaving && styles.buttonDisabled]} onPress={() => void persist(false)} disabled={isSaving}>
              <Text style={styles.secondaryButtonText}>{isSaving ? 'Saving...' : 'Save Draft'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryButton, isSaving && styles.buttonDisabled]} onPress={() => void persist(true)} disabled={isSaving}>
              <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Submit for Review'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  backButton: { padding: 8, marginRight: 6 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  content: { padding: 18, paddingBottom: 36, gap: 16 },
  heroCard: {
    backgroundColor: '#0D1B2A',
    borderRadius: 24,
    padding: 22,
  },
  heroEyebrow: { fontSize: 12, fontWeight: '700', color: '#9FB3C8', letterSpacing: 1 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#FFF', marginTop: 8 },
  heroSub: { fontSize: 14, color: '#D7E1EA', marginTop: 8 },
  heroMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 },
  heroPill: { backgroundColor: '#12324F', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  heroPillText: { color: '#AEE3C3', fontWeight: '700', fontSize: 12 },
  heroDate: { color: '#B8C6D3', fontSize: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 18 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0D1B2A', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0D1B2A', marginBottom: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  progressLabel: { fontSize: 14, color: '#52606D', flex: 1 },
  progressLabelComplete: { color: '#0D1B2A', fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: '#425466', marginBottom: 8, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#D8E1EA',
    borderRadius: 14,
    backgroundColor: '#FCFDFE',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#0D1B2A',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D8E1EA',
    borderRadius: 14,
    backgroundColor: '#FCFDFE',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#0D1B2A',
    minHeight: 92,
    textAlignVertical: 'top',
  },
  chipRow: { gap: 10, paddingVertical: 2 },
  choiceChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D8E1EA',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  choiceChipActive: {
    backgroundColor: '#E8FBF2',
    borderColor: '#00B761',
  },
  choiceChipText: { fontSize: 13, color: '#52606D', fontWeight: '600' },
  choiceChipTextActive: { color: '#007A42' },
  switchRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 14,
  },
  switchCopy: { flex: 1 },
  switchTitle: { fontSize: 14, fontWeight: '700', color: '#0D1B2A' },
  switchHint: { fontSize: 12, color: '#64748B', marginTop: 4 },
  footer: { gap: 10, marginTop: 6 },
  secondaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00B761',
    backgroundColor: '#FFF',
  },
  secondaryButtonText: { color: '#00B761', fontSize: 16, fontWeight: '700' },
  primaryButton: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B761',
  },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.7 },
  errorText: { color: '#C62828', paddingHorizontal: 18, marginTop: 18 },
});
