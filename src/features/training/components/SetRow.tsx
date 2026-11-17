import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  ReduceMotion,
  ZoomIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppText, Icon } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { sanitizeNumericInput } from '@/lib/numeric-input';
import { colors, fonts, radius, spacing } from '@/theme';
import { spring, timing } from '@/theme/motion';

import { KIND_META } from '../template-model';
import type { DraftSet, SetKind } from '../types';
import type { SetPatch } from '../workout-model';
import { displayValue, formatNumber, parseNumber, patchFor, type SetField } from './set-fields';

type Props = {
  set: DraftSet;
  number: number;
  fields: SetField[];
  /** Last session's values for this set (shown as placeholders, used when the athlete just taps ✓). */
  previous: SetPatch | null;
  onChange: (patch: SetPatch) => void;
  /** Return false when the set could not be completed (no value). */
  onToggle: (done: boolean, fill?: SetPatch) => boolean;
  /** Tap on the set number: normal → warm-up → drop → failure. */
  onCycleKind?: () => void;
  testID: string;
};

/**
 * One set: big numeric fields and a large ✓ that is easy to hit with a thumb.
 * Every keystroke is saved (the draft survives reloads). Completing pops the
 * check, tints the row and gives a success haptic; a set without any value
 * shakes instead.
 */
export const SetRow = memo(function SetRow({ set, number, fields, previous, onChange, onToggle, onCycleKind, testID }: Props) {
  const done = useSharedValue(set.done ? 1 : 0);
  const pop = useSharedValue(1);
  const shake = useSharedValue(0);

  useEffect(() => {
    done.set(withTiming(set.done ? 1 : 0, timing.fast));
  }, [set.done, done]);

  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(done.get(), [0, 1], ['rgba(255,113,56,0)', 'rgba(255,113,56,0.12)']),
    transform: [{ translateX: shake.get() }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(done.get(), [0, 1], [colors.surfaceAlt, colors.orange]),
    borderColor: interpolateColor(done.get(), [0, 1], [colors.borderStrong, colors.orange]),
    transform: [{ scale: pop.get() }],
  }));

  const toggle = () => {
    const next = !set.done;
    const hasValue = fields.some((f) => set[f.key] !== null);
    const fill = next && !hasValue && previous ? previous : undefined;
    if (!onToggle(next, fill)) {
      haptics.warning();
      const sm = ReduceMotion.System;
      shake.set(
        withSequence(
          withTiming(-8, { duration: 50, reduceMotion: sm }),
          withTiming(8, { duration: 70, reduceMotion: sm }),
          withTiming(-5, { duration: 60, reduceMotion: sm }),
          withTiming(0, { duration: 50, reduceMotion: sm }),
        ),
      );
      return;
    }
    if (next) {
      haptics.success();
      pop.set(withSequence(withSpring(1.18, spring.press), withSpring(1, spring.select)));
    } else {
      haptics.tap();
    }
  };

  const label = `Set ${number}`;
  return (
    <Animated.View style={[styles.row, rowStyle]} testID={testID}>
      <KindBadge kind={set.kind} number={number} done={set.done} onPress={onCycleKind} testID={`${testID}-kind`} />
      {fields.map((f) => (
        <ValueField
          key={f.key}
          field={f}
          set={set}
          placeholder={previous && previous[f.key] != null ? formatNumber(f.toDisplay(previous[f.key] as number)) : '–'}
          accessibilityLabel={`${label} ${f.label.toLocaleLowerCase('tr-TR')} (${f.unit})`}
          onCommit={(n) => onChange(patchFor(f, n))}
          testID={`${testID}-${f.key}`}
        />
      ))}
      <Pressable
        onPress={toggle}
        hitSlop={8}
        accessibilityRole="checkbox"
        aria-checked={set.done}
        accessibilityLabel={set.done ? `${label}: tamamlandı` : `${label}: tamamla`}
        testID={`${testID}-done`}
      >
        <Animated.View style={[styles.check, checkStyle]}>
          {set.done ? (
            <Animated.View entering={ZoomIn.duration(240).reduceMotion(ReduceMotion.System)}>
              <Icon name="check" size={30} color="textOnOrange" />
            </Animated.View>
          ) : (
            <Icon name="check" size={26} color="textFaint" />
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

const KIND_COLOR: Record<SetKind, 'textMuted' | 'gold' | 'orange' | 'danger'> = { normal: 'textMuted', warmup: 'gold', drop: 'orange', failure: 'danger' };

/** Set number, or the set type's letter (Ö ısınma, D drop, T tükeniş). Tappable when `onPress` is given. */
export function KindBadge({ kind, number, done = false, onPress, testID }: { kind: SetKind; number: number; done?: boolean; onPress?: () => void; testID?: string }) {
  const label = kind === 'normal' ? String(number) : KIND_META[kind].short;
  const content = (
    <AppText variant="statM" color={kind === 'normal' ? (done ? 'orange' : 'textMuted') : KIND_COLOR[kind]} style={styles.numText}>
      {label}
    </AppText>
  );
  if (!onPress) return <View style={styles.num}>{content}</View>;
  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onPress();
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`Set ${number}: ${KIND_META[kind].label}. Türü değiştir`}
      testID={testID}
      style={[styles.num, kind !== 'normal' && styles.numKind]}
    >
      {content}
    </Pressable>
  );
}

/**
 * Numeric cell with its own text state, so in-between input like "62," is
 * kept while typing; valid numbers are saved immediately.
 */
export function ValueField({
  field,
  set,
  placeholder,
  accessibilityLabel,
  onCommit,
  testID,
}: {
  field: SetField;
  set: Pick<DraftSet, SetField['key']>;
  placeholder: string;
  accessibilityLabel: string;
  onCommit: (n: number | null) => void;
  testID: string;
}) {
  const stored = displayValue(set, field);
  const [text, setText] = useState(stored);
  const [focused, setFocused] = useState(false);
  // Outside edits (pre-fill from last time, round clock) show up when not typing.
  const shown = focused ? text : stored;

  return (
    <View style={styles.field}>
      <TextInput
        value={shown}
        onChangeText={(raw) => {
          const r = sanitizeNumericInput(raw, field.spec);
          if (!r.ok) return;
          setText(r.value);
          const n = parseNumber(r.value);
          if (r.value === '' || n !== null) onCommit(n);
        }}
        onFocus={() => {
          setText(stored);
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        keyboardType={field.spec.maxDecimals ? 'decimal-pad' : 'number-pad'}
        returnKeyType="done"
        selectTextOnFocus
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.orange}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={[styles.input, focused && styles.inputFocused]}
      />
      <AppText variant="overline" color="textFaint" style={styles.unit}>
        {field.unit}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  num: { width: 34, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  numKind: { backgroundColor: 'rgba(255,255,255,0.05)' },
  numText: { fontSize: 22 },
  field: { flex: 1, minWidth: 0, alignItems: 'stretch', gap: 2 },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgRaised,
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 26,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
    outlineStyle: 'none',
  } as object,
  inputFocused: { borderColor: colors.gold, backgroundColor: colors.surfaceAlt },
  unit: { textAlign: 'center', fontSize: 9, letterSpacing: 1.2 },
  check: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
