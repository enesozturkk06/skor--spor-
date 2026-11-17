import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, Icon, Tag } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

import { EXERCISES } from '../catalog';
import { MuscleMap } from './MuscleMap';

/** Entry card to the exercise library, shown on the training tab. */
export function LibraryTeaser() {
  const router = useRouter();
  return (
    <Card onPress={() => router.push('/exercises')} accessibilityLabel="Egzersiz kütüphanesini aç" accent="orange" padded={false}>
      <View style={styles.row}>
        <View style={styles.text}>
          <Tag label="Yeni" tone="orange" icon="bookshelf" />
          <AppText variant="h2">Egzersiz kütüphanesi</AppText>
          <AppText variant="small" color="textMuted">
            {EXERCISES.length} egzersiz · kas haritası · teknik ve set önerileri
          </AppText>
          <View style={styles.cta}>
            <AppText variant="smallStrong" color="orange">
              Keşfet
            </AppText>
            <Icon name="arrow-right" size={16} color="orange" />
          </View>
        </View>
        <View style={styles.art} pointerEvents="none">
          <MuscleMap primary={['chest', 'quads']} secondary={['front_delts', 'abs']} height={150} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  text: { flex: 1, gap: spacing.sm },
  cta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  art: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.bgRaised,
    transform: [{ scale: 0.9 }],
  },
});
