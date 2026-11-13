import { Tabs } from 'expo-router/js-tabs';

import { TAB_META, TabBar } from '@/components/navigation/TabBar';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: TAB_META.index.label }} />
      <Tabs.Screen name="training" options={{ title: TAB_META.training.label }} />
      <Tabs.Screen name="coach" options={{ title: TAB_META.coach.label }} />
      <Tabs.Screen name="nutrition" options={{ title: TAB_META.nutrition.label }} />
      <Tabs.Screen name="profile" options={{ title: TAB_META.profile.label }} />
    </Tabs>
  );
}
