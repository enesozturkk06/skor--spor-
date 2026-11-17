import { LibraryTeaser } from '@/features/exercises/components/LibraryTeaser';
import { ModuleTabScreen } from '@/features/modules/ModuleTabScreen';
import { StartWorkoutCard } from '@/features/training/components/StartWorkoutCard';
import { ProgramsTeaser } from '@/features/training/programs/ProgramsTeaser';

export default function TrainingScreen() {
  return (
    <ModuleTabScreen id="training">
      <StartWorkoutCard />
      <ProgramsTeaser />
      <LibraryTeaser />
    </ModuleTabScreen>
  );
}
