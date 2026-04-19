import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, TextInput, Alert, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import { updateBookingStatus } from '@/services/providerBookingService';

export function ProviderCancelBookingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onCancel = async () => {
    if (!id || !user?.id) return;
    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please provide a cancellation reason.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateBookingStatus(String(id), user.id, 'cancelled');
      Alert.alert('Cancelled', 'Booking cancelled successfully.', [{ text: 'OK', onPress: () => router.replace('/provider-bookings' as any) }]);
    } catch (err) {
      Alert.alert('Failed', getErrorMessage(err, 'Could not cancel booking.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable 
          onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </Pressable>
        <Text style={styles.headerTitle}>Cancel Booking</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Reason</Text>
        <TextInput
          style={styles.input}
          placeholder="Explain why you need to cancel"
          value={reason}
          onChangeText={setReason}
          multiline
        />

        <Pressable 
          style={({ pressed }) => [
            styles.btn, 
            pressed && { backgroundColor: '#A02020' },
            isSubmitting && { opacity: 0.7 }
          ]} 
          onPress={onCancel} 
          disabled={isSubmitting}
        >
          <Text style={styles.btnText}>{isSubmitting ? 'Please wait...' : 'Confirm Cancellation'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  content: { padding: 16 },
  label: { fontWeight: '700', color: '#0D1B2A', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 10, minHeight: 120, padding: 12, textAlignVertical: 'top' },
  btn: { marginTop: 16, backgroundColor: '#C62828', borderRadius: 10, height: 44, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '700' },
});

