import { StyleSheet, View, type TextInputInstance, type TextInputProps } from 'react-native';
import type { Ref } from 'react';

import { PressableScale } from '@/components/motion/PressableScale';
import { Icon, TextField, type IconName } from '@/components/ui';
import { toNumber } from '@/lib/validation';
import { colors, radius, spacing } from '@/theme';
import { pressScale } from '@/theme/motion';

type Props = Pick<TextInputProps, 'keyboardType' | 'returnKeyType' | 'onSubmitEditing' | 'placeholder'> & {
  ref?: Ref<TextInputInstance>;
  label: string;
  icon: IconName;
  value: string;
  /** Receives typed / pasted text (sanitised by the parent). */
  onChangeText: (text: string) => void;
  /** Receives the stepped value, already within [min, max]. */
  onStep: (value: string) => void;
  suffix: string;
  error?: string | null;
  min: number;
  max: number;
  step: number;
  /** Starting point when the field is empty and a button is pressed. */
  start: number;
};

/** Formats a stepped number the way the athlete would type it (Turkish comma). */
function format(n: number, step: number): string {
  return Number.isInteger(step) ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, '').replace('.', ',');
}

/**
 * Numeric input with − / + steppers: type, paste or tap. Steps are clamped to
 * the allowed range, so a stepper can never produce an invalid value.
 */
export function NumberField({ ref, label, icon, value, onChangeText, onStep, suffix, error, min, max, step, start, ...input }: Props) {
  const current = value ? toNumber(value) : NaN;
  const base = Number.isFinite(current) ? current : start;
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const next = (dir: 1 | -1) => {
    // Empty field: the first tap shows the starting value instead of jumping past it.
    const n = Number.isFinite(current) ? clamp(Math.round((base + dir * step) / step) * step) : clamp(start);
    onStep(format(n, step));
  };
  const atMin = Number.isFinite(current) && current <= min;
  const atMax = Number.isFinite(current) && current >= max;

  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <TextField ref={ref} label={label} icon={icon} value={value} onChangeText={onChangeText} suffix={suffix} error={error} {...input} />
      </View>
      <View style={styles.steppers}>
        <PressableScale
          scaleTo={pressScale.tile}
          haptic="select"
          accessibilityRole="button"
          accessibilityLabel={`${label} azalt`}
          disabled={atMin}
          onPress={() => next(-1)}
          style={[styles.stepBtn, atMin && styles.stepDisabled]}
        >
          <Icon name="minus" size={20} color="text" />
        </PressableScale>
        <PressableScale
          scaleTo={pressScale.tile}
          haptic="select"
          accessibilityRole="button"
          accessibilityLabel={`${label} artır`}
          disabled={atMax}
          onPress={() => next(1)}
          style={[styles.stepBtn, styles.stepPlus, atMax && styles.stepDisabled]}
        >
          <Icon name="plus" size={20} color="orange" />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  field: { flex: 1 },
  // Aligns with the 54 px input under the field label.
  steppers: { flexDirection: 'row', gap: spacing.xs, marginTop: 14 + spacing.sm },
  stepBtn: {
    width: 46,
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepPlus: { borderColor: colors.borderStrong },
  stepDisabled: { opacity: 0.35 },
});
