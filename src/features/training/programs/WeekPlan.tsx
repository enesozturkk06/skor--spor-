import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { fadeIn } from '@/components/motion/entrance';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText, Icon } from '@/components/ui';
import { getSport } from '@/features/athlete/catalog';
import { colors, radius, spacing } from '@/theme';
import { pressScale } from '@/theme/motion';

import { WEEKDAYS, estimateMinutes, isoWeekday } from '../template-model';
import type { Weekday, WorkoutTemplate } from '../types';

/**
 * The athlete's week: which program is on which day. A day is a tab; its
 * programs show underneath (start / open with one tap). Today is marked.
 */
export function WeekPlan({ programs, onOpen, today = isoWeekday(new Date()) }: { programs: readonly WorkoutTemplate[]; onOpen: (t: WorkoutTemplate) => void; today?: Weekday }) {
  const [day, setDay] = useState<Weekday>(today);
  const byDay = useMemo(() => {
    const m = new Map<Weekday, WorkoutTemplate[]>();
    for (const d of WEEKDAYS) m.set(d.day, programs.filter((p) => p.days.includes(d.day)));
    return m;
  }, [programs]);
  const list = byDay.get(day) ?? [];
  const meta = WEEKDAYS[day - 1];

  return (
    <View style={styles.card} testID="week-plan">
      <View style={styles.days} accessibilityRole="tablist">
        {WEEKDAYS.map((d) => {
          const on = d.day === day;
          const count = byDay.get(d.day)?.length ?? 0;
          return (
            <PressableScale
              key={d.day}
              scaleTo={pressScale.tile}
              haptic="select"
              accessibilityRole="tab"
              aria-selected={on}
              accessibilityLabel={`${d.long}${d.day === today ? ', bugün' : ''}: ${count ? `${count} program` : 'dinlenme'}`}
              onPress={() => setDay(d.day)}
              style={[styles.day, on && styles.dayOn]}
              testID={`week-day-${d.day}`}
            >
              <AppText variant="overline" color={on ? 'textOnOrange' : d.day === today ? 'orange' : 'textMuted'} style={styles.dayLabel}>
                {d.short}
              </AppText>
              <View style={[styles.dot, count ? (on ? styles.dotOnSelected : styles.dotOn) : null]} />
            </PressableScale>
          );
        })}
      </View>
      <Animated.View key={day} entering={fadeIn()} style={styles.list}>
        <AppText variant="overline" color="gold">
          {day === today ? `Bugün · ${meta.long}` : meta.long}
        </AppText>
        {list.length ? (
          list.map((p) => (
            <PressableScale
              key={p.id}
              scaleTo={pressScale.card}
              haptic="tap"
              accessibilityRole="button"
              accessibilityLabel={`${p.name} programını aç`}
              onPress={() => onOpen(p)}
              style={styles.item}
            >
              <Icon name={getSport(p.sport).icon} size={18} color="orange" />
              <AppText variant="title" style={styles.flex} numberOfLines={1}>
                {p.name}
              </AppText>
              <AppText variant="small" color="textMuted">
                ~{estimateMinutes(p)} dk
              </AppText>
              <Icon name="chevron-right" size={18} color="textFaint" />
            </PressableScale>
          ))
        ) : (
          <AppText variant="small" color="textMuted" testID="week-rest">
            Dinlenme günü. Bir programa gün atamak için programı düzenle.
          </AppText>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  flex: { flex: 1 },
  days: { flexDirection: 'row', gap: 4 },
  day: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.bgRaised },
  dayOn: { backgroundColor: colors.orange },
  dayLabel: { fontSize: 10, letterSpacing: 0.8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: colors.orange },
  dotOnSelected: { backgroundColor: colors.textOnOrange },
  list: { gap: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bgRaised },
});
