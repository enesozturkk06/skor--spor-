import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { enter } from '@/components/motion/entrance';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText, Icon } from '@/components/ui';
import { getExercise } from '@/features/exercises/catalog';
import { MUSCLES } from '@/features/exercises/muscles';
import { colors, radius, spacing } from '@/theme';
import { pressScale } from '@/theme/motion';

import { Stepper } from '../components/RoundTimer';
import { FIELDS, patchFor } from '../components/set-fields';
import { KindBadge, ValueField } from '../components/SetRow';
import { REST_LIMITS, ROUND_LIMITS, formatClock } from '../timers';
import { TEMPLATE_LIMITS, nextKind } from '../template-model';
import type { TemplateBlock, TemplateSet } from '../types';

type Props = {
  block: TemplateBlock;
  index: number;
  onChange: (b: TemplateBlock) => void;
  onRemove: () => void;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** One exercise in the builder: planned sets (type, reps, kg, time, distance), rest, or a round plan. */
export const BlockEditor = memo(function BlockEditor({ block: b, index, onChange, onRemove }: Props) {
  const ex = getExercise(b.exerciseKey)!;
  const fields = FIELDS[ex.modality];
  const setAt = (i: number, patch: Partial<TemplateSet>) => onChange({ ...b, sets: b.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const key = `block-${b.exerciseKey}`;

  return (
    <Animated.View entering={enter(0, { ms: 240 })} style={styles.card} testID={key}>
      <View style={styles.head}>
        <View style={styles.badge}>
          <AppText variant="statM" color="orange" style={styles.badgeText}>
            {String(index + 1).padStart(2, '0')}
          </AppText>
        </View>
        <View style={styles.titles}>
          <AppText variant="h3" numberOfLines={2}>
            {ex.name.tr}
          </AppText>
          <AppText variant="small" color="gold" numberOfLines={1}>
            {ex.primary.map((m) => MUSCLES[m].tr).join(' · ')}
          </AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${ex.name.tr} programdan çıkar`} hitSlop={10} onPress={onRemove} style={styles.iconBtn}>
          <Icon name="delete-outline" size={22} color="textMuted" />
        </Pressable>
      </View>

      {b.rounds ? (
        <View style={styles.rounds} testID={`${key}-rounds`}>
          <Stepper
            label="Raund"
            value={String(b.rounds.rounds)}
            onMinus={() => onChange({ ...b, rounds: { ...b.rounds!, rounds: clamp(b.rounds!.rounds - 1, ROUND_LIMITS.rounds.min, ROUND_LIMITS.rounds.max) } })}
            onPlus={() => onChange({ ...b, rounds: { ...b.rounds!, rounds: clamp(b.rounds!.rounds + 1, ROUND_LIMITS.rounds.min, ROUND_LIMITS.rounds.max) } })}
          />
          <Stepper
            label="Raund süresi"
            value={formatClock(b.rounds.roundS)}
            onMinus={() => onChange({ ...b, rounds: { ...b.rounds!, roundS: clamp(b.rounds!.roundS - ROUND_LIMITS.roundS.step, ROUND_LIMITS.roundS.min, ROUND_LIMITS.roundS.max) } })}
            onPlus={() => onChange({ ...b, rounds: { ...b.rounds!, roundS: clamp(b.rounds!.roundS + ROUND_LIMITS.roundS.step, ROUND_LIMITS.roundS.min, ROUND_LIMITS.roundS.max) } })}
          />
          <Stepper
            label="Raund arası"
            value={formatClock(b.rounds.restS)}
            onMinus={() => onChange({ ...b, rounds: { ...b.rounds!, restS: clamp(b.rounds!.restS - ROUND_LIMITS.restS.step, ROUND_LIMITS.restS.min, ROUND_LIMITS.restS.max) } })}
            onPlus={() => onChange({ ...b, rounds: { ...b.rounds!, restS: clamp(b.rounds!.restS + ROUND_LIMITS.restS.step, ROUND_LIMITS.restS.min, ROUND_LIMITS.restS.max) } })}
          />
        </View>
      ) : (
        <>
          <View style={styles.cols}>
            <AppText variant="overline" color="textFaint" style={styles.colNum}>
              Set
            </AppText>
            {fields.map((f) => (
              <AppText key={f.key} variant="overline" color="textFaint" style={styles.colField}>
                {f.label}
              </AppText>
            ))}
            <View style={styles.colX} />
          </View>
          {b.sets.map((s, i) => (
            <View key={i} style={styles.setRow} testID={`${key}-set-${i + 1}`}>
              <KindBadge kind={s.kind} number={i + 1} onPress={() => setAt(i, { kind: nextKind(s.kind) })} testID={`${key}-set-${i + 1}-kind`} />
              {fields.map((f) => (
                <ValueField
                  key={f.key}
                  field={f}
                  set={s}
                  placeholder="–"
                  accessibilityLabel={`${ex.name.tr} set ${i + 1} ${f.label.toLocaleLowerCase('tr-TR')} (${f.unit})`}
                  onCommit={(n) => setAt(i, patchFor(f, n))}
                  testID={`${key}-set-${i + 1}-${f.key}`}
                />
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${ex.name.tr} set ${i + 1} sil`}
                disabled={b.sets.length <= 1}
                hitSlop={6}
                onPress={() => onChange({ ...b, sets: b.sets.filter((_, j) => j !== i) })}
                style={[styles.colX, styles.iconBtnSmall, b.sets.length <= 1 && styles.off]}
              >
                <Icon name="close" size={18} color="textMuted" />
              </Pressable>
            </View>
          ))}
          <View style={styles.foot}>
            <PressableScale
              scaleTo={pressScale.button}
              haptic="tap"
              accessibilityRole="button"
              accessibilityLabel={`${ex.name.tr} için set ekle`}
              disabled={b.sets.length >= TEMPLATE_LIMITS.setsPerBlock}
              onPress={() => onChange({ ...b, sets: [...b.sets, { ...(b.sets[b.sets.length - 1] ?? { kind: 'normal', reps: null, weightKg: null, durationS: null, distanceM: null }), kind: 'normal' }] })}
              style={styles.addSet}
            >
              <Icon name="plus" size={18} color="text" />
              <AppText variant="smallStrong">Set ekle</AppText>
            </PressableScale>
            <View style={styles.rest}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${ex.name.tr} dinlenmeyi azalt`} hitSlop={6} onPress={() => onChange({ ...b, restS: clamp(b.restS - REST_LIMITS.step, REST_LIMITS.min, REST_LIMITS.max) })} style={styles.restBtn}>
                <Icon name="minus" size={18} />
              </Pressable>
              <View style={styles.restValue}>
                <Icon name="timer-outline" size={14} color="gold" />
                <AppText variant="smallStrong" color="gold" testID={`${key}-rest`}>
                  {formatClock(b.restS)}
                </AppText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`${ex.name.tr} dinlenmeyi artır`} hitSlop={6} onPress={() => onChange({ ...b, restS: clamp(b.restS + REST_LIMITS.step, REST_LIMITS.min, REST_LIMITS.max) })} style={styles.restBtn}>
                <Icon name="plus" size={18} />
              </Pressable>
            </View>
          </View>
        </>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orangeSoft },
  badgeText: { fontSize: 20 },
  titles: { flex: 1, minWidth: 0, gap: 2 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  iconBtnSmall: { alignItems: 'center', justifyContent: 'center' },
  rounds: { gap: spacing.md },
  cols: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: 2 },
  colNum: { width: 34, textAlign: 'center' },
  colField: { flex: 1, textAlign: 'center' },
  colX: { width: 32 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  off: { opacity: 0.25 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addSet: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  rest: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 48, paddingHorizontal: 4, borderRadius: radius.md, backgroundColor: colors.goldSoft },
  restBtn: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  restValue: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 56, justifyContent: 'center' },
});
