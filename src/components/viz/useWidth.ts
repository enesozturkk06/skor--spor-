import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/** Measured width of a container, so SVG charts draw at real pixels (crisp strokes, no stretching). */
export function useWidth(initial = 0) {
  const [width, setWidth] = useState(initial);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setWidth((prev) => (prev === w ? prev : w));
  }, []);
  return [width, onLayout] as const;
}
