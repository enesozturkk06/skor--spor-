import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText, Icon } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import { pressScale } from '@/theme/motion';

import { LEVEL_LABELS, MODALITY_META } from '../catalog';
import { MUSCLES, type MuscleId } from '../muscles';
import type { Exercise } from '../types';

const muscleLine = (ms: readonly MuscleId[]) => ms.map((m) => MUSCLES[m].tr).join(' · ');

type Props = { exercise: Exercise; onPress: (key: string) => void; compact?: boolean };

/** One library row: modality badge, bilingual name, primary muscles, level. */
export const ExerciseCard = memo(function ExerciseCard({ exercise: e, onPress, compact = false }: Props) {
  const meta = MODALITY_META[e.modality];
  return (
    <PressableScale
      scaleTo={pressScale.card}
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={`${e.name.tr}, ${muscleLine(e.primary)}`}
      onPress={() => onPress(e.key)}
      testID={`exercise-${e.key}`}
      style={({ pressed }) => [styles.card, compact && styles.compact, pressed && styles.pressed]}
    >
      <View style={styles.badge}>
        <Icon name={meta.icon} size={20} color="orange" />
      </View>
      <View style={styles.body}>
        <AppText variant="title" numberOfLines={1}>
          {e.name.tr}
        </AppText>
        <AppText variant="small" color="textMuted" numberOfLines={1}>
          {e.name.en}
        </AppText>
        {!compact ? (
          <AppText variant="smallStrong" color="gold" numberOfLines={1} style={styles.muscles}>
            {muscleLine(e.primary)}
          </AppText>
        ) : null}
      </View>
      {!compact ? (
        <View style={styles.side}>
          <LevelBars level={e.level} />
          <Icon name="chevron-right" size={20} color="textFaint" />
        </View>
      ) : null}
    </PressableScale>
  );
});

/** Three bars, filled by level — reads faster than a word in a dense list. */
export function LevelBars({ level }: { level: Exercise['level'] }) {
  const n = level === 'beginner' ? 1 : level === 'intermediate' ? 2 : 3;
  return (
    <View style={styles.bars} accessible accessibilityLabel={`Seviye: ${LEVEL_LABELS[level]}`}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.bar, { height: 6 + i * 4 }, i < n && styles.barOn]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  compact: { width: 230, padding: spacing.md },
  pressed: { backgroundColor: colors.surfacePressed },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orangeSoft,
  },
  body: { flex: 1, minWidth: 0 },
  muscles: { marginTop: spacing.xxs },
  side: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 4, borderRadius: 2, backgroundColor: colors.dataTrack },
  barOn: { backgroundColor: colors.gold },
});
