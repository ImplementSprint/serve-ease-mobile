import React, { useMemo, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  SafeAreaView, 
  StatusBar, 
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import { submitCustomerReview } from '@/services/customerFeedbackService';

export default function CustomerReviewScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ booking?: string; id?: string }>();
  
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const booking = useMemo(() => {
    if (!params.booking) return null;
    try {
      return JSON.parse(params.booking);
    } catch {
      return null;
    }
  }, [params.booking]);

  const bookingId = String(booking?.rawId || booking?.id || params.id || '').trim();
  const providerId = String(booking?.providerId || booking?.provider_id || booking?.provider?.id || '').trim();
  const providerName = String(booking?.provider?.name || booking?.providerName || 'your provider');
  const serviceName = String(booking?.service || 'service');

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert('Missing Rating', 'Please select a star rating before submitting.');
      return;
    }
    if (!user?.id || !bookingId || !providerId) {
      Alert.alert('Missing Booking', 'We could not find the completed booking for this review.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitCustomerReview({
        bookingId,
        reviewerId: user.id,
        providerId,
        rating,
        reviewText,
      });

      Alert.alert('Review Submitted', `Thanks for reviewing ${providerName} for ${serviceName}.`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Submit Failed', getErrorMessage(error, 'Could not submit your review.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave a Review</Text>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Review Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LEAVE A REVIEW</Text>
        </View>

        <View style={styles.reviewCard}>
          <Text style={styles.reviewPrompt}>How was your service?</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starButton}>
                <Ionicons 
                  name={star <= rating ? "star" : "star-outline"} 
                  size={36} 
                  color={star <= rating ? "#FFA000" : "#E0E0E0"} 
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textArea}
              placeholder="Write your review here (optional)"
              placeholderTextColor="#A0A0A0"
              multiline
              numberOfLines={4}
              value={reviewText}
              onChangeText={setReviewText}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.uploadBox}>
            <Ionicons name="camera-outline" size={28} color="#00C853" />
            <Text style={styles.uploadText}>Photo reviews coming soon</Text>
          </View>
        </View>

        <View style={styles.footerSpacer} />
      </ScrollView>

      {/* Submit Action */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} onPress={() => void handleSubmitReview()} disabled={isSubmitting}>
          <Text style={styles.submitButtonText}>{isSubmitting ? 'Submitting...' : 'Submit Review'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A', marginLeft: 8 },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 20 },
  sectionHeader: { marginBottom: 12, marginTop: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#999', letterSpacing: 1 },
  reviewCard: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#F0F0F5',
  },
  reviewPrompt: { fontSize: 16, fontWeight: '600', color: '#0D1B2A', textAlign: 'center', marginBottom: 16 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  starButton: { padding: 4 },
  textAreaContainer: {
    backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    padding: 12, marginBottom: 16,
  },
  textArea: { height: 100, fontSize: 15, color: '#0D1B2A' },
  uploadBox: {
    backgroundColor: '#F8FBF9', borderWidth: 1, borderColor: '#BDE4CD', borderStyle: 'dashed',
    borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
  },
  uploadText: { fontSize: 15, fontWeight: '600', color: '#00C853' },
  bottomContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 34,
    borderTopWidth: 1, borderTopColor: '#F0F0F0', shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10,
  },
  submitButton: {
    backgroundColor: '#00C853', borderRadius: 12, height: 52,
    justifyContent: 'center', alignItems: 'center', shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  submitButtonDisabled: { opacity: 0.7 },
  footerSpacer: { height: 100 },
});

