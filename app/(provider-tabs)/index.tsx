import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  Image,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

// --- Backend Hooks & Services from your structured code ---
import { useAuth } from "@/hooks/useAuth";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { NotificationBadge } from "@/components/ui/notification-badge";
import { getErrorMessage } from "@/lib/error-handling";
import { getProviderBookings, normalizeProviderBookingStatus } from "@/services/providerBookingService";
import {
  getProviderEarningsSummary,
  type ProviderPaymentHistoryItem,
} from "@/services/paymentService";
import {
  getMyProviderServices,
  type ProviderServiceRecord,
} from "@/services/providerCatalogService";
import { getProviderReviewsSummary } from "@/services/customerFeedbackService";
import {
  getProviderChatSummaries,
  subscribeToChatSummaries,
  type ChatSummary,
} from "@/services/chatService";

const { width } = Dimensions.get("window");

// --- Helper Functions from your structured code ---
const formatScheduleShort = (ts?: string) => {
  if (!ts) return { date: "--", time: "--", day: "--" };
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return { date: "--", time: "--", day: "--" };
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    day: days[d.getDay()],
  };
};

const formatUIStatus = (status: string) => {
  const norm = normalizeProviderBookingStatus(status);
  if (norm === 'in_progress') return 'In Progress';
  return norm.charAt(0).toUpperCase() + norm.slice(1);
};

const toAmountNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.-]/g, "").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const toSafeNumber = (value: unknown, fallback = 0) => {
  const parsed = toAmountNumber(value);
  return parsed !== null ? parsed : fallback;
};

const toComparableString = (value: unknown) =>
  String(value ?? "").trim().toLowerCase();

const findPaymentForBooking = (
  booking: any,
  payments: ProviderPaymentHistoryItem[],
): ProviderPaymentHistoryItem | null => {
  const bookingId = toComparableString(booking?.id);
  const bookingReference = toComparableString(booking?.booking_reference);

  return (
    payments.find((payment) => {
      const paymentBookingId = toComparableString((payment as any)?.booking_id);
      const paymentReference = toComparableString(payment?.booking_reference);
      if (bookingId && paymentBookingId && bookingId === paymentBookingId) return true;
      return Boolean(
        bookingReference && paymentReference && bookingReference === paymentReference,
      );
    }) || null
  );
};

const findServiceForBooking = (
  booking: any,
  services: ProviderServiceRecord[],
): ProviderServiceRecord | null => {
  const bookingServiceId = toComparableString(booking?.service_id);
  const bookingServiceTitle = toComparableString(booking?.service_title);

  return (
    services.find((service) => {
      const serviceId = toComparableString(service?.id);
      const serviceTitle = toComparableString(service?.title);
      if (bookingServiceId && serviceId && bookingServiceId === serviceId) return true;
      return Boolean(
        bookingServiceTitle && serviceTitle && bookingServiceTitle === serviceTitle,
      );
    }) || null
  );
};

const resolveBookingAmount = (
  booking: any,
  payment: ProviderPaymentHistoryItem | null,
  service: ProviderServiceRecord | null,
): number => {
  const paymentAmount = toAmountNumber((payment as any)?.amount);
  const paymentNet = toAmountNumber((payment as any)?.net_earnings);
  const paymentPlatformFee = toAmountNumber((payment as any)?.platform_fee);
  const paymentDerivedAmount =
    paymentAmount ??
    (paymentNet !== null
      ? paymentNet + (paymentPlatformFee ?? paymentNet * (1 / 9))
      : null);

  const primaryCandidates = [
    paymentDerivedAmount,
    toAmountNumber(booking?.total_amount),
    toAmountNumber(booking?.totalAmount),
  ];

  const positivePrimary = primaryCandidates.find(
    (value): value is number => value !== null && value > 0,
  );
  if (positivePrimary !== undefined) return positivePrimary;

  const hourlyRate =
    toAmountNumber(booking?.hourly_rate) ?? toAmountNumber(service?.hourly_rate);
  const rawHoursRequired = toAmountNumber(booking?.hours_required);
  const hoursRequired = rawHoursRequired !== null && rawHoursRequired > 0 ? rawHoursRequired : 1;
  const hourlyComputed =
    hourlyRate !== null && hourlyRate > 0 ? hourlyRate * hoursRequired : null;
  const flatRate =
    toAmountNumber(booking?.flat_rate) ?? toAmountNumber(service?.flat_rate);
  const servicePrice = toAmountNumber(
    booking?.service_price ??
      booking?.serviceAmount ??
      booking?.service?.price ??
      service?.price,
  );

  const fallbackPositive = [hourlyComputed, flatRate, servicePrice].find(
    (value): value is number => value !== null && value > 0,
  );
  if (fallbackPositive !== undefined) return fallbackPositive;

  const nullablePrimary = primaryCandidates.find(
    (value): value is number => value !== null,
  );
  return nullablePrimary ?? 0;
};


// --- Your UI Components ---
const ActiveBookingItem = ({ id, customer, service, amount, status, avatar, onPress }: any) => (
  <TouchableOpacity style={styles.bookingRow} onPress={onPress}>
    <View style={styles.customerCell}>
      <Image source={{ uri: avatar }} style={styles.tinyAvatar} />
      <Text style={styles.customerName}>{customer}</Text>
    </View>
    <Text style={styles.serviceCell} numberOfLines={1}>
      {service}
    </Text>
    <Text style={styles.amountCell}>₱{amount}</Text>
    <View
      style={[
        styles.statusPill,
        status === "Confirmed"
          ? styles.statusConfirmed
          : status === "Pending"
          ? styles.statusPending
          : styles.statusInProgress,
      ]}
    >
      <Text
        style={[
          styles.statusText,
          status === "Confirmed"
            ? styles.textConfirmed
            : status === "Pending"
            ? styles.textPending
            : styles.textInProgress,
        ]}
      >
        {status}
      </Text>
    </View>
  </TouchableOpacity>
);

const QuickAction = ({ icon, label, color, onPress }: any) => (
  <TouchableOpacity style={styles.actionCard} activeOpacity={0.7} onPress={onPress}>
    <View style={[styles.actionIconContainer, { backgroundColor: color + "15" }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const UpcomingBooking = ({ id, date, time, customer, service, location, status, onPress }: any) => (
  <View style={styles.upcomingCard}>
    <View style={styles.upcomingHeader}>
      <Text style={styles.upcomingDateTime}>
        {date} at {time}
      </Text>
      <View
        style={[
          styles.statusPillSmall,
          status === "Confirmed" ? styles.statusConfirmed : styles.statusPending,
        ]}
      >
        <Text
          style={[
            styles.statusTextSmall,
            status === "Confirmed" ? styles.textConfirmed : styles.textPending,
          ]}
        >
          {status}
        </Text>
      </View>
    </View>
    <Text style={styles.upcomingCustomer}>{customer}</Text>
    <Text style={styles.upcomingService}>{service}</Text>
    <View style={styles.locationRow}>
      <Ionicons name="location-outline" size={14} color="#777" />
      <Text style={styles.upcomingLocation} numberOfLines={1}>{location}</Text>
    </View>
    <TouchableOpacity style={styles.viewDetailsButton} onPress={onPress}>
      <Text style={styles.viewDetailsText}>View Details</Text>
    </TouchableOpacity>
  </View>
);

const MetricItem = ({ label, value, progress }: any) => (
  <View style={styles.metricRow}>
    <View style={styles.metricLabelRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
    <View style={styles.progressBarBg}>
      <View style={[styles.progressBarFill, { width: progress }]} />
    </View>
  </View>
);


// --- Main Screen ---
export default function ProviderDashboard() {
  const router = useRouter();
  
  // -- REAL LOGIC ENGINE --
  const { user } = useAuth();
  const unreadNotifications = useUnreadNotifications();
  
  const [rows, setRows] = useState<any[]>([]);
  const [paidEarnings, setPaidEarnings] = useState(0);
  const [pendingCollections, setPendingCollections] = useState(0);
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [averageRating, setAverageRating] = useState("0.0"); // <-- NEW DYNAMIC RATING STATE
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const providerFirstName = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, any>;
    const fullName = String(meta.full_name || meta.name || "").trim();
    return fullName.split(/\s+/)[0] || "Provider";
  }, [user]);

  const loadDashboard = React.useCallback(async () => {
    if (!user?.id) {
      setRows([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const [bookingsResult, earningsResult, reviewsResult, servicesResult] =
        await Promise.allSettled([
          getProviderBookings(user.id),
          getProviderEarningsSummary(user.id),
          getProviderReviewsSummary(user.id),
          getMyProviderServices(),
        ]);

      const data = bookingsResult.status === 'fulfilled' ? bookingsResult.value : [];
      const earningsSummary = earningsResult.status === 'fulfilled' ? earningsResult.value : null;
      const reviewsSummary = reviewsResult.status === 'fulfilled' ? reviewsResult.value : null;
      const providerServices =
        servicesResult.status === 'fulfilled' ? servicesResult.value : ([] as ProviderServiceRecord[]);

      const failures = [bookingsResult, earningsResult, reviewsResult, servicesResult]
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failures.length > 0) {
        console.warn('Dashboard partial load — failed calls:', failures.map((f) => f.reason));
      }

      const paymentHistory = earningsSummary?.payments || [];
      const rowsWithAmounts = (data || []).map((booking: any) => {
        const matchedPayment = findPaymentForBooking(booking, paymentHistory);
        const matchedService = findServiceForBooking(booking, providerServices);
        return {
          ...booking,
          total_amount: resolveBookingAmount(booking, matchedPayment, matchedService),
        };
      });

      setRows(rowsWithAmounts);
      setPaidEarnings(toSafeNumber(earningsSummary?.totalNetEarnings));
      setPendingCollections(toSafeNumber(earningsSummary?.pendingRevenue));
      setAverageRating(Number(reviewsSummary?.average_rating || 0).toFixed(1));

      if (bookingsResult.status === 'rejected') {
        setError(getErrorMessage(bookingsResult.reason, 'Failed to load bookings.'));
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load provider dashboard."));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      void loadDashboard();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [loadDashboard, user?.id]);

  const loadChatSummaries = React.useCallback(async () => {
    if (!user?.id) {
      setChatSummaries([]);
      return;
    }
    try {
      const summaries = await getProviderChatSummaries(user.id);
      setChatSummaries(summaries);
    } catch {
      setChatSummaries([]);
    }
  }, [user?.id]);

  React.useEffect(() => {
    void loadChatSummaries();
  }, [loadChatSummaries]);

  React.useEffect(() => {
    if (!user?.id) return;
    return subscribeToChatSummaries({
      role: "provider",
      userId: user.id,
      onChange: () => void loadChatSummaries(),
    });
  }, [loadChatSummaries, user?.id]);

  // -- CALCULATIONS FOR YOUR UI --
  const stats = useMemo(() => {
    const total = rows.length;
    // THIS IS REAL DATA! If this shows 4, it means you have 4 active bookings in the DB.
    const upcoming = rows.filter((r) => !String(r.status).toLowerCase().includes("cancel") && !String(r.status).toLowerCase().includes("complete")).length;
    return { total, upcoming };
  }, [rows]);

  const upcomingRows = useMemo(() => {
    const summaryMap = new Map(chatSummaries.map((summary) => [summary.bookingId, summary]));
    return rows
      .filter((r) => {
        const s = String(r.status).toLowerCase();
        return !s.includes("cancel") && !s.includes("complete");
      })
      .sort((left, right) => {
        const leftUnread = summaryMap.get(String(left.id))?.unreadCount || 0;
        const rightUnread = summaryMap.get(String(right.id))?.unreadCount || 0;
        if (rightUnread !== leftUnread) return rightUnread - leftUnread;
        return new Date(left.scheduled_at || 0).getTime() - new Date(right.scheduled_at || 0).getTime();
      })
      .slice(0, 5);
  }, [chatSummaries, rows]);

  const activeBookingRows = useMemo(() => {
    return rows
      .filter((row) => {
        const status = normalizeProviderBookingStatus(String(row?.status || ""));
        return status !== "completed" && status !== "cancelled";
      })
      .slice(0, 4);
  }, [rows]);

  const needsAttentionCount = useMemo(() => {
    let count = 0;
    const chatSummaryMap = new Map(chatSummaries.map((summary) => [summary.bookingId, summary]));
    for (const row of upcomingRows) {
      const summary = chatSummaryMap.get(String(row.id));
      if (summary && summary.unreadCount > 0) count++;
    }
    return count;
  }, [upcomingRows, chatSummaries]);


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Dynamic Header */}
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.providerName}>{providerFirstName}</Text> 
            </View>
            
            <TouchableOpacity onPress={() => router.push("/notifications" as any)}>
              <Ionicons name="notifications-outline" size={28} color="#FFF" />
              <NotificationBadge count={unreadNotifications} top={0} right={-2} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {isLoading && <ActivityIndicator size="large" color="#00B761" style={{ marginTop: 20 }} />}
        {error ? <Text style={{ color: 'red', textAlign: 'center', marginTop: 10 }}>{error}</Text> : null}

        {/* Dynamic Earnings Card */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <Text style={styles.earningsLabel}>Total Earnings</Text>
            <TouchableOpacity style={styles.walletIconContainer} onPress={() => router.push("/provider-earnings" as any)}>
              <Ionicons name="wallet-outline" size={20} color="#00B761" />
            </TouchableOpacity>
          </View>
          <Text style={styles.earningsAmount}>
            ₱{paidEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
          <View style={styles.trendRow}>
            <Ionicons name="time-outline" size={16} color="#F59E0B" />
            <Text style={[styles.trendText, { color: '#F59E0B' }]}>
              ₱{pendingCollections.toLocaleString('en-US')} pending collections
            </Text>
          </View>
        </View>

        {/* Dynamic Active Jobs */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push("/provider-calendar" as any)}>
            <Text style={styles.statLabel}>Active{"\n"}Jobs</Text>
            <Text style={styles.statValue}>{stats.upcoming}</Text>
          </TouchableOpacity>
        </View>

        {/* DYNAMIC RATING CARD */}
        <TouchableOpacity style={styles.ratingCardFull} onPress={() => router.push("/ratings" as any)}>
          <View>
            <Text style={styles.statLabel}>Rating</Text>
            <View style={styles.ratingBox}>
              <Text style={styles.statValue}>{averageRating}</Text> 
              <Ionicons name="star" size={18} color={averageRating === "0.0" ? "#CCC" : "#FFD700"} style={{ marginLeft: 4 }} />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#CCC" />
        </TouchableOpacity>

        {/* Dynamic Booking Alert */}
        {needsAttentionCount > 0 && (
          <TouchableOpacity style={styles.bookingAlert} onPress={() => router.push("/provider-bookings" as any)}>
            <View style={styles.alertLeft}>
              <Text style={styles.alertTitle}>{needsAttentionCount} Needs Reply</Text>
              <Text style={styles.alertSubtitle}>Tap to check unread messages</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFF" />
          </TouchableOpacity>
        )}

        {/* Dynamic Active Bookings Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Bookings</Text>
          <TouchableOpacity onPress={() => router.push("/provider-bookings" as any)}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { flex: 1.2 }]}>Customer</Text>
            <Text style={[styles.headerText, { flex: 1.5 }]}>Service</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>Amount</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>Status</Text>
          </View>

          {activeBookingRows.map((b) => (
            <ActiveBookingItem
              key={b.id}
              id={b.id}
              customer={b.customer_name}
              service={b.service_title}
              amount={toSafeNumber(b.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              status={formatUIStatus(b.status)} 
              avatar={`https://i.pravatar.cc/100?u=${b.customer_name}`}
              onPress={() =>
                router.push({
                  pathname: "/provider-booking-details",
                  params: { id: b.id },
                } as any)
              }
            />
          ))}
          {activeBookingRows.length === 0 && !isLoading && (
              <Text style={{ textAlign: 'center', padding: 20, color: '#777' }}>No active bookings.</Text>
          )}
        </View>

        {/* Quick Actions Grid */}
        <Text style={styles.sectionTitlePadding}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickAction icon="time-outline" label="Set Availability" color="#00B761" onPress={() => router.push("/provider-availability" as any)} />
          <QuickAction icon="calendar-outline" label="View Calendar" color="#00B761" onPress={() => router.push("/provider-calendar" as any)} />
          <QuickAction icon="cash-outline" label="Update Pricing" color="#00B761" onPress={() => router.push("/pricing" as any)} />
          <QuickAction icon="trending-up-outline" label="View Earnings" color="#00B761" onPress={() => router.push("/provider-earnings" as any)} />
        </View>

        {/* Dynamic Upcoming Bookings */}
        <Text style={styles.sectionTitlePadding}>Upcoming Bookings</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {upcomingRows.map((b) => {
            const schedule = formatScheduleShort(b.scheduled_at);
            return (
              <UpcomingBooking
                key={b.id}
                id={b.id}
                date={schedule.date}
                time={schedule.time}
                customer={b.customer_name}
                service={b.service_title}
                location={b.location || "Location provided in details"} 
                status={formatUIStatus(b.status)}
                onPress={() =>
                  router.push({
                    pathname: "/provider-booking-details",
                    params: { id: b.id },
                  } as any)
                }
              />
            );
          })}
          {upcomingRows.length === 0 && !isLoading && (
              <Text style={{ color: '#777', paddingVertical: 20 }}>No upcoming bookings.</Text>
          )}
        </ScrollView>

        {/* Performance Metrics */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          <TouchableOpacity onPress={() => router.push("/metrics" as any)}>
            <Text style={styles.viewAllText}>Analysis</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.metricsContainer} activeOpacity={0.7} onPress={() => router.push("/metrics" as any)}>
          <MetricItem label="Acceptance Rate" value="92%" progress="92%" />
          <MetricItem label="Completion Rate" value="98%" progress="98%" />
          <MetricItem label="Response Time" value="< 5 min" progress="85%" />
        </TouchableOpacity>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </View>
  );
}

// --- EXACT STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    backgroundColor: "#00B761",
    paddingBottom: 80,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: "#E8FBF2",
    fontFamily: "Outfit-Regular",
  },
  providerName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFF",
    fontFamily: "Outfit-Bold",
  },
  scrollContainer: {
    flex: 1,
    marginTop: -60,
  },
  earningsCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  earningsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  earningsLabel: {
    fontSize: 14,
    color: "#777",
    fontWeight: "600",
  },
  walletIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E8FBF2",
    justifyContent: "center",
    alignItems: "center",
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: "#00B761",
    marginBottom: 8,
    fontFamily: "Outfit-Bold",
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  trendText: {
    fontSize: 12,
    color: "#00B761",
    fontWeight: "700",
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    justifyContent: "space-between",
    minHeight: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#777",
    fontWeight: "600",
    lineHeight: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0D1B2A",
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  ratingCardFull: {
    backgroundColor: "#FFF",
    marginHorizontal: 24,
    marginTop: 12,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  bookingAlert: {
    backgroundColor: "#00B761",
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  alertLeft: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 4,
  },
  alertSubtitle: {
    fontSize: 13,
    color: "#E8FBF2",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 30,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0D1B2A",
  },
  sectionTitlePadding: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0D1B2A",
    paddingHorizontal: 24,
    marginTop: 30,
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: "#00B761",
    fontWeight: "700",
  },
  tableContainer: {
    backgroundColor: "#FFF",
    marginHorizontal: 24,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#E8FBF2",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#777",
    textTransform: "uppercase",
  },
  bookingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F9FA",
  },
  customerCell: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
  },
  tinyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  customerName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0D1B2A",
  },
  serviceCell: {
    flex: 1.5,
    fontSize: 11,
    color: "#444",
  },
  amountCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#00B761",
  },
  statusPill: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  statusConfirmed: {
    backgroundColor: "#E8FBF2",
  },
  statusPending: {
    backgroundColor: "#FFF2E6",
  },
  statusInProgress: {
    backgroundColor: "#E6F0FF",
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
  },
  textConfirmed: {
    color: "#00B761",
  },
  textPending: {
    color: "#FF8800",
  },
  textInProgress: {
    color: "#0066FF",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 18,
    gap: 12,
  },
  actionCard: {
    width: (width - 48 - 12) / 2,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0D1B2A",
  },
  horizontalScroll: {
    paddingLeft: 24,
    paddingRight: 12,
    paddingBottom: 20,
  },
  upcomingCard: {
    width: width * 0.75,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  upcomingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  upcomingDateTime: {
    fontSize: 13,
    fontWeight: "700",
    color: "#00B761",
  },
  statusPillSmall: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: "800",
  },
  upcomingCustomer: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0D1B2A",
    marginBottom: 4,
  },
  upcomingService: {
    fontSize: 14,
    color: "#444",
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  upcomingLocation: {
    fontSize: 12,
    color: "#777",
    marginLeft: 4,
  },
  viewDetailsButton: {
    backgroundColor: "#F8F9FA",
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0D1B2A",
  },
  metricsContainer: {
    backgroundColor: "#FFF",
    marginHorizontal: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  metricRow: {
    marginBottom: 20,
  },
  metricLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: "#444",
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 14,
    color: "#00B761",
    fontWeight: "700",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#F0F0F0",
    borderRadius: 3,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#00B761",
    borderRadius: 3,
  },
  footerSpacer: {
    height: 40,
  },
});
