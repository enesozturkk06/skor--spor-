import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText, Button, Icon } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import { pressScale } from '@/theme/motion';

import { elapsedMs, formatClock } from '../timers';
import type { ActiveWorkout } from '../types';
import { useNow } from '../useNow';
import { doneSetCount } from '../workout-model';
import { Sheet } from './Sheet';

type Props = {
  workout: ActiveWorkout;
  onClose: () => void;
  onFinish: (rpe: number | null) => Promise<void>;
  onDiscard: () => void;
};

export const volumeKg = (w: ActiveWorkout) =>
  Math.round(w.exercises.reduce((v, e) => v + e.sets.reduce((s, x) => s + (x.done && x.weightKg && x.reps ? x.weightKg * x.reps : 0), 0), 0));

/**
 * Safe finish: shows what will be saved, warns about sets that won't be,
 * asks for effort (RPE, optional). Deleting needs a second, explicit tap.
 */
export function FinishSheet({ workout: w, onClose, onFinish, onDiscard }: Props) {
  const [rpe, setRpe] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const now = useNow(1000);
  const done = doneSetCount(w);
  const undone = w.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);

  if (confirmDiscard) {
    return (
      <Sheet title="Antrenman silinsin mi?" subtitle="Bu antrenmandaki tüm setler kalıcı olarak silinir." onClose={() => setConfirmDiscard(false)} testID="discard-sheet">
        <Button label="Evet, sil" variant="danger" icon="close" onPress={onDiscard} />
        <Button label="Vazgeç" variant="secondary" onPress={() => setConfirmDiscard(false)} />
      </Sheet>
    );
  }

  return (
    <Sheet title="Antrenmanı bitir" subtitle={w.name} onClose={onClose} testID="finish-sheet">
      <View style={styles.stats}>
        <Stat label="Süre" value={formatClock(elapsedMs(w, now) / 1000)} />
        <Stat label="Set" value={String(done)} testID="finish-sets" />
        <Stat label="Hacim" value={`${volumeKg(w).toLocaleString('tr-TR')} kg`} />
      </View>

      {undone ? (
        <View style={styles.warn} testID="finish-warning">
          <Icon name="alert-outline" size={18} color="warning" />
          <AppText variant="small" style={styles.flex}>
            {undone} set tamamlanmadı; bunlar kaydedilmeyecek.
          </AppText>
        </View>
      ) : null}

      <View style={styles.rpe}>
        <AppText variant="overline" color="textMuted">
          Zorluk (RPE) · isteğe bağlı
        </AppText>
        <View style={styles.rpeRow} accessibilityRole="radiogroup" accessibilityLabel="Zorluk">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const on = rpe === n;
            return (
              <PressableScale
                key={n}
                scaleTo={pressScale.tile}
                haptic="select"
                accessibilityRole="radio"
                aria-checked={on}
                accessibilityLabel={`RPE ${n}`}
                onPress={() => setRpe(on ? null : n)}
                style={[styles.rpeChip, on && styles.rpeOn]}
              >
                <AppText variant="smallStrong" color={on ? 'textOnOrange' : 'text'}>
                  {n}
                </AppText>
              </PressableScale>
            );
          })}
        </View>
      </View>

      {error ? (
        <AppText variant="small" color="danger" accessibilityLiveRegion="polite" testID="finish-error">
          {error}
        </AppText>
      ) : null}
      {!done ? (
        <AppText variant="small" color="textMuted" testID="finish-empty">
          Kaydetmek için en az bir seti tamamla.
        </AppText>
      ) : null}

      <Button
        label="Antrenmanı kaydet"
        icon="check"
        loading={saving}
        disabled={!done}
        onPress={async () => {
          setSaving(true);
          setError(null);
          try {
            await onFinish(rpe);
          } catch (e) {
            setError((e as Error).message);
            setSaving(false);
          }
        }}
      />
      <View style={styles.row}>
        <Button label="Devam et" variant="secondary" onPress={onClose} style={styles.flex} />
        <Button label="Antrenmanı sil" variant="ghost" onPress={() => setConfirmDiscard(true)} style={styles.flex} />
      </View>
    </Sheet>
  );
}

function Stat({ label, value, testID }: { label: string; value: string; testID?: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="overline" color="textMuted">
        {label}
      </AppText>
      <AppText variant="statM" testID={testID}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.md },
  stats: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  rpe: { gap: spacing.sm },
  rpeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  rpeChip: {
    width: 40,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rpeOn: { backgroundColor: colors.orange, borderColor: colors.orange },
});
