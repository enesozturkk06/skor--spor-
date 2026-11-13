import { StyleSheet, View } from 'react-native';

import { AppText, Card, Icon, Tag } from '@/components/ui';
import { MODULES, type ModuleId } from '@/features/modules/modules';
import { useOpenModule } from '@/features/modules/useOpenModule';
import { colors, radius, spacing } from '@/theme';

const QUICK: ModuleId[] = ['training', 'exercises', 'coach', 'recovery', 'performance', 'community'];

export function QuickAccess({ columns }: { columns: 2 | 3 }) {
  const openModule = useOpenModule();
  return (
    <View style={styles.grid}>
      {QUICK.map((id) => {
        const m = MODULES[id];
        return (
          <Card
            key={id}
            onPress={() => openModule(id)}
            accessibilityLabel={`${m.title}, ${m.tagline}`}
            style={[styles.tile, { flexBasis: columns === 3 ? '30%' : '46%' }]}
            padded={false}
          >
            <View style={styles.inner}>
              <View style={styles.top}>
                <View style={styles.icon}>
                  <Icon name={m.icon} size={22} color="orange" />
                </View>
                {m.status === 'soon' ? <Tag label="Yakında" /> : null}
              </View>
              <AppText variant="title" numberOfLines={1}>
                {m.title}
              </AppText>
              <AppText variant="small" color="textMuted" numberOfLines={2}>
                {m.tagline}
              </AppText>
            </View>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { flexGrow: 1 },
  inner: { padding: spacing.lg, gap: spacing.xxs },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orangeSoft,
  },
});
