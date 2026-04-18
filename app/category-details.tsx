import React, { useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions, 
  Animated 
} from 'react-native';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getErrorMessage } from '@/lib/error-handling';
import { getServiceCategories, getServicesByCategoryName, type ServiceCategory } from '@/services/marketplaceService';
import { findCategoryGroup } from '@/constants/service-taxonomy';

const { width } = Dimensions.get('window');
const SUB_COL_WIDTH = (width - 52) / 2; // 20px parent padding + 12px gap

const InteractiveCard = ({ children, onPress, style }: { children: React.ReactNode, onPress: () => void, style?: any }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 12,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function CategoryDetailsScreen() {
  const router = useRouter();
  const { title = 'Home Maintenance', categoryId = '' } = useLocalSearchParams<{
    title: string;
    categoryId?: string;
  }>();
  const [services, setServices] = useState<any[]>([]);
  const [categoryRows, setCategoryRows] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError('');
      try {
        const [categories, rows] = await Promise.all([
          getServiceCategories(),
          getServicesByCategoryName(title),
        ]);
        if (mounted) {
          setCategoryRows(categories || []);
          setServices(rows || []);
        }
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Failed to load services.'));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [title]);

  const selectedCategory = React.useMemo(() => {
    const normalizedTitle = String(title || '').trim().toLowerCase();
    const normalizedCategoryId = String(categoryId || '').trim();

    if (normalizedCategoryId) {
      const byId = categoryRows.find((row) => String(row.id) === normalizedCategoryId);
      if (byId) return byId;
    }

    return (
      categoryRows.find((row) => String(row.name || '').trim().toLowerCase() === normalizedTitle) ||
      null
    );
  }, [categoryId, categoryRows, title]);

  const dynamicSubcategories = React.useMemo(() => {
    if (!selectedCategory?.id) return [] as ServiceCategory[];
    return categoryRows
      .filter((row) => String(row.parent_id || '').trim() === String(selectedCategory.id).trim())
      .filter((row) => row.is_active !== false);
  }, [categoryRows, selectedCategory?.id]);

  const fallbackSubcategories = React.useMemo(() => {
    if (dynamicSubcategories.length > 0) return [] as { id: string; name: string }[];
    const matchingGroup = findCategoryGroup(title);
    if (!matchingGroup) return [] as { id: string; name: string }[];

    return matchingGroup.subcategories.map((subcategoryName) => {
      const match = categoryRows.find(
        (row) => String(row.name || '').trim().toLowerCase() === subcategoryName.toLowerCase(),
      );
      return {
        id: String(match?.id || ''),
        name: subcategoryName,
      };
    });
  }, [categoryRows, dynamicSubcategories.length, title]);

  const subcategories = React.useMemo(
    () =>
      dynamicSubcategories.length > 0
        ? dynamicSubcategories.map((row) => ({ id: String(row.id), name: String(row.name || '').trim() }))
        : fallbackSubcategories,
    [dynamicSubcategories, fallbackSubcategories],
  );

  const parentCategoryName = React.useMemo(() => {
    if (!selectedCategory?.parent_id) return '';
    const parent = categoryRows.find((row) => String(row.id) === String(selectedCategory.parent_id));
    return parent?.name || '';
  }, [categoryRows, selectedCategory?.parent_id]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <SafeAreaViewContext>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} 
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={24} color="#0F172A" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>
                {subcategories.length > 0
                  ? `${subcategories.length} sub-categories`
                  : `${services.length} services found`}
              </Text>
            </View>
          </View>
        </SafeAreaViewContext>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {parentCategoryName ? (
          <View style={styles.breadcrumb}>
            <Text style={styles.parentLabel}>{parentCategoryName}</Text>
            <Ionicons name="chevron-forward" size={10} color="#94A3B8" style={{ marginHorizontal: 4 }} />
            <Text style={[styles.parentLabel, { color: '#94A3B8' }]}>{title}</Text>
          </View>
        ) : null}

        {isLoading && <ActivityIndicator size="large" color="#00C853" style={{ marginTop: 40 }} />}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        
        {!isLoading && !error && services.length === 0 && subcategories.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color="#E2E8F0" />
            <Text style={styles.emptyText}>No services found in this category.</Text>
          </View>
        )}

        {/* Subcategories - 2 Column Grid */}
        {subcategories.length > 0 && (
          <View style={styles.subGrid}>
            {subcategories.map((subcategory) => (
              <InteractiveCard
                key={`${subcategory.id || subcategory.name}`}
                style={{ width: SUB_COL_WIDTH, marginBottom: 12 }}
                onPress={() => {
                  const params: Record<string, string> = {
                    serviceName: subcategory.name,
                    categoryName: subcategory.name,
                  };
                  if (subcategory.id) {
                    params.categoryId = subcategory.id;
                  }
                  router.push({
                    pathname: '/provider-list',
                    params,
                  } as any);
                }}
              >
                <View style={styles.subCard}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="layers-outline" size={20} color="#00C853" />
                  </View>
                  <Text style={styles.subTitle} numberOfLines={2}>{subcategory.name}</Text>
                  <Text style={styles.subHint}>Browse All</Text>
                </View>
              </InteractiveCard>
            ))}
          </View>
        )}

        {/* Services - Single Column List */}
        {services.map((service) => (
          <InteractiveCard
            key={service.id}
            style={{ width: '100%', marginBottom: 12 }}
            onPress={() =>
              router.push({
                pathname: '/provider-list',
                params: {
                  serviceName: service.title,
                  categoryName: selectedCategory?.name || title,
                  categoryId: String(service.category_id || selectedCategory?.id || ''),
                },
              } as any)
            }
          >
            <View style={styles.serviceCard}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceTitle}>{service.title}</Text>
                <Text style={styles.serviceDescription} numberOfLines={2}>
                  {service.description || 'Professional services tailored to your needs.'}
                </Text>
              </View>
              <View style={styles.serviceFooter}>
                <View style={styles.priceTag}>
                  <Text style={styles.fromText}>From</Text>
                  <Text style={styles.priceText}>P{Number(service.price || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.actionBtn}>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </View>
              </View>
            </View>
          </InteractiveCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  header: { 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9',
    paddingBottom: 4,
  },
  headerContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 12,
  },
  backButton: { 
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitleContainer: { 
    flex: 1 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: { 
    fontSize: 12, 
    color: '#94A3B8', 
    marginTop: 2,
    fontWeight: '600',
  },
  scrollContent: { 
    padding: 20,
    paddingBottom: 60,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  parentLabel: { 
    fontSize: 11, 
    color: '#00C853', 
    fontWeight: '800', 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  subCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    height: 140,
    justifyContent: 'space-between',
    shadowColor: '#004D40',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(241, 245, 249, 0.8)',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#0F172A',
    lineHeight: 18,
  },
  subHint: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  serviceCard: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 20,
    shadowColor: '#004D40',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(241, 245, 249, 0.8)',
  },
  serviceInfo: {
    marginBottom: 16,
  },
  serviceTitle: { 
    fontSize: 17, 
    fontWeight: '800', 
    color: '#0F172A',
    marginBottom: 6,
  },
  serviceDescription: { 
    fontSize: 13, 
    color: '#64748B', 
    lineHeight: 18,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  fromText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
    marginRight: 4,
  },
  priceText: { 
    fontSize: 18, 
    color: '#00C853', 
    fontWeight: '800',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#00C853',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: { 
    textAlign: 'center', 
    color: '#94A3B8', 
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
  },
  errorText: { 
    textAlign: 'center', 
    color: '#EF4444', 
    marginTop: 24,
    fontWeight: '500',
  },
});
