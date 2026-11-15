import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton, SkeletonGroup } from '@/components/motion/Skeleton';
import { Screen } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

/** Card-shaped frame so the skeleton matches the real dashboard layout. */
function Frame({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.frame, style]}>{children}</View>;
}

/**
 * Shown while the athlete profile loads (after sign-in, or on start-up once
 * the session is known). Mirrors the dashboard's first screen so content
 * lands in place instead of jumping.
 */
export function DashboardSkeleton() {
  return (
    <Screen edges={['top', 'left', 'right']}>
      <SkeletonGroup label="Performans panelin yükleniyor" style={styles.stack}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Skeleton width={120} height={10} />
            <Skeleton width="70%" height={30} radius={radius.xs} />
            <Skeleton width={110} height={12} />
          </View>
          <Skeleton width={52} height={52} radius={26} />
        </View>

        <Frame style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.headerText}>
              <Skeleton width={110} height={10} />
              <Skeleton width={120} height={56} radius={radius.xs} />
              <Skeleton width={150} height={18} radius={radius.pill} />
            </View>
            <Skeleton width={124} height={124} radius={62} />
          </View>
          <View style={styles.pillars}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.pillar}>
                <Skeleton width="80%" height={10} />
                <Skeleton height={5} radius={radius.pill} />
              </View>
            ))}
          </View>
        </Frame>

        <View style={styles.row}>
          {[0, 1].map((i) => (
            <Frame key={i} style={styles.small}>
              <Skeleton width={70} height={10} />
              <Skeleton width={90} height={34} radius={radius.xs} />
              <Skeleton height={6} radius={radius.pill} />
            </Frame>
          ))}
        </View>

        <Frame>
          <Skeleton width={130} height={10} />
          <View style={styles.bars}>
            {[0.6, 0.15, 0.8, 0.55, 0.9, 0.45, 0.1].map((h, i) => (
              <Skeleton key={i} width={22} height={24 + h * 90} radius={radius.xs} />
            ))}
          </View>
        </Frame>
      </SkeletonGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg },
  headerText: { flex: 1, gap: spacing.sm },
  frame: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  hero: { backgroundColor: colors.petrolDeep },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  pillars: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  pillar: { flex: 1, gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  small: { flex: 1 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 130, marginTop: spacing.md },
});
