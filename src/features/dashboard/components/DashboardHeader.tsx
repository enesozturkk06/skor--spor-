import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText, Icon, LogoMark } from '@/components/ui';
import { getSport, type SportId } from '@/features/athlete/catalog';
import { firstName, initials } from '@/lib/format';
import { colors, fonts, radius, spacing } from '@/theme';
import { pressScale } from '@/theme/motion';

import { greeting } from '../dashboard-data';

type Props = {
  name: string;
  primarySport: SportId;
  /** Web has no pull-to-refresh, so it gets a visible refresh button. */
  onRefresh?: () => void;
  refreshing?: boolean;
};

/** Refresh button for web; the icon spins while a refresh is running. */
function RefreshButton({ onPress, refreshing }: { onPress: () => void; refreshing: boolean }) {
  const reduceMotion = useReducedMotion();
  const turn = useSharedValue(0);

  useEffect(() => {
    if (refreshing && !reduceMotion) {
      turn.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1));
    } else {
      cancelAnimation(turn);
      turn.set(0);
    }
  }, [refreshing, reduceMotion, turn]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 360}deg` }] }));

  return (
    <PressableScale
      scaleTo={pressScale.tile}
      haptic="tap"
      onPress={onPress}
      disabled={refreshing}
      accessibilityRole="button"
      accessibilityLabel={refreshing ? 'Yenileniyor' : 'Yenile'}
      aria-busy={refreshing}
      style={styles.iconButton}
    >
      <Animated.View style={spin}>
        <Icon name="refresh" size={20} color={refreshing ? 'orange' : 'textMuted'} />
      </Animated.View>
    </PressableScale>
  );
}

export function DashboardHeader({ name, primarySport, onRefresh, refreshing = false }: Props) {
  const router = useRouter();
  const sport = getSport(primarySport);
  const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={styles.brandRow}>
          <LogoMark size={22} />
          <AppText variant="overline" color="textMuted">
            {today}
          </AppText>
        </View>
        <AppText variant="h1" numberOfLines={1}>
          {greeting()}, <AppText variant="h1" color="orange">{firstName(name)}</AppText>
        </AppText>
        <View style={styles.sport}>
          <Icon name={sport.icon} size={14} color="gold" />
          <AppText variant="smallStrong" color="gold">
            {sport.label} sporcusu
          </AppText>
        </View>
      </View>
      <View style={styles.actions}>
        {onRefresh && Platform.OS === 'web' ? <RefreshButton onPress={onRefresh} refreshing={refreshing} /> : null}
        <PressableScale
          scaleTo={pressScale.tile}
          haptic="tap"
          accessibilityRole="button"
          accessibilityLabel="Profili aç"
          onPress={() => router.navigate('/profile')}
          style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.85 }]}
        >
          <AppText style={styles.avatarText}>{initials(name)}</AppText>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg },
  left: { flexShrink: 1, gap: spacing.xs },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sport: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.petrol,
    borderWidth: 2,
    borderColor: colors.gold,
  },
  avatarText: { fontFamily: fonts.display, fontSize: 20, color: colors.gold, letterSpacing: 1 },
});
