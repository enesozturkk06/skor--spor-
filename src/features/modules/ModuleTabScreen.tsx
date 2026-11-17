import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTabBarClearance } from '@/components/navigation/TabBar';
import { Screen } from '@/components/ui';
import { spacing } from '@/theme';

import { ModulePreview } from './ModulePreview';
import { MODULES, type ModuleId } from './modules';

/** Tab-level screen for modules that are still in development; `children` shows what is already live. */
export function ModuleTabScreen({ id, children }: { id: ModuleId; children?: ReactNode }) {
  const clearance = useTabBarClearance();
  return (
    <Screen width="form" edges={['top', 'left', 'right']} bottomInset={clearance}>
      <View style={styles.stack}>
        {children}
        <ModulePreview module={MODULES[id]} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xxl },
});
