import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
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
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import { createCustomerSupportTicket } from '@/services/supportService';

const FAQ_CATEGORIES = ['All', 'Payments', 'Bookings', 'Safety', 'Account', 'Other'];

const FAQ_DATA = [
  {
    id: '1',
    question: 'How do I cancel my booking?',
    answer:
      'Open My Bookings, select the booking you want to cancel, then tap Cancel Booking. Free cancellation applies up to 24 hours before your scheduled service.',
    category: 'Bookings',
    icon: 'calendar-outline',
    iconBg: '#E8F1FF',
    iconColor: '#4C84FF',
    tagBg: '#EEF4FF',
    tagColor: '#4C84FF',
  },
  {
    id: '2',
    question: 'When do I get my refund?',
    answer:
      'Refunds are usually processed within 5 to 10 business days depending on your payment method. You will receive an update once the refund has been approved and released.',
    category: 'Payments',
    icon: 'cash-outline',
    iconBg: '#FFF5E8',
    iconColor: '#FF9800',
    tagBg: '#FFF5E8',
    tagColor: '#FF9800',
  },
  {
    id: '3',
    question: 'How does the identity verification work?',
    answer:
      'Verified providers submit a valid government ID and supporting documents for review. Once approved, a verification badge appears on their profile so customers can book with more confidence.',
    category: 'Safety',
    icon: 'shield-checkmark-outline',
    iconBg: '#F3ECFF',
    iconColor: '#8B5CF6',
    tagBg: '#F3ECFF',
    tagColor: '#8B5CF6',
  },
  {
    id: '4',
    question: 'How do I reschedule a booking?',
    answer:
      'Go to My Bookings, open the booking details, and choose the reschedule option if the provider still allows schedule changes for that service.',
    category: 'Bookings',
    icon: 'time-outline',
    iconBg: '#E8F1FF',
    iconColor: '#4C84FF',
    tagBg: '#EEF4FF',
    tagColor: '#4C84FF',
  },
  {
    id: '5',
    question: 'What payment methods are accepted?',
    answer:
      'ServEase supports cash, selected e-wallets, and card payments depending on the service and provider. Available payment methods are shown before you confirm your booking.',
    category: 'Payments',
    icon: 'card-outline',
    iconBg: '#FFF5E8',
    iconColor: '#FF9800',
    tagBg: '#FFF5E8',
    tagColor: '#FF9800',
  },
  {
    id: '6',
    question: 'How do I know if a provider is verified?',
    answer:
      'Verified providers have a badge on their profile and may show supporting credentials such as licenses or permits. You can review those details before booking.',
    category: 'Safety',
    icon: 'shield-outline',
    iconBg: '#F3ECFF',
    iconColor: '#8B5CF6',
    tagBg: '#F3ECFF',
    tagColor: '#8B5CF6',
  },
  {
    id: '7',
    question: 'How can I update my profile information?',
    answer:
      'Open the More tab, tap Edit Profile, update your details, and save your changes. Your updated information will be used for future bookings and support requests.',
    category: 'Account',
    icon: 'person-outline',
    iconBg: '#E8FBF2',
    iconColor: '#00B761',
    tagBg: '#E8FBF2',
    tagColor: '#00B761',
  },
  {
    id: '8',
    question: 'Why am I not receiving notifications?',
    answer:
      'Make sure notifications are enabled both in the app settings and on your device. You can also review your notification preferences from the More tab.',
    category: 'Account',
    icon: 'notifications-outline',
    iconBg: '#E8FBF2',
    iconColor: '#00B761',
    tagBg: '#E8FBF2',
    tagColor: '#00B761',
  },
  {
    id: '9',
    question: 'How do I contact support for a different issue?',
    answer:
      'If your concern does not fit the listed help articles, you can contact support through email or Facebook and include your booking reference for faster assistance.',
    category: 'Other',
    icon: 'help-circle-outline',
    iconBg: '#F3F4F6',
    iconColor: '#6B7280',
    tagBg: '#F3F4F6',
    tagColor: '#6B7280',
  },
];

const SUPPORT_OPTIONS = [
  {
    id: 'email',
    icon: 'mail-outline',
    iconBg: '#E8FBF2',
    iconColor: '#00B761',
    title: 'Email Support',
    subtitle: 'support@servease.ph',
  },
  {
    id: 'facebook',
    icon: 'logo-facebook',
    iconBg: '#E8F1FF',
    iconColor: '#1877F2',
    title: 'Message us on Facebook',
    subtitle: 'Usually replies within a few hours',
  },
];

function FAQCard({
  item,
  expanded,
  onToggle,
}: {
  item: (typeof FAQ_DATA)[0];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={styles.faqCard} activeOpacity={0.8} onPress={onToggle}>
      <View style={styles.faqHeader}>
        <View style={[styles.faqIconWrap, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
        </View>
        <View style={styles.faqTextWrap}>
          <Text style={styles.faqQuestion}>{item.question}</Text>
          <View style={[styles.faqTag, { backgroundColor: item.tagBg }]}>
            <Text style={[styles.faqTagText, { color: item.tagColor }]}>{item.category}</Text>
          </View>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#A0A7B5" />
      </View>

      {expanded ? <Text style={styles.faqAnswer}>{item.answer}</Text> : null}
    </TouchableOpacity>
  );
}

export default function HelpCenterScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return FAQ_DATA.filter((item) => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesQuery =
        !query ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, searchQuery]);

  const handleSupportCardPress = async (optionId: string) => {
    const url =
      optionId === 'email'
        ? 'mailto:support@servease.ph?subject=ServEase%20Support'
        : 'https://facebook.com/';

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unavailable', 'Could not open that support channel on this device.');
    }
  };

  const handleSubmitSupportTicket = async () => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please sign in first before submitting a support request.');
      return;
    }
    if (!supportSubject.trim() || !supportMessage.trim()) {
      Alert.alert('Missing Details', 'Please add both a subject and message for support.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCustomerSupportTicket(
        user.id,
        supportSubject.trim(),
        supportMessage.trim(),
        activeCategory === 'All' ? 'General' : activeCategory
      );
      Alert.alert('Support Request Sent', 'Our team will review your request and get back to you.', [
        {
          text: 'OK',
          onPress: () => {
            setSupportSubject('');
            setSupportMessage('');
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Submit Failed', getErrorMessage(error, 'Could not submit your support request.'));
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
        <Text style={styles.headerTitle}>Help Center</Text>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={22} color="#A0A7B5" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search help articles..."
            placeholderTextColor="#A0A7B5"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}>
          {FAQ_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[styles.categoryChip, activeCategory === category && styles.categoryChipActive]}
              onPress={() => setActiveCategory(category)}>
              <Text
                style={[
                  styles.categoryChipText,
                  activeCategory === category && styles.categoryChipTextActive,
                ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filteredFaqs.map((item) => (
          <FAQCard
            key={item.id}
            item={item}
            expanded={expandedId === item.id}
            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
          />
        ))}

        <View style={styles.divider} />

        <Text style={styles.supportTitle}>Still need help?</Text>
        <Text style={styles.supportSubtitle}>Our team typically responds within 24 hours</Text>

        {SUPPORT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.supportCard}
            activeOpacity={0.8}
            onPress={() => void handleSupportCardPress(option.id)}
          >
            <View style={[styles.supportIconWrap, { backgroundColor: option.iconBg }]}>
              <Ionicons name={option.icon as any} size={24} color={option.iconColor} />
            </View>
            <View style={styles.supportTextWrap}>
              <Text style={styles.supportCardTitle}>{option.title}</Text>
              <Text
                style={[
                  styles.supportCardSubtitle,
                  option.id === 'email' && styles.supportCardSubtitleAccent,
                ]}>
                {option.subtitle}
              </Text>
            </View>
            <Ionicons name="open-outline" size={20} color="#B0B7C3" />
          </TouchableOpacity>
        ))}

        <View style={styles.ticketCard}>
          <Text style={styles.ticketTitle}>Send a support request</Text>
          <Text style={styles.ticketSubtitle}>
            Share your concern here and we will respond through the support queue.
          </Text>

          <TextInput
            style={styles.ticketInput}
            placeholder="Subject"
            placeholderTextColor="#98A2B3"
            value={supportSubject}
            onChangeText={setSupportSubject}
          />
          <TextInput
            style={styles.ticketMessageInput}
            placeholder="Describe your concern"
            placeholderTextColor="#98A2B3"
            multiline
            textAlignVertical="top"
            value={supportMessage}
            onChangeText={setSupportMessage}
          />

          <TouchableOpacity
            style={[styles.ticketButton, isSubmitting && styles.ticketButtonDisabled]}
            onPress={() => void handleSubmitSupportTicket()}
            disabled={isSubmitting}
          >
            <Text style={styles.ticketButtonText}>
              {isSubmitting ? 'Sending...' : 'Submit Support Ticket'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
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
  searchSection: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 62,
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#0D1B2A',
  },
  categoriesRow: {
    paddingTop: 14,
    paddingRight: 8,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 10,
  },
  categoryChipActive: {
    backgroundColor: '#00B761',
    borderColor: '#00B761',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667085',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 22,
    paddingBottom: 36,
  },
  faqCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EAECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faqIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  faqTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
  },
  faqTag: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
  },
  faqTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 22,
    color: '#5B6472',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  divider: {
    height: 1,
    backgroundColor: '#E4E7EC',
    marginVertical: 26,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  supportSubtitle: {
    fontSize: 14,
    color: '#98A2B3',
    marginTop: 8,
    marginBottom: 18,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  supportIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  supportTextWrap: {
    flex: 1,
  },
  supportCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  supportCardSubtitle: {
    fontSize: 14,
    color: '#98A2B3',
    marginTop: 4,
  },
  supportCardSubtitleAccent: {
    color: '#00B761',
  },
  ticketCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EAECEF',
    marginTop: 8,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  ticketSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#667085',
    marginTop: 6,
    marginBottom: 14,
  },
  ticketInput: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0D1B2A',
    backgroundColor: '#FFF',
    marginBottom: 12,
  },
  ticketMessageInput: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingTop: 14,
    fontSize: 15,
    color: '#0D1B2A',
    backgroundColor: '#FFF',
    marginBottom: 14,
  },
  ticketButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#00B761',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketButtonDisabled: {
    opacity: 0.7,
  },
  ticketButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});

