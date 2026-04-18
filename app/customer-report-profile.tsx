import React, { useState } from 'react';
import {
  Alert,
  Modal,
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
import { submitProviderProfileReport } from '@/services/customerFeedbackService';

const REPORT_REASONS = [
  'Fake profile',
  'Inappropriate behavior',
  'Spam or scam',
  'Harassment',
  'Other concern',
];

export default function CustomerReportProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { providerName = 'Provider', providerId = '', bookingId = '' } = useLocalSearchParams<{
    providerName?: string;
    providerId?: string;
    bookingId?: string;
  }>();
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = selectedReason.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Missing Reason', 'Please select a reason before submitting your report.');
      return;
    }
    if (!user?.id || !String(providerId).trim()) {
      Alert.alert('Missing Provider', 'We could not determine which provider you are reporting.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitProviderProfileReport({
        providerId: String(providerId),
        reporterId: user.id,
        bookingId: String(bookingId || ''),
        reason: selectedReason,
        details,
      });

      Alert.alert('Report Sent', `Your report for ${providerName} has been submitted.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Submit Failed', getErrorMessage(error, 'Could not submit this report.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Reporting Profile</Text>
          <Text style={styles.infoName}>{providerName}</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Reason</Text>
          <TouchableOpacity style={styles.selectButton} onPress={() => setModalVisible(true)}>
            <Text style={[styles.selectText, selectedReason && styles.selectedText]}>
              {selectedReason || 'Select a reason'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#7C8594" />
          </TouchableOpacity>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Additional Details</Text>
          <TextInput
            style={styles.detailsInput}
            placeholder="Tell us what happened..."
            placeholderTextColor="#A0A7B5"
            multiline
            numberOfLines={6}
            value={details}
            onChangeText={setDetails}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, (!canSubmit || isSubmitting) && styles.submitButtonDisabled]}
          onPress={() => void handleSubmit()}
          disabled={!canSubmit || isSubmitting}>
          <Text style={styles.submitButtonText}>{isSubmitting ? 'Submitting...' : 'Submit Report'}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select a Reason</Text>
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedReason(reason);
                  setModalVisible(false);
                }}>
                <Text style={styles.modalOptionText}>{reason}</Text>
                {selectedReason === reason ? (
                  <Ionicons name="checkmark-circle" size={20} color="#00B761" />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0D1B2A',
    marginLeft: 8,
  },
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 18,
    padding: 18,
    marginBottom: 22,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#98A2B3',
    marginBottom: 8,
  },
  infoName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0D1B2A',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D1B2A',
    marginBottom: 10,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
  },
  selectText: {
    fontSize: 15,
    color: '#A0A7B5',
  },
  selectedText: {
    color: '#0D1B2A',
  },
  detailsInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 16,
    minHeight: 140,
    fontSize: 15,
    color: '#0D1B2A',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  submitButton: {
    backgroundColor: '#00B761',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#97DDB8',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0D1B2A',
    marginBottom: 10,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalOptionText: {
    fontSize: 15,
    color: '#0D1B2A',
  },
});

