import { StyleSheet, View } from 'react-native';

import { AppText, Card, Icon, Tag } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

import type { AppModule } from './modules';

/**
 * Honest placeholder for modules that are not built yet: shows what the
 * module is and what is planned, instead of fake functionality.
 */
export function ModulePreview({ module }: { module: AppModule }) {
  return (
    <View style={styles.wrap}>
      <Card variant="hero" accent="orange">
        <View style={styles.hero}>
          <View style={styles.icon}>
            <Icon name={module.icon} size={34} color="orange" />
          </View>
          <Tag label={module.status === 'soon' ? 'Geliştiriliyor' : 'Aktif'} tone="gold" icon="progress-wrench" />
          <AppText variant="display" accessibilityRole="header">
            {module.title}
          </AppText>
          <AppText variant="body" color="textMuted">
            {module.tagline}
          </AppText>
        </View>
      </Card>

      <View>
        <AppText variant="overline" color="gold" style={styles.overline}>
          Bu modülde neler olacak
        </AppText>
        <View style={styles.list}>
          {module.roadmap.map((item, i) => (
            <View key={item} style={styles.item}>
              <AppText variant="statM" color="orange" style={styles.index}>
                {String(i + 1).padStart(2, '0')}
              </AppText>
              <AppText variant="bodyStrong" style={styles.itemText}>
                {item}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xxl },
  hero: { gap: spacing.md, paddingVertical: spacing.sm },
  icon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,13,13,0.4)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  overline: { marginBottom: spacing.md },
  list: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  index: { width: 34 },
  itemText: { flex: 1 },
});
