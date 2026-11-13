import { useId } from 'react';

/**
 * Unique, SVG-safe id per component instance.
 *
 * SVG gradients are referenced by document-wide id (`url(#id)`). On web the
 * navigation stack keeps previous screens mounted, so two instances with the
 * same hard-coded id resolve to the first (possibly hidden) one and the
 * gradient silently fails to paint. Always derive ids from this hook.
 */
export function useSvgId(prefix: string): (name: string) => string {
  const base = `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (name) => `${base}-${name}`;
}
