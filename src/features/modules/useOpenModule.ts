import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

import { MODULES, type ModuleId } from './modules';

/** Navigates to a module: its tab, its own screen if live, otherwise /module/[id]. */
export function useOpenModule() {
  const router = useRouter();
  return useCallback(
    (id: ModuleId) => {
      const { tabRoute, route } = MODULES[id];
      if (tabRoute) router.navigate(tabRoute as Href);
      else if (route) router.push(route as Href);
      else router.push({ pathname: '/module/[id]', params: { id } } as Href);
    },
    [router],
  );
}
