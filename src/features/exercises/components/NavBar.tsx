import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon } from '@/components/ui';
import { radius, spacing } from '@/theme';

/** Back button + overline; falls back to `fallback` when there is no history (deep link). */
export function NavBar({ overline, fallback = '/' }: { overline: string; fallback?: Href }) {
  const router = useRouter();
  return (
    <View style={styles.nav}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Geri"
        hitSlop={12}
        onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
        style={styles.btn}
      >
        <Icon name="arrow-left" size={22} />
      </Pressable>
      <AppText variant="overline" color="textMuted">
        {overline}
      </AppText>
      <View style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  btn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
