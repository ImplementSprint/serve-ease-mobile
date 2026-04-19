import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, StatusBar, TextInput, Platform, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import { createProviderSupportTicket } from '@/services/supportService';

const categories = ['All', 'Payments', 'Bookings', 'Verification'];

const FAQ_DATA = [
  {
    id: '1',
    question: 'How do I get paid?',
    answer: 'Once a booking is completed and confirmed by the customer, your earnings are automatically credited to your registered payout method. Payouts are processed every Monday and Thursday. You can track all your earnings and payout history from the Earnings tab on your dashboard. Make sure your GCash, bank account, or e-wallet details are up to date under Payout Methods in Settings.',
    category: 'Payments & Earnings',
    icon: 'cash-outline',
    iconBg: '#FFF9E6',
    iconColor: '#FFB800',
    tagBg: '#FFF9E6',
    tagColor: '#FFB800',
  },
  {
    id: '2',
    question: 'How do booking cancellations work?',
    answer: 'If a customer cancels a booking more than 24 hours before the scheduled time, no cancellation fee applies. Cancellations within 24 hours may result in a partial payment to you as compensation for the late notice. If you need to cancel, please do so as early as possible through the Bookings tab — repeated provider cancellations may affect your rating and visibility on the platform.',
    category: 'Managing Bookings',
    icon: 'book-outline',
    iconBg: '#E6F0FF',
    iconColor: '#007AFF',
    tagBg: '#E6F0FF',
    tagColor: '#007AFF',
  },
  {
    id: '3',
    question: 'How does profile verification work?',
    answer: "Profile verification helps build trust with customers. You'll need to submit a valid Philippine government ID (e.g., PhilSys, Passport, Driver's License) and a clear selfie for identity matching. Verification is reviewed within 1-3 business days. Verified providers receive a badge on their profile and are prioritized in search results. You can check your verification status under More > Settings > Profile & Verification.",
    category: 'Profile & Verification',
    icon: 'shield-checkmark-outline',
    iconBg: '#F2EBFF',
    iconColor: '#9747FF',
    tagBg: '#F2EBFF',
    tagColor: '#9747FF',
  },
  {
    id: '4',
    question: 'How do I set or update my service rates?',
    answer: 'Go to your Provider Dashboard, tap on More, then Settings, then Service Configuration. From there you can update your base rate, price unit (per hour, per project, or per sqm), and estimated duration for each service. Changes take effect immediately and will be reflected on your public profile. We recommend keeping your rates competitive by checking similar providers in your area.',
    category: 'Payments & Earnings',
    icon: 'cash-outline',
    iconBg: '#FFF9E6',
    iconColor: '#FFB800',
    tagBg: '#FFF9E6',
    tagColor: '#FFB800',
  },
];

const FAQItem = ({ item, expanded, onToggle }: { item: typeof FAQ_DATA[0], expanded: boolean, onToggle: () => void }) => (
  <TouchableOpacity 
    style={[styles.faqCard, expanded && styles.expandedFaqCard]} 
    activeOpacity={0.7}
    onPress={onToggle}
  >
    <View style={styles.faqHeader}>
      <View style={[styles.faqIconContainer, { backgroundColor: item.iconBg }]}>
        <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
      </View>
      <View style={styles.faqContent}>
        <Text style={styles.faqQuestion}>{item.question}</Text>
        <View style={[styles.categoryTag, { backgroundColor: item.tagBg }]}>
          <Text style={[styles.categoryTagText, { color: item.tagColor }]}>{item.category}</Text>
        </View>
      </View>
      <Ionicons 
        name={expanded ? "chevron-up" : "chevron-down"} 
        size={18} 
        color={expanded ? "#00B761" : "#CCC"} 
      />
    </View>
    
    {expanded && (
      <View style={styles.faqAnswerContainer}>
        <View style={styles.faqAnswerDivider} />
        <Text style={styles.faqAnswerText}>{item.answer}</Text>
      </View>
    )}
  </TouchableOpacity>
);

export default function ProviderHelpScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openSupportChannel = async (channel: 'email' | 'facebook') => {
    const url =
      channel === 'email'
        ? 'mailto:support@servease.ph?subject=ServEase%20Provider%20Support'
        : 'https://facebook.com/';

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unavailable', 'Could not open that support channel on this device.');
    }
  };

  const handleSubmitSupport = async () => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please sign in before submitting a support request.');
      return;
    }
    if (!supportSubject.trim() || !supportMessage.trim()) {
      Alert.alert('Missing Details', 'Please add both a subject and message for support.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createProviderSupportTicket(
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      
      {/* Green Header Section */}
      <View style={styles.greenHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help Center</Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#AAA" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search help articles..."
            placeholderTextColor="#AAA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Category Selector */}
        <View style={styles.categoryContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContent}>
            {categories.map((cat) => (
              <TouchableOpacity 
                key={cat} 
                style={[styles.categoryChip, activeCategory === cat && styles.activeCategoryChip]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.categoryText, activeCategory === cat && styles.activeCategoryText]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <Text style={styles.sectionSubtitle}>Tap a question to see the answer</Text>

          {FAQ_DATA.filter(item => 
            (activeCategory === 'All' || item.category.includes(activeCategory)) &&
            (item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
             item.answer.toLowerCase().includes(searchQuery.toLowerCase()))
          ).map((item) => (
            <FAQItem 
              key={item.id} 
              item={item} 
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
          ))}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Still need help?</Text>
          <Text style={styles.sectionSubtitle}>Our team typically responds within 24 hours</Text>

          {/* Support Options */}
          <TouchableOpacity style={styles.supportCard} onPress={() => void openSupportChannel('email')}>
            <View style={[styles.supportIconContainer, { backgroundColor: '#E8FBF2' }]}>
              <Ionicons name="mail-outline" size={24} color="#00B761" />
            </View>
            <View style={styles.supportInfo}>
              <Text style={styles.supportLabel}>Email Support</Text>
              <Text style={styles.supportValue}>support@servease.ph</Text>
            </View>
            <Ionicons name="open-outline" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportCard} onPress={() => void openSupportChannel('facebook')}>
            <View style={[styles.supportIconContainer, { backgroundColor: '#E7F3FF' }]}>
              <Ionicons name="logo-facebook" size={24} color="#1877F2" />
            </View>
            <View style={styles.supportInfo}>
              <Text style={styles.supportLabel}>Message us on Facebook</Text>
              <Text style={styles.supportSublabel}>Usually replies within a few hours</Text>
            </View>
            <Ionicons name="open-outline" size={20} color="#CCC" />
          </TouchableOpacity>

          <View style={styles.ticketCard}>
            <Text style={styles.ticketTitle}>Send a provider support request</Text>
            <Text style={styles.ticketSubtitle}>
              Use this for payout, verification, booking, or account concerns that need staff review.
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
              placeholder="Describe the issue"
              placeholderTextColor="#98A2B3"
              multiline
              textAlignVertical="top"
              value={supportMessage}
              onChangeText={setSupportMessage}
            />

            <TouchableOpacity
              style={[styles.ticketButton, isSubmitting && styles.ticketButtonDisabled]}
              onPress={() => void handleSubmitSupport()}
              disabled={isSubmitting}
            >
              <Text style={styles.ticketButtonText}>
                {isSubmitting ? 'Sending...' : 'Submit Support Ticket'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>ServEase Help Center v1.0</Text>
          <View style={styles.footerSpacer} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  greenHeader: {
    backgroundColor: '#00B761',
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    paddingBottom: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 24,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0D1B2A',
  },
  scrollContainer: {
    flex: 1,
  },
  categoryContainer: {
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryContent: {
    paddingHorizontal: 20,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F2F3F5',
    marginRight: 12,
  },
  activeCategoryChip: {
    backgroundColor: '#00B761',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  activeCategoryText: {
    color: '#FFF',
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0D1B2A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
  },
  faqCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  expandedFaqCard: {
    borderColor: '#00B761',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faqIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  faqContent: {
    flex: 1,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D1B2A',
    marginBottom: 6,
  },
  faqAnswerContainer: {
    marginTop: 16,
  },
  faqAnswerDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 16,
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 32,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  supportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  supportInfo: {
    flex: 1,
  },
  supportLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D1B2A',
    marginBottom: 2,
  },
  supportValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00B761',
  },
  supportSublabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  ticketCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginTop: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F0F0F0',
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
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0D1B2A',
    marginBottom: 12,
    backgroundColor: '#FFF',
  },
  ticketMessageInput: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingTop: 14,
    fontSize: 15,
    color: '#0D1B2A',
    marginBottom: 14,
    backgroundColor: '#FFF',
  },
  ticketButton: {
    height: 50,
    borderRadius: 12,
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
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#CCC',
    marginVertical: 24,
  },
  footerSpacer: {
    height: 40,
  },
});
