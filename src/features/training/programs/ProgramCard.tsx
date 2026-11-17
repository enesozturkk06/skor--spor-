import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText, Icon, Tag } from '@/components/ui';
import { getSport } from '@/features/athlete/catalog';
import { GOAL_LABELS } from '@/features/exercises/presets';
import { colors, radius, spacing } from '@/theme';
import { pressScale } from '@/theme/motion';

import { WEEKDAYS, estimateMinutes, totalSets } from '../template-model';
import type { WorkoutTemplate } from '../types';

/** Program in a list: sport, goal, size and its days in the weekly plan. */
export const ProgramCard = memo(function ProgramCard({ program: t, onPress }: { program: WorkoutTemplate; onPress: (t: WorkoutTemplate) => void }) {
  const sport = getSport(t.sport);
  const minutes = estimateMinutes(t);
  return (
    <PressableScale
      scaleTo={pressScale.card}
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={`${t.name}, ${sport.label}, ${t.blocks.length} egzersiz, yaklaşık ${minutes} dakika`}
      onPress={() => onPress(t)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      testID={`program-${t.id}`}
    >
      <View style={styles.accent} />
      <View style={styles.top}>
        <View style={styles.icon}>
          <Icon name={sport.icon} size={22} color="orange" />
        </View>
        <View style={styles.tags}>
          {t.builtIn ? <Tag label="Hazır" tone="gold" /> : null}
          {t.goal ? <Tag label={GOAL_LABELS[t.goal]} tone="orange" /> : null}
        </View>
      </View>
      <AppText variant="h3" numberOfLines={2}>
        {t.name}
      </AppText>
      <AppText variant="small" color="textMuted">
        {sport.label} · {t.blocks.length} egzersiz · {totalSets(t)} set · ~{minutes} dk
      </AppText>
      {t.days.length ? (
        <View style={styles.days}>
          {WEEKDAYS.map((d) => (
            <View key={d.day} style={[styles.day, t.days.includes(d.day) && styles.dayOn]}>
              <AppText variant="overline" color={t.days.includes(d.day) ? 'textOnOrange' : 'textFaint'} style={styles.dayText}>
                {d.short.slice(0, 2)}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  pressed: { backgroundColor: colors.surfacePressed },
  accent: { position: 'absolute', top: 0, left: spacing.lg, width: 28, height: 3, backgroundColor: colors.orange, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orangeSoft },
  tags: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 1 },
  days: { flexDirection: 'row', gap: 4, marginTop: spacing.xs },
  day: { width: 28, height: 22, borderRadius: radius.xs, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dataTrack },
  dayOn: { backgroundColor: colors.orange },
  dayText: { fontSize: 9, letterSpacing: 0.5 },
});
