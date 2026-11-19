import { Redirect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { enter } from '@/components/motion/entrance';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText, Button, Icon, Screen } from '@/components/ui';
import { getSport } from '@/features/athlete/catalog';
import { haptics } from '@/lib/haptics';
import { colors, layout, radius, spacing } from '@/theme';
import { duration, pressScale } from '@/theme/motion';

import { previousPerformance } from '../previous';
import { elapsedMs, formatClock } from '../timers';
import { useTraining } from '../TrainingProvider';
import type { ActiveWorkout, DraftExercise } from '../types';
import { useNow } from '../useNow';
import { doneSetCount, pauseWorkout, removeExercise, resumeWorkout } from '../workout-model';
import { FinishSheet, volumeKg } from './FinishSheet';
import { RestTimerPanel } from './RestTimerPanel';
import { RoundSetupSheet, RoundTimerOverlay } from './RoundTimer';
import { Sheet } from './Sheet';
import { WorkoutExerciseCard } from './WorkoutExerciseCard';

type Overlay = { kind: 'finish' } | { kind: 'remove'; ex: DraftExercise } | { kind: 'rounds'; ex: DraftExercise } | null;

/**
 * The live workout. Built for one hand in the gym: everything frequent sits
 * in the bottom third (✓ buttons, rest controls, pause, finish), numbers are
 * large, and every change is saved to the device immediately.
 */
export function ActiveWorkoutScreen() {
  const router = useRouter();
  const t = useTraining();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [leaving, setLeaving] = useState(false);
  const w = t.active;
  const edit = t.editActive;

  const previous = useMemo(() => {
    const map = new Map<string, ReturnType<typeof previousPerformance>>();
    for (const e of w?.exercises ?? []) if (!map.has(e.exerciseKey)) map.set(e.exerciseKey, previousPerformance(t.history, e.exerciseKey));
    return map;
  }, [w?.exercises, t.history]);

  const onRemove = useCallback((ex: DraftExercise) => setOverlay({ kind: 'remove', ex }), []);
  const onRounds = useCallback((ex: DraftExercise) => setOverlay({ kind: 'rounds', ex }), []);

  if (!t.ready || leaving) return <View style={styles.blank} />;
  if (!w) return <Redirect href="/training" />;

  const paused = Boolean(w.pausedAt);
  const togglePause = () => {
    haptics.tap();
    edit((x) => (x.pausedAt ? resumeWorkout(x, Date.now()) : pauseWorkout(x, Date.now())));
  };
  const minimize = () => (router.canGoBack() ? router.back() : router.replace('/training'));

  const footer = (
    <View>
      {w.rest && !w.roundTimer ? <RestTimerPanel workout={w} edit={edit} /> : null}
      <View style={styles.actions}>
        <PressableScale
          scaleTo={pressScale.button}
          haptic="tap"
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Antrenmana devam et' : 'Antrenmanı duraklat'}
          onPress={togglePause}
          style={[styles.pause, paused && styles.pauseOn]}
          testID="workout-pause"
        >
          <Icon name={paused ? 'play' : 'pause'} size={28} color={paused ? 'textOnOrange' : 'text'} />
        </PressableScale>
        <Button label="Egzersiz" icon="plus" variant="secondary" onPress={() => router.push('/workout/add')} style={styles.flex} />
        <Button label="Bitir" icon="check" onPress={() => setOverlay({ kind: 'finish' })} style={styles.flex} />
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <Screen width="form" footer={footer} glow>
        <Animated.View entering={enter(0)} style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="Küçült" hitSlop={12} onPress={minimize} style={styles.iconBtn}>
            <Icon name="chevron-down" size={26} />
          </Pressable>
          <View style={styles.titles}>
            <AppText variant="overline" color="gold">
              {getSport(w.sport).label} · {paused ? 'Duraklatıldı' : 'Canlı'}
            </AppText>
            <AppText variant="h2" numberOfLines={1} accessibilityRole="header">
              {w.name}
            </AppText>
          </View>
        </Animated.View>

        <Animated.View entering={enter(1)} style={styles.hero}>
          <ElapsedClock workout={w} />
          <View style={styles.heroStats}>
            <HeroStat label="Set" value={String(doneSetCount(w))} testID="workout-sets" />
            <HeroStat label="Hacim" value={`${volumeKg(w).toLocaleString('tr-TR')} kg`} testID="workout-volume" />
            <HeroStat label="Egzersiz" value={String(w.exercises.length)} />
          </View>
        </Animated.View>

        <View style={styles.list}>
          {w.exercises.map((ex, i) => (
            <WorkoutExerciseCard
              key={ex.uid}
              exercise={ex}
              index={i}
              previous={previous.get(ex.exerciseKey) ?? null}
              roundsRunning={Boolean(w.roundTimer)}
              edit={edit}
              onRemove={onRemove}
              onRounds={onRounds}
            />
          ))}
          <PressableScale
            scaleTo={pressScale.card}
            haptic="tap"
            accessibilityRole="button"
            accessibilityLabel="Egzersiz ekle"
            onPress={() => router.push('/workout/add')}
            style={styles.addCard}
            testID="workout-add"
          >
            <Icon name="plus" size={26} color="orange" />
            <AppText variant="button" color="orange">
              {w.exercises.length ? 'Egzersiz ekle' : 'İlk egzersizini ekle'}
            </AppText>
          </PressableScale>
        </View>
      </Screen>

      {paused && !w.roundTimer && !overlay ? <PausedOverlay onResume={togglePause} /> : null}
      {w.roundTimer ? <RoundTimerOverlay workout={w} edit={edit} /> : null}

      {overlay?.kind === 'finish' ? (
        <FinishSheet
          workout={w}
          onClose={() => setOverlay(null)}
          onFinish={async (rpe) => {
            const id = w.id; // becomes the saved workout's id
            await t.finish({ rpe });
            haptics.success();
            setLeaving(true);
            // The completion screen: records, XP, comparison.
            router.replace({ pathname: '/history/[id]', params: { id, celebrate: '1' } });
          }}
          onDiscard={() => {
            setLeaving(true);
            t.discard();
            router.replace('/training');
          }}
        />
      ) : null}
      {overlay?.kind === 'remove' ? (
        <Sheet
          title="Egzersiz kaldırılsın mı?"
          subtitle={`${overlay.ex.exerciseName} ve setleri bu antrenmandan çıkarılır.`}
          onClose={() => setOverlay(null)}
          testID="remove-sheet"
        >
          <Button
            label="Kaldır"
            variant="danger"
            onPress={() => {
              edit((x) => removeExercise(x, overlay.ex.uid));
              setOverlay(null);
            }}
          />
          <Button label="Vazgeç" variant="secondary" onPress={() => setOverlay(null)} />
        </Sheet>
      ) : null}
      {overlay?.kind === 'rounds' ? <RoundSetupSheet exercise={overlay.ex} edit={edit} onClose={() => setOverlay(null)} /> : null}
    </View>
  );
}

/** Ticks on its own so the rest of the screen doesn't re-render every second. */
function ElapsedClock({ workout }: { workout: ActiveWorkout }) {
  const paused = Boolean(workout.pausedAt);
  const now = useNow(500, !paused);
  return (
    <View style={styles.clockRow}>
      <View style={[styles.liveDot, paused && styles.liveDotPaused]} />
      <AppText variant="statXL" testID="workout-elapsed" accessibilityLabel={`Geçen süre ${formatClock(elapsedMs(workout, now) / 1000)}`}>
        {formatClock(elapsedMs(workout, now) / 1000)}
      </AppText>
    </View>
  );
}

function HeroStat({ label, value, testID }: { label: string; value: string; testID?: string }) {
  return (
    <View style={styles.heroStat}>
      <AppText variant="overline" color="textMuted">
        {label}
      </AppText>
      <AppText variant="statM" testID={testID}>
        {value}
      </AppText>
    </View>
  );
}

function PausedOverlay({ onResume }: { onResume: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(duration.fast).reduceMotion(ReduceMotion.System)} style={styles.paused} testID="paused-overlay">
      <View style={styles.pausedCard}>
        <Icon name="pause" size={40} color="gold" />
        <AppText variant="h1">Duraklatıldı</AppText>
        <AppText variant="body" color="textMuted" align="center">
          Süre ve dinlenme durduruldu. Hazır olduğunda devam et.
        </AppText>
        <Button label="Devam et" icon="play" onPress={onResume} style={styles.fullWidth} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  blank: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  fullWidth: { alignSelf: 'stretch' },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  iconBtn: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1, minWidth: 0 },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.petrolDeep,
  },
  clockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  liveDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.orange, boxShadow: `0 0 10px ${colors.orange}` },
  liveDotPaused: { backgroundColor: colors.gold, boxShadow: 'none' },
  heroStats: { flexDirection: 'row', alignSelf: 'stretch', paddingHorizontal: spacing.md },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  list: { gap: spacing.lg },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 72,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.orange,
    backgroundColor: colors.orangeSoft,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  pause: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  pauseOn: { backgroundColor: colors.orange, borderColor: colors.orange },
  paused: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.overlay,
    zIndex: 5,
  },
  pausedCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgRaised,
  },
});
