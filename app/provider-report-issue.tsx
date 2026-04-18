import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { createProviderDispute, createProviderSupportTicket } from '@/services/providerBookingService';
import { getErrorMessage } from '@/lib/error-handling';

export default function ProviderReportIssueScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!user?.id || !id) return;
    if (!issueType.trim() || !description.trim()) {
      Alert.alert('Missing Details', 'Please complete issue type and description.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createProviderSupportTicket(user.id, `Booking ${id}: ${issueType}`, description);
      await createProviderDispute(user.id, String(id), `${issueType}: ${description}`);
      Alert.alert('Submitted', 'Issue report has been submitted.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert('Failed', getErrorMessage(err, 'Could not submit issue report.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))}><Ionicons name="arrow-back" size={24} color="#0D1B2A" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Report Issue</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>Issue Type</Text>
        <TextInput style={styles.input} placeholder="e.g. Safety issue" value={issueType} onChangeText={setIssueType} />
        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textArea]} multiline placeholder="Describe the issue" value={description} onChangeText={setDescription} />
        <TouchableOpacity style={styles.btn} onPress={onSubmit} disabled={isSubmitting}>
          <Text style={styles.btnText}>{isSubmitting ? 'Please wait...' : 'Submit Report'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  content: { padding: 16 },
  label: { marginBottom: 8, fontWeight: '700', color: '#0D1B2A' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 10, height: 44, paddingHorizontal: 12, marginBottom: 14 },
  textArea: { minHeight: 120, textAlignVertical: 'top', paddingTop: 12 },
  btn: { height: 44, borderRadius: 10, backgroundColor: '#00B761', justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '700' },
});

