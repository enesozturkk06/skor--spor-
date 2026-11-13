import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

import { MODULES, type ModuleId } from './modules';

/** Navigates to a module: its tab if it has one, otherwise /module/[id]. */
export function useOpenModule() {
  const router = useRouter();
  return useCallback(
    (id: ModuleId) => {
      const target = MODULES[id].tabRoute;
      if (target) router.navigate(target as Href);
      else router.push({ pathname: '/module/[id]', params: { id } } as Href);
    },
    [router],
  );
}
