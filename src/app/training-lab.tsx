import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components/ui';
import { useTraining } from '@/features/training/TrainingProvider';
import { doneSetCount } from '@/features/training/workout-model';
import { spacing } from '@/theme';

/**
 * Internal harness for the training data layer (Phase 3B): drives the
 * TrainingProvider without the real workout UI (Phase 3C). Enabled only in
 * development and E2E builds, like /motion-lab; production redirects home.
 */
const ENABLED = __DEV__ || process.env.EXPO_PUBLIC_MOTION_LAB === '1';

export default function TrainingLab() {
  const t = useTraining();
  const [message, setMessage] = useState('');
  if (!ENABLED) return <Redirect href="/" />;

  const first = t.active?.exercises[0];
  const lastSet = first?.sets[first.sets.length - 1];
  const run = (fn: () => unknown) => async () => {
    try {
      const r = await fn();
      setMessage(r === undefined ? 'ok' : JSON.stringify(r));
    } catch (e) {
      setMessage(`error: ${(e as Error).message}`);
    }
  };

  const actions: [string, () => unknown][] = [
    ['Başlat', () => t.start({ name: 'Push Day', sport: 'fitness' }).id],
    ['Bench ekle', () => t.addExercise('bench_press')],
    ['Plank ekle', () => t.addExercise('plank')],
    ['Set ekle', () => first && t.addSet(first.uid)],
    ['Seti doldur', () => first && lastSet && t.updateSet(first.uid, lastSet.uid, first.exerciseKey === 'plank' ? { durationS: 60 } : { reps: 8, weightKg: 60 })],
    ['Seti tamamla', () => first && lastSet && t.setDone(first.uid, lastSet.uid, true)],
    ['Bitir', () => t.finish({ rpe: 8 })],
    ['Çift bitir', () => Promise.allSettled([t.finish(), t.finish()]).then((r) => r.map((x) => x.status))],
    ['Vazgeç', () => t.discard()],
    ['Senkronize et', () => t.syncNow()],
    ['Yenile', () => t.refresh()],
    ['İlkini sil', () => t.history[0] && t.deleteWorkout(t.history[0].id)],
  ];

  return (
    <Screen width="form">
      <View style={styles.stack}>
        <AppText variant="h1" accessibilityRole="header">
          Antrenman laboratuvarı
        </AppText>
        <Card>
          <AppText variant="small" testID="lab-ready">{`ready:${t.ready}`}</AppText>
          <AppText variant="small" testID="lab-history-status">{`history:${t.historyStatus}`}</AppText>
          <AppText variant="small" testID="lab-sync">{`sync:${t.syncStatus} pending:${t.pendingCount} rejected:${t.rejectedCount}`}</AppText>
          <AppText variant="small" testID="lab-active">
            {t.active ? `active:${t.active.id} exercises:${t.active.exercises.length} done:${doneSetCount(t.active)}` : 'active:none'}
          </AppText>
          <AppText variant="small" testID="lab-error">{`error:${t.historyError ?? ''}`}</AppText>
          <AppText variant="small" testID="lab-message">{message}</AppText>
        </Card>
        <View style={styles.grid}>
          {actions.map(([label, fn]) => (
            <Button key={label} label={label} size="md" variant="secondary" onPress={run(fn)} />
          ))}
        </View>
        <View testID="lab-history">
          {t.history.map((w) => (
            <AppText key={w.id} variant="small" testID={`lab-workout-${w.id}`}>
              {`${w.name}|${w.sync}|${w.sets.length}`}
            </AppText>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
