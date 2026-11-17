import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { fadeIn } from '@/components/motion/entrance';
import { AppText, Icon, ProgressBar } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

import type { TrainingScore } from '../athlete-score';

/**
 * "What is this score based on?" — the exact inputs behind the number, and
 * what is not included yet. Collapsed by default to keep the home screen calm.
 */
export function ScoreBasis({ score }: { score: TrainingScore }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.card} testID="score-basis">
      <Pressable
        accessibilityRole="button"
        aria-expanded={open}
        accessibilityLabel="Skor neye dayanıyor?"
        onPress={() => setOpen((o) => !o)}
        style={styles.head}
      >
        <Icon name="information-outline" size={18} color="gold" />
        <AppText variant="smallStrong" style={styles.flex}>
          Skor neye dayanıyor?
        </AppText>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color="textMuted" />
      </Pressable>
      {open ? (
        <Animated.View entering={fadeIn()} style={styles.body}>
          {score.status === 'ready' ? (
            score.components.map((c) => (
              <View key={c.key} style={styles.row} testID={`score-part-${c.key}`}>
                <View style={styles.rowHead}>
                  <AppText variant="smallStrong">
                    {c.label}{' '}
                    <AppText variant="small" color="textFaint">
                      · ağırlık %{Math.round(c.weight * 100)}
                    </AppText>
                  </AppText>
                  <AppText variant="smallStrong" color="orange">
                    {c.value}
                  </AppText>
                </View>
                <ProgressBar progress={c.value / 100} height={4} accessibilityLabel={`${c.label} ${c.value} puan`} />
                <AppText variant="small" color="textMuted">
                  {c.detail}
                </AppText>
              </View>
            ))
          ) : score.status === 'loading' ? (
            <AppText variant="small" color="textMuted">
              Antrenman geçmişin yükleniyor; skor son 35 günün tüm kayıtları gelince hesaplanır.
            </AppText>
          ) : (
            <AppText variant="small" color="textMuted">
              {score.needed} antrenman tamamlayınca sıklık, süre, devamlılık ve kişisel rekorlarından hesaplanır. Şu an {score.workouts} antrenmanın var.
            </AppText>
          )}
          <AppText variant="small" color="textMuted" style={styles.note} testID="score-scope">
            Şu an yalnızca kaydettiğin antrenmanlara dayanır. Toparlanma ve beslenme modülleri açıldığında skora eklenecek; o zamana kadar bu alanlar için hiçbir örnek değer kullanılmaz.
          </AppText>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, minHeight: 48 },
  body: { gap: spacing.md, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  row: { gap: spacing.xs },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between' },
  note: { paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
});
