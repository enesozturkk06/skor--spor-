import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/motion/PressableScale';
import { AppText, Button, Card, Chip, Icon, Tag } from '@/components/ui';
import { getSport, type SportId } from '@/features/athlete/catalog';
import { useAthlete } from '@/features/athlete/AthleteProvider';
import { colors, layout, radius, spacing } from '@/theme';
import { pressScale } from '@/theme/motion';

import { elapsedMs, formatClock } from '../timers';
import { useTraining } from '../TrainingProvider';
import type { WorkoutEntry } from '../types';
import { useNow } from '../useNow';
import { doneSetCount, durationMinutes } from '../workout-model';

const SYNC_LABEL = { synced: 'Kaydedildi', pending: 'Gönderilmeyi bekliyor', rejected: 'Sunucu kabul etmedi' } as const;
const SYNC_TONE = { synced: 'success', pending: 'gold', rejected: 'orange' } as const;

/** Training tab entry: resume the running workout, or start one for one of the athlete's sports. */
export function StartWorkoutCard() {
  const router = useRouter();
  const t = useTraining();
  const { profile } = useAthlete();
  const sports: SportId[] = profile ? [profile.primarySport, ...profile.secondarySports] : ['fitness'];
  const [sport, setSport] = useState<SportId>(sports[0]);

  if (!t.ready) return null;
  const last = t.history[0];

  return (
    <View style={styles.stack}>
      {t.active ? (
        <Card variant="hero" accent="orange" onPress={() => router.push('/workout')} accessibilityLabel="Devam eden antrenmana dön">
          <View style={styles.inner} testID="resume-card">
            <Tag label={t.active.pausedAt ? 'Duraklatıldı' : 'Devam ediyor'} tone="orange" icon={t.active.pausedAt ? 'pause' : 'lightning-bolt'} />
            <AppText variant="h1">{t.active.name}</AppText>
            <ActiveSummary />
            <Button label="Antrenmana dön" icon="play" onPress={() => router.push('/workout')} />
          </View>
        </Card>
      ) : (
        <Card variant="hero" accent="orange">
          <View style={styles.inner}>
            <AppText variant="overline" color="gold">
              Bugün
            </AppText>
            <AppText variant="h1">Antrenmana başla</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
              {sports.map((id) => {
                const s = getSport(id);
                return <Chip key={id} label={s.label} icon={s.icon} selected={sport === id} onPress={() => setSport(id)} />;
              })}
            </ScrollView>
            <Button
              label="Başlat"
              icon="play"
              onPress={() => {
                t.start({ name: `${getSport(sport).label} antrenmanı`, sport });
                router.push('/workout');
              }}
            />
          </View>
        </Card>
      )}

      {t.pendingCount ? (
        <View style={styles.pending} testID="pending-banner">
          <Icon name="cloud-off-outline" size={18} color="gold" />
          <AppText variant="small" style={styles.flex}>
            {t.pendingCount} antrenman bağlantı gelince otomatik gönderilecek.
          </AppText>
        </View>
      ) : null}
      {last ? <LastWorkout entry={last} onPress={() => router.push({ pathname: '/history/[id]', params: { id: last.id } })} /> : null}
      <View style={styles.links}>
        <Button label="Geçmiş" icon="calendar-check" variant="secondary" size="md" style={styles.flex} onPress={() => router.push('/history')} />
        <Button label="Rekorlar" icon="trophy-outline" variant="secondary" size="md" style={styles.flex} onPress={() => router.push('/records')} />
      </View>
    </View>
  );
}

function ActiveSummary() {
  const { active } = useTraining();
  const now = useNow(1000, Boolean(active && !active.pausedAt));
  if (!active) return null;
  return (
    <AppText variant="body" color="textMuted">
      {formatClock(elapsedMs(active, now) / 1000)} · {doneSetCount(active)} set · {active.exercises.length} egzersiz
    </AppText>
  );
}

function LastWorkout({ entry, onPress }: { entry: WorkoutEntry; onPress: () => void }) {
  const date = new Date(entry.endedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  return (
    <PressableScale scaleTo={pressScale.card} haptic="tap" accessibilityRole="button" accessibilityLabel={"Son antrenman: " + entry.name} onPress={onPress} style={styles.last} testID="last-workout">
      <View style={styles.lastIcon}>
        <Icon name="calendar-check" size={20} color="orange" />
      </View>
      <View style={styles.flex}>
        <AppText variant="overline" color="textMuted">
          Son antrenman
        </AppText>
        <AppText variant="title" numberOfLines={1}>
          {entry.name}
        </AppText>
        <AppText variant="small" color="textMuted">
          {date} · {durationMinutes(entry)} dk · {entry.sets.length} set
        </AppText>
      </View>
      <Tag label={SYNC_LABEL[entry.sync]} tone={SYNC_TONE[entry.sync]} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  links: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  inner: { gap: spacing.md, paddingVertical: spacing.xs },
  chipScroll: { marginHorizontal: -layout.gutter, flexGrow: 0 },
  chips: { gap: spacing.sm, paddingHorizontal: layout.gutter },
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.goldSoft,
  },
  last: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  lastIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orangeSoft,
  },
});
