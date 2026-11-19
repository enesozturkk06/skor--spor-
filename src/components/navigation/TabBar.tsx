import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/motion/PressableScale';
import { pressScale } from '@/theme/motion';
import { AppText, Icon, type IconName } from '@/components/ui';
import { APP_ICONS } from '@/components/ui/icon-system';
import { colors, gradients, layout, radius, spacing } from '@/theme';

export type TabMeta = { label: string; icon: IconName; iconActive: IconName; featured?: boolean };

/** Visual metadata per route name. Order is defined by the Tabs layout. */
export const TAB_META: Record<string, TabMeta> = {
  index: { label: 'Ana Sayfa', icon: APP_ICONS.home.outline, iconActive: APP_ICONS.home.filled },
  training: { label: 'Antrenman', icon: APP_ICONS.training.outline, iconActive: APP_ICONS.training.filled },
  coach: { label: 'AI Koç', icon: APP_ICONS.coach.outline, iconActive: APP_ICONS.coach.outline, featured: true },
  nutrition: { label: 'Beslenme', icon: APP_ICONS.nutrition.outline, iconActive: APP_ICONS.nutrition.filled },
  profile: { label: 'Profil', icon: APP_ICONS.profile.outline, iconActive: APP_ICONS.profile.filled },
};

/** Space content must leave at the bottom so the floating bar never covers it. */
export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  return layout.tabBarHeight + Math.max(insets.bottom, spacing.md) + spacing.lg;
}

export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.bar} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;
          const focused = state.index === index;

          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          const onLongPress = () => {
            emitter.emit({ type: 'tabLongPress', target: route.key });
          };

          if (meta.featured) {
            return (
              <PressableScale
        scaleTo={pressScale.tile}
        haptic="select"
                key={route.key}
                accessibilityRole="tab"
                aria-selected={focused}
                accessibilityLabel={meta.label}
                onPress={onPress}
                onLongPress={onLongPress}
                style={({ pressed }) => [styles.item, pressed && styles.pressed]}
              >
                <LinearGradient colors={gradients.orange} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.featured, focused && styles.featuredActive]}>
                  <Icon name={meta.icon} size={24} color="textOnOrange" />
                </LinearGradient>
              </PressableScale>
            );
          }

          return (
            <PressableScale
        scaleTo={pressScale.tile}
        haptic="select"
              key={route.key}
              accessibilityRole="tab"
              aria-selected={focused}
              accessibilityLabel={meta.label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <Icon name={focused ? meta.iconActive : meta.icon} size={24} color={focused ? 'orange' : 'textFaint'} />
              <AppText variant="overline" color={focused ? 'text' : 'textFaint'} style={styles.label} numberOfLines={1}>
                {meta.label}
              </AppText>
              <View style={[styles.indicator, focused && styles.indicatorActive]} />
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: spacing.md },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 560,
    height: layout.tabBarHeight,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(12,21,20,0.96)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    ...Platform.select({
      web: { boxShadow: '0 12px 32px rgba(0,0,0,0.45)' },
      default: { shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 14 },
    }),
  },
  item: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
  pressed: { opacity: 0.7 },
  label: { fontSize: 9, letterSpacing: 0.6 },
  indicator: { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2 },
  indicatorActive: { backgroundColor: colors.orange },
  featured: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    borderWidth: 4,
    borderColor: colors.bg,
  },
  featuredActive: { borderColor: colors.gold },
});
