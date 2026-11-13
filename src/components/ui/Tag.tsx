import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Tone = 'orange' | 'gold' | 'neutral' | 'success';

const TONES: Record<Tone, { bg: string; fg: 'orange' | 'gold' | 'textMuted' | 'success' }> = {
  orange: { bg: colors.orangeSoft, fg: 'orange' },
  gold: { bg: colors.goldSoft, fg: 'gold' },
  neutral: { bg: 'rgba(255,255,255,0.06)', fg: 'textMuted' },
  success: { bg: 'rgba(79,209,161,0.12)', fg: 'success' },
};

export function Tag({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const t = TONES[tone];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }]}>
      {icon ? <Icon name={icon} size={12} color={t.fg} /> : null}
      <AppText variant="overline" color={t.fg} style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  text: { fontSize: 10, letterSpacing: 1.2 },
});
