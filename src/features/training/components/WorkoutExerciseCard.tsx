import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { enter } from '@/components/motion/entrance';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText, Icon } from '@/components/ui';
import { getExercise } from '@/features/exercises/catalog';
import { MUSCLES } from '@/features/exercises/muscles';
import { colors, radius, spacing } from '@/theme';
import { pressScale } from '@/theme/motion';

import { describeSet, previousFill, type PreviousPerformance } from '../previous';
import { formatClock } from '../timers';
import type { ActiveWorkout, DraftExercise } from '../types';
import { nextKind } from '../template-model';
import { WorkoutError, addSet, completeSet, removeSet, uncompleteSet, updateSet, type SetPatch } from '../workout-model';
import { FIELDS } from './set-fields';
import { SetRow } from './SetRow';

type Props = {
  exercise: DraftExercise;
  index: number;
  previous: PreviousPerformance | null;
  roundsRunning: boolean;
  edit: (fn: (w: ActiveWorkout) => ActiveWorkout) => void;
  onRemove: (ex: DraftExercise) => void;
  onRounds: (ex: DraftExercise) => void;
};

const dateTr = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

export const WorkoutExerciseCard = memo(function WorkoutExerciseCard({ exercise: ex, index, previous, roundsRunning, edit, onRemove, onRounds }: Props) {
  const meta = getExercise(ex.exerciseKey);
  const modality = meta?.modality ?? 'strength';
  const fields = FIELDS[modality];
  const doneCount = ex.sets.filter((s) => s.done).length;

  const change = useCallback((setUid: string, patch: SetPatch) => edit((w) => updateSet(w, ex.uid, setUid, patch)), [edit, ex.uid]);
  const toggle = useCallback(
    (setUid: string, done: boolean, fill?: SetPatch) => {
      try {
        edit((w) => (done ? completeSet(w, ex.uid, setUid, Date.now(), fill) : uncompleteSet(w, ex.uid, setUid)));
        return true;
      } catch (e) {
        if (e instanceof WorkoutError) return false;
        throw e;
      }
    },
    [edit, ex.uid],
  );
  const last = ex.sets[ex.sets.length - 1];

  return (
    <Animated.View entering={enter(Math.min(index, 4))} style={styles.card} testID={`workout-ex-${ex.exerciseKey}`}>
      <View style={styles.head}>
        <View style={styles.badge}>
          <AppText variant="statM" color="orange" style={styles.badgeText}>
            {String(index + 1).padStart(2, '0')}
          </AppText>
        </View>
        <View style={styles.titles}>
          <AppText variant="h3" numberOfLines={2}>
            {ex.exerciseName}
          </AppText>
          <AppText variant="small" color="gold" numberOfLines={1}>
            {(meta?.primary ?? []).map((m) => MUSCLES[m].tr).join(' · ')}
          </AppText>
        </View>
        <AppText variant="smallStrong" color={doneCount ? 'orange' : 'textFaint'} testID={`workout-ex-${ex.exerciseKey}-count`}>
          {doneCount}/{ex.sets.length}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${ex.exerciseName} egzersizini kaldır`}
          hitSlop={10}
          onPress={() => onRemove(ex)}
          style={styles.iconBtn}
        >
          <Icon name="close" size={20} color="textMuted" />
        </Pressable>
      </View>

      <View style={styles.prev} testID={`workout-ex-${ex.exerciseKey}-previous`}>
        <Icon name="refresh" size={14} color="textFaint" />
        <AppText variant="small" color="textMuted" numberOfLines={2} style={styles.flex}>
          {previous
            ? `Önceki · ${dateTr(previous.endedAt)}: ${previous.sets.map(describeSet).join(', ')}`
            : 'İlk kez yapıyorsun — ilk rekorun bugün.'}
        </AppText>
      </View>

      {modality === 'rounds' ? (
        <PressableScale
          scaleTo={pressScale.button}
          haptic="tap"
          accessibilityRole="button"
          accessibilityLabel="Raund zamanlayıcısı"
          disabled={roundsRunning}
          onPress={() => onRounds(ex)}
          style={[styles.rounds, roundsRunning && styles.disabled]}
        >
          <Icon name="boxing-glove" size={20} color="orange" />
          <AppText variant="button" color="orange">
            Raund zamanlayıcısı
          </AppText>
        </PressableScale>
      ) : null}

      <View style={styles.cols}>
        <AppText variant="overline" color="textFaint" style={styles.colNum}>
          Set
        </AppText>
        {fields.map((f) => (
          <AppText key={f.key} variant="overline" color="textFaint" style={styles.colField}>
            {f.label}
          </AppText>
        ))}
        <View style={styles.colCheck} />
      </View>

      {ex.sets.map((s, i) => (
        <Animated.View key={s.uid} entering={i ? enter(0, { ms: 220 }) : undefined}>
          <SetRow
            set={s}
            number={i + 1}
            fields={fields}
            previous={previousFill(previous, i + 1)}
            onChange={(patch) => change(s.uid, patch)}
            onToggle={(done, fill) => toggle(s.uid, done, fill)}
            onCycleKind={() => change(s.uid, { kind: nextKind(s.kind) })}
            testID={`set-${ex.exerciseKey}-${i + 1}`}
          />
        </Animated.View>
      ))}

      <View style={styles.foot}>
        <PressableScale
          scaleTo={pressScale.button}
          haptic="tap"
          accessibilityRole="button"
          accessibilityLabel={`${ex.exerciseName} için set ekle`}
          onPress={() => edit((w) => addSet(w, ex.uid))}
          style={styles.addSet}
          testID={`workout-ex-${ex.exerciseKey}-add`}
        >
          <Icon name="plus" size={20} color="text" />
          <AppText variant="button">Set ekle</AppText>
        </PressableScale>
        <PressableScale
          scaleTo={pressScale.button}
          haptic="tap"
          accessibilityRole="button"
          accessibilityLabel={`${ex.exerciseName} son seti sil`}
          disabled={ex.sets.length <= 1 || Boolean(last?.done)}
          onPress={() => last && edit((w) => removeSet(w, ex.uid, last.uid))}
          style={[styles.removeSet, (ex.sets.length <= 1 || last?.done) && styles.disabled]}
        >
          <Icon name="minus" size={20} color="textMuted" />
        </PressableScale>
        <View style={styles.restChip} accessible accessibilityLabel={`Dinlenme ${formatClock(ex.restS)}`}>
          <Icon name="timer-outline" size={16} color="gold" />
          <AppText variant="smallStrong" color="gold">
            {formatClock(ex.restS)}
          </AppText>
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orangeSoft,
  },
  badgeText: { fontSize: 22 },
  titles: { flex: 1, minWidth: 0, gap: 2 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  prev: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.bgRaised,
  },
  rounds: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.orange,
    backgroundColor: colors.orangeSoft,
  },
  cols: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.sm },
  colNum: { width: 34, textAlign: 'center' },
  colField: { flex: 1, textAlign: 'center' },
  colCheck: { width: 56 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addSet: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeSet: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  restChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.goldSoft,
  },
  disabled: { opacity: 0.4 },
});
