import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getErrorMessage } from '@/lib/error-handling';
import {
  getProviderBookingActionState,
  getProviderBookingById,
} from '@/services/providerBookingService';

export default function ProviderNavigationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) {
        setError('Booking id is missing.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const row = await getProviderBookingById(String(id));
        if (mounted) setBooking(row);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Could not load navigation details.'));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const actionState = getProviderBookingActionState(booking?.status);
  const address = booking?.service_address || 'No service address found.';

  const openExternalMaps = async () => {
    const destination = String(address).trim();
    if (!destination) {
      Alert.alert('Missing Address', 'This booking does not have a service address yet.');
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Maps Unavailable', 'No supported maps app was found on this device.');
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Open Maps Failed', getErrorMessage(err, 'Could not open navigation.'));
    }
  };

  const onContinue = () => {
    if (!booking?.id) return;

    if (actionState.canResumeService) {
      router.replace({ pathname: '/provider-service-in-progress', params: { id: booking.id } } as any);
      return;
    }

    if (actionState.canStartService) {
      router.replace({ pathname: '/provider-start-service', params: { id: booking.id } } as any);
      return;
    }

    if (actionState.normalizedStatus === 'completed') {
      router.replace({ pathname: '/provider-receipt', params: { id: booking.id } } as any);
      return;
    }

    router.replace({ pathname: '/provider-booking-details', params: { id: booking.id } } as any);
  };

  const actionLabel = actionState.canResumeService
    ? 'Continue Service'
    : actionState.canStartService
      ? "I've Arrived"
      : actionState.normalizedStatus === 'completed'
        ? 'View Receipt'
        : 'View Booking';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Navigation</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="small" color="#00B761" />
            <Text style={styles.stateText}>Loading service destination...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!isLoading && booking ? (
          <>
            <Ionicons name="navigate-circle-outline" size={72} color="#00B761" />
            <Text style={styles.title}>{booking.service_title || 'Assigned Service'}</Text>
            <Text style={styles.text}>Customer: {booking.customer_name || 'Customer'}</Text>
            <Text style={styles.text}>Status: {actionState.label}</Text>
            <Text style={styles.address}>{address}</Text>

            <TouchableOpacity style={styles.secondaryBtn} onPress={openExternalMaps}>
              <Text style={styles.secondaryBtnText}>Open in Maps</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btn} onPress={onContinue}>
              <Text style={styles.btnText}>{actionLabel}</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  stateWrap: { alignItems: 'center', gap: 10, marginBottom: 10 },
  stateText: { color: '#64748B', fontSize: 13 },
  errorText: { color: '#B91C1C', textAlign: 'center', marginBottom: 12 },
  title: { marginTop: 14, fontSize: 18, fontWeight: '700', color: '#0D1B2A', textAlign: 'center' },
  text: { marginTop: 8, color: '#475569', textAlign: 'center' },
  address: { marginTop: 10, color: '#334155', textAlign: 'center' },
  btn: {
    marginTop: 14,
    height: 44,
    minWidth: 200,
    borderRadius: 10,
    backgroundColor: '#00B761',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: {
    marginTop: 18,
    height: 44,
    minWidth: 200,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D7DDE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#223', fontWeight: '700' },
});
