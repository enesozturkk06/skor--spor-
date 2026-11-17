import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText, Button, Icon } from '@/components/ui';
import { signal } from '@/lib/signal';
import { colors, radius, spacing } from '@/theme';
import { duration, pressScale } from '@/theme/motion';

import { ROUND_LIMITS, clockMs, countdownSeconds, formatClock, roundState, type RoundPhase } from '../timers';
import type { ActiveWorkout, DraftExercise } from '../types';
import { pauseWorkout, resumeWorkout, startRounds, stopRounds, syncRounds, type RoundConfig } from '../workout-model';
import { useNow } from '../useNow';
import { CountdownRing } from './CountdownRing';
import { Sheet } from './Sheet';

type Edit = (fn: (w: ActiveWorkout) => ActiveWorkout) => void;

/* ---------------------------------------------------------------- setup */

export function RoundSetupSheet({ exercise, onClose, edit }: { exercise: DraftExercise; onClose: () => void; edit: Edit }) {
  // A program's round plan pre-fills the clock; otherwise pro defaults (3 × 3:00 / 1:00).
  const [cfg, setCfg] = useState<RoundConfig>(
    exercise.plannedRounds ?? {
      rounds: ROUND_LIMITS.rounds.default,
      roundS: ROUND_LIMITS.roundS.default,
      restS: ROUND_LIMITS.restS.default,
    },
  );
  const total = ROUND_LIMITS.prepS + cfg.rounds * cfg.roundS + (cfg.rounds - 1) * cfg.restS;
  return (
    <Sheet title="Raund zamanlayıcısı" subtitle={`${exercise.exerciseName} · toplam ${formatClock(total)}`} onClose={onClose} testID="round-setup">
      <Stepper
        label="Raund"
        value={String(cfg.rounds)}
        onMinus={() => setCfg((c) => ({ ...c, rounds: Math.max(ROUND_LIMITS.rounds.min, c.rounds - 1) }))}
        onPlus={() => setCfg((c) => ({ ...c, rounds: Math.min(ROUND_LIMITS.rounds.max, c.rounds + 1) }))}
      />
      <Stepper
        label="Raund süresi"
        value={formatClock(cfg.roundS)}
        onMinus={() => setCfg((c) => ({ ...c, roundS: Math.max(ROUND_LIMITS.roundS.min, c.roundS - ROUND_LIMITS.roundS.step) }))}
        onPlus={() => setCfg((c) => ({ ...c, roundS: Math.min(ROUND_LIMITS.roundS.max, c.roundS + ROUND_LIMITS.roundS.step) }))}
      />
      <Stepper
        label="Dinlenme"
        value={formatClock(cfg.restS)}
        onMinus={() => setCfg((c) => ({ ...c, restS: Math.max(ROUND_LIMITS.restS.min, c.restS - ROUND_LIMITS.restS.step) }))}
        onPlus={() => setCfg((c) => ({ ...c, restS: Math.min(ROUND_LIMITS.restS.max, c.restS + ROUND_LIMITS.restS.step) }))}
      />
      <Button
        label="Zamanlayıcıyı başlat"
        icon="boxing-glove"
        onPress={() => {
          edit((w) => startRounds(w, exercise.uid, cfg, Date.now()));
          onClose();
        }}
      />
    </Sheet>
  );
}

export function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepper}>
      <AppText variant="title" style={styles.flex}>
        {label}
      </AppText>
      <PressableScale scaleTo={pressScale.tile} haptic="select" accessibilityRole="button" accessibilityLabel={`${label} azalt`} onPress={onMinus} style={styles.stepBtn}>
        <Icon name="minus" size={22} />
      </PressableScale>
      <AppText variant="statM" style={styles.stepValue} accessibilityLabel={`${label}: ${value}`}>
        {value}
      </AppText>
      <PressableScale scaleTo={pressScale.tile} haptic="select" accessibilityRole="button" accessibilityLabel={`${label} artır`} onPress={onPlus} style={styles.stepBtn}>
        <Icon name="plus" size={22} />
      </PressableScale>
    </View>
  );
}

/* ---------------------------------------------------------------- clock */

const BANNER_MS = 2_500;

const PHASE: Record<RoundPhase, { label: string; ring: readonly [string, string] }> = {
  prep: { label: 'Hazırlan', ring: [colors.text, colors.gold] },
  round: { label: 'Raund', ring: [colors.orange, colors.orangeDeep] },
  rest: { label: 'Dinlenme', ring: [colors.gold, colors.goldDeep] },
  done: { label: 'Bitti', ring: [colors.gold, colors.gold] },
};

/**
 * Full-screen fight clock. Phase changes announce themselves (banner, haptic,
 * tone on web): round start, round end, last 10 seconds. Every finished round
 * is logged as a set automatically, also when the app was closed meanwhile.
 */
export function RoundTimerOverlay({ workout: w, edit }: { workout: ActiveWorkout; edit: Edit }) {
  const insets = useSafeAreaInsets();
  const t = w.roundTimer!;
  const paused = Boolean(w.pausedAt);
  const now = useNow(200, !paused);
  const st = roundState(t, clockMs(w, now));
  const secs = countdownSeconds(st.remainingMs);
  const ex = w.exercises.find((e) => e.uid === t.exUid);
  const endsAt = clockMs(w, now) + st.remainingMs;
  const phaseKey = `${st.phase}:${st.round}`;

  // Log finished rounds as sets (no-op when nothing new).
  useEffect(() => {
    edit((x) => syncRounds(x, Date.now()));
  }, [st.completedRounds, st.phase, edit]);

  // Sound/haptic cues on phase changes (not for the phase the clock opened on).
  const lastPhase = useRef(phaseKey);
  const warned = useRef<string | null>(null);
  useEffect(() => {
    if (lastPhase.current === phaseKey) return;
    lastPhase.current = phaseKey;
    if (st.phase !== 'prep') signal(st.phase === 'round' ? 'start' : st.phase === 'done' ? 'done' : 'end');
  }, [phaseKey, st.phase]);
  useEffect(() => {
    if (st.phase !== 'round' || secs !== 10 || warned.current === phaseKey) return;
    warned.current = phaseKey;
    signal('tick');
  }, [st.phase, secs, phaseKey]);

  // The banner is derived from the clock itself: shown for the first 2.5 s of
  // a phase, and from 10 to 7.5 s before the end of a round.
  const intoPhase = st.phaseMs - st.remainingMs;
  const banner =
    st.phase === 'round' && st.remainingMs <= 10_000 && st.remainingMs > 7_500
      ? { key: `${phaseKey}:10`, text: 'Son 10 saniye' }
      : intoPhase < BANNER_MS && st.phase === 'round'
        ? { key: phaseKey, text: `Raund ${st.round} başladı` }
        : intoPhase < BANNER_MS && st.phase === 'rest'
          ? { key: phaseKey, text: `Raund ${st.round} bitti` }
          : null;

  const meta = PHASE[st.phase];
  const urgent = st.phase === 'round' && secs <= 10;

  return (
    <Animated.View
      entering={FadeIn.duration(duration.base).reduceMotion(ReduceMotion.System)}
      style={[styles.overlay, { paddingTop: insets.top + spacing.lg, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
      testID="round-overlay"
      accessibilityViewIsModal
    >
      <View style={styles.top}>
        <AppText variant="overline" color="gold">
          {ex?.exerciseName ?? 'Raund'}
        </AppText>
        <AppText variant="h1" testID="round-label" accessibilityLiveRegion="polite">
          {st.phase === 'prep' ? 'Hazırlan' : st.phase === 'done' ? 'Bitti' : `Raund ${st.round} / ${t.rounds}`}
        </AppText>
        <View style={styles.dots} accessible accessibilityLabel={`${st.completedRounds} raund tamamlandı`}>
          {Array.from({ length: t.rounds }, (_, i) => (
            <View key={i} style={[styles.dot, i < st.completedRounds && styles.dotDone, i === st.round - 1 && st.phase === 'round' && styles.dotNow]} />
          ))}
        </View>
      </View>

      <CountdownRing
        remainingMs={st.remainingMs}
        totalMs={st.phaseMs}
        endsAt={endsAt - (endsAt % 1000)}
        paused={paused}
        size={272}
        stroke={16}
        colors={meta.ring}
        testID="round-ring"
        accessibilityLabel={`${meta.label}, ${secs} saniye`}
      >
        <AppText variant="overline" color={st.phase === 'round' ? 'orange' : st.phase === 'rest' ? 'gold' : 'text'} testID="round-phase">
          {paused ? 'Duraklatıldı' : meta.label}
        </AppText>
        <AppText variant="statXL" color={urgent ? 'orange' : 'text'} style={styles.clock} testID="round-time">
          {formatClock(secs)}
        </AppText>
      </CountdownRing>

      {banner ? (
        <Animated.View key={banner.key} entering={ZoomIn.duration(220).reduceMotion(ReduceMotion.System)} style={styles.banner} testID="round-banner">
          <AppText variant="h2" color="textOnOrange">
            {banner.text}
          </AppText>
        </Animated.View>
      ) : (
        <View style={styles.bannerSpace} />
      )}

      <View style={styles.actions}>
        <Button
          label={paused ? 'Devam et' : 'Duraklat'}
          icon={paused ? 'play' : 'pause'}
          variant={paused ? 'primary' : 'secondary'}
          onPress={() => edit((x) => (x.pausedAt ? resumeWorkout(x, Date.now()) : pauseWorkout(x, Date.now())))}
          style={styles.flex}
        />
        <Button label="Raundları bitir" variant="ghost" onPress={() => edit((x) => stopRounds(x, Date.now()))} style={styles.flex} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepValue: { minWidth: 72, textAlign: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bg,
    zIndex: 10,
  },
  top: { alignItems: 'center', gap: spacing.sm },
  dots: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.dataTrack },
  dotDone: { backgroundColor: colors.gold },
  dotNow: { backgroundColor: colors.orange },
  clock: { fontSize: 76, lineHeight: 80 },
  banner: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.orange,
  },
  bannerSpace: { height: 52 },
  actions: { flexDirection: 'row', gap: spacing.md, width: '100%', maxWidth: 480 },
});
