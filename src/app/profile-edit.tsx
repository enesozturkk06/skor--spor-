import { useRouter } from 'expo-router';

import { useAthlete } from '@/features/athlete/AthleteProvider';
import { OnboardingFlow } from '@/features/athlete/components/OnboardingFlow';

export default function ProfileEditScreen() {
  const router = useRouter();
  const { profile, saveProfile } = useAthlete();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

  return (
    <OnboardingFlow
      initial={profile}
      onClose={close}
      onSubmit={async (input) => {
        await saveProfile(input);
        close();
      }}
    />
  );
}
