import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { enter } from '@/components/motion/entrance';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText, Button, Icon, ProgressBar, Screen } from '@/components/ui';
import { getExercise } from '@/features/exercises/catalog';
import { MUSCLES } from '@/features/exercises/muscles';
import { NavBar } from '@/features/exercises/components/NavBar';
import { colors, radius, spacing } from '@/theme';
import { pressScale } from '@/theme/motion';

import { METRIC_META, METRICS_BY_MODALITY, formatRecord } from '../records';
import { useTraining } from '../TrainingProvider';
import { useInsights } from '../useInsights';

/**
 * Personal records per exercise: each kind of measure on its own line, with
 * the date and the workout it was set in (tap to open that workout).
 */
export function RecordsScreen() {
  const router = useRouter();
  const { records, totalXp, level, ready } = useInsights();
  const { historyLoading: loading, refresh } = useTraining();
  const rows = useMemo(
    () =>
      [...records.entries()]
        .map(([key, list]) => {
          const order = METRICS_BY_MODALITY[getExercise(key)?.modality ?? 'strength'];
          return { key, list: [...list].sort((a, b) => order.indexOf(a.metric) - order.indexOf(b.metric)), latest: Math.max(...list.map((r) => Date.parse(r.at))) };
        })
        .sort((a, b) => b.latest - a.latest),
    [records],
  );
  const count = rows.reduce((n, r) => n + r.list.length, 0);

  return (
    <Screen width="form">
      <NavBar overline="Antrenman" fallback="/training" />
      <Animated.View entering={enter(0)} style={styles.title}>
        <AppText variant="display" accessibilityRole="header">
          Rekorlar
        </AppText>
        <AppText variant="body" color="textMuted" testID="records-summary">
          {rows.length} egzersizde {count} kişisel rekor
        </AppText>
      </Animated.View>

      {!ready ? (
        <View style={styles.empty} testID="records-loading" accessibilityLiveRegion="polite">
          <Icon name="refresh" size={28} color="textFaint" />
          <AppText variant="small" color="textMuted" align="center">
            {loading
              ? 'Antrenman geçmişin yükleniyor. Rekorlar ve seviye, tüm kayıtlar geldikten sonra kesin olarak gösterilir.'
              : 'Antrenman geçmişinin tamamı yüklenemedi; eksik veriyle rekor gösterilmez.'}
          </AppText>
          {!loading ? <Button label="Tekrar dene" size="md" variant="secondary" onPress={() => void refresh()} /> : null}
        </View>
      ) : (
        <>
      <Animated.View entering={enter(1)} style={styles.level} testID="records-level">
        <View style={styles.levelHead}>
          <AppText variant="overline" color="gold">
            Seviye
          </AppText>
          <AnimatedNumber value={level.level} variant="statL" delay={150} />
          <View style={styles.flex} />
          <AppText variant="smallStrong" color="orange" testID="records-xp">
            {totalXp.toLocaleString('tr-TR')} XP
          </AppText>
        </View>
        <ProgressBar progress={level.progress} height={8} animated delay={250} accessibilityLabel={`Sonraki seviyeye ${level.span - level.into} XP`} />
        <AppText variant="small" color="textMuted">
          Antrenman başına 50 XP, set başına 2, her 5 dakika için 1 ve her yeni rekor için 25 XP.
        </AppText>
      </Animated.View>

      {!rows.length ? (
        <View style={styles.empty} testID="records-empty">
          <Icon name="trophy-outline" size={32} color="textFaint" />
          <AppText variant="small" color="textMuted" align="center">
            Rekorların antrenman kaydettikçe burada oluşur. Isınma setleri sayılmaz; her ölçüm türü (ağırlık, tekrar, süre, mesafe) ayrı tutulur.
          </AppText>
        </View>
      ) : (
        <View style={styles.list}>
          {rows.map((r, i) => {
            const ex = getExercise(r.key);
            return (
              <Animated.View key={r.key} entering={enter(Math.min(i, 6), { step: 50, delay: 150 })} style={styles.card} testID={`records-${r.key}`}>
                <View style={styles.cardHead}>
                  <View style={styles.trophy}>
                    <Icon name="trophy-outline" size={20} color="gold" />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="h3">{ex?.name.tr ?? r.key}</AppText>
                    <AppText variant="small" color="gold" numberOfLines={1}>
                      {(ex?.primary ?? []).map((m) => MUSCLES[m].tr).join(' · ')}
                    </AppText>
                  </View>
                </View>
                {r.list.map((rec) => (
                  <PressableScale
                    key={rec.metric}
                    scaleTo={pressScale.card}
                    accessibilityRole="button"
                    accessibilityLabel={`${METRIC_META[rec.metric].label}: ${formatRecord(rec.metric, rec.value)}. ${rec.workoutName} antrenmanını aç`}
                    onPress={() => router.push({ pathname: '/history/[id]', params: { id: rec.workoutId } })}
                    style={styles.metric}
                    testID={`record-${r.key}-${rec.metric}`}
                  >
                    <View style={styles.flex}>
                      <AppText variant="overline" color="textMuted">
                        {METRIC_META[rec.metric].label}
                      </AppText>
                      <AppText variant="small" color="textMuted" numberOfLines={1}>
                        {new Date(rec.at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} · {rec.workoutName}
                      </AppText>
                    </View>
                    <AppText variant="statM" color="text">
                      {formatRecord(rec.metric, rec.value)}
                    </AppText>
                    <Icon name="chevron-right" size={18} color="textFaint" />
                  </PressableScale>
                ))}
              </Animated.View>
            );
          })}
        </View>
      )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { gap: spacing.sm, marginBottom: spacing.lg },
  flex: { flex: 1, minWidth: 0 },
  level: { gap: spacing.sm, padding: spacing.lg, marginBottom: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.petrolDeep },
  levelHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  list: { gap: spacing.lg },
  card: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
  trophy: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.goldSoft },
  metric: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bgRaised },
  empty: { alignItems: 'center', gap: spacing.md, padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong },
});
