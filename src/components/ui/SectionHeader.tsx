import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

type SectionHeaderProps = {
  title: string;
  overline?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, overline, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.titles}>
        {overline ? (
          <AppText variant="overline" color="gold">
            {overline}
          </AppText>
        ) : null}
        <AppText variant="h2" accessibilityRole="header">
          {title}
        </AppText>
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10} style={styles.action}>
          <AppText variant="smallStrong" color="orange">
            {actionLabel}
          </AppText>
          <Icon name="chevron-right" size={18} color="orange" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.md },
  titles: { gap: spacing.xxs, flexShrink: 1 },
  action: { flexDirection: 'row', alignItems: 'center' },
});
