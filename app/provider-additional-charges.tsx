import React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import { getProviderBookingById } from '@/services/providerBookingService';
import { createProviderAdditionalChargeRequest } from '@/services/providerBookingActionsService';

type ChargeItem = {
  id: string;
  desc: string;
  amt: number;
};

export default function ProviderAdditionalChargesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [justification, setJustification] = React.useState('');
  const [items, setItems] = React.useState<ChargeItem[]>([]);

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
        const data = await getProviderBookingById(String(id));
        if (!mounted) return;
        setBooking(data);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Could not load booking details.'));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const originalPrice = Number(booking?.total_amount || 0);

  const handleAddItem = () => {
    if (!description.trim() || !amount.trim()) return;
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than zero.');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      desc: description.trim(),
      amt: parsedAmount,
    };

    setItems((prev) => [...prev, newItem]);
    setDescription('');
    setAmount('');
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const totalAdditional = items.reduce((sum, item) => sum + item.amt, 0);
  const newTotal = originalPrice + totalAdditional;
  const canSubmit = items.length > 0 && !!justification.trim() && !isSubmitting;

  const onSubmit = async () => {
    if (!user?.id || !booking?.id) {
      Alert.alert('Missing Details', 'Please reopen this booking and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createProviderAdditionalChargeRequest({
        bookingId: booking.id,
        providerId: user.id,
        justification,
        items: items.map((item) => ({
          description: item.desc,
          amount: item.amt,
        })),
      });

      Alert.alert('Request Sent', 'Additional charges were saved and are ready for customer review.', [
        {
          text: 'Back to Booking',
          onPress: () =>
            router.replace({ pathname: '/provider-booking-details', params: { id: booking.id } } as any),
        },
      ]);
    } catch (err) {
      Alert.alert('Submit Failed', getErrorMessage(err, 'Could not submit additional charges.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/(provider-tabs)/bookings' as any))} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Additional Charges</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {isLoading ? (
              <View style={styles.stateWrap}>
                <ActivityIndicator size="small" color="#00B761" />
                <Text style={styles.stateText}>Loading booking details...</Text>
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {!isLoading && booking ? (
              <>
                <View style={styles.priceCard}>
                  <Text style={styles.priceLabel}>Current Booking Price</Text>
                  <Text style={styles.priceAmount}>P{originalPrice.toFixed(2)}</Text>
                  <Text style={styles.priceSubtext}>{booking.service_title || 'Service'} for {booking.customer_name || 'Customer'}</Text>
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Additional Charges</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Description</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Extra pipe replacement"
                      placeholderTextColor="#AAA"
                      value={description}
                      onChangeText={setDescription}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Amount (PHP)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="0.00"
                      placeholderTextColor="#AAA"
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="numeric"
                    />
                  </View>

                  <TouchableOpacity style={styles.addItemButton} onPress={handleAddItem}>
                    <Ionicons name="add" size={20} color="#00B761" />
                    <Text style={styles.addItemText}>Add Item</Text>
                  </TouchableOpacity>
                </View>

                {items.length > 0 ? (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Additional Items ({items.length})</Text>
                    {items.map((item) => (
                      <View key={item.id} style={styles.addedItemRow}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{item.desc}</Text>
                          <Text style={styles.itemAmount}>P{item.amt.toFixed(2)}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeButton}>
                          <Ionicons name="close" size={20} color="#FF4D4D" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}

                {items.length > 0 ? (
                  <View style={[styles.sectionCard, styles.summaryCard]}>
                    <Text style={styles.summaryLabel}>Summary</Text>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryText}>Original Amount</Text>
                      <Text style={styles.summaryValue}>P{originalPrice.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryText, styles.greenText]}>Total Additional Charges</Text>
                      <Text style={[styles.summaryValue, styles.greenText]}>+P{totalAdditional.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.divider, { marginVertical: 12 }]} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.totalLabel}>New Total Amount</Text>
                      <Text style={styles.totalValue}>P{newTotal.toFixed(2)}</Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.sectionCard}>
                  <View style={styles.labelRow}>
                    <Text style={styles.sectionTitle}>Justification</Text>
                    <Text style={styles.requiredAsterisk}>*</Text>
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Explain why these additional charges are necessary..."
                    placeholderTextColor="#AAA"
                    value={justification}
                    onChangeText={setJustification}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.warningAlert}>
                  <Ionicons name="alert-circle-outline" size={20} color="#8B6E12" />
                  <Text style={styles.warningText}>
                    Customer approval is still required before these charges should be applied to the booking total.
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.sendButton, !canSubmit && styles.sendButtonDisabled]}
            disabled={!canSubmit}
            onPress={() => void onSubmit()}
          >
            <Text style={styles.sendButtonText}>{isSubmitting ? 'Sending...' : 'Send Request to Customer'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    borderBottomColor: '#F0F0F0',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A', marginLeft: 8 },
  container: { flex: 1 },
  scrollContainer: { flex: 1 },
  content: { padding: 24 },
  stateWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  stateText: { color: '#64748B' },
  errorText: { color: '#C62828', marginBottom: 16 },
  priceCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  priceLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '600', marginBottom: 8 },
  priceAmount: { fontSize: 28, fontWeight: '800', color: '#0D1B2A' },
  priceSubtext: { marginTop: 8, color: '#64748B', fontSize: 13 },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0D1B2A', marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  requiredAsterisk: { color: '#FF4D4D', fontSize: 16, marginLeft: 4, marginTop: -8 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, color: '#444', fontWeight: '600', marginBottom: 8 },
  textInput: {
    backgroundColor: '#F2F3F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 52,
    fontSize: 15,
    color: '#0D1B2A',
  },
  textArea: { minHeight: 120, paddingTop: 16, textAlignVertical: 'top' },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00B76140',
    marginTop: 8,
    gap: 8,
  },
  addItemText: { color: '#00B761', fontWeight: '700', fontSize: 15 },
  addedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#0D1B2A', marginBottom: 4 },
  itemAmount: { fontSize: 14, color: '#00B761', fontWeight: '600' },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  summaryCard: { borderColor: '#00B761', borderWidth: 1.5, backgroundColor: '#F8F9FA80' },
  summaryLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryText: { fontSize: 14, color: '#555' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  greenText: { color: '#00B761', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#DDD' },
  totalLabel: { fontSize: 15, fontWeight: '800', color: '#0D1B2A' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#00B761' },
  warningAlert: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#8B6E1220',
  },
  warningText: { flex: 1, fontSize: 13, color: '#8B6E12', fontWeight: '700', lineHeight: 18 },
  footer: { padding: 24, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  sendButton: {
    backgroundColor: '#99E6C3',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.6 },
  sendButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
