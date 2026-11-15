import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { fadeIn } from '@/components/motion/entrance';
import { AppText, Card } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { stagger } from '@/theme/motion';

import type { WeekDay } from '../dashboard-data';

import { AnimatedFlame } from './AnimatedFlame';
import { MiniCardHeader } from './MiniCardHeader';

/** Dots light up left to right after the card has entered. */
const DOTS_DELAY = 260;

export function StreakCard({ days, week }: { days: number; week: WeekDay[] }) {
  const activeCount = week.filter((d) => d.minutes > 0).length;
  return (
    <Card accent="gold" style={styles.card}>
      <MiniCardHeader label="Seri" icon="fire" tone="gold" iconNode={<AnimatedFlame active={days > 0} />} />
      <AppText variant="statL" style={styles.value} accessibilityLabel={`${days} gün üst üste aktif`}>
        <AnimatedNumber value={days} delay={150} variant="statL" testID="streak-days" />
        <AppText variant="smallStrong" color="textMuted">
          {' '}gün
        </AppText>
      </AppText>
      <AppText variant="small" color="textMuted">
        üst üste aktif
      </AppText>
      <View style={styles.dots} accessible accessibilityLabel={`Bu hafta ${activeCount} gün aktif`}>
        {week.map((d, i) => (
          <View key={d.label} style={styles.dotCol}>
            <Animated.View
              entering={fadeIn(0).delay(DOTS_DELAY + i * stagger)}
              style={[styles.dot, d.minutes > 0 && styles.dotActive, d.isToday && styles.dotToday, d.isFuture && styles.dotFuture]}
            />
            <AppText variant="overline" color={d.isToday ? 'orange' : 'textFaint'} style={styles.dotLabel}>
              {d.label.slice(0, 2)}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  value: { marginTop: spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  dotCol: { alignItems: 'center', gap: spacing.xs },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.dataTrack },
  dotActive: { backgroundColor: colors.gold },
  dotToday: { borderWidth: 2, borderColor: colors.orange },
  dotFuture: { opacity: 0.5 },
  dotLabel: { fontSize: 9, letterSpacing: 0 },
});
