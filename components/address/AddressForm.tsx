import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  fetchProvinces, 
  fetchCities, 
  fetchBarangays, 
  ProvinceOption, 
  CityOption, 
  BarangayOption
} from '@/services/psgcService';

export type AddressFormData = {
  label: 'Home' | 'Work' | 'Other';
  streetAddress: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string;
  isDefault: boolean;
};

interface AddressFormProps {
  initialData?: Partial<AddressFormData>;
  onSubmit: (data: AddressFormData) => void;
  isLoading?: boolean;
  submitButtonText?: string;
}

const LABELS: ('Home' | 'Work' | 'Other')[] = ['Home', 'Work', 'Other'];

export const AddressForm: React.FC<AddressFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  submitButtonText = 'Save Address',
}) => {
  const [formData, setFormData] = useState<AddressFormData>({
    label: initialData?.label ?? 'Home',
    streetAddress: initialData?.streetAddress ?? '',
    barangay: initialData?.barangay ?? '',
    city: initialData?.city ?? '',
    province: initialData?.province ?? '',
    zipCode: initialData?.zipCode ?? '',
    isDefault: initialData?.isDefault ?? false,
  });

  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string | null>(null);
  const [selectedCityCode, setSelectedCityCode] = useState<string | null>(null);
  
  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [barangays, setBarangays] = useState<BarangayOption[]>([]);
  
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  
  const [activePicker, setActivePicker] = useState<'province' | 'city' | 'barangay' | null>(null);

  // Load Provinces
  useEffect(() => {
    const load = async () => {
      setLoadingProvinces(true);
      const data = await fetchProvinces();
      setProvinces(data);
      
      // If we have initial province, try to find its code
      if (formData.province) {
        const found = data.find(p => p.name === formData.province);
        if (found) setSelectedProvinceCode(found.code);
      }
      
      setLoadingProvinces(false);
    };
    load();
  }, []);

  // Load Cities when Province changes
  useEffect(() => {
    if (selectedProvinceCode) {
      const load = async () => {
        setLoadingCities(true);
        const data = await fetchCities(selectedProvinceCode);
        setCities(data);
        
        // If we have initial city, try to find its code
        if (formData.city) {
          const found = data.find(c => c.name === formData.city);
          if (found) setSelectedCityCode(found.code);
        }
        
        setLoadingCities(false);
      };
      load();
    } else {
      setCities([]);
    }
  }, [selectedProvinceCode]);

  // Load Barangays when City changes
  useEffect(() => {
    if (selectedCityCode) {
      const load = async () => {
        setLoadingBarangays(true);
        const data = await fetchBarangays(selectedCityCode);
        setBarangays(data);
        setLoadingBarangays(false);
      };
      load();
    } else {
      setBarangays([]);
    }
  }, [selectedCityCode]);

  const isFormValid = useMemo(() => {
    return (
      formData.streetAddress.trim() !== '' &&
      formData.province.trim() !== '' &&
      formData.city.trim() !== '' &&
      formData.barangay.trim() !== '' &&
      formData.zipCode.trim() !== ''
    );
  }, [formData]);

  const renderPicker = () => {
    let listOptions: (ProvinceOption | CityOption | BarangayOption)[] = [];
    let title = '';
    let currentVal = '';
    let onSelectedItem = (item: ProvinceOption | CityOption | BarangayOption) => {};

    if (activePicker === 'province') {
      listOptions = provinces;
      title = 'Select Province';
      currentVal = formData.province;
      onSelectedItem = (item) => {
        setFormData(prev => ({ ...prev, province: item.name, city: '', barangay: '' }));
        setSelectedProvinceCode(item.code);
        setSelectedCityCode(null);
        setActivePicker(null);
      };
    } else if (activePicker === 'city') {
      listOptions = cities;
      title = 'Select City';
      currentVal = formData.city;
      onSelectedItem = (item) => {
        setFormData(prev => ({ ...prev, city: item.name, barangay: '' }));
        setSelectedCityCode(item.code);
        setActivePicker(null);
      };
    } else if (activePicker === 'barangay') {
      listOptions = barangays;
      title = 'Select Barangay';
      currentVal = formData.barangay;
      onSelectedItem = (item) => {
        setFormData(prev => ({ ...prev, barangay: item.name }));
        setActivePicker(null);
      };
    }

    return (
      <Modal visible={!!activePicker} animationType="slide" transparent>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setActivePicker(null)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={() => setActivePicker(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {listOptions.map((opt) => (
                <TouchableOpacity 
                  key={opt.code} 
                  style={styles.modalItem}
                  onPress={() => onSelectedItem(opt)}
                >
                  <Text style={[
                    styles.modalItemText, 
                    opt.name === currentVal && styles.modalItemTextActive
                  ]}>
                    {opt.name}
                  </Text>
                  {opt.name === currentVal && (
                    <Ionicons name="checkmark-circle" size={20} color="#00B761" />
                  )}
                </TouchableOpacity>
              ))}
              {listOptions.length === 0 && !loadingProvinces && !loadingCities && !loadingBarangays && (
                <Text style={styles.emptyText}>No options found</Text>
              )}
              {(loadingProvinces || loadingCities || loadingBarangays) && (
                <ActivityIndicator style={{ padding: 20 }} color="#00B761" />
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Label Selection */}
      <Text style={styles.label}>Address Label</Text>
      <View style={styles.labelRow}>
        {LABELS.map((l) => (
          <TouchableOpacity
            key={l}
            style={[styles.labelChip, formData.label === l && styles.labelChipActive]}
            onPress={() => setFormData({ ...formData, label: l })}
          >
            <Text style={[styles.labelChipText, formData.label === l && styles.labelChipTextActive]}>
              {l}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Street Address */}
      <Text style={styles.label}>Street Address / House No. / Landmark</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 123 Mabini St, Building Name"
        value={formData.streetAddress}
        onChangeText={(txt: string) => setFormData({ ...formData, streetAddress: txt })}
      />

      {/* Province */}
      <Text style={styles.label}>Province</Text>
      <TouchableOpacity 
        style={styles.pickerButton} 
        onPress={() => setActivePicker('province')}
      >
        <Text style={[styles.pickerText, !formData.province && styles.placeholderText]}>
          {formData.province || (loadingProvinces ? 'Loading...' : 'Select Province')}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#999" />
      </TouchableOpacity>

      {/* City */}
      <Text style={styles.label}>City / Municipality</Text>
      <TouchableOpacity 
        style={[styles.pickerButton, !formData.province && styles.disabledButton]} 
        onPress={() => formData.province && setActivePicker('city')}
        disabled={!formData.province}
      >
        <Text style={[styles.pickerText, !formData.city && styles.placeholderText]}>
          {formData.city || (loadingCities ? 'Loading...' : 'Select City')}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#999" />
      </TouchableOpacity>

      {/* Barangay */}
      <Text style={styles.label}>Barangay</Text>
      <TouchableOpacity 
        style={[styles.pickerButton, !formData.city && styles.disabledButton]} 
        onPress={() => formData.city && setActivePicker('barangay')}
        disabled={!formData.city}
      >
        <Text style={[styles.pickerText, !formData.barangay && styles.placeholderText]}>
          {formData.barangay || (loadingBarangays ? 'Loading...' : 'Select Barangay')}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#999" />
      </TouchableOpacity>

      {/* Postal Code */}
      <Text style={styles.label}>ZIP Code / Postal Code</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 1100"
        value={formData.zipCode}
        onChangeText={(txt: string) => setFormData({ ...formData, zipCode: txt })}
        keyboardType="number-pad"
      />

      {/* Default Toggle */}
      <TouchableOpacity 
        style={styles.defaultRow} 
        onPress={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
      >
        <View style={[styles.checkbox, formData.isDefault && styles.checkboxActive]}>
          {formData.isDefault && <Ionicons name="checkmark" size={16} color="#FFF" />}
        </View>
        <Text style={styles.defaultText}>Set as default address</Text>
      </TouchableOpacity>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, !isFormValid && styles.submitButtonDisabled]}
        onPress={() => onSubmit(formData)}
        disabled={!isFormValid || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.submitButtonText}>{submitButtonText}</Text>
        )}
      </TouchableOpacity>

      {renderPicker()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D1B2A',
    marginBottom: 8,
    marginTop: 16,
  },
  labelRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  labelChip: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  labelChipActive: {
    borderColor: '#00B761',
    backgroundColor: '#F0FBF6',
  },
  labelChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  labelChipTextActive: {
    color: '#00B761',
    fontWeight: '700',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: '#FFF',
    color: '#333',
  },
  pickerButton: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
  },
  pickerText: {
    fontSize: 15,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  disabledButton: {
    backgroundColor: '#F5F5F5',
  },
  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: '#00B761',
    borderColor: '#00B761',
  },
  defaultText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#00B761',
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00B761',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalList: {
    paddingHorizontal: 20,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalItemTextActive: {
    color: '#00B761',
    fontWeight: '600',
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: '#999',
  },
});
