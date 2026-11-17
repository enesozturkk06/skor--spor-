import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText, Button, Card, Icon } from '@/components/ui';
import { getSport } from '@/features/athlete/catalog';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme';
import { pressScale } from '@/theme/motion';

import { WEEKDAYS, estimateMinutes, isoWeekday } from '../template-model';
import { useTraining } from '../TrainingProvider';

/**
 * Training tab: today's programs from the weekly plan (one tap to start)
 * and the way into all programs.
 */
export function ProgramsTeaser() {
  const router = useRouter();
  const t = useTraining();
  if (!t.ready) return null;
  const today = isoWeekday(new Date());
  const todays = t.templates.filter((p) => p.days.includes(today));

  return (
    <Card accent="gold" padded={false}>
      <View style={styles.inner} testID="programs-teaser">
        <View style={styles.head}>
          <View style={styles.icon}>
            <Icon name="calendar-week" size={22} color="gold" />
          </View>
          <View style={styles.flex}>
            <AppText variant="overline" color="gold">
              {WEEKDAYS[today - 1].long} · bugün
            </AppText>
            <AppText variant="h3">{todays.length ? 'Bugünün programı' : 'Programlar'}</AppText>
          </View>
        </View>
        {todays.slice(0, 2).map((p) => (
          <View key={p.id} style={styles.today} testID="today-program">
            <Icon name={getSport(p.sport).icon} size={18} color="orange" />
            <View style={styles.flex}>
              <AppText variant="title" numberOfLines={1}>
                {p.name}
              </AppText>
              <AppText variant="small" color="textMuted">
                {p.blocks.length} egzersiz · ~{estimateMinutes(p)} dk
              </AppText>
            </View>
            {!t.active ? (
              <PressableScale
                scaleTo={pressScale.button}
                accessibilityRole="button"
                accessibilityLabel={`${p.name} başlat`}
                onPress={() => {
                  t.startFromTemplate(p);
                  haptics.success();
                  router.push('/workout');
                }}
                style={styles.play}
              >
                <Icon name="play" size={20} color="textOnOrange" />
              </PressableScale>
            ) : null}
          </View>
        ))}
        {!todays.length ? (
          <AppText variant="small" color="textMuted">
            {t.templates.length ? `${t.templates.length} programın var; bugüne atanmış olan yok.` : 'Kendi programını kur ya da hazır şablonlarla başla.'}
          </AppText>
        ) : null}
        <Button label="Programlar ve haftalık plan" icon="clipboard-list-outline" variant="secondary" size="md" onPress={() => router.push('/programs')} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  inner: { padding: spacing.lg, gap: spacing.md },
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.goldSoft },
  today: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bgRaised },
  play: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orange },
});
