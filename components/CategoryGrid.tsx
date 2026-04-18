import React, { memo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';


const { width } = Dimensions.get('window');
// Recalculated to fit perfectly in HomeScreen (20px padding) + Grid (4px padding) + 16px gap
const COLUMN_WIDTH = (width - 64) / 2; 

interface CategoryItem {
  id: string;
  name: string;
  icon_name?: string;
}

interface CategoryGridProps {
  categories: CategoryItem[];
  onPress: (name: string, id: string) => void;
}

const CategoryGridCard = memo(({ 
  category, 
  onPress 
}: { 
  category: CategoryItem; 
  onPress: (name: string, id: string) => void 
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const iconName = (category.icon_name || 'apps-outline') as any;

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
    <Animated.View style={[styles.cardContainer, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(category.name, category.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.iconWrapper}>
              <View style={styles.iconBg} />
              <Ionicons name={iconName} size={24} color="#00C853" />
            </View>
            <View style={styles.chevron}>
              <Ionicons name="arrow-forward" size={14} color="#CBD5E1" />
            </View>
          </View>
          
          <View style={styles.textWrapper}>
            <Text style={styles.title} numberOfLines={2}>
              {category.name}
            </Text>
            <Text style={styles.tagline}>View All</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

CategoryGridCard.displayName = 'CategoryGridCard';

export const CategoryGrid = ({ categories, onPress }: CategoryGridProps) => {
  return (
    <View style={styles.grid}>
      {categories.map((category) => (
        <CategoryGridCard
          key={category.id}
          category={category}
          onPress={onPress}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingTop: 4,
  },
  cardContainer: {
    width: COLUMN_WIDTH,
    marginBottom: 16,
  },
  card: {
    height: 140, // Consistent height for grid alignment
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    // Multi-layered shadow for premium depth
    shadowColor: '#004D40',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(241, 245, 249, 0.8)',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    transform: [{ rotate: '45deg' }], // Diamond shape background
  },
  chevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrapper: {
    marginTop: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
    letterSpacing: -0.4,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 4,
  },
});
