import { Redirect, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/ui';
import { getExercise } from '@/features/exercises/catalog';
import { ExerciseDetail } from '@/features/exercises/components/ExerciseDetail';
import { NavBar } from '@/features/exercises/components/NavBar';

export default function ExerciseDetailScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const exercise = typeof key === 'string' ? getExercise(key) : undefined;

  // Unknown or renamed keys (hand-typed URL, old link) land on the library.
  if (!exercise) return <Redirect href="/exercises" />;

  return (
    <Screen width="form">
      <NavBar overline="Egzersiz" fallback="/exercises" />
      {/* key: navigating between related exercises remounts with fresh state and entrances. */}
      <ExerciseDetail key={exercise.key} exercise={exercise} />
    </Screen>
  );
}
