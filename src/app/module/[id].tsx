import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon, Screen } from '@/components/ui';
import { ModulePreview } from '@/features/modules/ModulePreview';
import { MODULES, isModuleId } from '@/features/modules/modules';
import { layout, radius, spacing } from '@/theme';

export default function ModuleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Unknown ids (e.g. a hand-typed URL) go back home instead of crashing.
  if (!isModuleId(id)) return <Redirect href="/" />;
  const module = MODULES[id];
  if (module.tabRoute) return <Redirect href={module.tabRoute} />;
  if (module.route) return <Redirect href={module.route} />;

  return (
    <Screen>
      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri"
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.back}
        >
          <Icon name="arrow-left" size={22} />
        </Pressable>
        <AppText variant="overline" color="textMuted">
          Modül
        </AppText>
        <View style={styles.back} />
      </View>
      <ModulePreview module={module} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  back: { width: layout.minTouch, height: layout.minTouch, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
