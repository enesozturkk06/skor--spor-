import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { layout, spacing } from '@/theme';

/**
 * "Hesabın yok mu? Kayıt ol" — the prompt plus a link with a full 44 px
 * touch target (a link nested inside a sentence can't be made tappable enough).
 */
export function AuthSwitch({ prompt, action, onPress }: { prompt: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.row}>
      <AppText variant="small" color="textMuted">
        {prompt}
      </AppText>
      <Pressable accessibilityRole="link" accessibilityLabel={action} onPress={onPress} style={styles.link}>
        <AppText variant="smallStrong" color="orange">
          {action}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: spacing.xs },
  link: { minHeight: layout.minTouch, minWidth: layout.minTouch, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xs },
});
