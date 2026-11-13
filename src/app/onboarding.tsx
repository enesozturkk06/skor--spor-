import { useAthlete } from '@/features/athlete/AthleteProvider';
import { OnboardingFlow } from '@/features/athlete/components/OnboardingFlow';

export default function OnboardingScreen() {
  const { saveProfile } = useAthlete();
  // Once saved, the root guards switch to the tab navigator.
  return (
    <OnboardingFlow
      onSubmit={async (input) => {
        await saveProfile(input);
      }}
    />
  );
}
