import { useRouter } from 'expo-router';
import { memo, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { enter } from '@/components/motion/entrance';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText, Button, Chip, Icon, Screen, Tag } from '@/components/ui';
import { getSport, type SportId } from '@/features/athlete/catalog';
import { NavBar } from '@/features/exercises/components/NavBar';
import { colors, layout, radius, spacing } from '@/theme';
import { pressScale } from '@/theme/motion';

import { counted, lastDays, weekStart, workoutStats } from '../progress';
import { useTraining } from '../TrainingProvider';
import type { WorkoutEntry } from '../types';
import { useInsights } from '../useInsights';

type Period = 'week' | '30' | '90' | 'all';
const PERIODS: { id: Period; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'week', label: 'Bu hafta' },
  { id: '30', label: '30 gün' },
  { id: '90', label: '90 gün' },
];

const MAX_STAGGER = 6;
/** Rows rendered at once (more on demand): long histories stay light on low-end phones. */
const SHOW_STEP = 30;

function weekLabel(start: Date, now: Date): string {
  const thisWeek = weekStart(now).getTime();
  const diff = Math.round((thisWeek - start.getTime()) / (7 * 86_400_000));
  if (diff === 0) return 'Bu hafta';
  if (diff === 1) return 'Geçen hafta';
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const f = (d: Date, month: boolean) => d.toLocaleDateString('tr-TR', month ? { day: 'numeric', month: 'short' } : { day: 'numeric' });
  return start.getMonth() === end.getMonth() ? `${f(start, false)}–${f(end, true)}` : `${f(start, true)} – ${f(end, true)}`;
}

/** Workout history: filter by period, sport and exercise; grouped by week. */
export function HistoryScreen() {
  const router = useRouter();
  const t = useTraining();
  const { recordCounts } = useInsights();
  const [period, setPeriod] = useState<Period>('all');
  const [sport, setSport] = useState<SportId | null>(null);
  const [exercise, setExercise] = useState<string | null>(null);
  const [limit, setLimit] = useState(SHOW_STEP);
  const all = useMemo(() => counted(t.history).concat(t.history.filter((e) => e.sync === 'rejected')), [t.history]);

  const sports = useMemo(() => [...new Set(all.map((w) => w.sport))], [all]);
  const topExercises = useMemo(() => {
    const n = new Map<string, { name: string; count: number }>();
    for (const w of all) for (const key of new Set(w.sets.map((s) => s.exerciseKey))) {
      const name = w.sets.find((s) => s.exerciseKey === key)!.exerciseName;
      n.set(key, { name, count: (n.get(key)?.count ?? 0) + 1 });
    }
    return [...n.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 8);
  }, [all]);

  const filtered = useMemo(() => {
    const now = new Date();
    const from = period === 'all' ? null : period === 'week' ? weekStart(now) : lastDays(Number(period), now).from;
    return all
      .filter((w) => !from || Date.parse(w.startedAt) >= from.getTime())
      .filter((w) => !sport || w.sport === sport)
      .filter((w) => !exercise || w.sets.some((s) => s.exerciseKey === exercise))
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  }, [all, period, sport, exercise]);

  const groups = useMemo(() => {
    const now = new Date();
    const out: { label: string; items: WorkoutEntry[] }[] = [];
    for (const w of filtered.slice(0, limit)) {
      const label = weekLabel(weekStart(new Date(w.startedAt)), now);
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push(w);
      else out.push({ label, items: [w] });
    }
    return out;
  }, [filtered, limit]);

  const totals = filtered.reduce((acc, w) => {
    const s = workoutStats(w);
    return { minutes: acc.minutes + s.minutes, sets: acc.sets + s.sets };
  }, { minutes: 0, sets: 0 });
  const open = (w: WorkoutEntry) => router.push({ pathname: '/history/[id]', params: { id: w.id } });
  let index = 0;

  return (
    <Screen width="form">
      <NavBar overline="Antrenman" fallback="/training" />
      <Animated.View entering={enter(0)} style={styles.title}>
        <AppText variant="display" accessibilityRole="header">
          Geçmiş
        </AppText>
        <AppText variant="body" color="textMuted" testID="history-summary">
          {filtered.length} antrenman · {totals.minutes} dk · {totals.sets} set
        </AppText>
      </Animated.View>

      {all.length ? (
        <Animated.View entering={enter(1)} style={styles.filters}>
          <FilterRow>
            {PERIODS.map((p) => (
              <Chip key={p.id} label={p.label} selected={period === p.id} onPress={() => (setPeriod(p.id), setLimit(SHOW_STEP))} />
            ))}
          </FilterRow>
          {sports.length > 1 ? (
            <FilterRow>
              {sports.map((id) => {
                const s = getSport(id);
                return <Chip key={id} label={s.label} icon={s.icon} tone="gold" selected={sport === id} onPress={() => (setSport((c) => (c === id ? null : id)), setLimit(SHOW_STEP))} />;
              })}
            </FilterRow>
          ) : null}
          <FilterRow>
            {topExercises.map(([key, e]) => (
              <Chip key={key} label={e.name} tone="gold" selected={exercise === key} onPress={() => (setExercise((c) => (c === key ? null : key)), setLimit(SHOW_STEP))} />
            ))}
          </FilterRow>
        </Animated.View>
      ) : null}

      {!all.length ? (
        <View style={styles.empty} testID="history-empty">
          <Icon name="calendar-check-outline" size={32} color="textFaint" />
          <AppText variant="h3">Henüz antrenman yok</AppText>
          <AppText variant="small" color="textMuted" align="center">
            İlk antrenmanını bitirdiğinde burada görünecek; rekorların ve skorun buradan beslenir.
          </AppText>
          <Button label="Antrenmana başla" icon="play" onPress={() => router.replace('/training')} />
        </View>
      ) : !filtered.length ? (
        <View style={styles.empty} testID="history-no-match">
          <AppText variant="small" color="textMuted">
            Bu filtrelerle antrenman bulunamadı.
          </AppText>
        </View>
      ) : (
        <View style={styles.groups}>
          {t.historyLoading ? (
            <View style={styles.loading} testID="history-loading" accessibilityLiveRegion="polite">
              <Icon name="refresh" size={16} color="gold" />
              <AppText variant="small" color="textMuted">
                Daha eski antrenmanlar arka planda yükleniyor…
              </AppText>
            </View>
          ) : !t.historyComplete ? (
            <View style={styles.loading} testID="history-incomplete">
              <Icon name="cloud-alert-outline" size={16} color="warning" />
              <AppText variant="small" color="textMuted" style={styles.flex}>
                Daha eski antrenmanlar yüklenemedi.
              </AppText>
              <Button label="Tekrar dene" size="md" variant="ghost" onPress={() => void t.refresh()} />
            </View>
          ) : null}
          {groups.map((g) => (
            <View key={g.label} style={styles.group}>
              <AppText variant="overline" color="gold">
                {g.label}
              </AppText>
              {g.items.map((w) => (
                <Animated.View key={w.id} entering={enter(Math.min(index++, MAX_STAGGER), { step: 40, delay: 120 })}>
                  <HistoryCard workout={w} records={recordCounts.get(w.id) ?? 0} onPress={open} />
                </Animated.View>
              ))}
            </View>
          ))}
          {filtered.length > limit ? (
            <Button
              label={'Daha fazla göster (' + (filtered.length - limit) + ')'}
              variant="secondary"
              icon="chevron-down"
              onPress={() => setLimit((l) => l + SHOW_STEP)}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function FilterRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
      {children}
    </ScrollView>
  );
}

const HistoryCard = memo(function HistoryCard({ workout: w, records, onPress }: { workout: WorkoutEntry; records: number; onPress: (w: WorkoutEntry) => void }) {
  const s = workoutStats(w);
  const sport = getSport(w.sport);
  const day = new Date(w.startedAt).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <PressableScale
      scaleTo={pressScale.card}
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={`${w.name}, ${day}, ${s.minutes} dakika, ${s.sets} set${records ? `, ${records} rekor` : ''}`}
      onPress={() => onPress(w)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      testID={`history-${w.id}`}
    >
      <View style={styles.icon}>
        <Icon name={sport.icon} size={22} color="orange" />
      </View>
      <View style={styles.flex}>
        <AppText variant="title" numberOfLines={1}>
          {w.name}
        </AppText>
        <AppText variant="small" color="textMuted">
          {day} · {s.minutes} dk · {s.sets} set{s.volumeKg ? ` · ${s.volumeKg.toLocaleString('tr-TR')} kg` : ''}
        </AppText>
        <View style={styles.badges}>
          {records ? <Tag label={`${records} rekor`} tone="gold" icon="trophy-outline" /> : null}
          {w.sync !== 'synced' ? <Tag label={w.sync === 'pending' ? 'Bekliyor' : 'Reddedildi'} tone={w.sync === 'pending' ? 'neutral' : 'orange'} /> : null}
        </View>
      </View>
      <Icon name="chevron-right" size={20} color="textFaint" />
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  title: { gap: spacing.sm, marginBottom: spacing.lg },
  filters: { gap: spacing.sm, marginBottom: spacing.xl },
  chipScroll: { marginHorizontal: -layout.gutter, flexGrow: 0 },
  chips: { gap: spacing.sm, paddingHorizontal: layout.gutter },
  groups: { gap: spacing.xl },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  group: { gap: spacing.sm },
  flex: { flex: 1, minWidth: 0, gap: 2 },
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
  pressed: { backgroundColor: colors.surfacePressed },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orangeSoft },
  badges: { flexDirection: 'row', gap: spacing.xs, marginTop: 2 },
  empty: { alignItems: 'center', gap: spacing.md, padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong },
});
