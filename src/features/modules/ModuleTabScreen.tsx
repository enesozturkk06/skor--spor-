import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTabBarClearance } from '@/components/navigation/TabBar';
import { Screen } from '@/components/ui';
import { spacing } from '@/theme';

import { ModulePreview } from './ModulePreview';
import { MODULES, type ModuleId } from './modules';

/**
 * Tab-level screen of a module. `children` is what already works; the
 * "coming soon" preview is shown ONLY while the module's status is 'soon' —
 * a live module never advertises itself as in development.
 */
export function ModuleTabScreen({ id, children }: { id: ModuleId; children?: ReactNode }) {
  const clearance = useTabBarClearance();
  const module = MODULES[id];
  return (
    <Screen width="form" edges={['top', 'left', 'right']} bottomInset={clearance}>
      <View style={styles.stack}>
        {children}
        {module.status === 'soon' ? <ModulePreview module={module} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xxl },
});
