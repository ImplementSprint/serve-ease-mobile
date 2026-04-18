import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar, 
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { updateAddress, deleteAddress } from '@/services/addressService';
import { getErrorMessage } from '@/lib/error-handling';

export default function EditAddressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  // Form State
  const [label, setLabel] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [addressId, setAddressId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (params.address) {
      try {
        const parsed = JSON.parse(params.address as string);
        setAddressId(parsed.id || parsed.address_id || '');
        setLabel(parsed.label || 'Home');
        setAddressLine1(parsed.street_address || parsed.street || '');
        const line2 = [parsed.city, parsed.province, parsed.zip_code || parsed.postal_code].filter(Boolean).join(', ');
        setAddressLine2(line2);
      } catch (e) {
        console.error('Failed to parse address params', e);
      }
    }
  }, [params.address]);

  const handleSaveAddress = async () => {
    if (!addressLine1 || !addressLine2) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }

    setIsSaving(true);
    try {
      const parts = addressLine2.split(',').map(p => p.trim());
      const city = parts[0] || '';
      const province = parts[1] || '';
      const zip_code = parts[2] || '';

      await updateAddress(addressId, {
        label: label.trim() || 'Home',
        street_address: addressLine1,
        city,
        province,
        zip_code
      });

      if (router.canGoBack?.()) router.back(); else router.replace('/' as any);
    } catch (error: any) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to update address.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = () => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              await deleteAddress(addressId);
              if (router.canGoBack?.()) router.back(); else router.replace('/' as any);
            } catch (error: any) {
              Alert.alert('Error', getErrorMessage(error, 'Failed to delete address.'));
            } finally {
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Address</Text>
        <TouchableOpacity onPress={handleDeleteAddress} style={styles.deleteButtonHeader} disabled={isSaving}>
           <Ionicons name="trash-outline" size={24} color={isSaving ? "#999" : "#FF3B30"} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.scrollContainer} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Location Label */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Save As (Label) <Text style={styles.requiredAsterisk}>*</Text></Text>
            <View style={styles.chipContainer}>
              {['Home', 'Work', 'Gym'].map((item) => (
                <TouchableOpacity 
                  key={item}
                  style={[styles.chip, label === item && styles.activeChip]}
                  onPress={() => setLabel(item)}
                >
                  <Text style={[styles.chipText, label === item && styles.activeChipText]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.textInput, { marginTop: 12 }]}
              placeholder="Or type a custom label (e.g. Mom's House)"
              placeholderTextColor="#8E8E93"
              value={label}
              onChangeText={setLabel}
            />
          </View>

          {/* Form Fields */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Street Address / Landmark <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 123 Mabini Street"
              placeholderTextColor="#8E8E93"
              value={addressLine1}
              onChangeText={setAddressLine1}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>City, Province, ZIP Code <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Quezon City, Metro Manila, 1100"
              placeholderTextColor="#8E8E93"
              value={addressLine2}
              onChangeText={setAddressLine2}
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && { opacity: 0.7 }]} 
          onPress={handleSaveAddress}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A', flex: 1, marginLeft: 8 },
  deleteButtonHeader: { padding: 8 },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 20 },
  fieldContainer: { marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#0D1B2A', marginBottom: 8 },
  requiredAsterisk: { color: '#FF5252' },
  textInput: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 16, height: 52, fontSize: 15, color: '#0D1B2A',
  },
  bottomContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, borderTopWidth: 1,
    borderTopColor: '#F0F0F0', shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 10,
  },
  saveButton: {
    backgroundColor: '#00B761', borderRadius: 12, height: 52,
    justifyContent: 'center', alignItems: 'center', shadowColor: '#00B761',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
    elevation: 4, width: '100%',
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  activeChip: {
    backgroundColor: '#00B761',
    borderColor: '#00B761',
  },
  chipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  activeChipText: {
    color: '#FFF',
  },
});

