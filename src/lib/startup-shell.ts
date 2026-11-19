import { Platform } from 'react-native';

/**
 * Removes the branded start screen that public/index.html draws before any
 * JavaScript runs (web only; a no-op on native and when it is already gone).
 * It fades out — or disappears at once with Reduce Motion — revealing the
 * app's first real screen underneath.
 */
export function hideStartupShell(): void {
  if (Platform.OS !== 'web') return;
  (globalThis as { __skorHideShell?: () => void }).__skorHideShell?.();
}
