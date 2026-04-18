import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: '1', name: 'Home Maintenance & Repair', icon: 'hammer-outline' },
  { id: '2', name: 'Beauty, Wellness & Personal Care', icon: 'color-palette-outline' },
  { id: '3', name: 'Education & Professional Services', icon: 'school-outline' },
  { id: '4', name: 'Domestic & Cleaning Services', icon: 'sparkles-outline' },
  { id: '5', name: 'Pet Services', icon: 'paw-outline' },
  { id: '6', name: 'Events & Entertainment', icon: 'musical-notes-outline' },
  { id: '7', name: 'Automotive & Tech Support', icon: 'car-outline' },
];

export default function ProviderJoinScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.header}>
        <TouchableOpacity 
          onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} 
          style={styles.backButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>Be Your Own Boss</Text>
          <Text style={styles.subtitleText}>Your reliable partner for every service need.</Text>
        </View>

        {/* Image Grid */}
        <View style={styles.imageGrid}>
          <View style={styles.leftCol}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400&auto=format&fit=crop&q=60' }} 
              style={styles.largeImage} 
            />
          </View>
          <View style={styles.rightCol}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&auto=format&fit=crop&q=60' }} 
              style={styles.smallImage} 
            />
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&auto=format&fit=crop&q=60' }} 
              style={[styles.smallImage, { marginTop: 10 }]} 
            />
          </View>
        </View>

        {/* Independent Contractor Box */}
        <View style={styles.contractorBox}>
          <View style={styles.contractorHeader}>
            <View style={styles.shieldIcon}>
              <Ionicons name="shield-checkmark" size={20} color="#00C853" />
            </View>
            <View>
              <Text style={styles.contractorTitle}>Independent Contractor</Text>
              <TouchableOpacity>
                <Text style={styles.tcLink}>T&C Section 1 ↓</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.contractorText}>
            You are an independent contractor, not an employee of ServEase. You maintain <Text style={styles.boldText}>full control</Text> over your work schedule, methods, and the clients you choose to accept.
          </Text>
        </View>

        {/* Why Join Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>WHY JOIN SERVEASE</Text>
        </View>
        <View style={styles.benefitsGrid}>
          <View style={styles.benefitCard}>
            <View style={[styles.benefitIconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="time-outline" size={24} color="#00C853" />
            </View>
            <Text style={styles.benefitTitle}>Flexible Hours</Text>
            <Text style={styles.benefitDesc}>Choose when you want to work.</Text>
          </View>
          <View style={styles.benefitCard}>
            <View style={[styles.benefitIconContainer, { backgroundColor: '#E1F5FE' }]}>
              <Ionicons name="wallet-outline" size={24} color="#03A9F4" />
            </View>
            <Text style={styles.benefitTitle}>Direct Payments</Text>
            <Text style={styles.benefitDesc}>Keep 100% of your agreed service fee.</Text>
          </View>
          <View style={styles.benefitCard}>
            <View style={[styles.benefitIconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="flash-outline" size={24} color="#FF9800" />
            </View>
            <Text style={styles.benefitTitle}>Simple Setup</Text>
            <Text style={styles.benefitDesc}>No business registration needed to start.</Text>
          </View>
          <View style={styles.benefitCard}>
            <View style={[styles.benefitIconContainer, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="shield-outline" size={24} color="#9C27B0" />
            </View>
            <Text style={styles.benefitTitle}>Safety First</Text>
            <Text style={styles.benefitDesc}>Verified customers only.</Text>
          </View>
        </View>

        {/* Service Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>SERVICE CATEGORIES</Text>
          <Text style={styles.sectionSubtitle}>7 categories available for individuals to join (T&C Section 2)</Text>
        </View>
        <View style={styles.categoryList}>
          {CATEGORIES.map((cat) => (
            <View key={cat.id} style={styles.categoryItem}>
              <View style={styles.categoryIconContainer}>
                <Ionicons name={cat.icon as any} size={20} color="#00C853" />
              </View>
              <Text style={styles.categoryName}>{cat.name}</Text>
            </View>
          ))}
        </View>

        {/* Earnings & Fees */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>EARNINGS & FEES</Text>
        </View>
        <View style={styles.infoCard}>
          <View style={styles.infoIconBox}>
            <Ionicons name="cash-outline" size={24} color="#00C853" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Keep Your Service Fees</Text>
            <Text style={styles.infoText}>
              You keep <Text style={styles.highlightText}>100%</Text> of the agreed-upon service fee. Payment is transferred to your payout method within 1—3 business days.
            </Text>
            <Text style={styles.infoSubtitle}>T&C Section 5</Text>
          </View>
        </View>
        <View style={[styles.infoCard, { marginTop: 15 }]}>
          <View style={[styles.infoIconBox, { backgroundColor: '#FFF9C4' }]}>
            <Ionicons name="car-outline" size={24} color="#FBC02D" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Transport Fees May Apply</Text>
            <Text style={styles.infoText}>
              Additional transport fees may apply for services beyond a 10km radius from your registered area. These must be disclosed and agreed upon by the Customer before the service begins.
            </Text>
            <Text style={styles.infoSubtitle}>T&C Section 6</Text>
          </View>
        </View>

        {/* Community Stats */}
        <View style={styles.communityCard}>
          <Text style={styles.communityLabel}>JOIN A GROWING COMMUNITY</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={20} color="#00C853" />
              <Text style={styles.statVal}>5,200+</Text>
              <Text style={styles.statLab}>Active Providers</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="star-outline" size={20} color="#00C853" />
              <Text style={styles.statVal}>4.8★</Text>
              <Text style={styles.statLab}>Average Rating</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={20} color="#00C853" />
              <Text style={styles.statVal}>28K+</Text>
              <Text style={styles.statLab}>Monthly Bookings</Text>
            </View>
          </View>
        </View>

        {/* Legal */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>LEGAL</Text>
        </View>
        <TouchableOpacity style={styles.legalItem}>
          <View style={styles.legalIconBox}>
            <Ionicons name="document-text-outline" size={20} color="#666" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.legalTitle}>View Terms & Conditions</Text>
            <Text style={styles.legalSubtitle}>Independent contractor status, fees & policies</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.legalItem}>
          <View style={styles.legalIconBox}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.legalTitle}>View Privacy Policy</Text>
            <Text style={styles.legalSubtitle}>Location data, security & your rights</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        {/* Testimonial */}
        <View style={styles.testimonialCard}>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons key={s} name="star" size={16} color="#FFA000" />
            ))}
          </View>
          <Text style={styles.testimonialText}>
            &quot;I used to struggle finding clients. Now I get 3—5 bookings a day without leaving home to look for work. ServEase changed everything for me.&quot;
          </Text>
          <View style={styles.testimonialFooter}>
            <View style={styles.testimonialAvatar}>
              <Text style={styles.avatarLetter}>R</Text>
            </View>
            <View>
              <Text style={styles.testimonialName}>Rico M.</Text>
              <Text style={styles.testimonialTitle}>Aircon Technician · Makati City</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.applyButton}
          onPress={() => router.push('/provider-signup' as any)}
        >
          <Text style={styles.applyButtonText}>Apply to be a Provider</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingTop: 10,
  },
  titleSection: {
    marginBottom: 25,
  },
  titleText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0D1B2A',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
  },
  imageGrid: {
    flexDirection: 'row',
    height: 220,
    marginBottom: 25,
  },
  leftCol: {
    flex: 1.5,
    marginRight: 10,
  },
  rightCol: {
    flex: 1,
  },
  largeImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  smallImage: {
    width: '100%',
    height: '48%',
    borderRadius: 20,
  },
  contractorBox: {
    backgroundColor: '#E8FBF2',
    padding: 20,
    borderRadius: 25,
    marginBottom: 30,
  },
  contractorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shieldIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#00C853',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  contractorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D1B2A',
  },
  tcLink: {
    fontSize: 12,
    color: '#00C853',
    marginTop: 2,
    fontWeight: '600',
  },
  contractorText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
  },
  boldText: {
    fontWeight: 'bold',
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  benefitCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 20,
    marginBottom: 15,
  },
  benefitIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1B1E',
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  categoryList: {
    marginBottom: 30,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  categoryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1B1E',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 20,
  },
  infoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1B1E',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  highlightText: {
    color: '#00C853',
    fontWeight: 'bold',
  },
  infoSubtitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
  },
  communityCard: {
    backgroundColor: '#161B22',
    padding: 25,
    borderRadius: 25,
    marginTop: 30,
    marginBottom: 30,
  },
  communityLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#999',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLab: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  legalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  legalTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1B1E',
  },
  legalSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  testimonialCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 25,
    borderRadius: 25,
    marginTop: 15,
    marginBottom: 40,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  testimonialText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  testimonialFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testimonialAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00C853',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  avatarLetter: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  testimonialName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1B1E',
  },
  testimonialTitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#fff',
    paddingHorizontal: 25,
    paddingTop: 15,
    paddingBottom: 35,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  applyButton: {
    backgroundColor: '#00C853',
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
});

