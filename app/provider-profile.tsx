import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import { getProviderProfileData } from '@/services/marketplaceService';
import { formatVerificationStatusLabel } from '@/services/providerVerificationService';
import { getAvatarUrl } from '@/lib/avatar';

const TABS = ['About', 'Services', 'Reviews'];

// Helper to handle badge colors based on REAL status
const getStatusTheme = (status: string) => {
  const s = status?.toLowerCase();
  if (s === 'approved' || s === 'verified') {
    return { bg: '#E8FBF2', text: '#00B761', dot: '#00B761' }; // Green
  }
  if (s === 'pending' || s === 'under_review') {
    return { bg: '#FFF7E6', text: '#F59E0B', dot: '#F59E0B' }; // Orange/Yellow
  }
  return { bg: '#F2F4F7', text: '#667085', dot: '#667085' }; // Gray (Not Started / Unverified)
};

export default function ProviderProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const {
    providerId: paramProviderId,
    providerName,
    serviceId: paramServiceId,
    serviceName: paramServiceName,
  } = useLocalSearchParams<{
    providerId?: string;
    providerName?: string;
    serviceId?: string;
    serviceName?: string;
  }>();

  const effectiveProviderId = paramProviderId || user?.id;
  const isOwnProfile = useMemo(() => user?.id === effectiveProviderId, [user?.id, effectiveProviderId]);

  const [activeTab, setActiveTab] = useState('About');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!effectiveProviderId) {
        setError('Provider ID is missing.');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const data = await getProviderProfileData(effectiveProviderId);
        if (mounted) setPayload(data);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Failed to load profile.'));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [effectiveProviderId]);

  const providerDisplayName = useMemo(() => payload?.user?.full_name || providerName || 'Provider', [payload, providerName]);
  const avatarUri = useMemo(() => effectiveProviderId ? `${getAvatarUrl(effectiveProviderId)}?t=${Date.now()}` : null, [effectiveProviderId]);
  const requestedServiceId = String(paramServiceId || '').trim();
  const requestedServiceName = String(paramServiceName || '').trim();

  const selectedServiceForBooking = useMemo(() => {
    const services = Array.isArray(payload?.services) ? payload.services : [];
    const serviceById = requestedServiceId
      ? services.find((item: any) => String(item?.id || '').trim() === requestedServiceId)
      : null;
    const normalizedRequestedName = requestedServiceName.toLowerCase();
    const serviceByName =
      !serviceById && normalizedRequestedName
        ? services.find((item: any) => String(item?.title || '').trim().toLowerCase() === normalizedRequestedName)
        : null;
    const fallback = serviceById || serviceByName || services[0] || null;

    if (!fallback) {
      return {
        id: requestedServiceId,
        name: requestedServiceName,
      };
    }

    return {
      id: String(fallback.id || requestedServiceId).trim(),
      name: String(fallback.title || requestedServiceName).trim(),
    };
  }, [payload?.services, requestedServiceId, requestedServiceName]);

  const handleBookNowPress = useCallback(() => {
    if (!effectiveProviderId) return;

    const bookingParams: Record<string, string> = {
      providerId: String(effectiveProviderId),
      providerName: String(payload?.profile?.business_name || providerDisplayName || 'Provider'),
    };

    if (selectedServiceForBooking.id) {
      bookingParams.serviceId = selectedServiceForBooking.id;
    }

    if (selectedServiceForBooking.name) {
      bookingParams.serviceName = selectedServiceForBooking.name;
    }

    if (avatarUri) {
      bookingParams.avatarUrl = avatarUri;
    }

    router.push({
      pathname: '/customer-booking-form',
      params: bookingParams,
    } as any);
  }, [
    avatarUri,
    effectiveProviderId,
    payload?.profile?.business_name,
    providerDisplayName,
    router,
    selectedServiceForBooking.id,
    selectedServiceForBooking.name,
  ]);

  // CRITICAL FIX: Pulling actual verification status from payload
  const currentStatus = payload?.profile?.verification_status || 'not_started';
  const statusTheme = getStatusTheme(currentStatus);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/' as any))}>
            <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isOwnProfile ? 'My Public Profile' : 'Provider Profile'}</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B761" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* HEADER SECTION: Centered UI */}
          <View style={styles.profileHeaderSection}>
            <View style={styles.avatarWrapper}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.profileAvatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{providerDisplayName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.businessNameDisplay}>
              {payload?.profile?.business_name || providerDisplayName}
            </Text>

            {/* DYNAMIC BADGE: No longer hardcoded to "Approved" */}
            <View style={[styles.statusBadge, { backgroundColor: statusTheme.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusTheme.dot }]} />
              <Text style={[styles.statusText, { color: statusTheme.text }]}>
                {formatVerificationStatusLabel(currentStatus)}
              </Text>
            </View>

            {/* EDIT BUTTON: Visible only to you */}
            {isOwnProfile && (
              <TouchableOpacity 
                style={styles.editButton} 
                onPress={() => router.push('/provider-edit-profile' as any)}
              >
                <Ionicons name="create-outline" size={18} color="#00B761" />
                <Text style={styles.editButtonText}>Edit My Profile</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* METRICS SECTION */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{Number(payload?.profile?.average_rating || 0).toFixed(1)}</Text>
              <Text style={styles.metricLabel}>RATING</Text>
            </View>
            <View style={[styles.metricItem, styles.metricBorder]}>
              <Text style={styles.metricValue}>{payload?.profile?.total_reviews || 0}</Text>
              <Text style={styles.metricLabel}>REVIEWS</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{payload?.services?.length || 0}</Text>
              <Text style={styles.metricLabel}>SERVICES</Text>
            </View>
          </View>

          {/* TABS */}
          <View style={styles.tabsRow}>
            {TABS.map((tab) => (
              <TouchableOpacity 
                key={tab} 
                onPress={() => setActiveTab(tab)} 
                style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
              >
                <Text style={[styles.tabItemText, activeTab === tab && styles.activeTabItemText]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* TAB CONTENT */}
          <View style={styles.tabContent}>
            {activeTab === 'About' && (
              <View style={styles.infoCard}>
                <Text style={styles.cardHeading}>About This Provider</Text>
                <Text style={styles.cardBody}>
                  {payload?.profile?.bio || 'This provider hasn’t added a bio yet.'}
                </Text>
              </View>
            )}

            {activeTab === 'Services' && (
              <View style={styles.infoCard}>
                {payload?.services?.length > 0 ? payload.services.map((svc: any) => (
                  <View key={svc.id} style={styles.serviceRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceName}>{svc.title}</Text>
                      <Text style={styles.serviceDesc}>{svc.description || 'No description provided'}</Text>
                    </View>
                    <Text style={styles.servicePrice}>P{Number(svc.price).toFixed(2)}</Text>
                  </View>
                )) : <Text style={styles.emptyText}>No services listed.</Text>}
              </View>
            )}
          </View>
          
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FOOTER: Hidden if it's your own profile */}
      {!isOwnProfile && payload && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.bookNowBtn} onPress={handleBookNowPress}>
            <Text style={styles.bookNowText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safe: { backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingTop: 20 },
  
  profileHeaderSection: { alignItems: 'center', marginBottom: 24 },
  avatarWrapper: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#F2F2F2', overflow: 'hidden', marginBottom: 16 },
  profileAvatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: '100%', height: '100%', backgroundColor: '#00B761', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#FFF', fontSize: 44, fontWeight: '800' },
  businessNameDisplay: { fontSize: 24, fontWeight: '800', color: '#0D1B2A', marginBottom: 8 },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 14, fontWeight: '700' },

  editButton: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#00B761' },
  editButtonText: { marginLeft: 8, color: '#00B761', fontWeight: '700', fontSize: 15 },

  metricsRow: { flexDirection: 'row', marginHorizontal: 20, paddingVertical: 20, backgroundColor: '#F8F9FA', borderRadius: 24, marginBottom: 24 },
  metricItem: { flex: 1, alignItems: 'center' },
  metricBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E9ECEF' },
  metricValue: { fontSize: 22, fontWeight: '800', color: '#0D1B2A' },
  metricLabel: { fontSize: 10, color: '#6C757D', fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },

  tabsRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 10 },
  tabItem: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, backgroundColor: '#F2F4F7' },
  activeTabItem: { backgroundColor: '#00B761' },
  tabItemText: { fontWeight: '700', color: '#4B5563' },
  activeTabItemText: { color: '#FFF' },

  tabContent: { paddingHorizontal: 20 },
  infoCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F2F4F7' },
  cardHeading: { fontSize: 16, fontWeight: '800', color: '#0D1B2A', marginBottom: 12 },
  cardBody: { fontSize: 14, color: '#4B5563', lineHeight: 22 },

  serviceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F2F4F7' },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#0D1B2A' },
  serviceDesc: { fontSize: 13, color: '#6C757D', marginTop: 3 },
  servicePrice: { fontSize: 16, fontWeight: '800', color: '#00B761', marginLeft: 12 },

  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F2F4F7' },
  bookNowBtn: { backgroundColor: '#00B761', height: 58, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  bookNowText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', paddingVertical: 20 },
  errorText: { textAlign: 'center', color: '#EF4444', marginTop: 20 }
});
