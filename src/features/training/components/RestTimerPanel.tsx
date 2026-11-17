import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText, Icon } from '@/components/ui';
import { signal } from '@/lib/signal';
import { colors, radius, spacing } from '@/theme';
import { duration, easing, pressScale } from '@/theme/motion';

import { countdownSeconds, formatClock, restRemainingMs } from '../timers';
import type { ActiveWorkout } from '../types';
import { adjustRest, expireRest, skipRest } from '../workout-model';
import { useNow } from '../useNow';
import { CountdownRing } from './CountdownRing';

type Props = {
  workout: ActiveWorkout;
  edit: (fn: (w: ActiveWorkout) => ActiveWorkout) => void;
};

/** A rest that ended this long ago (app was closed) ends silently. */
const STALE_MS = 2_000;

/**
 * Docked rest timer: starts automatically after a completed set. The ring
 * drains on the UI thread; the last 3 seconds tick (haptic), the end rings.
 */
export function RestTimerPanel({ workout: w, edit }: Props) {
  const rest = w.rest!;
  const paused = Boolean(w.pausedAt);
  const now = useNow(200, !paused);
  const left = restRemainingMs(w, now) ?? 0;
  const secs = countdownSeconds(left);
  const endsAt = Date.parse(rest.startedAt) + rest.durationS * 1000;
  const ex = w.exercises.find((e) => e.uid === rest.exUid);
  const setNo = ex ? ex.sets.findIndex((s) => s.uid === rest.setUid) + 2 : 0;
  const hasNext = ex ? setNo - 1 < ex.sets.length : false;

  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));

  // Last three seconds: a tick and a beat on the number.
  const lastTick = useRef<number | null>(null);
  useEffect(() => {
    if (paused || secs > 3 || secs < 1 || lastTick.current === secs) return;
    lastTick.current = secs;
    signal('tick');
    pulse.set(withSequence(withTiming(1.15, { duration: 90, reduceMotion: ReduceMotion.System }), withTiming(1, { duration: 160, reduceMotion: ReduceMotion.System })));
  }, [secs, paused, pulse]);

  // End of rest (or found already over after a reload).
  useEffect(() => {
    if (paused || left > 0) return;
    if (now - endsAt < STALE_MS) signal('end');
    edit((x) => expireRest(x, Date.now()));
  }, [left, paused, now, endsAt, edit]);

  return (
    <Animated.View
      entering={FadeInDown.duration(duration.base).easing(easing.out).reduceMotion(ReduceMotion.System)}
      style={styles.panel}
      testID="rest-panel"
      accessibilityLiveRegion="polite"
    >
      <CountdownRing
        remainingMs={left}
        totalMs={rest.durationS * 1000}
        endsAt={endsAt}
        paused={paused}
        size={124}
        stroke={11}
        testID="rest-ring"
        accessibilityLabel={`Dinlenme, ${secs} saniye kaldı`}
      >
        <Animated.View style={pulseStyle}>
          <AppText variant="statL" testID="rest-time" style={styles.time}>
            {formatClock(secs)}
          </AppText>
        </Animated.View>
      </CountdownRing>
      <View style={styles.side}>
        <View>
          <AppText variant="overline" color="gold">
            {paused ? 'Dinlenme · duraklatıldı' : 'Dinlenme'}
          </AppText>
          <AppText variant="small" color="textMuted" numberOfLines={1}>
            {ex && hasNext ? `Sıradaki: ${ex.exerciseName} · Set ${setNo}` : ex ? `${ex.exerciseName} tamam` : ''}
          </AppText>
        </View>
        <View style={styles.buttons}>
          <RestButton label="−15" a11y="Dinlenmeyi 15 saniye kısalt" onPress={() => edit((x) => adjustRest(x, -15, Date.now()))} />
          <RestButton label="+15" a11y="Dinlenmeyi 15 saniye uzat" onPress={() => edit((x) => adjustRest(x, 15, Date.now()))} />
          <PressableScale
            scaleTo={pressScale.button}
            haptic="tap"
            accessibilityRole="button"
            accessibilityLabel="Dinlenmeyi atla"
            onPress={() => edit(skipRest)}
            style={styles.skip}
          >
            <AppText variant="button" color="textOnOrange">
              Atla
            </AppText>
            <Icon name="arrow-right" size={18} color="textOnOrange" />
          </PressableScale>
        </View>
      </View>
    </Animated.View>
  );
}

function RestButton({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <PressableScale scaleTo={pressScale.tile} haptic="select" accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} style={styles.adj}>
      <AppText variant="statM" style={styles.adjText}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.petrolDeep,
  },
  time: { fontSize: 34, lineHeight: 36 },
  side: { flex: 1, gap: spacing.md },
  buttons: { flexDirection: 'row', gap: spacing.sm },
  adj: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,13,13,0.45)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  adjText: { fontSize: 20 },
  skip: {
    flex: 1.3,
    height: 52,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.orange,
  },
});
