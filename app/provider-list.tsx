import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getErrorMessage } from '@/lib/error-handling';
import { getAvatarUrl } from '@/lib/avatar';
import {
  getProvidersByCategoryId,
  getProvidersByServiceName,
  ProviderCard,
} from '@/services/marketplaceService';

function formatProviderRating(rating: unknown) {
  const normalizedRating = Number(rating);
  return Number.isFinite(normalizedRating) ? normalizedRating.toFixed(1) : '0.0';
}

function formatProviderReviews(reviews: unknown) {
  const normalizedReviews = Number(reviews);
  return Number.isFinite(normalizedReviews) ? String(normalizedReviews) : '0';
}

function formatProviderPrice(priceLabel: unknown) {
  return typeof priceLabel === 'string' && priceLabel.trim() ? priceLabel : 'Price unavailable';
}

function formatProviderBusinessName(provider: ProviderCard) {
  return provider.businessName || provider.name || 'Unnamed provider';
}

function getLocationBadgeLabel(locationType: ProviderCard['serviceLocationType']) {
  return locationType === 'in_shop' ? 'In-Shop' : 'Mobile';
}

function formatLocationPreview(address: string | null) {
  if (!address) return 'Visit the provider for this service.';
  return address.length > 60 ? `${address.slice(0, 57)}...` : address;
}

export default function ProviderListScreen() {
  const router = useRouter();
  const {
    serviceName = 'General Service',
    categoryId = '',
    categoryName = '',
  } = useLocalSearchParams<{
    serviceName?: string;
    categoryId?: string;
    categoryName?: string;
  }>();
  const [providers, setProviders] = useState<ProviderCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [avatarLoadErrors, setAvatarLoadErrors] = useState<Record<string, boolean>>({});

  const activeQueryLabel =
    (typeof categoryName === 'string' && categoryName.trim()) ||
    (typeof serviceName === 'string' && serviceName.trim()) ||
    'General Service';
  const normalizedCategoryId = typeof categoryId === 'string' ? categoryId.trim() : '';

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError('');
      setAvatarLoadErrors({});
      try {
        let rows: ProviderCard[] = [];
        if (normalizedCategoryId) {
          rows = await getProvidersByCategoryId(normalizedCategoryId);
        }
        if (rows.length === 0) {
          rows = await getProvidersByServiceName(String(serviceName || ''));
        }
        if (mounted) setProviders(rows || []);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Failed to load providers.'));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [normalizedCategoryId, serviceName]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{activeQueryLabel}</Text>
              <Text style={styles.headerSubtitle}>{providers.length} providers available</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isLoading ? <ActivityIndicator size="large" color="#00B761" style={{ marginTop: 24 }} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!isLoading && !error && providers.length === 0 ? <Text style={styles.emptyText}>No providers found for this category yet.</Text> : null}

        {providers.map((provider) => {
          const cardKey = `${provider.id}-${provider.serviceId}`;
          const normalizedProviderId = String(provider.id || '').trim();
          const providerAvatarUri = normalizedProviderId
            ? getAvatarUrl(normalizedProviderId)
            : String(provider.avatarUrl || '').trim();
          const showProviderAvatar =
            Boolean(providerAvatarUri) && !avatarLoadErrors[cardKey];

          return (
            <TouchableOpacity
              key={cardKey}
              style={styles.providerCard}
              onPress={() =>
                router.push({
                  pathname: '/provider-profile',
                  params: {
                    providerId: provider.id,
                    serviceId: provider.serviceId,
                    serviceName: provider.serviceName || String(serviceName || activeQueryLabel),
                    providerName: provider.name,
                  },
                })
              }
            >
              <View style={styles.cardHeader}>
                {showProviderAvatar ? (
                  <Image
                    source={{ uri: providerAvatarUri }}
                    style={styles.avatar}
                    onError={() =>
                      setAvatarLoadErrors((prev) =>
                        prev[cardKey] ? prev : { ...prev, [cardKey]: true }
                      )
                    }
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Ionicons name="person" size={20} color="#00B761" />
                  </View>
                )}
                <View style={styles.cardHeaderText}>
                  <Text style={styles.businessName}>{formatProviderBusinessName(provider)}</Text>
                  <Text style={styles.providerName}>{provider.serviceName || provider.name}</Text>
                </View>
                {provider.serviceLocationType === 'in_shop' ? (
                  <View style={styles.locationBadge}>
                    <Text style={styles.locationBadgeText}>{getLocationBadgeLabel(provider.serviceLocationType)}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Rating: {formatProviderRating(provider.rating)}</Text>
                <Text style={styles.metaText}>Reviews: {formatProviderReviews(provider.reviews)}</Text>
                <Text style={styles.priceText}>{formatProviderPrice(provider.priceLabel)}</Text>
              </View>
              {provider.serviceLocationType === 'in_shop' ? (
                <View style={styles.locationPreview}>
                  <Ionicons name="location-outline" size={16} color="#00B761" />
                  <Text style={styles.locationPreviewText}>{formatLocationPreview(provider.serviceLocationAddress)}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10 },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 10 },
  backButton: { padding: 5, marginRight: 15 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  headerSubtitle: { fontSize: 12, color: '#999', marginTop: 2 },
  scrollContent: { padding: 20 },
  providerCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardHeaderText: { flex: 1 },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12, backgroundColor: '#E8F8EF' },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    backgroundColor: '#E8F8EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessName: { fontSize: 16, fontWeight: '700', color: '#0D1B2A' },
  providerName: { fontSize: 14, color: '#555', marginTop: 4 },
  locationBadge: {
    backgroundColor: '#EAF8EF',
    borderColor: '#B7E4C7',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 10,
  },
  locationBadgeText: { color: '#157347', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  metaText: { fontSize: 12, color: '#777' },
  priceText: { fontSize: 13, fontWeight: '700', color: '#00B761' },
  locationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#F8FBF9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  locationPreviewText: { flex: 1, fontSize: 12, color: '#3B4A54' },
  emptyText: { textAlign: 'center', color: '#777', marginTop: 24 },
  errorText: { textAlign: 'center', color: '#C62828', marginTop: 24 },
});

