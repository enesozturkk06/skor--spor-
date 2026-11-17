import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { enter } from '@/components/motion/entrance';
import { AppText, Button, Card, Chip, Icon, Screen, SectionHeader } from '@/components/ui';
import { SPORTS, type SportId } from '@/features/athlete/catalog';
import { useAthlete } from '@/features/athlete/AthleteProvider';
import { NavBar } from '@/features/exercises/components/NavBar';
import { colors, layout, radius, spacing } from '@/theme';

import { BUILTIN_TEMPLATES } from '../builtin-templates';
import { useTraining } from '../TrainingProvider';
import type { WorkoutTemplate } from '../types';
import { ProgramCard } from './ProgramCard';
import { WeekPlan } from './WeekPlan';

/** Programs hub: weekly plan, the athlete's own programs and ready-made ones. */
export function ProgramsScreen() {
  const router = useRouter();
  const t = useTraining();
  const { profile } = useAthlete();
  const mine = useMemo(() => (profile ? [profile.primarySport, ...profile.secondarySports] : []), [profile]);
  const [sport, setSport] = useState<SportId | null>(null);

  const open = useCallback((p: WorkoutTemplate) => router.push({ pathname: '/programs/[id]', params: { id: p.id } }), [router]);
  const builtIns = useMemo(() => {
    const list = sport ? BUILTIN_TEMPLATES.filter((p) => p.sport === sport) : [...BUILTIN_TEMPLATES];
    // The athlete's sports first.
    const rank = (p: WorkoutTemplate) => (mine.includes(p.sport) ? mine.indexOf(p.sport) : 99);
    return list.sort((a, b) => rank(a) - rank(b));
  }, [sport, mine]);
  const sportsWithBuiltIns = SPORTS.filter((s) => BUILTIN_TEMPLATES.some((p) => p.sport === s.id));

  return (
    <Screen width="form">
      <NavBar overline="Antrenman" fallback="/training" />
      <Animated.View entering={enter(0)} style={styles.title}>
        <AppText variant="display" accessibilityRole="header">
          Programlar
        </AppText>
        <AppText variant="body" color="textMuted">
          Kendi programını kur, haftana yerleştir, tek dokunuşla başla.
        </AppText>
      </Animated.View>

      <View style={styles.stack}>
        <Animated.View entering={enter(1)}>
          <Button label="Yeni program" icon="plus" onPress={() => router.push('/programs/edit')} />
        </Animated.View>

        <Animated.View entering={enter(2)}>
          <SectionHeader overline="Haftalık plan" title="Bu hafta" />
          <WeekPlan programs={t.templates} onOpen={open} />
        </Animated.View>

        <Animated.View entering={enter(3)}>
          <SectionHeader overline={`${t.templates.length} program`} title="Programlarım" />
          {t.templatesStatus === 'error' ? (
            <Card variant="outline">
              <AppText variant="small" color="textMuted">
                Programların yüklenemedi. Oturumunu kontrol edip tekrar dene.
              </AppText>
            </Card>
          ) : t.templates.length ? (
            <View style={styles.list} testID="my-programs">
              {t.templates.map((p) => (
                <ProgramCard key={p.id} program={p} onPress={open} />
              ))}
            </View>
          ) : (
            <View style={styles.empty} testID="my-programs-empty">
              <Icon name="clipboard-list-outline" size={28} color="textFaint" />
              <AppText variant="small" color="textMuted" align="center">
                Henüz programın yok. Sıfırdan kur ya da aşağıdaki hazır şablonlardan birini kopyala.
              </AppText>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={enter(4)}>
          <SectionHeader overline="SKOR SPOR" title="Hazır şablonlar" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
            <Chip label="Tümü" selected={!sport} onPress={() => setSport(null)} />
            {sportsWithBuiltIns.map((s) => (
              <Chip key={s.id} label={s.label} icon={s.icon} tone="gold" selected={sport === s.id} onPress={() => setSport((c) => (c === s.id ? null : s.id))} />
            ))}
          </ScrollView>
          <View style={styles.list}>
            {builtIns.map((p) => (
              <ProgramCard key={p.id} program={p} onPress={open} />
            ))}
          </View>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { gap: spacing.sm, marginBottom: spacing.xl },
  stack: { gap: spacing.xxl },
  list: { gap: spacing.md },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong },
  chipScroll: { marginHorizontal: -layout.gutter, flexGrow: 0, marginBottom: spacing.md },
  chips: { gap: spacing.sm, paddingHorizontal: layout.gutter },
});
