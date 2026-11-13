import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon, LogoMark } from '@/components/ui';
import { getSport, type SportId } from '@/features/athlete/catalog';
import { firstName, initials } from '@/lib/format';
import { colors, fonts, radius, spacing } from '@/theme';

import { greeting } from '../dashboard-data';

type Props = { name: string; primarySport: SportId };

export function DashboardHeader({ name, primarySport }: Props) {
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Profili aç"
        onPress={() => router.navigate('/profile')}
        style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.8 }]}
      >
        <AppText style={styles.avatarText}>{initials(name)}</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg },
  left: { flexShrink: 1, gap: spacing.xs },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sport: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
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
