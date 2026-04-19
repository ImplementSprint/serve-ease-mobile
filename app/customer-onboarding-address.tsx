import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  savePendingCustomerAddress,
  useCustomerSession,
} from '@/lib/customer-session';

const PRESET_LABELS = ['Home', 'Work', 'Other'] as const;
const PSGC_BASE_URL = 'https://psgc.cloud';
const NCR_CODE = 'NCR';
const NCR_LABEL = 'Metro Manila';

type ProvinceOption = {
  code: string;
  name: string;
};

type CityOption = {
  code: string;
  name: string;
};

const NCR_CITIES: CityOption[] = [
  { code: 'manila', name: 'Manila' },
  { code: 'quezon-city', name: 'Quezon City' },
  { code: 'makati', name: 'Makati City' },
  { code: 'taguig', name: 'Taguig City' },
  { code: 'pasig', name: 'Pasig City' },
  { code: 'mandaluyong', name: 'Mandaluyong City' },
  { code: 'marikina', name: 'Marikina City' },
  { code: 'pasay', name: 'Pasay City' },
  { code: 'paranaque', name: 'Paranaque City' },
  { code: 'las-pinas', name: 'Las Pinas City' },
  { code: 'muntinlupa', name: 'Muntinlupa City' },
  { code: 'san-juan', name: 'San Juan City' },
  { code: 'caloocan', name: 'Caloocan City' },
  { code: 'malabon', name: 'Malabon City' },
  { code: 'navotas', name: 'Navotas City' },
  { code: 'valenzuela', name: 'Valenzuela City' },
  { code: 'pateros', name: 'Pateros' },
];

const FALLBACK_PROVINCES: ProvinceOption[] = [
  { code: NCR_CODE, name: NCR_LABEL },
  { code: '0128', name: 'Ilocos Norte' },
  { code: '0133', name: 'Ilocos Sur' },
  { code: '0155', name: 'La Union' },
  { code: '0231', name: 'Cavite' },
  { code: '0349', name: 'Bulacan' },
  { code: '0421', name: 'Cebu' },
  { code: '0434', name: 'Laguna' },
  { code: '0458', name: 'Rizal' },
  { code: '1124', name: 'Davao del Sur' },
];

type PickerType = 'province' | 'city' | null;

export default function CustomerOnboardingAddressScreen() {
  const router = useRouter();
  const { pendingCustomer } = useCustomerSession();

  const existingAddress = pendingCustomer?.address;
  const [label, setLabel] = useState(existingAddress?.label ?? 'Home');
  const [showCustomLabel, setShowCustomLabel] = useState(
    existingAddress?.label ? !PRESET_LABELS.includes(existingAddress.label as any) : false
  );
  const [streetAddress, setStreetAddress] = useState(existingAddress?.streetAddress ?? '');
  const [barangay, setBarangay] = useState(existingAddress?.barangay ?? '');
  const [province, setProvince] = useState(existingAddress?.province ?? '');
  const [city, setCity] = useState(existingAddress?.city ?? '');
  const [postalCode, setPostalCode] = useState(existingAddress?.postalCode ?? '');
  const [locationNote, setLocationNote] = useState(existingAddress?.locationNote ?? 'Select your location');
  const [isDefault, setIsDefault] = useState(existingAddress?.isDefault ?? true);
  const [activePicker, setActivePicker] = useState<PickerType>(null);
  const [provinceOptions, setProvinceOptions] = useState<ProvinceOption[]>(FALLBACK_PROVINCES);
  const [cityOptions, setCityOptions] = useState<CityOption[]>(
    existingAddress?.province === NCR_LABEL && existingAddress?.city
      ? NCR_CITIES
      : []
  );
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  const selectedProvince = useMemo(
    () => provinceOptions.find((item) => item.name === province) ?? null,
    [province, provinceOptions]
  );
  const isReady =
    label.trim().length > 0 &&
    streetAddress.trim().length > 0 &&
    barangay.trim().length > 0 &&
    province.trim().length > 0 &&
    city.trim().length > 0 &&
    postalCode.trim().length > 0;

  useEffect(() => {
    let isMounted = true;

    async function loadProvinces() {
      setIsLoadingProvinces(true);
      try {
        const response = await fetch(`${PSGC_BASE_URL}/api/provinces`);
        const data: ProvinceOption[] = await response.json();

        if (!isMounted || !Array.isArray(data)) {
          return;
        }

        const normalized = data
          .filter((item) => item?.name && item?.code)
          .map((item) => ({ code: item.code, name: item.name }))
          .sort((left, right) => left.name.localeCompare(right.name));

        setProvinceOptions([{ code: NCR_CODE, name: NCR_LABEL }, ...normalized]);
      } catch {
        if (isMounted) {
          setProvinceOptions(FALLBACK_PROVINCES);
        }
      } finally {
        if (isMounted) {
          setIsLoadingProvinces(false);
        }
      }
    }

    loadProvinces();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCities() {
      if (!selectedProvince) {
        setCityOptions([]);
        return;
      }

      if (selectedProvince.code === NCR_CODE) {
        setCityOptions(NCR_CITIES);
        return;
      }

      setIsLoadingCities(true);
      try {
        const [citiesResponse, municipalitiesResponse] = await Promise.all([
          fetch(`${PSGC_BASE_URL}/api/cities`),
          fetch(`${PSGC_BASE_URL}/api/municipalities`),
        ]);
        const [citiesData, municipalitiesData]: [CityOption[], CityOption[]] = await Promise.all([
          citiesResponse.json(),
          municipalitiesResponse.json(),
        ]);

        if (!isMounted || !Array.isArray(citiesData) || !Array.isArray(municipalitiesData)) {
          return;
        }

        const provincePrefix = selectedProvince.code.slice(0, 5);
        const normalized = [...citiesData, ...municipalitiesData]
          .filter((item) => item?.code?.startsWith(provincePrefix))
          .filter((item) => item?.name && item?.code)
          .map((item) => ({ code: item.code, name: item.name }))
          .sort((left, right) => left.name.localeCompare(right.name));

        setCityOptions(normalized);
      } catch {
        if (isMounted) {
          setCityOptions([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingCities(false);
        }
      }
    }

    loadCities();

    return () => {
      isMounted = false;
    };
  }, [selectedProvince]);

  const handleContinue = async () => {
    if (!isReady) {
      Alert.alert('Missing details', 'Please complete the full address before continuing.');
      return;
    }

    await savePendingCustomerAddress({
      label,
      streetAddress: streetAddress.trim(),
      barangay: barangay.trim(),
      province: province.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      locationNote: locationNote.trim(),
      isDefault,
    });
    router.replace('/customer-login' as any);
  };

  const renderPicker = () => {
    const isProvincePicker = activePicker === 'province';
    const options = isProvincePicker ? provinceOptions : cityOptions;
    const selectedValue = isProvincePicker ? province : city;

    return (
      <Modal visible={Boolean(activePicker)} animationType="fade" transparent onRequestClose={() => setActivePicker(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActivePicker(null)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isProvincePicker ? 'Select Province' : 'Select City'}</Text>
              <TouchableOpacity onPress={() => setActivePicker(null)}>
                <Ionicons name="close" size={22} color="#162033" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.code}
                  style={styles.modalOption}
                  onPress={() => {
                    if (isProvincePicker) {
                      setProvince(option.name);
                      setCity('');
                    } else {
                      setCity(option.name);
                    }
                    setActivePicker(null);
                  }}
                >
                  <Text style={[styles.modalOptionText, option.name === selectedValue && styles.modalOptionTextActive]}>
                    {option.name}
                  </Text>
                  {option.name === selectedValue ? (
                    <Ionicons name="checkmark-circle" size={22} color="#00B761" />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.card}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backIconButton} onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))}>
            <Ionicons name="arrow-back" size={24} color="#162033" />
          </TouchableOpacity>
          <Text style={styles.logo}>ServEase</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.progressRow}>
          <View style={[styles.progressLine, styles.progressLineActive]} />
        </View>
        <Text style={styles.stepText}>Complete Your Setup</Text>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Add Your Address</Text>
            <Text style={styles.subtitle}>
              We&apos;ll use this to find the best service providers near you
            </Text>

            <Text style={styles.labelTitle}>Address Label</Text>
            <View style={styles.labelRow}>
              {PRESET_LABELS.map((item) => {
                const isActive = item === 'Other'
                  ? showCustomLabel
                  : !showCustomLabel && label === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.labelChip, isActive && styles.labelChipActive]}
                    onPress={() => {
                      if (item === 'Other') {
                        setShowCustomLabel(true);
                        setLabel('');
                      } else {
                        setShowCustomLabel(false);
                        setLabel(item);
                      }
                    }}
                  >
                    <Text style={[styles.labelChipText, isActive && styles.labelChipTextActive]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {showCustomLabel && (
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                placeholder="e.g., Mom's House, My Condo"
                placeholderTextColor="#A8AFBC"
                value={label}
                onChangeText={setLabel}
                autoFocus
              />
            )}

            <Text style={styles.fieldLabel}>Street Address <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 123 Main Street, Building Name, Unit #"
              placeholderTextColor="#A8AFBC"
              value={streetAddress}
              onChangeText={setStreetAddress}
            />

            <Text style={styles.fieldLabel}>Barangay <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Barangay Centro"
              placeholderTextColor="#A8AFBC"
              value={barangay}
              onChangeText={setBarangay}
            />

            <Text style={styles.fieldLabel}>Province <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity style={styles.selectInput} onPress={() => setActivePicker('province')}>
              <Text style={[styles.selectInputText, !province && styles.placeholderText]}>
                {province || (isLoadingProvinces ? 'Loading provinces...' : 'Select Province')}
              </Text>
              <Ionicons name="chevron-down" size={22} color="#162033" />
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>City <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={[styles.selectInput, !province && styles.selectInputDisabled]}
              onPress={() => province && setActivePicker('city')}
              disabled={!province}
            >
              <Text style={[styles.selectInputText, !city && styles.placeholderText]}>
                {city || (isLoadingCities ? 'Loading cities...' : 'Select City / Municipality')}
              </Text>
              <Ionicons name="chevron-down" size={22} color={province ? '#162033' : '#B7BEC9'} />
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Postal Code <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 1200"
              placeholderTextColor="#A8AFBC"
              value={postalCode}
              onChangeText={setPostalCode}
              keyboardType="number-pad"
            />

            <Text style={styles.labelTitle}>Location on Map</Text>
            <TouchableOpacity
              style={styles.mapCard}
              activeOpacity={0.85}
              onPress={() => setLocationNote('Pinned near your selected service area')}
            >
              <View style={styles.mapPin}>
                <Ionicons name="location" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.mapText}>{locationNote}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setLocationNote('Using current location')}
              activeOpacity={0.85}
            >
              <Ionicons name="locate-outline" size={20} color="#00B761" />
              <Text style={styles.secondaryButtonText}>Use Current Location</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.defaultRow} onPress={() => setIsDefault((value) => !value)} activeOpacity={0.8}>
              <View style={[styles.defaultCheck, !isDefault && styles.defaultCheckInactive]}>
                {isDefault ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
              </View>
              <Text style={styles.defaultText}>Set as default address</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.primaryButton, !isReady && styles.primaryButtonDisabled]}
              onPress={() => {
                void handleContinue();
              }}
              disabled={!isReady}
            >
              <Text style={[styles.primaryButtonText, !isReady && styles.primaryButtonTextDisabled]}>
                Continue to Login
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>

      {renderPicker()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    padding: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
  },
  backIconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  logo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#162033',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
  },
  progressLine: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  progressLineActive: {
    backgroundColor: '#00C853',
  },
  stepText: {
    alignSelf: 'center',
    marginTop: 10,
    color: '#42454D',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 170,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: '#162033',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 28,
    color: '#4B5563',
    marginBottom: 28,
  },
  labelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#162033',
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  labelChip: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.25,
    borderColor: '#D7DDE7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  labelChipActive: {
    borderColor: '#00C853',
    backgroundColor: '#F0FFF4',
  },
  labelChipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555B66',
  },
  labelChipTextActive: {
    color: '#00B761',
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#162033',
    marginBottom: 10,
    marginTop: 10,
  },
  required: {
    color: '#FF5757',
  },
  input: {
    height: 60,
    borderRadius: 14,
    borderWidth: 1.25,
    borderColor: '#D7DDE7',
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#162033',
    backgroundColor: '#FFFFFF',
  },
  selectInput: {
    height: 60,
    borderRadius: 14,
    borderWidth: 1.25,
    borderColor: '#D7DDE7',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectInputDisabled: {
    backgroundColor: '#F5F7FB',
  },
  selectInputText: {
    fontSize: 17,
    color: '#162033',
  },
  placeholderText: {
    color: '#A8AFBC',
  },
  mapCard: {
    height: 170,
    borderRadius: 18,
    backgroundColor: '#F4FBF7',
    borderWidth: 1,
    borderColor: '#DCEFE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  mapPin: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00C853',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  mapText: {
    fontSize: 16,
    color: '#4B5563',
  },
  secondaryButton: {
    marginTop: 18,
    height: 60,
    borderWidth: 2,
    borderColor: '#00C853',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00B761',
  },
  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
  },
  defaultCheck: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#00C853',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  defaultCheckInactive: {
    backgroundColor: '#D7DDE7',
  },
  defaultText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#162033',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F5',
  },
  primaryButton: {
    backgroundColor: '#00C853',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#E1E5EB',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  primaryButtonTextDisabled: {
    color: '#9EA6B2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#162033',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F5',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#162033',
  },
  modalOptionTextActive: {
    color: '#00B761',
    fontWeight: '700',
  },
});

