import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { enter } from '@/components/motion/entrance';
import { useTabBarClearance } from '@/components/navigation/TabBar';
import { Screen, SectionHeader } from '@/components/ui';
import { useAthlete } from '@/features/athlete/AthleteProvider';
import { StaleProfileNotice } from '@/features/athlete/components/StaleProfileNotice';
import { useAuth } from '@/features/auth/AuthProvider';
import { DailyGoalCard } from '@/features/dashboard/components/DailyGoalCard';
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader';
import { MotivationCard } from '@/features/dashboard/components/MotivationCard';
import { NutritionSummary } from '@/features/dashboard/components/NutritionSummary';
import { QuickAccess } from '@/features/dashboard/components/QuickAccess';
import { RecoverySummary } from '@/features/dashboard/components/RecoverySummary';
import { SampleDataNotice } from '@/features/dashboard/components/SampleDataNotice';
import { ScoreHero } from '@/features/dashboard/components/ScoreHero';
import { StreakCard } from '@/features/dashboard/components/StreakCard';
import { TrainingStats } from '@/features/dashboard/components/TrainingStats';
import { WeeklyActivityChart } from '@/features/dashboard/components/WeeklyActivityChart';
import { buildDashboardSnapshot, motivationOfTheDay } from '@/features/dashboard/dashboard-data';
import { useOpenModule } from '@/features/modules/useOpenModule';
import { layout, spacing } from '@/theme';

/** Each block rises in after the previous one (Reduce Motion: appears at once). */
function Reveal({ order, children }: { order: number; children: ReactNode }) {
  return <Animated.View entering={enter(order)}>{children}</Animated.View>;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { profile, refresh, refreshing } = useAthlete();
  const openModule = useOpenModule();
  const clearance = useTabBarClearance();
  const { width } = useWindowDimensions();
  const wide = width >= layout.wideBreakpoint;

  const snapshot = useMemo(() => (profile ? buildDashboardSnapshot(profile) : null), [profile]);
  if (!user || !profile || !snapshot) return null;
  const sample = snapshot.isSample;

  const overview = (
    <View style={styles.stack}>
      <Reveal order={2}>
        <ScoreHero score={snapshot.score} delta={snapshot.scoreDelta} />
      </Reveal>
      <Reveal order={3}>
        <View style={styles.row}>
          <DailyGoalCard minutes={snapshot.todayMinutes} target={snapshot.dailyTargetMinutes} />
          <StreakCard days={snapshot.streakDays} week={snapshot.week} />
        </View>
      </Reveal>
      <Reveal order={4}>
        <WeeklyActivityChart week={snapshot.week} dailyTarget={snapshot.dailyTargetMinutes} isSample={sample} />
      </Reveal>
    </View>
  );

  const details = (
    <View style={styles.stack}>
      <Reveal order={5}>
        <SectionHeader
          overline={sample ? 'Bu hafta · Örnek veri' : 'Bu hafta'}
          title="Antrenman"
          actionLabel="Detay"
          onAction={() => openModule('performance')}
        />
        <TrainingStats stats={snapshot.stats} />
      </Reveal>
      <Reveal order={6}>
        <SectionHeader overline="Bugün" title="Yakıt & toparlanma" />
        {/* Cards wrap to full width on narrow screens instead of being squeezed. */}
        <View style={[styles.row, styles.wrap]}>
          <NutritionSummary nutrition={snapshot.nutrition} isSample={sample} onPress={() => openModule('nutrition')} />
          <RecoverySummary recovery={snapshot.recovery} isSample={sample} onPress={() => openModule('recovery')} />
        </View>
      </Reveal>
    </View>
  );

  return (
    <Screen edges={['top', 'left', 'right']} bottomInset={clearance} onRefresh={refresh} refreshing={refreshing}>
      <View style={styles.stack}>
        <Reveal order={0}>
          <DashboardHeader name={user.displayName} primarySport={profile.primarySport} onRefresh={refresh} refreshing={refreshing} />
        </Reveal>
        <StaleProfileNotice />
        {sample ? (
          <Reveal order={1}>
            <SampleDataNotice />
          </Reveal>
        ) : null}

        {wide ? (
          <View style={styles.wideRow}>
            <View style={styles.wideCol}>{overview}</View>
            <View style={styles.wideCol}>{details}</View>
          </View>
        ) : (
          <>
            {overview}
            {details}
          </>
        )}

        <Reveal order={7}>
          <SectionHeader overline="Modüller" title="Hızlı erişim" />
          <QuickAccess columns={width >= 720 ? 3 : 2} />
        </Reveal>
        <Reveal order={8}>
          <MotivationCard message={motivationOfTheDay()} />
        </Reveal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xxl },
  row: { flexDirection: 'row', gap: spacing.md },
  wrap: { flexWrap: 'wrap' },
  wideRow: { flexDirection: 'row', gap: spacing.xxl, alignItems: 'flex-start' },
  wideCol: { flex: 1 },
});
