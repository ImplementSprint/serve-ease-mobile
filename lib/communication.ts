import { Alert, Linking } from 'react-native';

export const sanitizePhoneNumber = (value?: string | null) =>
  String(value || '').replace(/[^\d+]/g, '').trim();

export const openPhoneCall = async (phoneNumber?: string | null, fallbackName?: string) => {
  const sanitized = sanitizePhoneNumber(phoneNumber);

  if (!sanitized) {
    Alert.alert('Phone Unavailable', `No phone number is available for ${fallbackName || 'this contact'}.`);
    return false;
  }

  const telUrl = `tel:${sanitized}`;
  const canOpen = await Linking.canOpenURL(telUrl);

  if (!canOpen) {
    Alert.alert('Call Unavailable', 'Calling is not supported on this device right now.');
    return false;
  }

  await Linking.openURL(telUrl);
  return true;
};

export const getInitials = (value?: string | null) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 'NA';

  const parts = trimmed.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
};
