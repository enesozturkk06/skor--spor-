import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { enter } from '@/components/motion/entrance';
import { AppText, Button, Screen, SectionHeader, Tag } from '@/components/ui';
import { getSport } from '@/features/athlete/catalog';
import { getExercise } from '@/features/exercises/catalog';
import { MuscleLegend, MuscleMap } from '@/features/exercises/components/MuscleMap';
import { NavBar } from '@/features/exercises/components/NavBar';
import { GOAL_LABELS } from '@/features/exercises/presets';
import { haptics } from '@/lib/haptics';
import { colors, gradients, radius, spacing } from '@/theme';

import { getBuiltinTemplate } from '../builtin-templates';
import { Sheet } from '../components/Sheet';
import { WEEKDAYS, estimateMinutes, programMuscles, totalSets } from '../template-model';
import { useTraining } from '../TrainingProvider';
import { summarizeBlock } from './format';

/**
 * The pre-workout briefing: what the session is, what it trains, how it
 * flows — then one big button to start it.
 */
export function ProgramDetail() {
  const router = useRouter();
  const t = useTraining();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sheet, setSheet] = useState<'delete' | 'busy' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!t.ready) return null;
  const program = typeof id === 'string' ? (getBuiltinTemplate(id) ?? t.templates.find((p) => p.id === id)) : undefined;
  if (!program) return <Redirect href="/programs" />;

  const sport = getSport(program.sport);
  const muscles = programMuscles(program);
  const start = () => {
    if (t.active) return setSheet('busy');
    try {
      t.startFromTemplate(program);
      haptics.success();
      router.replace('/workout');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <View style={styles.root}>
      <Screen width="form" footer={<Button label="Antrenmanı başlat" icon="play" onPress={start} />}>
        <NavBar overline={program.builtIn ? 'Hazır şablon' : 'Program'} fallback="/programs" />

        <Animated.View entering={enter(0)} style={styles.hero}>
          <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.heroGlow} pointerEvents="none" />
          <View style={styles.tags}>
            <Tag label={sport.label} icon={sport.icon} tone="gold" />
            {program.goal ? <Tag label={GOAL_LABELS[program.goal]} tone="orange" /> : null}
          </View>
          <AppText variant="display" accessibilityRole="header" testID="program-title">
            {program.name}
          </AppText>
          {program.notes ? (
            <AppText variant="body" color="textMuted">
              {program.notes}
            </AppText>
          ) : null}
          <View style={styles.stats}>
            <Stat label="Egzersiz" value={program.blocks.length} delay={150} />
            <Stat label="Set / raund" value={totalSets(program)} delay={250} testID="program-sets" />
            <Stat label="Dakika" value={estimateMinutes(program)} delay={350} prefix="~" />
          </View>
        </Animated.View>

        {error ? (
          <AppText variant="small" color="danger" style={styles.error}>
            {error}
          </AppText>
        ) : null}

        <View style={styles.stack}>
          <Animated.View entering={enter(1)}>
            <SectionHeader overline="Anatomi" title="Çalışan kaslar" />
            <View style={styles.mapCard}>
              <MuscleMap primary={muscles.primary} secondary={muscles.secondary} height={250} testID="program-map" />
              <MuscleLegend />
            </View>
          </Animated.View>

          <Animated.View entering={enter(2)}>
            <SectionHeader overline="Akış" title="Seans planı" />
            <View style={styles.flow}>
              {program.blocks.map((b, i) => {
                const ex = getExercise(b.exerciseKey)!;
                const last = i === program.blocks.length - 1;
                return (
                  <Animated.View key={b.uid} entering={enter(i, { step: 60, delay: 250 })} style={styles.step} testID={`program-block-${i}`}>
                    <View style={styles.rail}>
                      <View style={[styles.node, b.rounds && styles.nodeRounds]}>
                        <AppText variant="smallStrong" color={b.rounds ? 'textOnOrange' : 'orange'}>
                          {i + 1}
                        </AppText>
                      </View>
                      {!last ? <View style={styles.line} /> : null}
                    </View>
                    <View style={[styles.stepBody, !last && styles.stepGap]}>
                      <AppText variant="title">{ex.name.tr}</AppText>
                      <AppText variant="small" color="gold">
                        {summarizeBlock(b)}
                      </AppText>
                      {!b.rounds ? (
                        <AppText variant="small" color="textMuted">
                          Dinlenme {b.restS} sn
                        </AppText>
                      ) : null}
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>

          {program.days.length ? (
            <Animated.View entering={enter(3)}>
              <SectionHeader overline="Haftalık plan" title="Günler" />
              <AppText variant="body" testID="program-days">
                {WEEKDAYS.filter((d) => program.days.includes(d.day))
                  .map((d) => d.long)
                  .join(' · ')}
              </AppText>
            </Animated.View>
          ) : null}

          <Animated.View entering={enter(4)} style={styles.actions}>
            {program.builtIn ? (
              <Button
                label="Kopyala ve özelleştir"
                icon="content-copy"
                variant="secondary"
                onPress={() => router.push({ pathname: '/programs/edit', params: { from: program.id } })}
              />
            ) : (
              <>
                <View style={styles.row}>
                  <Button label="Düzenle" icon="pencil-outline" variant="secondary" style={styles.flex} onPress={() => router.push({ pathname: '/programs/edit', params: { id: program.id } })} />
                  <Button
                    label="Çoğalt"
                    icon="content-copy"
                    variant="secondary"
                    style={styles.flex}
                    onPress={async () => {
                      const copy = await t.duplicateTemplate(program);
                      haptics.success();
                      router.replace({ pathname: '/programs/[id]', params: { id: copy.id } });
                    }}
                  />
                </View>
                <Button label="Programı sil" icon="delete-outline" variant="ghost" onPress={() => setSheet('delete')} />
              </>
            )}
          </Animated.View>
        </View>
      </Screen>

      {sheet === 'delete' ? (
        <Sheet title="Program silinsin mi?" subtitle={`"${program.name}" kalıcı olarak silinir. Geçmiş antrenmanların korunur.`} onClose={() => setSheet(null)} testID="delete-program-sheet">
          <Button
            label="Evet, sil"
            variant="danger"
            icon="delete-outline"
            onPress={async () => {
              await t.deleteTemplate(program.id);
              router.replace('/programs');
            }}
          />
          <Button label="Vazgeç" variant="secondary" onPress={() => setSheet(null)} />
        </Sheet>
      ) : null}
      {sheet === 'busy' ? (
        <Sheet title="Devam eden antrenmanın var" subtitle="Yeni bir program başlatmadan önce onu bitir ya da sil." onClose={() => setSheet(null)} testID="busy-sheet">
          <Button label="Antrenmana dön" icon="play" onPress={() => router.push('/workout')} />
          <Button label="Vazgeç" variant="secondary" onPress={() => setSheet(null)} />
        </Sheet>
      ) : null}
    </View>
  );
}

function Stat({ label, value, delay, prefix = '', testID }: { label: string; value: number; delay: number; prefix?: string; testID?: string }) {
  return (
    <View style={styles.stat}>
      <AnimatedNumber value={value} delay={delay} variant="statL" format={(n) => `${prefix}${n}`} testID={testID} />
      <AppText variant="overline" color="textMuted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.md },
  hero: {
    gap: spacing.md,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  // Soft orange light from the top-right corner (native CSS radial gradient, RN 0.88).
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'radial-gradient(ellipse 70% 80% at 100% 0%, rgba(255,113,56,0.30), rgba(255,113,56,0))',
  },
  tags: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  stats: { flexDirection: 'row', marginTop: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  error: { marginBottom: spacing.md },
  stack: { gap: spacing.xxl },
  mapCard: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  flow: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  step: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 30 },
  node: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  nodeRounds: { backgroundColor: colors.orange },
  line: { flex: 1, width: 1, backgroundColor: colors.borderStrong, marginVertical: spacing.xs },
  stepBody: { flex: 1, gap: 2, paddingTop: 4 },
  stepGap: { paddingBottom: spacing.lg },
  actions: { gap: spacing.md },
});
