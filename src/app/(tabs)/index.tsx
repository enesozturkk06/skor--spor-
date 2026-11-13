import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { useTabBarClearance } from '@/components/navigation/TabBar';
import { Screen, SectionHeader } from '@/components/ui';
import { useAthlete } from '@/features/athlete/AthleteProvider';
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

export default function HomeScreen() {
  const { user } = useAuth();
  const { profile } = useAthlete();
  const openModule = useOpenModule();
  const clearance = useTabBarClearance();
  const { width } = useWindowDimensions();
  const wide = width >= layout.wideBreakpoint;

  const snapshot = useMemo(() => (profile ? buildDashboardSnapshot(profile) : null), [profile]);
  if (!user || !profile || !snapshot) return null;

  const overview = (
    <View style={styles.stack}>
      <ScoreHero score={snapshot.score} delta={snapshot.scoreDelta} />
      <View style={styles.row}>
        <DailyGoalCard minutes={snapshot.todayMinutes} target={snapshot.dailyTargetMinutes} />
        <StreakCard days={snapshot.streakDays} week={snapshot.week} />
      </View>
      <WeeklyActivityChart week={snapshot.week} dailyTarget={snapshot.dailyTargetMinutes} />
    </View>
  );

  const details = (
    <View style={styles.stack}>
      <View>
        <SectionHeader overline="Bu hafta" title="Antrenman" actionLabel="Detay" onAction={() => openModule('performance')} />
        <TrainingStats stats={snapshot.stats} />
      </View>
      <View>
        <SectionHeader overline="Bugün" title="Yakıt & toparlanma" />
        {/* Cards wrap to full width on narrow screens instead of being squeezed. */}
        <View style={[styles.row, styles.wrap]}>
          <NutritionSummary nutrition={snapshot.nutrition} onPress={() => openModule('nutrition')} />
          <RecoverySummary recovery={snapshot.recovery} onPress={() => openModule('recovery')} />
        </View>
      </View>
    </View>
  );

  return (
    <Screen edges={['top', 'left', 'right']} bottomInset={clearance}>
      <View style={styles.stack}>
        <DashboardHeader name={user.displayName} primarySport={profile.primarySport} />
        {snapshot.isSample ? <SampleDataNotice /> : null}

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

        <View>
          <SectionHeader overline="Modüller" title="Hızlı erişim" />
          <QuickAccess columns={width >= 720 ? 3 : 2} />
        </View>
        <MotivationCard message={motivationOfTheDay()} />
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
