import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, StatusBar, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// --- Backend Hooks ---
import { useAuth } from '@/hooks/useAuth';
import { getAvatarUrl } from '@/lib/avatar';
import { type ProviderReview } from '@/src/types/database.interfaces';
import { getProviderReviewsSummary } from '@/services/customerFeedbackService';

// --- Components ---
const RatingDistribution = ({ distribution, totalReviews }: { distribution: any[], totalReviews: number }) => {
  return (
    <View style={styles.distributionContainer}>
      {distribution.map((item) => (
        <View key={item.stars} style={styles.distributionRow}>
          <Text style={styles.starLabel}>{item.stars}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${item.percentage}%`, backgroundColor: item.color }]} />
          </View>
        </View>
      ))}
      <Text style={styles.verifiedCount}>Based on {totalReviews} verified services</Text>
    </View>
  );
};

const ReviewItem = ({ avatar, name, date, rating, content }: any) => (
  <View style={styles.reviewCard}>
    <View style={styles.reviewHeader}>
      {/* Real Customer Avatar */}
      <Image 
        source={{ uri: avatar || `https://ui-avatars.com/api/?name=${name}&background=random` }} 
        style={styles.reviewerAvatar} 
      />
      <View style={styles.reviewerInfo}>
        <Text style={styles.reviewerName}>{name}</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Ionicons 
              key={s} 
              name={s <= rating ? "star" : "star-outline"} 
              size={14} 
              color="#00B761" 
              style={{ marginRight: 2 }} 
            />
          ))}
        </View>
      </View>
      <Text style={styles.reviewDate}>{date}</Text>
    </View>
    <Text style={styles.reviewComment}>{content}</Text>
  </View>
);

export default function RatingsScreen() {
  const router = useRouter();
  const { user } = useAuth(); 
  
  const [activeTab, setActiveTab] = useState('All Reviews');
  const [reviewsData, setReviewsData] = useState<ProviderReview[]>([]);
  const [averageRating, setAverageRating] = useState('0.0');
  const [totalReviews, setTotalReviews] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user?.id) {
        setReviewsData([]);
        setAverageRating('0.0');
        setTotalReviews(0);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const summary = await getProviderReviewsSummary(user.id);
        setReviewsData(summary.reviews || []);
        setAverageRating(Number(summary.average_rating || 0).toFixed(1));
        setTotalReviews(Number(summary.total_reviews || (summary.reviews || []).length || 0));
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
        setReviewsData([]);
        setAverageRating('0.0');
        setTotalReviews(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [user?.id]);

  
  const metrics = useMemo(() => {
    const defaultDist = [5, 4, 3, 2, 1].map(s => ({ stars: s, percentage: 0, color: '#00B761' }));
    if (reviewsData.length === 0) return { average: averageRating, total: totalReviews, distribution: defaultDist };

    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviewsData.forEach((r) => {
      if (counts[r.rating] !== undefined) counts[r.rating]++;
    });

    const total = reviewsData.length;
    return { 
      average: averageRating,
      total: totalReviews || total,
      distribution: [5, 4, 3, 2, 1].map(stars => ({
        stars,
        percentage: Math.round((counts[stars] / total) * 100),
        color: '#00B761'
      }))
    };
  }, [averageRating, reviewsData, totalReviews]);

  const displayedReviews = useMemo(() => {
    if (activeTab === 'Recent') return reviewsData.slice(0, 5); 
    if (activeTab === 'With Photos') return reviewsData.filter(r => Boolean(String(r.reviewer_id || '').trim()));
    return reviewsData; 
  }, [reviewsData, activeTab]);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))}>
          <Ionicons name="arrow-back" size={24} color="#00B761" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.reputationSection}>
          <Text style={styles.sectionLabel}>OVERALL RATINGS</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingValue}>{metrics.average}</Text>
            <Text style={styles.ratingMax}> / 5.0</Text>
          </View>
          <View style={styles.distributionCard}>
            <RatingDistribution distribution={metrics.distribution} totalReviews={metrics.total} />
          </View>
        </View>

        <View style={styles.filterTabs}>
          {['All Reviews', 'Recent', 'With Photos'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.filterTab, activeTab === tab && styles.filterTabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.filterTabText, activeTab === tab && styles.filterTabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.reviewsList}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#00B761" style={{ marginVertical: 40 }} />
          ) : displayedReviews.length === 0 ? (
            <Text style={styles.emptyText}>No reviews found.</Text>
          ) : (
            displayedReviews.map((review) => (
              <ReviewItem 
                key={review.id} 
                avatar={review.reviewer_id ? getAvatarUrl(String(review.reviewer_id)) : ''}
                name={review.reviewer_id ? `Customer ${String(review.reviewer_id).slice(0, 6)}` : 'Verified Customer'}
                date={formatDate(review.created_at)}
                rating={review.rating}
                content={review.review_text || 'No written feedback provided.'}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  scrollContainer: { flex: 1 },
  reputationSection: { paddingHorizontal: 24, marginBottom: 24 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#9CA3AF', marginBottom: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 24 },
  ratingValue: { fontSize: 64, fontWeight: '800', color: '#1F2937' },
  ratingMax: { fontSize: 24, fontWeight: '700', color: '#9CA3AF' },
  distributionCard: { backgroundColor: '#F3F4F640', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#F3F4F6' },
  distributionContainer: { width: '100%' },
  distributionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  starLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', width: 20 },
  barTrack: { flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginLeft: 10 },
  barFill: { height: '100%', borderRadius: 3 },
  verifiedCount: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 16 },
  filterTabs: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 24 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 10 },
  filterTabActive: { backgroundColor: '#00B761' },
  filterTabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  filterTabTextActive: { color: '#FFF' },
  reviewsList: { paddingHorizontal: 24 },
  reviewCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, marginBottom: 16, elevation: 2 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  reviewerAvatar: { width: 48, height: 48, borderRadius: 24 },
  reviewerInfo: { flex: 1, marginLeft: 12 },
  reviewerName: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  starRow: { flexDirection: 'row' },
  reviewDate: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  reviewComment: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginVertical: 40 },
});
