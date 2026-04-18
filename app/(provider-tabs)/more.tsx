import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SettingsRow } from '@/components/ui/settings-row';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { logoutUser } from '@/services/authService';

export default function MoreScreen() {
  const router = useRouter();
  const unreadNotifications = useUnreadNotifications();

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Log Out', 
        style: 'destructive', 
        onPress: async () => {
          await logoutUser();
          router.replace('/login' as any);
        } 
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>More</Text>
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.menuList}>
            
            {/* FIXED: Navigates to your Profile with NO ID to show your own profile */}
            <SettingsRow 
              icon="person-outline" 
              label="My Profile" 
              onPress={() => router.push('/provider-profile' as any)}
              backgroundColor="#F8F9FA"
              borderBottomColor="#F8F9FA"
              badgeBorderColor="#F8F9FA"
            />

            <SettingsRow 
              icon="settings-outline" 
              label="Settings" 
              onPress={() => router.push('/provider-settings' as any)}
              backgroundColor="#F8F9FA"
              borderBottomColor="#F8F9FA"
              badgeBorderColor="#F8F9FA"
            />

            <SettingsRow 
              icon="notifications" 
              label="Notifications" 
              badgeCount={unreadNotifications}
              onPress={() => router.push('/notifications' as any)}
              backgroundColor="#F8F9FA"
              borderBottomColor="#F8F9FA"
              badgeBorderColor="#F8F9FA"
            />

            <SettingsRow
              icon="time-outline"
              label="View Schedule"
              onPress={() => router.push('/provider-calendar' as any)}
              backgroundColor="#F8F9FA"
              borderBottomColor="#F8F9FA"
              badgeBorderColor="#F8F9FA"
            />

            <SettingsRow
              icon="today-outline"
              label="Calendar Management"
              onPress={() => router.push('/provider-availability' as any)}
              backgroundColor="#F8F9FA"
              borderBottomColor="#F8F9FA"
              badgeBorderColor="#F8F9FA"
            />

            <SettingsRow 
              icon="help-circle-outline" 
              label="Help & Support" 
              onPress={() => router.push('/provider-help' as any)}
              backgroundColor="#F8F9FA"
              borderBottomColor="#F8F9FA"
              badgeBorderColor="#F8F9FA"
            />

            <SettingsRow 
              icon="receipt-outline" 
              label="Service History" 
              onPress={() => router.push('/provider-history' as any)}
              backgroundColor="#F8F9FA"
              borderBottomColor="#F8F9FA"
              badgeBorderColor="#F8F9FA"
            />
            
            <View style={styles.separator} />
            
            <SettingsRow 
              icon="log-out-outline" 
              label="Log Out" 
              onPress={handleLogout}
              isDestructive
              backgroundColor="#F8F9FA"
              borderBottomColor="#F8F9FA"
            />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0D1B2A',
    fontFamily: 'Outfit-Bold',
  },
  scrollContainer: {
    flex: 1,
  },
  menuList: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 16,
  },
});