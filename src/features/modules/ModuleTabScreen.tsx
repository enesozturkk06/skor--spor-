import { useTabBarClearance } from '@/components/navigation/TabBar';
import { Screen } from '@/components/ui';

import { ModulePreview } from './ModulePreview';
import { MODULES, type ModuleId } from './modules';

/** Tab-level screen for modules that are still in development. */
export function ModuleTabScreen({ id }: { id: ModuleId }) {
  const clearance = useTabBarClearance();
  return (
    <Screen width="form" edges={['top', 'left', 'right']} bottomInset={clearance}>
      <ModulePreview module={MODULES[id]} />
    </Screen>
  );
}
