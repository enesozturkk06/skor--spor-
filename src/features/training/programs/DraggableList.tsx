import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { colors, radius } from '@/theme';
import { spring } from '@/theme/motion';

type Props<T> = {
  items: readonly T[];
  keyOf: (item: T) => string;
  /** Fixed row height (compact rows make dragging predictable). */
  itemHeight: number;
  gap?: number;
  renderItem: (item: T, index: number) => ReactNode;
  /** Called once per drop with the new order of keys. */
  onReorder: (keys: string[]) => void;
  /** Accessible name of an item (for the move up/down buttons). */
  labelOf: (item: T) => string;
  testID?: string;
};

const SNAP = { ...spring.gentle, reduceMotion: ReduceMotion.System };

/**
 * Drag & drop reordering with a handle. The dragged row follows the finger
 * on the UI thread; the others glide out of the way; the order is committed
 * once on drop. ↑/↓ buttons do the same for screen readers and keyboards.
 * Works with touch (iOS/Android) and mouse (web).
 */
export function DraggableList<T>({ items, keyOf, itemHeight, gap = 8, renderItem, onReorder, labelOf, testID }: Props<T>) {
  const slot = itemHeight + gap;
  const keys = items.map(keyOf);
  // key → current slot index, shared with every row's worklets.
  const positions = useSharedValue<Record<string, number>>(Object.fromEntries(keys.map((k, i) => [k, i])));
  const joined = keys.join('|');
  useEffect(() => {
    positions.set(Object.fromEntries(joined.split('|').map((k, i) => [k, i])));
  }, [joined, positions]);

  const commit = (order: Record<string, number>) => {
    const next = Object.entries(order)
      .sort((a, b) => a[1] - b[1])
      .map(([k]) => k);
    if (next.join('|') !== joined) {
      haptics.success();
      onReorder(next);
    }
  };
  const step = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= keys.length) return;
    const next = [...keys];
    [next[index], next[to]] = [next[to], next[index]];
    haptics.select();
    onReorder(next);
  };

  return (
    <View style={{ height: Math.max(0, keys.length * slot - gap) }} testID={testID}>
      {items.map((item, i) => (
        <Row
          key={keyOf(item)}
          id={keyOf(item)}
          index={i}
          count={keys.length}
          slot={slot}
          height={itemHeight}
          positions={positions}
          onDrop={commit}
          onStep={step}
          label={labelOf(item)}
        >
          {renderItem(item, i)}
        </Row>
      ))}
    </View>
  );
}

type RowProps = {
  id: string;
  index: number;
  count: number;
  slot: number;
  height: number;
  positions: SharedValue<Record<string, number>>;
  onDrop: (order: Record<string, number>) => void;
  onStep: (index: number, dir: -1 | 1) => void;
  label: string;
  children: ReactNode;
};

function Row({ id, index, count, slot, height, positions, onDrop, onStep, label, children }: RowProps) {
  const dragging = useSharedValue(0);
  const y = useSharedValue(index * slot);
  const start = useSharedValue(0);

  useEffect(() => {
    y.set(index * slot);
  }, [index, slot, y]);

  const pan = usePanGesture({
    minDistance: 2,
    onActivate: () => {
      'worklet';
      start.set(positions.get()[id] * slot);
      dragging.set(1);
      scheduleOnRN(haptics.tap);
    },
    onUpdate: (e) => {
      'worklet';
      const top = Math.max(0, Math.min((count - 1) * slot, start.get() + e.translationY));
      y.set(top);
      const to = Math.round(top / slot);
      const map = positions.get();
      const from = map[id];
      if (to !== from) {
        const next = { ...map };
        for (const k of Object.keys(next)) if (next[k] === to) next[k] = from;
        next[id] = to;
        positions.set(next);
        scheduleOnRN(haptics.select);
      }
    },
    onDeactivate: () => {
      'worklet';
      y.set(withSpring(positions.get()[id] * slot, SNAP));
      dragging.set(0);
      scheduleOnRN(onDrop, positions.get());
    },
  });

  const style = useAnimatedStyle(() => {
    const active = dragging.get() === 1;
    const target = positions.get()[id] ?? index;
    return {
      top: active ? y.get() : withSpring(target * slot, SNAP),
      zIndex: active ? 10 : 1,
      transform: [{ scale: withSpring(active ? 1.03 : 1, SNAP) }],
      boxShadow: active ? '0 12px 28px rgba(0,0,0,0.55)' : '0 0 0 rgba(0,0,0,0)',
    };
  });

  return (
    <Animated.View style={[styles.row, { height }, style]} testID={`drag-row-${index}`}>
      <GestureDetector gesture={pan} touchAction="none">
        <View style={styles.handle} accessibilityLabel={`${label}: sürükleyerek taşı`} testID={`drag-handle-${index}`}>
          <Icon name="drag" size={24} color="textMuted" />
        </View>
      </GestureDetector>
      <View style={styles.body}>{children}</View>
      <View style={styles.arrows}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label} yukarı taşı`} disabled={index === 0} onPress={() => onStep(index, -1)} hitSlop={4} style={[styles.arrow, index === 0 && styles.off]}>
          <Icon name="chevron-up" size={20} color="textMuted" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} aşağı taşı`}
          disabled={index === count - 1}
          onPress={() => onStep(index, 1)}
          hitSlop={4}
          style={[styles.arrow, index === count - 1 && styles.off]}
        >
          <Icon name="chevron-down" size={20} color="textMuted" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  handle: { width: 48, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', cursor: 'grab' } as object,
  body: { flex: 1, minWidth: 0 },
  arrows: { paddingHorizontal: 6, gap: 2 },
  arrow: { width: 32, height: 26, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.25 },
});
