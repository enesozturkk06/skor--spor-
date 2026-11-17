import { useRouter } from 'expo-router';
import { useCallback, useMemo, type ReactNode } from 'react';
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
import { ScoreBasis } from '@/features/dashboard/components/ScoreBasis';
import { ScoreHero } from '@/features/dashboard/components/ScoreHero';
import { StreakCard } from '@/features/dashboard/components/StreakCard';
import { TrainingStats } from '@/features/dashboard/components/TrainingStats';
import { WeeklyActivityChart } from '@/features/dashboard/components/WeeklyActivityChart';
import { buildDashboardSnapshot, motivationOfTheDay } from '@/features/dashboard/dashboard-data';
import { useOpenModule } from '@/features/modules/useOpenModule';
import { useTraining } from '@/features/training/TrainingProvider';
import { layout, spacing } from '@/theme';

/** Each block rises in after the previous one (Reduce Motion: appears at once). */
function Reveal({ order, children }: { order: number; children: ReactNode }) {
  return <Animated.View entering={enter(order)}>{children}</Animated.View>;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { profile, refresh: refreshProfile, refreshing } = useAthlete();
  const training = useTraining();
  const router = useRouter();
  const openModule = useOpenModule();
  const clearance = useTabBarClearance();
  const { width } = useWindowDimensions();
  const wide = width >= layout.wideBreakpoint;

  // Training numbers come from the athlete's own logged workouts.
  const { history, historyComplete, historyLoadedUntil } = training;
  const snapshot = useMemo(
    () => (profile ? buildDashboardSnapshot(profile, history, new Date(), { complete: historyComplete, loadedUntil: historyLoadedUntil }) : null),
    [profile, history, historyComplete, historyLoadedUntil],
  );
  const refreshTraining = training.refresh;
  const refresh = useCallback(async () => {
    await Promise.all([refreshProfile(), refreshTraining()]);
  }, [refreshProfile, refreshTraining]);
  if (!user || !profile || !snapshot) return null;

  const overview = (
    <View style={styles.stack}>
      <Reveal order={2}>
        <ScoreHero score={snapshot.score} />
        <View style={styles.basis}>
          <ScoreBasis score={snapshot.score} />
        </View>
      </Reveal>
      <Reveal order={3}>
        <View style={styles.row}>
          <DailyGoalCard minutes={snapshot.todayMinutes} target={snapshot.dailyTargetMinutes} />
          <StreakCard days={snapshot.streakDays} week={snapshot.week} />
        </View>
      </Reveal>
      <Reveal order={4}>
        <WeeklyActivityChart week={snapshot.week} dailyTarget={snapshot.dailyTargetMinutes} />
      </Reveal>
    </View>
  );

  const details = (
    <View style={styles.stack}>
      <Reveal order={5}>
        <SectionHeader
          overline="Bu hafta"
          title="Antrenman"
          actionLabel="Geçmiş"
          onAction={() => router.push('/history')}
        />
        <TrainingStats stats={snapshot.stats} />
      </Reveal>
      <Reveal order={6}>
        <SectionHeader overline="Yakında" title="Yakıt & toparlanma" />
        {/* Cards wrap to full width on narrow screens instead of being squeezed. */}
        <View style={[styles.row, styles.wrap]}>
          <NutritionSummary nutrition={snapshot.nutrition} onPress={() => openModule('nutrition')} />
          <RecoverySummary onPress={() => openModule('recovery')} />
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
  basis: { marginTop: spacing.md },
  wideRow: { flexDirection: 'row', gap: spacing.xxl, alignItems: 'flex-start' },
  wideCol: { flex: 1 },
});
