import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Icon, type IconName } from '@/components/ui';
import { colors, radius } from '@/theme';

type Props = {
  label: string;
  icon: IconName;
  tone: 'orange' | 'gold';
  /** Replaces the static icon (e.g. an animated one). */
  iconNode?: ReactNode;
};

export function MiniCardHeader({ label, icon, tone, iconNode }: Props) {
  return (
    <View style={styles.row}>
      <AppText variant="overline" color="textMuted" numberOfLines={1} style={styles.label}>
        {label}
      </AppText>
      <View style={[styles.icon, { backgroundColor: tone === 'orange' ? colors.orangeSoft : colors.goldSoft }]}>
        {iconNode ?? <Icon name={icon} size={18} color={tone} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { flexShrink: 1 },
  icon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
