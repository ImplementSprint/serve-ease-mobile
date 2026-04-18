import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import {
  createMyProviderService,
  deleteMyProviderService,
  getActiveServiceCategories,
  getMyProviderServices,
  updateMyProviderService,
} from '@/services/providerCatalogService';

type ServiceRow = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category_id: string;
  supports_hourly: boolean;
  hourly_rate: number | null;
  supports_flat: boolean;
  flat_rate: number | null;
  default_pricing_mode: PricingMode | null;
  service_location_type: 'mobile' | 'in_shop';
  service_location_address: string | null;
};

type PricingMode = 'hourly' | 'flat';

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};

const formatMoney = (value: number) => `P${Number(value || 0).toFixed(2)}`;
const getServiceLocationLabel = (locationType: ServiceRow['service_location_type']) =>
  locationType === 'in_shop' ? 'In-Shop' : 'Mobile';
const normalizeCategoryHint = (value: unknown) => String(value || '').trim().toLowerCase();

export default function PricingScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // DB categories keyed by id.
  const [dbCategoryMap, setDbCategoryMap] = useState<Record<string, CategoryRow>>({});
  const [services, setServices] = useState<ServiceRow[]>([]);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [supportsHourly, setSupportsHourly] = useState(true);
  const [hourlyRateText, setHourlyRateText] = useState('');
  const [supportsFlat, setSupportsFlat] = useState(false);
  const [flatRateText, setFlatRateText] = useState('');
  const [defaultPricingMode, setDefaultPricingMode] = useState<PricingMode>('hourly');
  const [serviceLocationType, setServiceLocationType] = useState<'mobile' | 'in_shop'>('mobile');
  const [serviceLocationAddress, setServiceLocationAddress] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const canSubmit = useMemo(() => {
    const hasHourly = supportsHourly && Number(hourlyRateText) > 0;
    const hasFlat = supportsFlat && Number(flatRateText) > 0;
    return !!title.trim() && !!selectedCategoryId && (hasHourly || hasFlat) && !isSaving;
  }, [title, selectedCategoryId, supportsHourly, hourlyRateText, supportsFlat, flatRateText, isSaving]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setSupportsHourly(true);
    setHourlyRateText('');
    setSupportsFlat(false);
    setFlatRateText('');
    setDefaultPricingMode('hourly');
    setServiceLocationType('mobile');
    setServiceLocationAddress('');
    setSelectedCategoryId('');
  }, []);

  const categories = useMemo(
    () => Object.values(dbCategoryMap).sort((left, right) => left.name.localeCompare(right.name)),
    [dbCategoryMap],
  );

  const selectedCategory = useMemo(
    () => (selectedCategoryId ? dbCategoryMap[selectedCategoryId] ?? null : null),
    [dbCategoryMap, selectedCategoryId],
  );

  // Load DB categories into an id-keyed map.
  const loadDbCategories = useCallback(async () => {
    const map: Record<string, CategoryRow> = {};
    for (const row of (await getActiveServiceCategories()) as CategoryRow[]) {
      if (!row?.id || !row?.name) continue;
      map[row.id] = row;
    }
    setDbCategoryMap(map);
  }, []);

  const loadServices = useCallback(async () => {
    if (!user?.id) return;
    setServices((await getMyProviderServices()) as ServiceRow[]);
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) setIsLoading(true);
      try {
        await Promise.all([loadDbCategories(), loadServices()]);
      } catch (error) {
        if (mounted) {
          Alert.alert('Load Failed', getErrorMessage(error, 'Could not load services and categories.'));
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadDbCategories, loadServices]);

  // Pre-select category using user metadata when possible.
  useEffect(() => {
    if (selectedCategoryId) return;
    if (!categories.length) return;

    const meta = (user?.user_metadata ?? {}) as Record<string, any>;
    const hints = [meta.sub_category, meta.primary_category]
      .map((value) => normalizeCategoryHint(value))
      .filter(Boolean);
    if (!hints.length) return;

    const matched = categories.find((row) => {
      const name = normalizeCategoryHint(row.name);
      const slug = normalizeCategoryHint(row.slug);
      return hints.some((hint) => hint === name || hint === slug);
    });

    if (matched) {
      setSelectedCategoryId(matched.id);
    }
  }, [categories, selectedCategoryId, user]);

  useEffect(() => {
    if (!selectedCategoryId) return;
    if (dbCategoryMap[selectedCategoryId]) return;
    if (categories.length) {
      setSelectedCategoryId(categories[0].id);
    } else {
      setSelectedCategoryId('');
    }
  }, [categories, dbCategoryMap, selectedCategoryId]);

  const handleEdit = useCallback((service: ServiceRow) => {
    setEditingId(service.id);
    setTitle(service.title || '');
    setDescription(service.description || '');
    setSupportsHourly(Boolean(service.supports_hourly));
    setHourlyRateText(service.hourly_rate ? String(service.hourly_rate) : '');
    setSupportsFlat(Boolean(service.supports_flat));
    setFlatRateText(service.flat_rate ? String(service.flat_rate) : '');
    setDefaultPricingMode(service.default_pricing_mode || 'hourly');
    setServiceLocationType(service.service_location_type || 'mobile');
    setServiceLocationAddress(service.service_location_address || '');

    if (service.category_id && dbCategoryMap[service.category_id]) {
      setSelectedCategoryId(service.category_id);
    } else if (categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    } else {
      setSelectedCategoryId('');
    }
  }, [categories, dbCategoryMap]);

  const handleDelete = useCallback((id: string) => {
    if (!user?.id) return;
    Alert.alert('Delete Service', 'This will remove the service permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsSaving(true);
          try {
            await deleteMyProviderService(id);
            await loadServices();
            if (editingId === id) resetForm();
          } catch (error) {
            Alert.alert('Delete Failed', getErrorMessage(error, 'Could not delete service.'));
          } finally {
            setIsSaving(false);
          }
        },
      },
    ]);
  }, [editingId, loadServices, resetForm, user?.id]);

  const handleSubmit = useCallback(async () => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please log in again before saving.');
      return;
    }

    const trimmedTitle = title.trim();
    const parsedHourlyRate = Number(hourlyRateText);
    const parsedFlatRate = Number(flatRateText);
    const hasHourly = supportsHourly && Number.isFinite(parsedHourlyRate) && parsedHourlyRate > 0;
    const hasFlat = supportsFlat && Number.isFinite(parsedFlatRate) && parsedFlatRate > 0;

    if (!trimmedTitle) {
      Alert.alert('Missing Fields', 'Service name is required.');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Missing Fields', 'Please choose a service category.');
      return;
    }
    if (!hasHourly && !hasFlat) {
      Alert.alert('Invalid Pricing', 'At least one pricing mode with a valid rate is required.');
      return;
    }
    if (serviceLocationType === 'in_shop' && !serviceLocationAddress.trim()) {
      Alert.alert('Missing Fields', 'In-shop services require a service address.');
      return;
    }

    setIsSaving(true);
    try {
      const fallbackPrice = hasHourly ? parsedHourlyRate : parsedFlatRate;

      const payload = {
        provider_id: user.id,
        title: trimmedTitle,
        description: description.trim() || null,
        price: fallbackPrice,
        category_id: selectedCategoryId,
        supports_hourly: supportsHourly,
        hourly_rate: hasHourly ? parsedHourlyRate : null,
        supports_flat: supportsFlat,
        flat_rate: hasFlat ? parsedFlatRate : null,
        default_pricing_mode: hasHourly && hasFlat
          ? defaultPricingMode
          : hasHourly ? 'hourly' : 'flat',
        service_location_type: serviceLocationType,
        service_location_address: serviceLocationType === 'in_shop' ? serviceLocationAddress.trim() : null,
      };

      if (editingId) {
        await updateMyProviderService(editingId, payload);
      } else {
        await createMyProviderService(payload);
      }
      await loadServices();
      resetForm();
      Alert.alert('Success', editingId ? 'Service updated.' : 'Service added.');
    } catch (error) {
      Alert.alert('Save Failed', getErrorMessage(error, 'Could not save service.'));
    } finally {
      setIsSaving(false);
    }
  }, [
    defaultPricingMode, description, editingId,
    flatRateText, hourlyRateText, loadServices, resetForm,
    selectedCategoryId, serviceLocationAddress, serviceLocationType, supportsFlat, supportsHourly, title, user?.id,
  ]);

  // Resolve category name for a service's category id.
  const getCategoryLabel = useCallback((categoryId: string) => {
    const row = dbCategoryMap[categoryId];
    if (!row) return 'Uncategorized';
    return row.name;
  }, [dbCategoryMap]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#00B761" />
        </Pressable>
        <Text style={styles.headerTitle}>Services & Pricing</Text>
        <View style={{ width: 34 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00B761" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* ── Form ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {editingId ? 'Edit Service' : 'Add New Service'}
            </Text>

            <Text style={styles.label}>Service Name</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Aircon Cleaning"
              placeholderTextColor="#94A3B8"
              editable={!isSaving}
            />

            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what's included"
              placeholderTextColor="#94A3B8"
              multiline
              editable={!isSaving}
            />
          </View>

          {/* ── Pricing ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>

            <Pressable
              onPress={() => {
                const next = !supportsHourly;
                if (!next && !supportsFlat) { setSupportsFlat(true); setDefaultPricingMode('flat'); }
                else if (!next && defaultPricingMode === 'hourly') { setDefaultPricingMode('flat'); }
                setSupportsHourly(next);
              }}
              disabled={isSaving}
              style={[styles.pricingOption, supportsHourly && styles.pricingOptionActive]}
            >
              <View style={styles.pricingOptionHeader}>
                <Ionicons
                  name={supportsHourly ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={supportsHourly ? '#00B761' : '#94A3B8'}
                />
                <Text style={[styles.pricingOptionTitle, supportsHourly && styles.pricingOptionTitleActive]}>
                  Hourly Rate
                </Text>
              </View>
              <Text style={styles.pricingOptionDesc}>Customer enters hours up front</Text>
            </Pressable>

            {supportsHourly && (
              <View style={styles.rateInputRow}>
                <Text style={styles.currencyPrefix}>PHP</Text>
                <TextInput
                  style={styles.rateInput}
                  value={hourlyRateText}
                  onChangeText={setHourlyRateText}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  editable={!isSaving}
                />
                <Text style={styles.rateSuffix}>/ hour</Text>
              </View>
            )}

            <Pressable
              onPress={() => {
                const next = !supportsFlat;
                if (!next && !supportsHourly) { setSupportsHourly(true); setDefaultPricingMode('hourly'); }
                else if (!next && defaultPricingMode === 'flat') { setDefaultPricingMode('hourly'); }
                setSupportsFlat(next);
              }}
              disabled={isSaving}
              style={[styles.pricingOption, supportsFlat && styles.pricingOptionActive]}
            >
              <View style={styles.pricingOptionHeader}>
                <Ionicons
                  name={supportsFlat ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={supportsFlat ? '#00B761' : '#94A3B8'}
                />
                <Text style={[styles.pricingOptionTitle, supportsFlat && styles.pricingOptionTitleActive]}>
                  Flat Rate
                </Text>
              </View>
              <Text style={styles.pricingOptionDesc}>One fixed price per service</Text>
            </Pressable>

            {supportsFlat && (
              <View style={styles.rateInputRow}>
                <Text style={styles.currencyPrefix}>PHP</Text>
                <TextInput
                  style={styles.rateInput}
                  value={flatRateText}
                  onChangeText={setFlatRateText}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  editable={!isSaving}
                />
                <Text style={styles.rateSuffix}>/ service</Text>
              </View>
            )}

            {supportsHourly && supportsFlat && (
              <View style={styles.defaultModeRow}>
                <Text style={styles.defaultModeLabel}>Default mode:</Text>
                <Pressable
                  onPress={() => setDefaultPricingMode('hourly')}
                  style={[styles.modeChip, defaultPricingMode === 'hourly' && styles.modeChipActive]}
                >
                  <Text style={[styles.modeChipText, defaultPricingMode === 'hourly' && styles.modeChipTextActive]}>
                    Hourly
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setDefaultPricingMode('flat')}
                  style={[styles.modeChip, defaultPricingMode === 'flat' && styles.modeChipActive]}
                >
                  <Text style={[styles.modeChipText, defaultPricingMode === 'flat' && styles.modeChipTextActive]}>
                    Flat
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Location</Text>

            <Text style={styles.label}>Where is this service performed?</Text>
            <View style={styles.locationTypeRow}>
              <Pressable
                onPress={() => setServiceLocationType('mobile')}
                disabled={isSaving}
                style={[styles.locationTypeChip, serviceLocationType === 'mobile' && styles.locationTypeChipActive]}
              >
                <Text
                  style={[
                    styles.locationTypeChipText,
                    serviceLocationType === 'mobile' && styles.locationTypeChipTextActive,
                  ]}
                >
                  Mobile
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setServiceLocationType('in_shop')}
                disabled={isSaving}
                style={[styles.locationTypeChip, serviceLocationType === 'in_shop' && styles.locationTypeChipActive]}
              >
                <Text
                  style={[
                    styles.locationTypeChipText,
                    serviceLocationType === 'in_shop' && styles.locationTypeChipTextActive,
                  ]}
                >
                  In-Shop
                </Text>
              </Pressable>
            </View>

            {serviceLocationType === 'in_shop' ? (
              <>
                <Text style={styles.label}>Service address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={serviceLocationAddress}
                  onChangeText={setServiceLocationAddress}
                  placeholder="Enter the provider address for this service"
                  placeholderTextColor="#94A3B8"
                  multiline
                  editable={!isSaving}
                />
              </>
            ) : null}
          </View>

          {/* ── Category ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>

            <Text style={styles.label}>Select a category</Text>
            {categories.length === 0 ? (
              <Text style={styles.categoryHint}>
                No active categories are available. Ask an admin to activate at least one category.
              </Text>
            ) : (
              <View style={styles.chipGrid}>
                {categories.map((category) => (
                  <Pressable
                    key={category.id}
                    onPress={() => setSelectedCategoryId(category.id)}
                    disabled={isSaving}
                    style={[styles.chip, selectedCategoryId === category.id && styles.chipActive]}
                  >
                    <Ionicons
                      name={selectedCategoryId === category.id ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={selectedCategoryId === category.id ? '#00B761' : '#64748B'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.chipText, selectedCategoryId === category.id && styles.chipTextActive]}>
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {!!selectedCategory && (
              <View style={styles.selectionBadge}>
                <Ionicons name="pricetag" size={14} color="#00B761" />
                <Text style={styles.selectionBadgeText}>
                  {selectedCategory.name}
                </Text>
              </View>
            )}
          </View>

          {/* ── Submit ── */}
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {editingId ? 'Save Changes' : 'Add Service'}
              </Text>
            )}
          </Pressable>

          {editingId && (
            <Pressable onPress={resetForm} disabled={isSaving} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          )}

          {/* ── Existing Services ── */}
          <View style={[styles.section, { marginTop: 20 }]}>
            <Text style={styles.sectionTitle}>Your Services</Text>

            {services.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="clipboard-outline" size={40} color="#CBD5E1" />
                <Text style={styles.emptyStateText}>No services yet</Text>
                <Text style={styles.emptyStateHint}>Add your first service using the form above</Text>
              </View>
            ) : (
              services.map((item) => (
                <View key={item.id} style={styles.serviceCard}>
                  <View style={styles.serviceCardHeader}>
                    <Text style={styles.serviceTitle}>{item.title}</Text>
                    <Text style={styles.serviceCategoryBadge}>
                      {getCategoryLabel(item.category_id)}
                    </Text>
                  </View>

                  {item.description ? (
                    <Text style={styles.serviceDesc}>{item.description}</Text>
                  ) : null}

                  <View style={styles.priceRow}>
                    {item.supports_hourly && (
                      <View style={styles.priceTag}>
                        <Ionicons name="time-outline" size={14} color="#00B761" />
                        <Text style={styles.priceTagText}>
                          {formatMoney(item.hourly_rate ?? item.price)}/hr
                        </Text>
                      </View>
                    )}
                    {item.supports_flat && (
                      <View style={styles.priceTag}>
                        <Ionicons name="pricetag-outline" size={14} color="#00B761" />
                        <Text style={styles.priceTagText}>
                          {formatMoney(item.flat_rate ?? item.price)} flat
                        </Text>
                      </View>
                    )}
                    {item.supports_hourly && item.supports_flat && (
                      <Text style={styles.defaultBadge}>
                        Default: {item.default_pricing_mode === 'flat' ? 'Flat' : 'Hourly'}
                      </Text>
                    )}
                  </View>

                  <View style={styles.locationSummaryRow}>
                    <View style={styles.locationBadge}>
                      <Ionicons
                        name={item.service_location_type === 'in_shop' ? 'location' : 'car-outline'}
                        size={14}
                        color="#047857"
                      />
                      <Text style={styles.locationBadgeText}>
                        {getServiceLocationLabel(item.service_location_type)}
                      </Text>
                    </View>
                    <Text style={styles.locationSummaryText}>
                      {item.service_location_type === 'in_shop'
                        ? item.service_location_address || 'Provider address will be shown to customers before booking.'
                        : 'Provider travels to the customer address for this service.'}
                    </Text>
                  </View>

                  <View style={styles.serviceActions}>
                    <Pressable onPress={() => handleEdit(item)} style={styles.editBtn}>
                      <Ionicons name="create-outline" size={16} color="#1E293B" />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: '#64748B', fontSize: 14 },
  scroll: {
    padding: 16,
    gap: 16,
  },

  // Sections
  section: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    minHeight: 44,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },

  // Pricing options
  pricingOption: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    backgroundColor: '#FFF',
  },
  pricingOptionActive: {
    borderColor: '#00B761',
    backgroundColor: '#F0FDF9',
  },
  pricingOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pricingOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  pricingOptionTitleActive: { color: '#00B761' },
  pricingOptionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 28,
    marginTop: 2,
  },
  rateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 6,
  },
  rateInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  rateSuffix: {
    fontSize: 13,
    color: '#94A3B8',
    marginLeft: 4,
  },
  defaultModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  defaultModeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modeChip: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FFF',
  },
  modeChipActive: {
    borderColor: '#00B761',
    backgroundColor: '#F0FDF9',
  },
  modeChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  modeChipTextActive: { color: '#00B761' },
  locationTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  locationTypeChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  locationTypeChipActive: {
    borderColor: '#00B761',
    backgroundColor: '#F0FDF9',
  },
  locationTypeChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  locationTypeChipTextActive: {
    color: '#00B761',
  },

  // Category chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF',
  },
  chipActive: {
    borderColor: '#00B761',
    backgroundColor: '#F0FDF9',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#00B761' },
  categoryHint: {
    fontSize: 13,
    color: '#B45309',
    lineHeight: 18,
  },
  selectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#F0FDF9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectionBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
  },

  // Submit
  submitBtn: {
    backgroundColor: '#00B761',
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  cancelBtnText: { fontWeight: '700', color: '#475569', fontSize: 15 },

  // Service cards
  serviceCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    backgroundColor: '#FAFBFC',
  },
  serviceCardHeader: { gap: 4 },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  serviceCategoryBadge: {
    fontSize: 12,
    color: '#64748B',
  },
  serviceDesc: {
    color: '#475569',
    fontSize: 14,
    marginTop: 6,
  },
  priceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priceTagText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00B761',
  },
  defaultBadge: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  locationSummaryRow: {
    marginTop: 10,
    gap: 8,
  },
  locationBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  locationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
    textTransform: 'uppercase',
  },
  locationSummaryText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  serviceActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
  },
  editBtnText: { color: '#1E293B', fontWeight: '600', fontSize: 14 },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  deleteBtnText: { color: '#DC2626', fontWeight: '600', fontSize: 14 },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 4,
  },
  emptyStateHint: {
    fontSize: 13,
    color: '#CBD5E1',
  },
});
