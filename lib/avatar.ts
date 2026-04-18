import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { api } from './apiClient';

const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000').trim().replace(/\/$/, '');

/**
 * Returns the public URL for a user's avatar (deterministic path).
 * Append a cache-buster when displaying to avoid stale images.
 */
export function getAvatarUrl(userId: string): string {
  const normalizedUserId = String(userId || '').trim();
  return `${API_ORIGIN}/api/v1/uploads/avatar/${encodeURIComponent(normalizedUserId)}`;
}

/**
 * Opens the image picker, uploads the selected image through the backend API,
 * and returns the public URL. Returns null if the user cancelled.
 */
export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission Required', 'Please allow access to your photo library to upload a profile picture.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: 'avatar.jpg',
      type: asset.mimeType || 'image/jpeg',
    } as any);

    await api.postForm<{ avatar_url: string }>('/uploads/avatar', formData);
    return `${getAvatarUrl(userId)}?t=${Date.now()}`;
  } catch (err) {
    Alert.alert('Upload Failed', (err as Error).message || 'Could not upload avatar.');
    return null;
  }
}
