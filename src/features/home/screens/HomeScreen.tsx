import { StyleSheet, Text, View } from 'react-native';

import { getAppConfig } from '@config/appConfig';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';

export function HomeScreen() {
  const { appName, environment } = getAppConfig();

  return (
    <View
      collapsable={false}
      nativeID="home-screen"
      testID="home-screen-root"
      style={styles.root}
    >
      <Text testID="home-title" accessible={true} style={styles.title}>{appName}</Text>
      <Text style={styles.subtitle}>Single-root Expo boilerplate (TypeScript-first)</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Environment: {environment}</Text>
      </View>
      <Text
        testID="maestro-smoke-ready"
        accessibilityLabel="maestro-smoke-ready"
        accessible={true}
        style={styles.smokeMarker}
      >
        MAESTRO_SMOKE_READY
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  badge: {
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  badgeText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  smokeMarker: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
  },
});
