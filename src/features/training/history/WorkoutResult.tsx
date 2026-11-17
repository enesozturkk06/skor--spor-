import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated';

import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { enter } from '@/components/motion/entrance';
import { AppText, Button, Icon, ProgressBar, Screen, SectionHeader, Tag } from '@/components/ui';
import { getSport } from '@/features/athlete/catalog';
import { getExercise } from '@/features/exercises/catalog';
import { NavBar } from '@/features/exercises/components/NavBar';
import { colors, radius, spacing } from '@/theme';

import { Sheet } from '../components/Sheet';
import { describeSet } from '../previous';
import { levelFor, previousComparable, workoutStats, type WorkoutStats } from '../progress';
import { METRIC_META, formatRecord, recordsSetBy } from '../records';
import { KIND_META } from '../template-model';
import { useTraining } from '../TrainingProvider';
import { useInsights } from '../useInsights';
import { Celebration } from './Celebration';

const SYNC = { synced: ['Kaydedildi', 'success'], pending: ['Gönderilmeyi bekliyor', 'gold'], rejected: ['Sunucu kabul etmedi', 'orange'] } as const;
const kg = (n: number) => `${n.toLocaleString('tr-TR')} kg`;
const dateLong = (iso: string) =>
  new Date(iso).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const time = (iso: string) => new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

/**
 * Result of one workout. Right after finishing (celebrate=1) it is the
 * completion screen: burst, records, XP and comparison with last time.
 * From the history it is the detailed record, with a confirmed delete.
 */
export function WorkoutResult() {
  const router = useRouter();
  const t = useTraining();
  const insights = useInsights();
  const { id, celebrate } = useLocalSearchParams<{ id: string; celebrate?: string }>();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const w = t.history.find((e) => e.id === id);

  const derived = useMemo(() => {
    if (!w) return null;
    const prev = previousComparable(w, t.history);
    return { stats: workoutStats(w), prev, prevStats: prev ? workoutStats(prev) : null, ...recordsSetBy(w, t.history) };
  }, [w, t.history]);

  if (!t.ready) return null;
  if (!w || !derived) return deleting ? null : <Redirect href="/history" />;

  const party = celebrate === '1';
  // Records and XP need the whole history: until every page is loaded, say so instead of guessing.
  const xp = insights.ready ? insights.xp.get(w.id) : undefined;
  const sport = getSport(w.sport);
  const exercises = [...new Set(w.sets.map((s) => s.exerciseKey))];

  return (
    <View style={styles.root}>
      <Screen
        width="form"
        footer={party ? <Button label="Devam" icon="check" onPress={() => router.replace('/training')} /> : undefined}
      >
        {party ? null : <NavBar overline="Antrenman" fallback="/history" />}

        <Animated.View entering={enter(0)} style={styles.head}>
          {party ? <Celebration icon={derived.records.length ? 'trophy-outline' : 'check'} tone={derived.records.length ? 'gold' : 'orange'} /> : null}
          <AppText variant="overline" color="gold">
            {party ? 'Antrenman tamam' : `${sport.label} · ${time(w.startedAt)}`}
          </AppText>
          <AppText variant="display" align={party ? 'center' : 'left'} accessibilityRole="header" testID="result-title">
            {w.name}
          </AppText>
          <AppText variant="small" color="textMuted" align={party ? 'center' : 'left'}>
            {dateLong(w.startedAt)}
          </AppText>
          <View style={[styles.tags, party && styles.center]}>
            <Tag label={SYNC[w.sync][0]} tone={SYNC[w.sync][1]} />
            {w.rpe ? <Tag label={`RPE ${w.rpe}`} tone="neutral" /> : null}
          </View>
        </Animated.View>

        <View style={styles.stack}>
          <Animated.View entering={enter(1)}>
            <StatGrid stats={derived.stats} />
          </Animated.View>

          {!insights.ready ? (
            <View style={styles.firsts} testID="result-records-loading">
              <AppText variant="small" color="textMuted">
                Rekorların ve XP tüm antrenman geçmişin yüklenince hesaplanır…
              </AppText>
            </View>
          ) : derived.records.length || derived.firsts.length ? (
            <Animated.View entering={enter(2)}>
              <SectionHeader overline="Kişisel rekorlar" title={derived.records.length ? `${derived.records.length} yeni rekor` : 'İlk ölçümler'} />
              <View style={styles.list} testID="result-records">
                {derived.records.map((r, i) => (
                  <Animated.View
                    key={`${r.exerciseKey}-${r.metric}`}
                    entering={ZoomIn.duration(360)
                      .delay(500 + i * 140)
                      .reduceMotion(ReduceMotion.System)}
                    style={styles.pr}
                    testID={`pr-${r.exerciseKey}-${r.metric}`}
                  >
                    <View style={styles.prBadge}>
                      <Icon name="trophy-outline" size={22} color="textOnOrange" />
                    </View>
                    <View style={styles.flex}>
                      <AppText variant="overline" color="gold">
                        Yeni rekor · {METRIC_META[r.metric].label}
                      </AppText>
                      <AppText variant="title">{getExercise(r.exerciseKey)?.name.tr ?? r.exerciseKey}</AppText>
                      <AppText variant="small" color="textMuted">
                        {formatRecord(r.metric, r.previous!)} → <AppText variant="smallStrong" color="gold">{formatRecord(r.metric, r.value)}</AppText>
                      </AppText>
                    </View>
                  </Animated.View>
                ))}
                {derived.firsts.length ? (
                  <View style={styles.firsts} testID="result-firsts">
                    <AppText variant="small" color="textMuted">
                      İlk ölçüm (bir sonraki seferin hedefi):{' '}
                      {derived.firsts
                        .slice(0, 6)
                        .map((f) => `${getExercise(f.exerciseKey)?.name.tr} · ${METRIC_META[f.metric].label.toLocaleLowerCase('tr-TR')} ${formatRecord(f.metric, f.value)}`)
                        .join('; ')}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </Animated.View>
          ) : null}

          {xp ? (
            <Animated.View entering={enter(3)}>
              <XpCard gained={xp.gained} totalAfter={xp.totalAfter} />
            </Animated.View>
          ) : null}

          <Animated.View entering={enter(4)}>
            <SectionHeader overline="Karşılaştırma" title={derived.prev ? 'Önceki antrenmana göre' : 'İlk karşılaştırma'} />
            {derived.prev && derived.prevStats ? (
              <View style={styles.compare} testID="result-compare">
                <AppText variant="small" color="textMuted">
                  {derived.prev.name} · {new Date(derived.prev.startedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                </AppText>
                <Delta label="Süre" now={derived.stats.minutes} before={derived.prevStats.minutes} unit="dk" />
                <Delta label="Set" now={derived.stats.sets} before={derived.prevStats.sets} unit="set" />
                {derived.stats.volumeKg || derived.prevStats.volumeKg ? <Delta label="Hacim" now={derived.stats.volumeKg} before={derived.prevStats.volumeKg} unit="kg" /> : null}
                {derived.stats.reps || derived.prevStats.reps ? <Delta label="Tekrar" now={derived.stats.reps} before={derived.prevStats.reps} unit="tekrar" /> : null}
              </View>
            ) : (
              <AppText variant="small" color="textMuted" testID="result-compare-none">
                Bu tür bir antrenmanı ilk kez kaydettin. Bir dahaki sefere burada gelişimini göreceksin.
              </AppText>
            )}
          </Animated.View>

          <Animated.View entering={enter(5)}>
            <SectionHeader overline="Ayrıntı" title="Egzersizler" />
            <View style={styles.list}>
              {exercises.map((key) => {
                const sets = w.sets.filter((s) => s.exerciseKey === key);
                return (
                  <View key={key} style={styles.exercise} testID={`result-ex-${key}`}>
                    <AppText variant="title">{sets[0].exerciseName}</AppText>
                    {sets.map((s) => (
                      <View key={`${s.position}-${s.setIndex}`} style={styles.setRow}>
                        <AppText variant="smallStrong" color={s.kind === 'normal' ? 'textMuted' : 'gold'} style={styles.setNo}>
                          {s.kind === 'normal' ? s.setIndex : KIND_META[s.kind].short}
                        </AppText>
                        <AppText variant="small">{describeSet(s)}</AppText>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          </Animated.View>

          {w.notes ? (
            <AppText variant="body" color="textMuted">
              {w.notes}
            </AppText>
          ) : null}

          <Button label="Antrenmanı sil" icon="delete-outline" variant="ghost" onPress={() => setConfirm(true)} />
        </View>
      </Screen>

      {confirm ? (
        <Sheet
          title="Antrenman silinsin mi?"
          subtitle="Bu antrenman ve setleri kalıcı olarak silinir; rekorların ve Athlete Score yeniden hesaplanır."
          onClose={() => setConfirm(false)}
          testID="delete-workout-sheet"
        >
          <Button
            label="Evet, sil"
            variant="danger"
            icon="delete-outline"
            onPress={async () => {
              setDeleting(true);
              await t.deleteWorkout(w.id);
              router.replace('/history');
            }}
          />
          <Button label="Vazgeç" variant="secondary" onPress={() => setConfirm(false)} />
        </Sheet>
      ) : null}
    </View>
  );
}

function StatGrid({ stats }: { stats: WorkoutStats }) {
  const items: { label: string; value: number; format?: (n: number) => string; id: string }[] = [
    { label: 'Süre (dk)', value: stats.minutes, id: 'minutes' },
    { label: 'Set', value: stats.sets, id: 'sets' },
    { label: 'Tekrar', value: stats.reps, id: 'reps' },
    { label: 'Hacim', value: stats.volumeKg, format: kg, id: 'volume' },
    { label: 'Egzersiz', value: stats.exercises, id: 'exercises' },
    ...(stats.rounds ? [{ label: 'Raund', value: stats.rounds, id: 'rounds' }] : []),
    ...(stats.distanceM ? [{ label: 'Mesafe (m)', value: stats.distanceM, id: 'distance' }] : []),
  ];
  return (
    <View style={styles.grid}>
      {items.map((s, i) => (
        <View key={s.id} style={styles.stat}>
          <AnimatedNumber value={s.value} format={s.format ?? ((n) => n.toLocaleString('tr-TR'))} delay={200 + i * 70} variant="statL" testID={`result-${s.id}`} />
          <AppText variant="overline" color="textMuted">
            {s.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function Delta({ label, now, before, unit }: { label: string; now: number; before: number; unit: string }) {
  const d = now - before;
  const tone = d > 0 ? 'success' : d < 0 ? 'danger' : 'textMuted';
  return (
    <View style={styles.deltaRow}>
      <AppText variant="small" color="textMuted" style={styles.flex}>
        {label}
      </AppText>
      <AppText variant="smallStrong">
        {now.toLocaleString('tr-TR')} {unit}
      </AppText>
      <View style={styles.deltaVal} testID={`delta-${label}`}>
        {d ? <Icon name={d > 0 ? 'trending-up' : 'trending-down'} size={14} color={tone} /> : null}
        <AppText variant="smallStrong" color={tone}>
          {d > 0 ? '+' : ''}
          {d.toLocaleString('tr-TR')}
        </AppText>
      </View>
    </View>
  );
}

function XpCard({ gained, totalAfter }: { gained: number; totalAfter: number }) {
  const before = levelFor(totalAfter - gained);
  const after = levelFor(totalAfter);
  const up = after.level > before.level;
  return (
    <View style={styles.xp} testID="result-xp">
      <View style={styles.xpHead}>
        <AnimatedNumber value={gained} delay={400} format={(n) => `+${n} XP`} variant="statL" style={styles.xpGain} testID="result-xp-gained" />
        <View style={styles.flex} />
        {up ? <Tag label={`Seviye ${after.level}!`} tone="gold" icon="trending-up" /> : <Tag label={`Seviye ${after.level}`} tone="neutral" />}
      </View>
      <ProgressBar progress={after.progress} height={8} animated delay={500} accessibilityLabel={`Seviye ${after.level}: ${after.into} / ${after.span} XP`} />
      <AppText variant="small" color="textMuted">
        {after.into} / {after.span} XP · sonraki seviyeye {after.span - after.into} XP
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  center: { justifyContent: 'center' },
  head: { gap: spacing.sm, marginBottom: spacing.xl },
  tags: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xs },
  stack: { gap: spacing.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: {
    flexGrow: 1,
    flexBasis: '28%',
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  list: { gap: spacing.md },
  pr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.goldSoft,
  },
  prBadge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold },
  firsts: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface },
  xp: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.petrolDeep },
  xpHead: { flexDirection: 'row', alignItems: 'center' },
  xpGain: { color: colors.orange },
  compare: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  deltaVal: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 64, justifyContent: 'flex-end' },
  exercise: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  setRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  setNo: { width: 20, textAlign: 'center' },
});

