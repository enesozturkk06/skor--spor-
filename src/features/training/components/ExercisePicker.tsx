import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { enter } from '@/components/motion/entrance';
import { AppText, Screen, TextField } from '@/components/ui';
import { EXERCISES, filterExercises } from '@/features/exercises/catalog';
import { ExerciseCard } from '@/features/exercises/components/ExerciseCard';
import { NavBar } from '@/features/exercises/components/NavBar';
import { haptics } from '@/lib/haptics';
import { spacing } from '@/theme';

import { useTraining } from '../TrainingProvider';
import { addExercise } from '../workout-model';

/** Adds an exercise to the running workout: search, with the workout's sport first. */
export function ExercisePicker() {
  const router = useRouter();
  const t = useTraining();
  const [query, setQuery] = useState('');
  const sport = t.active?.sport;

  const results = useMemo(() => {
    const list = filterExercises({ query });
    if (!sport) return list;
    // Stable sort: the workout's sport first, catalog order otherwise.
    return [...list].sort((a, b) => Number(b.sports.includes(sport)) - Number(a.sports.includes(sport)));
  }, [query, sport]);

  if (!t.ready) return null;
  if (!t.active) return <Redirect href="/training" />;
  const inWorkout = new Set(t.active.exercises.map((e) => e.exerciseKey));

  return (
    <Screen width="form">
      <NavBar overline="Egzersiz ekle" fallback="/workout" />
      <View style={styles.stack}>
        <TextField label="Ara" icon="magnify" value={query} onChangeText={setQuery} placeholder="Egzersiz veya kas" autoCorrect={false} autoCapitalize="none" />
        <AppText variant="small" color="textMuted">
          {results.length} / {EXERCISES.length} egzersiz
        </AppText>
        {results.map((e, i) => (
          <Animated.View key={e.key} entering={enter(Math.min(i, 8), { step: 30 })}>
            <ExerciseCard
              exercise={e}
              onPress={(key) => {
                t.editActive((w) => addExercise(w, key));
                haptics.success();
                router.back();
              }}
            />
            {inWorkout.has(e.key) ? (
              <AppText variant="small" color="gold" style={styles.already}>
                Bu antrenmanda var — tekrar eklenirse ayrı bir blok olur.
              </AppText>
            ) : null}
          </Animated.View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  already: { marginTop: spacing.xs, marginLeft: spacing.md },
});
