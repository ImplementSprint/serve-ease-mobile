import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCustomerSession } from '@/lib/customer-session';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { NotificationBadge } from '@/components/ui/notification-badge';
import { getCustomerBookings } from '@/services/bookingService';
import { getServiceCategories } from '@/services/marketplaceService';
import { getErrorMessage } from '@/lib/error-handling';
import { TOP_LEVEL_CATEGORY_ITEMS } from '@/constants/service-taxonomy';
import type { Payment } from '@/src/types/database.interfaces';
import {
  getCustomerChatSummaries,
  subscribeToChatSummaries,
  type ChatSummary,
} from '@/services/chatService';
import { getCustomerBookingPresentation } from '@/lib/booking-status';
import { getPaymentsByBookingIds } from '@/services/paymentService';
import { resolveDisplayedBookingTotal } from '@/lib/booking-amount';
import {
  findServiceForBooking,
  loadProviderServicesForFallback,
  type BookingServiceFallback,
} from '@/lib/booking-service-fallback';
import { BookingCarousel } from '@/components/BookingCarousel';
import { CategoryGrid } from '@/components/CategoryGrid';

const { width } = Dimensions.get('window');

const CATEGORY_ICON_RULES: { keywords: string[]; icon: string }[] = [
  { keywords: ['home', 'repair', 'maintenance', 'plumb', 'electric', 'carpentry', 'paint'], icon: 'construct-outline' },
  { keywords: ['beauty', 'wellness', 'hair', 'makeup', 'nails', 'massage'], icon: 'sparkles-outline' },
  { keywords: ['education', 'teacher', 'tutor', 'music', 'language'], icon: 'school-outline' },
  { keywords: ['clean', 'laundry', 'domestic'], icon: 'home-outline' },
  { keywords: ['pet', 'grooming', 'walking'], icon: 'paw-outline' },
  { keywords: ['event', 'photo', 'dj', 'catering'], icon: 'camera-outline' },
  { keywords: ['automotive', 'car', 'mechanic', 'tech', 'computer', 'mobile repair'], icon: 'car-outline' },
];

function getCategoryIconName(name: string) {
  const normalized = String(name || '').trim().toLowerCase();
  for (const rule of CATEGORY_ICON_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.icon;
    }
  }
  return 'apps-outline';
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentCustomer } = useCustomerSession();
  const unreadNotifications = useUnreadNotifications();
  const [categories, setCategories] = useState<{ id: string; name: string; icon_name?: string }[]>(TOP_LEVEL_CATEGORY_ITEMS);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [paymentByBookingId, setPaymentByBookingId] = useState<Record<string, Payment | null>>({});
  const [servicesByProviderId, setServicesByProviderId] = useState<Record<string, BookingServiceFallback[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const firstName =
    currentCustomer?.profile?.fullName?.trim().split(/\s+/)[0] ||
    currentCustomer?.signupName?.trim().split(/\s+/)[0] ||
    'Customer';

  const loadHomeData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [categoryRows, bookingRows] = await Promise.all([
        getServiceCategories(),
        user ? getCustomerBookings(user.id) : Promise.resolve([]),
      ]);

      const normalizedCategories = (categoryRows || []).filter((row) => row.is_active !== false);
      const parentCategories = normalizedCategories.filter((row) => !row.parent_id || row.category_level === 'category');
      const categoriesForGrid = (parentCategories.length ? parentCategories : normalizedCategories)
        .map((row) => ({
          id: String(row.id),
          name: String(row.name || '').trim(),
          icon_name: getCategoryIconName(row.name),
        }))
        .filter((row) => row.id && row.name);

      setCategories(categoriesForGrid.length ? categoriesForGrid : TOP_LEVEL_CATEGORY_ITEMS);
      const recentRows = (bookingRows || []).slice(0, 5);
      setRecentBookings(recentRows);

      const unresolvedBookingIds = recentRows
        .filter((row: any) => resolveDisplayedBookingTotal(row, null) <= 0)
        .map((row: any) => String(row?.id || '').trim())
        .filter(
          (id: string, index: number, rows: string[]) =>
            Boolean(id) && rows.indexOf(id) === index,
        );

      const paymentMap = unresolvedBookingIds.length
        ? await getPaymentsByBookingIds(unresolvedBookingIds)
        : {};
      setPaymentByBookingId(paymentMap);

      const unresolvedAfterPayment = recentRows.filter((row: any) => {
        const bookingId = String(row?.id || '').trim();
        return resolveDisplayedBookingTotal(row, paymentMap[bookingId] || null) <= 0;
      });
      const unresolvedProviderIds = unresolvedAfterPayment
        .map((row: any) => String(row?.provider_id || '').trim())
        .filter(
          (providerId: string, index: number, rows: string[]) =>
            Boolean(providerId) && rows.indexOf(providerId) === index,
        );
      const providerServicesEntries = await Promise.all(
        unresolvedProviderIds.map(async (providerId) => {
          const services = await loadProviderServicesForFallback(providerId);
          return [providerId, services] as const;
        }),
      );
      setServicesByProviderId(Object.fromEntries(providerServicesEntries));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load home data.'));
      setPaymentByBookingId({});
      setServicesByProviderId({});
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadHomeData();
    }, [loadHomeData])
  );

  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      void loadHomeData();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [loadHomeData, user?.id]);

  const loadChatSummaries = useCallback(async () => {
    if (!user?.id) {
      setChatSummaries([]);
      return;
    }

    try {
      const rows = await getCustomerChatSummaries(user.id);
      setChatSummaries(rows);
    } catch {
      setChatSummaries([]);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadChatSummaries();
  }, [loadChatSummaries]);

  useEffect(() => {
    if (!user?.id) return;

    return subscribeToChatSummaries({
      role: 'customer',
      userId: user.id,
      onChange: () => {
        void loadChatSummaries();
      },
    });
  }, [loadChatSummaries, user?.id]);

  const mappedBookings = useMemo(
    () => {
      const seen = new Set<string>();

      return recentBookings.reduce((acc: any[], b: any) => {
        const presentation = getCustomerBookingPresentation(b?.status);
        if (presentation.normalizedStatus !== 'completed') {
          return acc;
        }

        const providerId = String(b?.provider_id || '').trim();
        const serviceId = String(b?.service_id || '').trim();
        const matchedService = findServiceForBooking(
          b,
          servicesByProviderId[providerId] || [],
        );
        const serviceTitle = String(
          b?.service?.title || b?.service_name || matchedService?.title || 'Service Booking',
        ).trim();
        const providerName = String(b?.provider?.full_name || 'Service Provider').trim();
        const uniqueKey = `${providerId || providerName}::${serviceId || serviceTitle}`;

        if (seen.has(uniqueKey)) {
          return acc;
        }

        const bookingId = String(b?.id || '').trim();
        const enrichedBooking = {
          ...b,
          service:
            b?.service ||
            (matchedService
              ? { title: matchedService.title, price: matchedService.price }
              : undefined),
          service_price: (b as any)?.service_price ?? matchedService?.price,
          hourly_rate:
            b?.hourly_rate ?? (matchedService?.hourly_rate ?? undefined),
          flat_rate:
            (b as any)?.flat_rate ?? (matchedService?.flat_rate ?? undefined),
        };
        const resolvedAmount = resolveDisplayedBookingTotal(
          enrichedBooking,
          paymentByBookingId[bookingId] || null,
        );

        seen.add(uniqueKey);
        acc.push({
          id: bookingId || String(b.id),
          providerId,
          serviceId,
          service: serviceTitle,
          provider: providerName,
          price: `P${resolvedAmount.toFixed(2)}`,
          phone: b?.provider?.contact_number || '',
          address: String(b?.service_address || '').trim(),
          date: b?.scheduled_at || '',
        });
        return acc;
      }, []);
    },
    [paymentByBookingId, recentBookings, servicesByProviderId]
  );

  const chatSummaryMap = useMemo(
    () => new Map(chatSummaries.map((summary) => [summary.bookingId, summary])),
    [chatSummaries]
  );

  const prioritizedBookings = useMemo(
    () =>
      [...mappedBookings].sort((left, right) => {
        const leftUnread = chatSummaryMap.get(left.id)?.unreadCount || 0;
        const rightUnread = chatSummaryMap.get(right.id)?.unreadCount || 0;
        return rightUnread - leftUnread;
      }),
    [chatSummaryMap, mappedBookings]
  );

  const onBookingPress = useCallback((item: any) => {
    const chatSummary = chatSummaryMap.get(item.id);
    const needsReply = Boolean((chatSummary?.unreadCount || 0) > 0);

    if (needsReply) {
      router.push({
        pathname: '/customer-chat',
        params: {
          id: item.id,
          providerName: item.provider,
          serviceName: item.service,
          phone: item.phone,
        },
      } as any);
    } else {
      router.push({
        pathname: '/customer-book-again',
        params: {
          booking: JSON.stringify({
            id: item.id,
            rawId: item.id,
            providerId: item.providerId,
            serviceId: item.serviceId,
            service: item.service,
            providerName: item.provider,
            price: item.price,
            address: item.address,
            date: item.date,
            provider: {
              name: item.provider,
              phone: item.phone,
              specialty: item.service,
            },
          }),
        },
      } as any);
    }
  }, [chatSummaryMap, router]);

  const onCategoryPress = useCallback((name: string, categoryId: string) => {
    router.push({
      pathname: '/category-details',
      params: { title: name, categoryId },
    });
  }, [router]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#004D40', '#00C853']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greetingText}>Good Day,</Text>
                <Text style={styles.userNameText}>{firstName} 👋</Text>
              </View>
              <TouchableOpacity 
                style={styles.notificationBtn} 
                onPress={() => router.push('/notifications' as any)}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications" size={24} color="#fff" />
                <NotificationBadge
                  count={unreadNotifications}
                  top={-2}
                  right={-2}
                  borderColor="#004D40"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.searchBarTrigger}
              onPress={() => {/* Navigation to search */}}
              activeOpacity={0.9}
            >
              <Ionicons name="search" size={20} color="#94A3B8" />
              <Text style={styles.searchPlaceholder}>Search for services...</Text>
              <View style={styles.searchBadge}>
                <Ionicons name="options-outline" size={18} color="#00C853" />
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Transparent spacer for header overlap if needed, but here we just flow */}
        
        {isLoading && categories.length === 0 ? (
          <ActivityIndicator size="large" color="#00C853" style={{ marginTop: 40 }} />
        ) : (
          <View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Book it again</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/bookings' as any)}>
                <Text style={styles.seeAllText}>View History</Text>
              </TouchableOpacity>
            </View>

            {prioritizedBookings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color="#E2E8F0" />
                <Text style={styles.emptyText}>No recent bookings found.</Text>
              </View>
            ) : (
              <BookingCarousel 
                bookings={prioritizedBookings} 
                chatSummaryMap={chatSummaryMap}
                onPress={onBookingPress}
              />
            )}

            <View style={[styles.sectionHeader, { marginTop: 12 }]}>
              <Text style={styles.sectionTitle}>Explore Categories</Text>
            </View>
            
            <CategoryGrid 
              categories={categories} 
              onPress={onCategoryPress} 
            />

            <TouchableOpacity 
              style={styles.ctaBanner} 
              onPress={() => router.push('/provider-join' as any)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#0D1B2A', '#1B263B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <View style={styles.ctaContent}>
                  <View style={styles.ctaTextSection}>
                    <Text style={styles.ctaTitle}>Join the ServEase Team</Text>
                    <Text style={styles.ctaSub}>Become a verified provider and start earning today.</Text>
                  </View>
                  <View style={styles.ctaIconBox}>
                    <Ionicons name="rocket-outline" size={32} color="#00C853" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.footerSpacer} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  headerGradient: {
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#004D40',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  headerContent: {
    paddingHorizontal: 24,
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 16,
    marginBottom: 24,
  },
  greetingText: { 
    color: '#B2DFDB', 
    fontSize: 14,
    fontWeight: '500',
  },
  userNameText: { 
    color: '#fff', 
    fontSize: 24, 
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  notificationBtn: { 
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchBarTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 12,
    color: '#94A3B8',
    fontSize: 15,
  },
  searchBadge: {
    width: 32,
    height: 32,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { 
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  seeAllText: {
    fontSize: 14,
    color: '#00C853',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  emptyText: { 
    color: '#94A3B8', 
    marginTop: 12,
    fontSize: 14,
  },
  errorText: { 
    color: '#EF4444', 
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  ctaBanner: { 
    marginTop: 32, 
    borderRadius: 24, 
    overflow: 'hidden',
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaGradient: {
    padding: 24,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaTextSection: {
    flex: 1,
    marginRight: 16,
  },
  ctaTitle: { 
    color: '#fff', 
    fontWeight: '800', 
    fontSize: 18,
    marginBottom: 8,
  },
  ctaSub: { 
    color: '#94A3B8', 
    fontSize: 13,
    lineHeight: 18,
  },
  ctaIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  footerSpacer: {
    height: 40,
  }
});
