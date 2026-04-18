import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getUserAddresses, AddressRecord } from '@/services/addressService';

const getAddressIcon = (label: string = '') => {
  const lowered = (label ?? '').toLowerCase();
  if (lowered.includes('home')) return 'home-outline' as const;
  if (lowered.includes('work') || lowered.includes('office')) return 'business-outline' as const;
  if (lowered.includes('gym') || lowered.includes('fitness')) return 'barbell-outline' as const;
  return 'location-outline' as const;
};

const AddressCard = ({ 
  address, 
  onEdit 
}: { 
  address: AddressRecord; 
  onEdit: (id: string) => void;
}) => {
  const line2 = [address.city, address.province, address.zip_code ?? address.postal_code]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={styles.addressCard}>
      <View style={styles.cardHeader}>
        <View style={styles.typeContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name={getAddressIcon(address.label)} size={20} color="#00B761" />
          </View>
          <View>
            <Text style={styles.addressType}>{address.label || 'Saved Address'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
           <Ionicons name="ellipsis-vertical" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <View style={styles.addressInfo}>
        <Text style={styles.addressLine1}>
          {address.street_address || address.street || 'No street provided'}
        </Text>
        {line2 ? <Text style={styles.addressLine2}>{line2}</Text> : null}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton, { width: '100%' }]}
          onPress={() => address.id && onEdit(address.id)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function ManageAddressesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      async function fetchAddresses() {
        if (!user) {
          setAddresses([]);
          setIsLoading(false);
          return;
        }
        setIsLoading(true);
        try {
          const data = await getUserAddresses();
          setAddresses(data);
        } catch (error) {
          console.error('Failed to load addresses', error);
        } finally {
          setIsLoading(false);
        }
      }
      fetchAddresses();
    }, [user])
  );

  const handleEdit = (id: string) => {
    const addr = addresses.find(a => a.id === id);
    if (addr) {
      router.push({
        pathname: '/edit-address',
        params: { address: JSON.stringify(addr) }
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Addresses</Text>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Add New Address Button */}
        <TouchableOpacity 
          style={styles.addAddressButton}
          onPress={() => router.push('/add-address' as any)}
        >
          <Ionicons name="add" size={24} color="#FFF" />
          <Text style={styles.addAddressText}>Add New Address</Text>
        </TouchableOpacity>

        {isLoading && <ActivityIndicator size="large" color="#00B761" style={{ marginTop: 40 }} />}
        {!isLoading && addresses.length === 0 && (
          <Text style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>No addresses saved yet.</Text>
        )}
        {!isLoading && addresses.length > 0 && addresses.map(address => (
            <AddressCard 
              key={address.id} 
              address={address} 
              onEdit={handleEdit}
            />
        ))}

        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B761',
    borderRadius: 12,
    height: 56,
    marginBottom: 24,
    shadowColor: '#00B761',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  addAddressText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  addressCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8FBF2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addressType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  moreButton: {
    padding: 4,
  },
  addressInfo: {
    marginBottom: 20,
  },
  addressLine1: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },
  addressLine2: {
    fontSize: 13,
    color: '#8E8E93',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  footerSpacer: {
    height: 40,
  },
});

